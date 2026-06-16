-- 전속작가 테이블
CREATE TABLE writers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  birth_date DATE,
  bank_account VARCHAR(50),
  writer_type VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 작가 계약 요율
CREATE TABLE writer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id UUID NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
  work_type VARCHAR(20) NOT NULL,
  company_rate INTEGER NOT NULL CHECK (company_rate >= 0 AND company_rate <= 100),
  writer_rate INTEGER GENERATED ALWAYS AS (100 - company_rate) STORED,
  contract_date DATE NOT NULL,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(writer_id, work_type)
);

-- 저작물(곡)
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  komca_code VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  artist_name VARCHAR(100),
  writer_id UUID NOT NULL REFERENCES writers(id),
  work_type VARCHAR(20) NOT NULL,
  domestic_share DECIMAL(5, 2) DEFAULT 100,
  overseas_share DECIMAL(5, 2) DEFAULT 0,
  specific_rate INTEGER,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 정산 배치
CREATE TABLE settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  quarter SMALLINT NOT NULL CHECK (quarter IN (3, 6, 9, 12)),
  total_amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  source_file VARCHAR(255),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(year, quarter)
);

-- 정산 항목
CREATE TABLE settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES settlement_batches(id) ON DELETE CASCADE,
  writer_id UUID NOT NULL REFERENCES writers(id),
  song_id UUID REFERENCES songs(id),
  item_name VARCHAR(255) NOT NULL,
  allocated_amount DECIMAL(15, 2) NOT NULL,
  company_rate DECIMAL(5, 2) NOT NULL,
  is_rate_overridden BOOLEAN DEFAULT FALSE,
  order_num INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 정산 결과
CREATE TABLE settlement_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES settlement_batches(id),
  writer_id UUID NOT NULL REFERENCES writers(id),
  total_amount DECIMAL(15, 2) NOT NULL,
  total_fee DECIMAL(15, 2) NOT NULL,
  income_tax DECIMAL(15, 2) NOT NULL,
  local_income_tax DECIMAL(15, 2) NOT NULL,
  total_deduction DECIMAL(15, 2) NOT NULL,
  net_amount DECIMAL(15, 2) NOT NULL,
  is_valid BOOLEAN NOT NULL,
  pdf_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(batch_id, writer_id)
);

-- 사용자 역할
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'WRITER')),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 사용자 권한
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_code)
);

-- 작가-사용자 연결 (작가가 포털에 로그인할 때)
CREATE TABLE writer_users (
  writer_id UUID PRIMARY KEY REFERENCES writers(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE
);

-- 감시 추적 로그
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100),
  target_table VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_writers_email ON writers(email);
CREATE INDEX idx_songs_writer_id ON songs(writer_id);
CREATE INDEX idx_songs_komca_code ON songs(komca_code);
CREATE INDEX idx_settlement_batches_year_quarter ON settlement_batches(year, quarter);
CREATE INDEX idx_settlement_items_batch_id ON settlement_items(batch_id);
CREATE INDEX idx_settlement_results_batch_id ON settlement_results(batch_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE writers ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE writer_contracts ENABLE ROW LEVEL SECURITY;

-- RLS 정책: ADMIN은 모든 데이터 접근
CREATE POLICY admin_all ON writers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY admin_all_songs ON songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS 정책: WRITER는 자신의 정산서만 조회
CREATE POLICY writer_own_results ON settlement_results FOR SELECT
  USING (
    writer_id IN (
      SELECT writer_id FROM writer_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY writer_own_batches ON settlement_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM settlement_results sr
      WHERE sr.batch_id = settlement_batches.id
      AND sr.writer_id IN (
        SELECT writer_id FROM writer_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- 샘플 데이터 (선택사항)
-- INSERT INTO writers (name, birth_date, bank_account, writer_type, email, status)
-- VALUES
--   ('홍길동', '1985-01-15', '국민은행 123-456-789', '작곡가', 'hong@prism-filter.com', 'active'),
--   ('이순신', '1990-03-20', '우리은행 987-654-321', '작사가', 'lee@prism-filter.com', 'active');

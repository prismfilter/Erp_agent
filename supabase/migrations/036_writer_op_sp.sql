-- 작가 마스터: OP(오리지널 퍼블리셔)·SP(서브 퍼블리셔) 컬럼 추가
-- OP = Original Publisher, SP = Sub Publisher. 계약정보에 표기하는 자유 텍스트(미지정=null).
ALTER TABLE writers
  ADD COLUMN IF NOT EXISTS op TEXT,   -- 오리지널 퍼블리셔(Original Publisher)
  ADD COLUMN IF NOT EXISTS sp TEXT;   -- 서브 퍼블리셔(Sub Publisher)

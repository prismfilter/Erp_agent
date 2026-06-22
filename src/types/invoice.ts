// 인보이스(청구서) 도메인 타입 정의

export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type InvoiceItemType = 'normal' | 'discount' | 'custom';

// 프라이스 테이블 항목 (마스터)
export interface PriceItem {
  id: string;
  category: string;
  name: string;
  billing_price: number | null;   // 희망청구가 (수식형은 null)
  writer_base_pay: number | null; // 작가 지급액 방어선
  fee_rate: number;               // 관리 수수료율 (기본 0.20)
  is_formula: boolean;
  formula_note: string | null;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;      // 휴지통 이동 시각 (null = 정상)
}

// 작가 마스터 (로그인 계정과 무관한 작가/작업자 레지스트리)
export interface Writer {
  id: string;
  writer_code: string;            // 고유 코드 EX-001(전속)/GN-001(일반), 수정 불가
  name: string;
  writer_type: string;            // '전속작가' | '일반작가'
  fee_rate: number;               // 용역 요율(%) 0~100
  permanent_rate: number | null;  // 영구 저작물 요율(%) 0~100, null=미지정
  general_rate: number | null;    // 일반 저작물 요율(%) 0~100, null=미지정
  recontract_date: string | null; // 전속작가 재계약일 (YYYY-MM-DD), null=미지정
  status: string;
  created_at: string;
}

// 저작물 DB (전속작가 영구 관리 대상 저작물)
export interface MusicWork {
  id: string;
  no: number;                       // 전역 순번 (UNIQUE, 중복 불가)
  writer_name: string;              // 작가명
  komca_code: string | null;        // KOMCA 저작물 코드
  song_title: string;               // 곡명
  artist: string | null;            // 아티스트
  domestic_share: number | null;    // 국내 지분(%)
  overseas_share: number | null;    // 국외 지분(%)
  rate: number | null;              // 요율
  recontract_date: string | null;   // 전속작가 재계약일
  created_at: string;
}

// 작가별 저작물 건수 (좌측 작가 목록용)
export interface WorkWriterGroup {
  writer_name: string;
  count: number;
}

// 거래처
export interface Client {
  id: string;
  client_code?: string; // 거래처 고유 코드 CL-001 (거래처 DB에만 노출). 조인 결과엔 없을 수 있어 optional
  name: string;
  is_active: boolean;
  created_at?: string; // 거래처 DB 관리 페이지용(테이블에 존재). 조인 결과엔 없을 수 있어 optional
}

// 회사 입금계좌
export interface CompanyAccount {
  id: string;
  bank_name: string;
  account_number: string;
  is_default: boolean;
}

// 청구서 라인 항목
export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  no: number;
  price_item_id: string | null;   // 커스텀 항목은 null
  description: string;
  writer_names: string;           // 콤마 구분 복수 작업자
  supply_amount: number;          // 공급가액 (할인 전)
  discount_amount: number;        // 할인금액(원) — 순매출 = 공급가액 − 할인금액
  writer_pay_rate: number;        // 작가수수료율 % (0~100, 기본 70) — 작가지급액 = 순매출 × 율
  writer_pay: number;             // 작가 지급액 (계산값: 순매출 × writer_pay_rate%)
  item_type: InvoiceItemType;
  is_negotiated: boolean;
  note: string | null;            // 내부 비고
  show_in_external: boolean;
  group_key: string | null;       // 내부 행 분리 시 부모 항목 id (클라이언트는 임시키)
}

// 청구서 헤더
export interface Invoice {
  id: string;
  invoice_date: string;
  client_id: string | null;
  title: string;
  account_id: string | null;
  status: InvoiceStatus;
  paid_at: string | null;         // 입금 완료 시각 (status='paid' 전환 시 기록)
  memo: string | null;
  created_at: string;
  updated_at: string;
  // 조인 결과
  client?: Client | null;
  account?: CompanyAccount | null;
  items?: InvoiceItem[];
}

// 용역 정산 세부 항목 (정산 시점 스냅샷)
export interface ServiceSettlementDetailItem {
  invoice_id: string;
  invoice_date: string;
  paid_at: string | null;
  client_name: string;
  title: string;
  description: string;
  writer_pay: number;
}

// 용역 정산 레코드
export interface ServiceSettlement {
  id: string;
  writer_name: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  detail: ServiceSettlementDetailItem[];
  created_at: string;
}

// 청구서 합계 (실시간 계산 결과)
export interface InvoiceTotals {
  supplyTotal: number;       // 총 공급가액 (A) — 외부 표시 행의 순매출(할인 반영) 합
  writerPayTotal: number;    // 총 작가지급액 (B) — 내부 표시 행 기준
  attributionTotal: number;  // 총 귀속금액 (C) = A − B
  taxA: number;              // A 세액 (10%)
  taxB: number;              // B 세액
  taxC: number;              // C 세액
  grandTotal: number;        // 총 합계 = A + taxA
  internalSupplyTotal: number; // 내부 표시 행 순매출 합 (검증용)
  isValid: boolean;          // 외부·내부 합계 일치 + 세액 정합 여부
  warnings: string[];        // 검증 경고 메시지
}

// 청구서 목록 행 (목록 페이지용 — 합계 포함)
export interface InvoiceListRow extends Invoice {
  totals: InvoiceTotals;
  writerSummary: string;     // 내부 지급서 목록용 작업자 요약
}

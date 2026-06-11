// 인보이스(청구서) 도메인 타입 정의

export type InvoiceStatus = 'draft' | 'confirmed' | 'sent' | 'paid';
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
}

// 거래처
export interface Client {
  id: string;
  name: string;
  is_active: boolean;
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
  supply_amount: number;          // 공급가액 (할인 행은 음수)
  writer_pay: number;             // 작가 지급액
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
  memo: string | null;
  created_at: string;
  updated_at: string;
  // 조인 결과
  client?: Client | null;
  account?: CompanyAccount | null;
  items?: InvoiceItem[];
}

// 청구서 합계 (실시간 계산 결과)
export interface InvoiceTotals {
  supplyTotal: number;       // 총 공급가액 (A) — 외부 표시 행 기준
  writerPayTotal: number;    // 총 작가지급액 (B) — 내부 표시 행 기준
  attributionTotal: number;  // 총 귀속금액 (C) = A − B
  taxA: number;              // A 세액 (10%)
  taxB: number;              // B 세액
  taxC: number;              // C 세액
  grandTotal: number;        // 총 합계 = A + taxA
  internalSupplyTotal: number; // 내부 표시 행 공급가액 합 (검증용)
  isValid: boolean;          // 외부·내부 합계 일치 + 세액 정합 여부
  warnings: string[];        // 검증 경고 메시지
}

// 청구서 목록 행 (목록 페이지용 — 합계 포함)
export interface InvoiceListRow extends Invoice {
  totals: InvoiceTotals;
  writerSummary: string;     // 내부 지급서 목록용 작업자 요약
}

// API 요청 본문 검증 스키마 (zod v4)
// 각 라우트는 safeParse(parseJson 헬퍼)로 본문을 검증한 뒤 신뢰된 데이터만 사용한다.

import { z } from 'zod';

const ROLE = z.enum(['ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER']);
const INVOICE_STATUS = z.enum(['draft', 'sent', 'paid']);
const ITEM_TYPE = z.enum(['normal', 'discount', 'custom']);

// ── 청구서 라인 항목 ──────────────────────────────────────────────────────
// 금액은 음수(할인 행) 허용, 선택 필드는 관대하게 받아 itemsRepo가 기본값을 채운다.
export const invoiceItemInputSchema = z.object({
  id: z.string().optional(),
  no: z.number().int(),
  price_item_id: z.string().nullable().optional(),
  description: z.string().optional(),
  writer_names: z.string().optional(),
  supply_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  writer_pay_rate: z.number().min(0).max(100).optional(),
  writer_pay: z.number().optional(),
  item_type: ITEM_TYPE.optional(),
  is_negotiated: z.boolean().optional(),
  note: z.string().nullable().optional(),
  show_in_external: z.boolean().optional(),
  group_key: z.string().nullable().optional(),
});

// ── 청구서 생성/수정 ──────────────────────────────────────────────────────
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

export const invoiceCreateSchema = z.object({
  invoice_date: z.string().min(1, '날짜는 필수입니다.'),
  title: z.string().min(1, '거래명은 필수입니다.'),
  client_id: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  status: INVOICE_STATUS.optional(),
  memo: z.string().nullable().optional(),
  items: z.array(invoiceItemInputSchema).optional(),
});

export const invoiceUpdateSchema = z.object({
  invoice_date: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  client_id: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  status: INVOICE_STATUS.optional(),
  memo: z.string().nullable().optional(),
  items: z.array(invoiceItemInputSchema).optional(),
});

// ── 프라이스 테이블 ───────────────────────────────────────────────────────
export const priceItemCreateSchema = z.object({
  category: z.string().min(1, '카테고리는 필수입니다.'),
  name: z.string().min(1, '작업내역명은 필수입니다.'),
  billing_price: z.number().nullable().optional(),
  writer_base_pay: z.number().nullable().optional(),
  fee_rate: z.number().optional(),
  is_formula: z.boolean().optional(),
  formula_note: z.string().nullable().optional(),
  sort_order: z.number().optional(),
});

export const priceItemUpdateSchema = z.object({
  category: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  billing_price: z.number().nullable().optional(),
  writer_base_pay: z.number().nullable().optional(),
  fee_rate: z.number().optional(),
  is_formula: z.boolean().optional(),
  formula_note: z.string().nullable().optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
  deleted_at: z.string().nullable().optional(), // 휴지통 복구(null)/이동 시각
});

// ── 작가 마스터 ───────────────────────────────────────────────────────────
const WRITER_TYPE = z.enum(['전속작가', '일반작가']);

export const writerCreateSchema = z.object({
  name: z.string().trim().min(1, '작가명은 필수입니다.'),
  writer_type: WRITER_TYPE,
  fee_rate: z.number().min(0).max(100),
  permanent_rate: z.number().min(0).max(100).nullable().optional(), // 영구 저작물 요율(%), null=미지정
  general_rate: z.number().min(0).max(100).nullable().optional(),   // 일반 저작물 요율(%), null=미지정
  recontract_date: z.string().nullable().optional(),                // 재계약일(YYYY-MM-DD), null=미지정
});

export const writerUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  writer_type: WRITER_TYPE.optional(),
  fee_rate: z.number().min(0).max(100).optional(),
  permanent_rate: z.number().min(0).max(100).nullable().optional(),
  general_rate: z.number().min(0).max(100).nullable().optional(),
  recontract_date: z.string().nullable().optional(),
  // 계약 상태(활성화/해지). writer_code는 직접 수정 불가하므로 스키마에 포함하지 않는다.
  status: z.enum(['active', 'terminated']).optional(),
});

// ── 저작물 DB ─────────────────────────────────────────────────────────────
export const musicWorkCreateSchema = z.object({
  no: z.number().int().positive('NO.는 1 이상의 정수여야 합니다.'),
  writer_name: z.string().trim().min(1, '작가명은 필수입니다.'),
  komca_code: z.string().trim().nullable().optional(),
  song_title: z.string().trim().min(1, '곡명은 필수입니다.'),
  artist: z.string().trim().nullable().optional(),
  domestic_share: z.number().nullable().optional(),
  overseas_share: z.number().nullable().optional(),
  rate: z.number().nullable().optional(),
  recontract_date: z.string().nullable().optional(),
});

export const musicWorkUpdateSchema = z.object({
  no: z.number().int().positive().optional(),
  writer_name: z.string().trim().min(1).optional(),
  komca_code: z.string().trim().nullable().optional(),
  song_title: z.string().trim().min(1).optional(),
  artist: z.string().trim().nullable().optional(),
  domestic_share: z.number().nullable().optional(),
  overseas_share: z.number().nullable().optional(),
  rate: z.number().nullable().optional(),
  recontract_date: z.string().nullable().optional(),
});

// ── 용역 정산 ─────────────────────────────────────────────────────────────
export const serviceSettlementCreateSchema = z.object({
  writer_name: z.string().trim().min(1, '작가명은 필수입니다.'),
  period_start: z.string().min(1, '시작일은 필수입니다.'),
  period_end: z.string().min(1, '종료일은 필수입니다.'),
});

// ── 거래처 ────────────────────────────────────────────────────────────────
export const clientCreateSchema = z.object({
  name: z.string().trim().min(1, '거래처명은 필수입니다.'),
});

export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1, '거래처명은 필수입니다.').optional(),
  is_active: z.boolean().optional(),
  // 상세정보(021) — 빈 문자열/누락은 null로 클리어 허용
  representative: z.string().trim().nullable().optional(),
  business_number: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  manager_name: z.string().trim().nullable().optional(),
  contact_phone: z.string().trim().nullable().optional(),
  contact_email: z.string().trim().nullable().optional(),
  department_title: z.string().trim().nullable().optional(),
  bank_name: z.string().trim().nullable().optional(),
  account_number: z.string().trim().nullable().optional(),
  account_holder: z.string().trim().nullable().optional(),
});

// ── 회사 입금계좌 ───────────────────────────────────────────────────────────
export const companyAccountCreateSchema = z.object({
  bank_name: z.string().trim().min(1, '은행명은 필수입니다.'),
  account_number: z.string().trim().min(1, '계좌번호는 필수입니다.'),
});

// ── 사용자 본인 프로필/역할 (자가 승격 차단은 canSelfAssignRole가 담당) ──
export const userProfileSchema = z.object({
  name: z.string().nullable().optional(),
  role: ROLE.optional(),
});

export const userRoleSchema = z.object({
  role: ROLE,
});

// ── 관리자의 사용자 수정 ──────────────────────────────────────────────────
export const adminUserUpdateSchema = z.object({
  name: z.string().nullable().optional(),
  role: ROLE.optional(),
  contract_date: z.string().nullable().optional(),
});

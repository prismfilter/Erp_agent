// API 요청 본문 검증 스키마 (zod v4)
// 각 라우트는 safeParse(parseJson 헬퍼)로 본문을 검증한 뒤 신뢰된 데이터만 사용한다.

import { z } from 'zod';

const ROLE = z.enum(['ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER']);
const INVOICE_STATUS = z.enum(['draft', 'confirmed', 'sent', 'paid']);
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
});

export const writerUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  writer_type: WRITER_TYPE.optional(),
  fee_rate: z.number().min(0).max(100).optional(),
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

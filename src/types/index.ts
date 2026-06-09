// 사용자 역할
export type UserRole = 'ADMIN' | 'STAFF' | 'WRITER';

// 사용자 권한
export type Permission =
  | 'settlement.process'
  | 'settlement.view'
  | 'writers.manage'
  | 'songs.manage'
  | 'accounts.manage';

// 저작물 유형
export type WorkType = '영구저작물' | '일반저작물';

// 정산 상태
export type SettlementStatus = 'draft' | 'processing' | 'completed' | 'cancelled';

// 계약 정보
export interface WriterContract {
  writerId: string;
  workType: WorkType;
  companyRate: number;
  writerRate: number;
  contractDate: string;
}

// 전속작가
export interface Writer {
  id: string;
  name: string;
  birthDate: string;
  bankAccount: string;
  writerType: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// 저작물(곡)
export interface Song {
  id: string;
  komcaCode: string;
  title: string;
  artistName: string;
  writerId: string;
  workType: WorkType;
  domesticShare: number;
  overseasShare: number;
  specificRate?: number;
}

// 정산 항목
export interface SettlementItem {
  id: string;
  batchId: string;
  writerId: string;
  songId?: string;
  itemName: string;
  allocatedAmount: number;
  companyRate: number;
  isRateOverridden: boolean;
}

// 정산 배치
export interface SettlementBatch {
  id: string;
  year: number;
  quarter: 3 | 6 | 9 | 12;
  totalAmount: number;
  status: SettlementStatus;
  sourceFile?: string;
  createdBy: string;
  createdAt: string;
}

// 정산 결과
export interface SettlementResult {
  id: string;
  batchId: string;
  writerId: string;
  totalAmount: number;
  totalFee: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;
  netAmount: number;
  isValid: boolean;
  pdfPath?: string;
  createdAt: string;
}

// 사용자 정보 (인증 후)
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;   // null = 미등록 (최초 상태)
  role: UserRole | null; // null = 미지정 (최초 로그인 상태)
  permissions?: Permission[];
  writerInfo?: Writer;
}

// 정산 계산 결과
export interface CalculationResult {
  totalAmount: number;
  totalFee: number;
  taxableAmount: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;
  netAmount: number;
  isValid: boolean;
}

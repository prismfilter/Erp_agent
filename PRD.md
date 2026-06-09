# PRD — 프리즘필터 전속작가 정산 시스템

**Version**: 1.0  
**Last Updated**: 2026-06-08

---

## 1. 프로젝트 개요

### 배경 및 목표
- **현재**: 분기별 음악 저작권 정산을 수동으로 처리 (4시간 소요, 2-3% 오류)
- **목표**: 웹 기반 자동화 시스템으로 처리 시간 30분 이내, 오류 0%

### 범위
- 전속작가 5명, 관리 저작물 164건
- 분기별 정산 (3/6/9/12월)
- 2026년 2분기(4월) 이후 시스템 적용

---

## 2. 핵심 기능

### MVP (Phase 1)
- 웹 기반 정산서 입력 UI (항목별 지급액, 수수료율)
- 실시간 자동 계산 (수수료 → 소득세 3% → 지방소득세 10%)
- PDF 다운로드
- 정산 이력 저장 및 조회

### Phase 2 (선택)
- 업체 엑셀 파일 업로드
- Claude AI 자동 정산 처리

### Phase 3 (신규)
- AI 챗봇 (로그인 사용자 맞춤 정산 Q&A)
- "이번 년도 받은 금액이 얼마야?" 같은 자연어 지원

---

## 3. 정산서 양식 (작가정산서 샘플.xlsx 기준)

### 구조
```
[작가 정보]
성명 | 생년월일 | 입금계좌 | 정산기준일

[지급 내역]
항목    | 지급액   | 수수료율
A 용역  | 300,000 | 20%
B 용역  | 500,000 | 20%
C 용역  | 1,500,000 | 20%
합계    | 2,300,000

[공제 내역 - 자동계산]
수수료           | 460,000
소득세           | 55,200
지방소득세       | 5,520
공제액 소계      | 520,720
실수령액         | 1,779,280
```

### 계산 공식
| 항목 | 공식 |
|------|------|
| **수수료** | ROUNDDOWN(SUMPRODUCT(지급액 × 수수료율)) |
| **소득세** | ROUNDDOWN((합계-수수료) × 3%, -1) |
| **지방소득세** | ROUNDDOWN(소득세 × 10%, -1) |
| **공제액** | 수수료 + 소득세 + 지방소득세 |
| **실수령액** | MAX(합계 - 공제액, 0) |

---

## 4. 사용자 권한

### 인증
- Google OAuth (@prism-filter.com만 허용)
- Supabase Auth

### 역할 (Role)

| 역할 | 설명 | 접근 권한 |
|------|------|---------|
| **ADMIN** | 관리자/대표이사 | 모든 기능 + 계정 관리 |
| **STAFF** | 사내 정산 담당자 | 관리자가 부여한 권한만 |
| **WRITER** | 전속작가 | 본인 정산서 조회 + PDF만 |

---

## 5. 화면 목록

| 화면 | 경로 | 접근 권한 |
|------|------|---------|
| 로그인 | `/login` | 전체 |
| 대시보드 | `/` | ADMIN, STAFF |
| 정산 목록 | `/settlement` | ADMIN, STAFF |
| 새 정산 | `/settlement/new` | ADMIN, STAFF |
| 정산 상세 | `/settlement/[id]` | ADMIN, STAFF |
| 작가 관리 | `/writers` | ADMIN |
| 곡 관리 | `/songs` | ADMIN, STAFF |
| 계정 관리 | `/admin/accounts` | ADMIN |
| 작가 포털 | `/writer-portal` | WRITER |

---

## 6. 데이터 모델 (Supabase)

### 주요 테이블

**writers** (전속작가)
```sql
id | name | birth_date | bank_account | email | status
```

**songs** (저작물)
```sql
id | komca_code | title | artist_name | writer_id | work_type | specific_rate
```

**writer_contracts** (계약 요율)
```sql
id | writer_id | work_type | company_rate | writer_rate
```

**settlement_batches** (정산 배치)
```sql
id | year | quarter | total_amount | status | created_by
```

**settlement_items** (정산 항목)
```sql
id | batch_id | writer_id | item_name | allocated_amount | company_rate
```

**settlement_results** (정산 결과)
```sql
id | batch_id | writer_id | total_amount | total_fee | income_tax | net_amount
```

---

## 7. AI 챗봇 기능

### 사용 예시

**작가 로그인 시**
```
"이번 년도 받은 정산금이 얼마야?"
→ "2026년 총액: 1,779,280원"

"이번에 받은 정산서 보여줘"
→ 최신 정산서 상세 + PDF 링크

"1분기랑 2분기 비교해줘"
→ 분기별 비교 테이블
```

**관리자 로그인 시**
```
"홍길동 작가 3월 정산 현황"
→ 해당 작가 정산 요약

"이번 분기 전사 정산액"
→ 전사 합계
```

### 기술
- Claude Haiku 4.5 (경량)
- Tool Use: DB 조회, 데이터 분석
- 사이드바 플로팅 UI
- 스트리밍 응답 (SSE)

---

## 8. 검증 기준

### 정산 계산 정확도
샘플 데이터: 300K@20% + 500K@20% + 1.5M@20%
- 합계: 2,300,000 ✓
- 수수료: 460,000 ✓
- 소득세: 55,200 ✓
- 지방소득세: 5,520 ✓
- 공제액: 520,720 ✓
- 실수령액: 1,779,280 ✓

---

## 9. 보안

- Supabase RLS (역할별 접근 제어)
- 정산 결과는 수정/삭제 불가
- 모든 변경 기록 저장
- HTTPS (프로덕션)

---

## 10. 프로젝트 일정

- Phase 1: 기초 구축 (2주)
- Phase 2: 정산서 핵심 (1주)
- Phase 3: AI 챗봇 (1주)
- 테스트/배포: 1주

**예상 완료**: 2026-08-04

---

See CLAUDE.md for development guidelines

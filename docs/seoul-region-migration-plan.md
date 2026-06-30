# Supabase 서울 리전 이전 계획

> 싱가포르(`ap-southeast-1`) → 서울(`ap-northeast-2`) 리전 이전.
> 개인정보(PII) 데이터 주권 확보 목적. **리전은 인프라에 고정되어 직접 변경 불가 → 신규 프로젝트 생성 후 데이터 이전이 유일한 방법.**

---

## 1. 현황 (이전 출발점)

| 항목 | 값 |
|------|-----|
| 기존 프로젝트 | `프리즘필터 뮤직그룹 ERP 구축` (`aqsrhesndraehhlonqib`) |
| 기존 리전 | `ap-southeast-1` (싱가포르) |
| 목표 리전 | `ap-northeast-2` (서울 / Northeast Asia (Seoul)) |
| Postgres | 17.6 |
| 마이그레이션 파일 | `supabase/migrations/` 31개 (001~031) |
| **Storage 버킷** | **없음** (코드에 `storage.from` 사용처 0건) — 이전 단순화 |
| 인증 | Google OAuth (서드파티) |
| Supabase 연결 코드 | `src/lib/supabase/{client,server}.ts`, `src/proxy.ts`, `src/lib/auth/apiAuth.ts` — 전부 ENV 변수 사용 |

### 이전 대상 데이터 (행 수)
| 테이블 | 행 | 테이블 | 행 |
|--------|----|--------|----|
| `work_authors` | 6,002 | `clients` | 4 |
| `works` | 738 | `invoice_items` | 4 |
| `price_items` | 89 | `invoices` | 1 |
| `writers` | 27 | `company_accounts` | 1 |
| `user_roles` | 5 | (그 외 테이블) | 0 |

> `auth.users`(Google 로그인 계정)도 별도 이전 대상. 단 OAuth라 최악의 경우 재로그인으로 복구 가능.

---

## 2. 이전 방식 결정 — **무료 플랜 → 경로 B(CLI) 확정**

> **현재 무료(Free) 플랜.** 따라서:
> - 물리 백업/PITR 미제공 → 대시보드 **"Restore to another project"(경로 A) 사용 불가**
> - **CLI 백업·복원(경로 B)으로 확정** (`supabase db dump` 또는 `pg_dump`/`pg_restore`)
> - 데이터량이 적어(대부분 1만 행 미만) CLI로도 충분히 빠르고 안전

### ⚠️ 무료 플랜 제약 — 프로젝트 개수 (사전 처리 필요)
무료 플랜은 **조직당 활성 프로젝트 2개** 제한. 현재 조직(`redowtyuijqindnpbjcg`)에 이미 2개 존재:

| 프로젝트 | ref | 상태 | 처리 |
|----------|-----|------|------|
| 프리즘필터 뮤직그룹 ERP 구축 | `aqsrhesndraehhlonqib` | ACTIVE | **이전 원본 — 유지** |
| prismfilter's Project | `lpzmgbditsleafabxnhw` | INACTIVE | 미사용으로 보임 → **삭제 검토**(슬롯 확보용) |

- 서울 신규 프로젝트를 만들려면 **2개 제한에 걸릴 수 있음** → 미사용 `lpzmgbditsleafabxnhw`를 **먼저 삭제**해 슬롯을 비워야 할 가능성.
- 이전 기간엔 원본(싱가포르)+신규(서울)를 잠시 함께 둬야 하므로, **빈 슬롯 1개 확보가 선행 조건.**
- (대안) 잠깐 Pro로 올려 슬롯 여유를 두고 이전 후 다시 내리는 방법도 있으나, 무료 유지가 목표라면 INACTIVE 정리가 깔끔.

### 무료 플랜 기타 주의
- 무료 프로젝트는 **7일 비활성 시 자동 일시정지** → 이전·검증 기간 동안 양쪽 모두 주기적 접속 유지.
- 무료는 일 백업만 제공(다운로드형). 이전 직전 **수동 덤프 1부**를 반드시 따로 보관.

---

## 3. 단계별 절차

### 0단계 — 사전 확인 (작업 시작 전)
- [x] 플랜 확인 → **무료** → 이전 경로 **B(CLI) 확정**
- [ ] **프로젝트 슬롯 확보**: 무료 2개 제한 → 미사용 `lpzmgbditsleafabxnhw`(INACTIVE) 삭제 여부 결정
- [ ] **유지보수 창(다운타임 시간대)** 합의 — 전환 중 짧은 쓰기 중단 발생
- [ ] **수동 덤프 1부** 사전 백업·보관 (무료는 자동 복원 경로 없음)
- [ ] 본격 운영(2026-04) 전인 **지금이 적기** (데이터 최소, 사용자 적음)

### 1단계 — 서울 리전 신규 프로젝트 생성
- [ ] 동일 조직(`redowtyuijqindnpbjcg`) 내 신규 프로젝트, 리전 = **Seoul (`ap-northeast-2`)**
- [ ] DB 비밀번호는 **새로 강력하게** 설정·안전 보관 (재사용 금지)
- [ ] 상태가 `ACTIVE_HEALTHY` 될 때까지 대기

### 2단계 — 스키마 구성
- [ ] `supabase/migrations/` 001~031 **순서대로** 새 프로젝트에 적용
  - CLI: `supabase link --project-ref <새-ref>` → `supabase db push`
  - 또는 Management API `apply_migration`로 파일별 적용
- [ ] 적용 후 `list_tables`로 17개 테이블·RLS 활성 여부 대조

### 3단계 — 데이터 이전
- **경로 A**: 대시보드 "Restore to another project"로 한 번에 (스키마+데이터+auth 포함)
- **경로 B (CLI)**:
  - [ ] 기존 프로젝트에서 `supabase db dump --data-only` (또는 `pg_dump --data-only --column-inserts`)
  - [ ] 외래키 의존 순서 유의: `writers`/`clients`/`price_items`/`company_accounts` → `works` → `work_authors` → `invoices` → `invoice_items` → `user_roles`
  - [ ] 새 프로젝트에 복원 후 **행 수 대조** (위 표와 일치 확인)
  - [ ] 시퀀스/식별자 정합성 확인

### 4단계 — Auth(사용자) 이전
- [ ] `auth.users` 이전 (백업에 포함되거나, OAuth라면 재로그인으로 재생성)
- [ ] `user_roles`·`writer_users`와 **user id 매핑 정합성** 확인 (역할 유지가 핵심)
- [ ] 도메인 제한 트리거(013 `restrict_signup_domain`) 정상 작동 확인

### 5단계 — Google OAuth 재설정 ⚠️ 수동 필수
> 공식 문서: *서드파티 auth의 Client ID/Secret은 새 대시보드에 수동 재입력 필요.*
- [ ] 새 프로젝트 대시보드 → Authentication → Providers → Google에 **Client ID/Secret 재입력**
- [ ] **Google Cloud Console** → 승인된 리디렉션 URI에 **새 프로젝트 콜백 URL** 추가
  `https://<새-ref>.supabase.co/auth/v1/callback`
- [ ] Auth URL Configuration의 Site URL·Redirect URLs 설정 (`NEXT_PUBLIC_SITE_URL` 기준)

### 6단계 — 애플리케이션 연결 정보 교체
- [ ] `.env.local` 3개 값 교체:
  - `NEXT_PUBLIC_SUPABASE_URL` → `https://<새-ref>.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → 새 anon key
  - `SUPABASE_SERVICE_ROLE_KEY` → 새 service role key
- [ ] **배포 환경(호스팅) ENV**도 동일하게 교체
- [ ] 코드 수정 불필요 — 전부 ENV 참조 (`client.ts`/`server.ts`/`proxy.ts`/`apiAuth.ts`)

### 7단계 — 검증
- [ ] `npm run dev`로 새 프로젝트 연결 후:
  - [ ] Google 로그인 → 역할(ADMIN/STAFF/WRITER) 정상 부여
  - [ ] 작가 마스터·거래처·저작물 DB·청구서 데이터 정상 표시 (행 수 일치)
  - [ ] 청구서/내부지급서/용역정산 흐름 동작
  - [ ] RLS 정책 동작 (역할별 접근 제어)
- [ ] `get_advisors`(security/performance)로 새 프로젝트 점검

### 8단계 — 전환 마무리
- [ ] 운영 트래픽을 새(서울) 프로젝트로 전환
- [ ] 안정화 기간(수일~1주) 후 기존(싱가포르) 프로젝트 일시정지 → 삭제
- [ ] 기존 프로젝트 최종 백업 1부 보관 후 정리

---

## 4. 리스크 / 주의

| 리스크 | 대응 |
|--------|------|
| 전환 중 다운타임 | 데이터 적은 지금 + 저트래픽 시간대 작업으로 최소화 |
| OAuth 재설정 누락 → 로그인 불가 | 5단계 체크리스트 + Google Console 리디렉션 URI 확인 |
| 비가역 작업(신규 생성·삭제) | 기존 프로젝트는 **검증 완료까지 삭제 금지**, 최종 백업 후 정리 |
| `auth.users` ↔ `user_roles` 매핑 깨짐 | 4단계에서 id 매핑 대조 필수 |
| 과금 | 전환 기간 동안 **2개 프로젝트 동시 과금** 잠시 발생 |

> **참고**: Supabase 서울 리전도 **AWS 서울(`ap-northeast-2`)** 위에서 동작. "국내 물리 서버 보관"이 규정상 핵심이라면 이 점을 별도 확인.

---

## 5. 다음 액션
1. **0단계 사전 확인** (플랜·백업 설정) → 경로 A/B 결정
2. 유지보수 창 합의
3. 1단계부터 실행 (신규 생성·삭제는 비가역 → 단계마다 확인)

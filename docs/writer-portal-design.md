# 전속작가 포털 설계 문서 (Writer Portal Design)

> 상태: **설계 확정 · 구현 전** · 작성일 2026-06-17
> 목업: `mockups/writer-portal.html` (v2)

## 1. 개요 (Context)

전속/일반 작가가 **본인의 정산 내역·관리 저작물·계약 정보**를 직접 조회하는 포털.
별도 사이트가 아니라 **현재 ERP와 같은 Next.js 앱 안의 "역할(role) 기반 포털"** 로 구현한다.
로그인한 사용자의 역할이 작가면 staff/admin 화면 대신 포털만 노출하고, **RLS로 본인 데이터만** 보이게 한다.

### 확정 결정 (사용자 확인)
1. **위치**: 별도 사이트 ❌ → 같은 ERP 앱의 역할 기반 포털.
2. **로그인 수단**: **구글 로그인만**(staff/admin과 동일한 Supabase Google OAuth). 네이버 자체 로그인 미지원(추후 옵션).
3. **접근 허용**: 이메일이 `@prism-filter.com`(회사 도메인) **OR** DB 화이트리스트에 등록된 작가 이메일이면 통과.
4. **데이터 격리**: 작가는 **본인 데이터만**(RLS). 다른 작가 정산·저작물 노출 절대 금지.

---

## 2. 인증 — 화이트리스트 (Authentication)

현재 `src/lib/auth/domain.ts`의 `isAllowedEmail()`은 `@prism-filter.com`만 허용한다.
이를 **회사 도메인 OR 등록된 작가 이메일**로 완화한다.

### 데이터 모델
기존 `writers` 테이블(011, 작가 마스터)에 **로그인 이메일 컬럼**을 추가해 화이트리스트 겸 매핑으로 사용한다.
```sql
ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,         -- 작가가 구글로 로그인하는 이메일(화이트리스트)
  ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_writers_email ON public.writers(lower(email));
```
- `email` = 작가가 **구글로 로그인하는** 그 이메일(지메일 또는 구글에 등록된 메일). 관리자가 작가 마스터에서 입력.
- `portal_enabled` = 포털 접근 on/off(계약 종료 시 차단).

### 흐름
1. 작가가 ERP 주소 접속 → **구글 로그인**.
2. OAuth 콜백(`src/app/api/auth/callback/route.ts`) / 프록시(`src/proxy.ts`)에서 검증:
   - `isAllowedEmail(email)` (회사 도메인) **OR** `writers`에 `email` 일치 & `portal_enabled` → **허용**.
   - 둘 다 아니면 `/auth-code-error`로 차단(기존 도메인 차단과 동일 UX).
3. 최초 로그인 시 `user_roles` upsert: 화이트리스트 작가면 `role = EXCLUSIVE_WRITER`(또는 GENERAL), `name = writers.name`.

### 변경 파일
- `src/lib/auth/domain.ts`: `isAllowedEmail`은 그대로 두고, **비동기 화이트리스트 검사**(`isWhitelistedWriterEmail(email)`)를 별도 추가(서버에서 Supabase 조회). 순수 함수는 도메인용으로 유지.
- `src/proxy.ts`: 미인증 차단 직전, 인증 사용자 이메일이 `회사도메인 OR 화이트리스트`인지 확인. (Edge에서 Supabase 조회 — 이미 `getUser()` 호출 중이라 클라이언트 존재. 캐시/최소 쿼리로.)
- `src/app/api/auth/callback/route.ts`: 콜백 시 화이트리스트면 `user_roles`에 작가 역할/이름 upsert.

---

## 3. 인가 — RLS로 본인 데이터만 (Authorization)

매핑 체인: **auth 사용자 → `user_roles.name`(작가명) → `music_works.writer_name` / `*_settlements.writer_name` 필터**.
`user_roles`에는 이미 `name` 컬럼이 있다(003). 작가 로그인 시 `name = writers.name`으로 채운다.

### RLS 정책 (마이그레이션 신규)
작가 역할에게 **SELECT-only, 본인 writer_name 한정** 정책을 추가한다. (기존 staff_all_* 정책은 ADMIN/STAFF 유지.)
```sql
-- 저작물: 작가는 자기 곡만 조회
CREATE POLICY writer_select_own_works ON public.music_works FOR SELECT
  USING (
    writer_name = (SELECT name FROM public.user_roles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role IN ('EXCLUSIVE_WRITER','GENERAL_WRITER'))
  );
-- 용역 정산: 자기 정산만 조회 (저작권료 정산도 동일 패턴)
CREATE POLICY writer_select_own_service_settlements ON public.service_settlements FOR SELECT
  USING (
    writer_name = (SELECT name FROM public.user_roles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role IN ('EXCLUSIVE_WRITER','GENERAL_WRITER'))
  );
```
> 핵심: 작가는 **INSERT/UPDATE/DELETE 불가**(SELECT 정책만). 쓰기는 staff/admin 전용 유지.

### API 보안 원칙
- 작가용 엔드포인트는 **service-role `adminClient`(RLS 우회) 금지**. 사용자 세션 클라이언트(RLS 적용) 또는 **인증된 작가 이름으로 명시 필터**.
- `src/lib/auth/apiAuth.ts`에 `requireWriter()` 추가: 역할이 작가인지 확인 + 본인 `writer_name` 반환. 기존 `requireStaff()`는 작가 접근을 이미 403 차단(이중 방어).

---

## 4. 라우팅 · 역할별 UI (Routing & Role-based UI)

### 진입 분기
- 로그인 후 홈(`/`) 또는 레이아웃에서 역할 분기: 작가 → `/writer-portal`로 라우팅, staff/admin → 기존 대시보드.
- 작가의 staff/admin 라우트 접근 차단: `proxy.ts`에서 작가가 `/admin/*`·`/staff`·`/invoices` 등 접근 시 `/writer-portal`로 리다이렉트(+ API는 `requireStaff`가 이미 차단).

### 사이드바
- `src/components/layout/AppSidebar.tsx`의 `NAV_ITEMS`에 **작가 전용 섹션** 추가(`writerOnly` 플래그) 또는 역할별 NAV 분리. 작가는 staffOnly/adminOnly 항목 전부 숨김.
- 작가 메뉴: **작가 포털 / 내 정산서 / 내 저작물 / 내 정보**.

---

## 5. 포털 화면 (Pages) — 목업 v2 기준

| 경로 | 화면 | 내용 |
|---|---|---|
| `/writer-portal` | 대시보드 | 환영 배너, KPI(이번 분기·누적 정산액·관리 저작물·다음 정산), 분기별 정산 현황, 최근 정산 내역, 전속계약 정보, 내 저작물 미리보기 |
| `/writer-portal/settlements` | 내 정산서 | 본인 정산 목록(저작권료·용역) + 상태 + **정산서 PDF 다운로드**(완료건) |
| `/writer-portal/works` | 내 저작물 | 본인 영구 저작물 전체(곡명·아티스트·KOMCA·지분·요율·재계약일) |
| `/writer-portal/profile` | 내 정보 | 이름·이메일·계약 정보 표시(수정은 제한/문의 안내) |

기존 `src/app/(dashboard)/writer-portal/page.tsx`(플레이스홀더)를 대시보드로 대체, 하위 라우트 신설.

### 작가용 API (본인 데이터)
- `GET /api/me/works` — `requireWriter()` → 본인 `writer_name`의 `music_works`.
- `GET /api/me/settlements` — 본인 용역/저작권료 정산.
- `GET /api/me/summary` — KPI·분기 집계.
- (PDF는 기존 정산서 생성 로직 재사용, 본인 것만.)

---

## 6. 보안 체크리스트 (Security)

- [ ] 화이트리스트(회사 도메인 OR 등록 이메일)로만 입장 — `proxy.ts` + 콜백 양쪽 검증.
- [ ] 작가 RLS: **SELECT-only + 본인 writer_name 한정**. 쓰기 정책 없음.
- [ ] 작가용 API는 **adminClient(RLS 우회) 사용 금지**, 인증된 본인 이름으로만 필터.
- [ ] 작가의 staff/admin 페이지·API 접근 차단(리다이렉트 + `requireStaff` 403).
- [ ] `portal_enabled=false`(계약 종료) 작가 즉시 차단.
- [ ] 이메일 매칭은 `lower()` 비교(대소문자 무시), `email` UNIQUE로 중복 계정 방지.

---

## 7. 구현 단계 (Phases)

- **1차 (MVP)**: writers.email/portal_enabled 마이그레이션 + 화이트리스트 인증 완화 + 역할 라우팅·사이드바 + 작가 RLS(SELECT) + 포털 대시보드 + 내 저작물/내 정산서(조회).
- **2차**: 정산서 PDF 다운로드, 내 정보 화면, 알림/공지, 분기 차트 정교화.
- **범위 외(미정)**: 네이버 OAuth, 작가 셀프 정보수정, 일반작가 저작물 DB(별도 설계).

---

## 8. 미해결/확인 필요
- 정산서 PDF: 작가 본인 다운로드 허용 시점(지급 완료건만? 진행중 비공개?).
- `user_roles.name` ↔ `writers.name` 동기화 정책(작가명 변경 시).
- 동명이인 작가 가능성 → 매핑은 `email` 기준이 안전(현재 데이터는 동명이인 없음).

## 참조 코드
- 인증: `src/lib/auth/domain.ts`, `src/proxy.ts`, `src/app/api/auth/callback/route.ts`, `src/lib/auth/apiAuth.ts`
- 역할/사이드바: `src/components/layout/AppSidebar.tsx`, `src/store/authStore.ts`, `src/hooks/useAuth.ts`
- 데이터: `writers`(011), `music_works`(016), `service_settlements`(014), `user_roles`(003~005)
- 기존 포털: `src/app/(dashboard)/writer-portal/page.tsx`
- 목업: `mockups/writer-portal.html`

# Context7을 활용한 프롬프트 템플릿

이 파일은 최신 기술 스택을 적용하여 높은 품질의 코드를 생성하는 프롬프트 템플릿을 제공합니다.

---

## 📋 기본 템플릿

### 1️⃣ 새로운 페이지/컴포넌트 개발

```
[원래 요청사항]

기술 스택:
- Next.js 16 App Router (src/app/(dashboard)/)
- React 19 Server Components
- TypeScript 엄격 모드
- Tailwind CSS v4 (CSS-first)
- shadcn/ui 컴포넌트

스타일: bg-[var(--color-*)] CSS 변수 사용
상태관리: Zustand + useAuth 훅
폼 검증: React Hook Form + Zod

context7을 사용해줘
```

### 2️⃣ 기존 코드 버그 수정

```
파일: src/components/layout/AppSidebar.tsx
현재 문제: [설명]

최신 Next.js 16, React 19 패턴으로 수정해줘.
TypeScript 엄격 모드 준수.
Supabase Auth 최신 API 사용.

context7을 사용해줘
```

### 3️⃣ API/라우트 핸들러 작성

```
요청: [기능 설명]

Supabase RLS 정책 준수
최신 Next.js Server Actions 패턴
TypeScript 타입 안정성
에러 처리 포함

context7을 사용해줘
```

### 4️⃣ UI 스타일링

```
컴포넌트: [컴포넌트명]
요구사항: [설명]

Tailwind CSS v4 CSS-first 방식
다크/라이트/classic-dark 테마 지원
색상: var(--color-primary), var(--color-card) 등
반응형 디자인 (md: 브레이크포인트)

context7을 사용해줘
```

### 5️⃣ 성능 최적화

```
파일/기능: [대상]
성능 문제: [설명]

최신 React 19 성능 최적화 패턴
Next.js 최신 자동 최적화 활용
메모이제이션 (useCallback, useMemo)
불필요한 리렌더링 제거

context7을 사용해줘
```

---

## 🎯 고급 사용법

### 특정 라이브러리만 참고
```
[프롬프트]

특히 Supabase 최신 Auth API를 참고해줘

context7을 사용해줘
```

### 마이그레이션
```
현재: [구식 코드/패턴]
목표: [새 코드/패턴]

Next.js 16 App Router 최신 패턴으로 마이그레이션
React 19 최신 Hooks API 활용

context7을 사용해줘
```

### 모범 사례 학습
```
다음 기능을 구현하되, 각 라이브러리의 공식 모범 사례를 따라주세요:

[기능 설명]

context7을 사용해줘
```

---

## ✅ Context7 활성화 체크리스트

프롬프트를 작성할 때 다음을 확인하세요:

- [ ] 프롬프트 **마지막에 "context7을 사용해줘" 추가**
- [ ] 타겟 파일/컴포넌트 명시
- [ ] 사용할 기술 스택 언급
- [ ] 제약사항/요구사항 명확히 기술
- [ ] 예상 결과물 설명

---

## 📚 프로젝트 기술 스택 (Context7이 참고할 내용)

| 영역 | 기술 | 버전 | 문서 |
|------|------|------|------|
| **Framework** | Next.js | 16.2.7 | https://nextjs.org/docs |
| | React | 19.2.4 | https://react.dev |
| | TypeScript | 5.0+ | https://www.typescriptlang.org/docs |
| **Styling** | Tailwind CSS | 4.0 | https://tailwindcss.com/docs |
| | shadcn/ui | 4.10.0 | https://ui.shadcn.com |
| **State** | Zustand | 5.0.14 | https://docs.pmnd.rs/zustand |
| **Forms** | React Hook Form | 7.78.0 | https://react-hook-form.com |
| | Zod | 4.4.3 | https://zod.dev |
| **Backend** | Supabase | latest | https://supabase.com/docs |
| **Icons** | Lucide React | 1.17.0 | https://lucide.dev |
| **Auth** | next-themes | 0.4.6 | https://github.com/pacocoursey/next-themes |
| **Misc** | @anthropic-ai/sdk | 0.102.0 | https://sdk.anthropic.com |
| | xlsx | 0.18.5 | https://github.com/SheetJS/sheetjs |

---

**팁:** Context7 사용 시 Claude가 더 정확하고 최신화된 코드를 생성하므로, 복잡한 기능이나 새 라이브러리 사용 시 반드시 포함하세요!

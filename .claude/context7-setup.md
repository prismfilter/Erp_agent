# Context7 MCP 서버 설정 완료 ✅

**설치 일시:** 2026년 06월 09일  
**API 키:** `ctx7sk-daa1b2e7-63ed-4583-95c3-82da85060062`

---

## 📋 설치 상태

### ✅ 설치된 구성 요소

| 구성 요소 | 위치 | 상태 |
|----------|------|------|
| **MCP 서버** | Claude Code 내장 | ✅ 활성화 |
| **Rule** | `C:\Users\USER\.claude\rules\context7.md` | ✅ 설치됨 |
| **Skill** | `C:\Users\USER\.claude\skills\context7-mcp\` | ✅ 설치됨 |
| **프로젝트 설정** | `.claude/mcp.json` | ✅ 구성됨 |
| **API 키** | `.env.local` | ✅ 저장됨 |

---

## 🚀 사용 방법

### 방법 1️⃣: 프롬프트 끝에 "context7을 사용해줘" 추가

```
[원래 요청사항]

context7을 사용해줘
```

### 방법 2️⃣: 자동 활성화 (Rule 자동 적용)

Context7 Rule이 자동으로 다음 경우에 활성화됩니다:
- 라이브러리 / 프레임워크 질문
- API 문서 / 사용법 질문
- 설정 / 버전 마이그레이션 질문
- SDK / CLI 도구 사용법 질문

### 방법 3️⃣: Skill 직접 호출

```
/context7-mcp 라이브러리 이름과 질문
```

---

## 📚 지원하는 라이브러리 (자동 검색)

### 프로젝트 기술 스택
✅ **Next.js** 16.2+ (최신 App Router)  
✅ **React** 19.2+ (최신 Hooks API)  
✅ **TypeScript** 5.0+  
✅ **Tailwind CSS** v4 (CSS-first)  
✅ **Supabase** (Auth, RLS, Realtime)  
✅ **React Hook Form** 7.78+  
✅ **Zod** 4.4+  
✅ **shadcn/ui** 4.10+  
✅ **Zustand** 5.0+  
✅ **Lucide React** 1.17+  

### 추가 지원 라이브러리
- Express, Django, Flask, Spring Boot
- Vue.js, Svelte, Remix, Astro
- Prisma, SQLAlchemy, Sequelize
- PostgreSQL, MongoDB, Firebase
- Docker, Kubernetes, AWS, GCP, Azure
- 그 외 모든 인기 라이브러리

---

## 💡 예시 프롬프트

### 예시 1️⃣: Next.js 최신 패턴
```
서버 컴포넌트와 클라이언트 컴포넌트 분리를 사용한 
새로운 대시보드 페이지를 만들어줘.

context7을 사용해줘
```

### 예시 2️⃣: Supabase 최신 API
```
Supabase의 최신 RLS 정책으로 사용자별 데이터 접근 제어를
구현해줘.

context7을 사용해줘
```

### 예시 3️⃣: Tailwind v4 CSS-first
```
Tailwind CSS v4 CSS-first 방식으로 반응형 카드 컴포넌트를
만들어줘.

context7을 사용해줘
```

### 예시 4️⃣: 자동 활성화 (Rule)
```
React 19의 useCallback과 useTransition을 
사용한 성능 최적화 패턴을 알려줘
```
→ 자동으로 Context7이 최신 문서를 가져옵니다!

---

## 🔧 구성 파일

### `.env.local`
```bash
CONTEXT7_API_KEY=ctx7sk-daa1b2e7-63ed-4583-95c3-82da85060062
```

### `.claude/mcp.json`
```json
{
  "mcpServers": {
    "context7": {
      "env": {
        "CONTEXT7_API_KEY": "ctx7sk-..."
      }
    }
  }
}
```

### `.claude/rules/context7.md`
자동으로 다음을 감지하면 Context7을 호출:
- 라이브러리 / 프레임워크 이름
- API 문서 / 설정 관련 질문
- 버전 마이그레이션 / 업그레이드

---

## 🎯 이점

| 이점 | 설명 |
|------|------|
| **최신 API** | Deprecated된 코드 자동 방지 |
| **최신 패턴** | 현재 모범 사례 기반 코드 생성 |
| **타입 안정성** | 최신 TypeScript 정의 반영 |
| **성능 개선** | 최신 성능 권장사항 적용 |
| **보안 강화** | 최신 보안 패턴 자동 적용 |
| **학습 데이터 극복** | 과거 지식 문제 완전 해결 |

---

## ❓ 자주 묻는 질문

### Q1: Context7이 자동으로 활성화되나요?
**A:** 네! Rule이 자동으로 라이브러리 관련 질문을 감지하면 Context7을 호출합니다.

### Q2: 수동으로 활성화하려면?
**A:** 프롬프트 끝에 "context7을 사용해줘"라고 추가하면 됩니다.

### Q3: API 키는 어디에 저장되나요?
**A:** `.env.local` 파일과 Claude Code 자동 설정에 저장되어 있습니다.

### Q4: 오프라인에서도 작동하나요?
**A:** 아니요. Context7은 온라인 문서 서버에서 실시간으로 데이터를 가져옵니다.

### Q5: 비용이 드나요?
**A:** Context7 계정에 따라 다릅니다. API 키 기반 사용량 계산.

---

## 📞 지원

- **Context7 문서:** https://context7.com/docs
- **API 레퍼런스:** https://context7.com/api
- **설정 문제:** `npx ctx7@latest setup --help`

---

**이제 최신 기술 기반의 최고 품질 코드를 생성할 준비가 완료되었습니다!** 🚀

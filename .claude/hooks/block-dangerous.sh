#!/bin/bash
# 위험 명령 차단 — 운영 DB 초기화·강제 푸시·소스 삭제 등 복구 불가능한 명령 차단

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$CMD" ]; then
  exit 0
fi

# 운영 DB 초기화 (모든 데이터 소실)
if echo "$CMD" | grep -qE 'supabase\s+db\s+reset'; then
  echo "차단: 'supabase db reset'은 DB의 모든 데이터를 삭제합니다. 정말 필요하면 사용자가 직접 실행하세요." >&2
  exit 2
fi

# git 강제 푸시 (원격 이력 덮어쓰기)
if echo "$CMD" | grep -qE 'git\s+push\s+.*(--force|-f)\b'; then
  echo "차단: git 강제 푸시는 원격 커밋 이력을 덮어씁니다. 필요하면 사용자가 직접 실행하세요." >&2
  exit 2
fi

# 소스/마이그레이션 폴더 삭제
if echo "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+.*(src|supabase/migrations)'; then
  echo "차단: 소스 코드 또는 마이그레이션 폴더 삭제는 허용되지 않습니다." >&2
  exit 2
fi

# git hard reset (작업 내용 소실)
if echo "$CMD" | grep -qE 'git\s+reset\s+--hard'; then
  echo "차단: 'git reset --hard'는 커밋되지 않은 작업을 모두 날립니다. 필요하면 사용자가 직접 실행하세요." >&2
  exit 2
fi

exit 0

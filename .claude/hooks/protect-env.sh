#!/bin/bash
# .env.local 보호 — Supabase 키·API 키가 담긴 파일의 수정/덮어쓰기 차단

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE" == *".env.local"* ]] || [[ "$FILE" == *".env.production"* ]]; then
  echo "차단: $FILE 은 민감한 키가 포함된 파일로 직접 수정할 수 없습니다. 변경이 필요하면 사용자가 직접 수정하세요." >&2
  exit 2
fi

exit 0

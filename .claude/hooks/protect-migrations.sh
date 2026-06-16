#!/bin/bash
# 마이그레이션 보호 — 이미 DB에 적용된 기존 마이그레이션 파일 수정 차단 (신규 파일 생성은 허용)

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE" == *"supabase/migrations/"* ]] || [[ "$FILE" == *"supabase\\migrations\\"* ]]; then
  # 파일이 이미 존재하면 = 적용된 마이그레이션 수정 시도 → 차단
  if [ -f "$FILE" ]; then
    echo "차단: 이미 적용된 마이그레이션($FILE)은 수정할 수 없습니다. 새 번호의 마이그레이션 파일을 생성하세요 (예: 007_xxx.sql)." >&2
    exit 2
  fi
fi

exit 0

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    // 순수 함수 단위 테스트 — DOM 불필요
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    // tsconfig의 '@/*' → 'src/*' 경로 별칭 재현
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

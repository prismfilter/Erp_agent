/**
 * Tailwind v4가 내부적으로 생성하는 와일드카드 패턴 제거 플러그인
 *
 * 원인: @tailwindcss/postcss가 CSS variable shorthand 기능을 위해
 *       .bg-[var(--color-*)] 같은 와일드카드 규칙을 자동 생성함
 *       → var(--color-*) 는 유효하지 않은 CSS → Turbopack 파서 실패
 *
 * 해결: Tailwind가 생성한 후 Turbopack에 전달되기 전에 해당 규칙을 제거
 */
/**
 * ⚠️ 버그 수정: 이전 버전에서 decl.value.includes('*') 조건이
 *    calc(var(--spacing) * 4) 같은 정상적인 CSS 수식의 곱하기 연산자(*)도
 *    제거하여 w-4, px-4, gap-2 같은 숫자 간격 유틸리티가 모두 사라지는 문제 발생
 *
 * 수정: var(--xxx-*) 패턴 (CSS 변수 와일드카드)만 정확히 제거
 *       calc() 안의 * 연산자는 건드리지 않음
 */
const removeTailwindColorWildcards = {
  postcssPlugin: 'remove-tailwind-color-wildcards',
  Once(root) {
    root.walkRules((rule) => {
      let hasWildcard = false;
      rule.walkDecls((decl) => {
        // var(--xxx-*) 패턴만 제거 (CSS 변수 이름의 와일드카드)
        // calc() 안의 곱하기 * 연산자와 구분
        if (decl.value && /var\(--[a-z-]+-\*\)/.test(decl.value)) {
          hasWildcard = true;
        }
      });
      if (hasWildcard) {
        rule.remove();
      }
    });
  },
};

export default {
  plugins: [
    '@tailwindcss/postcss',
    removeTailwindColorWildcards,
  ],
};

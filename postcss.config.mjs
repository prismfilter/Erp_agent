/**
 * Tailwind v4가 내부적으로 생성하는 와일드카드 패턴 제거 플러그인
 *
 * 원인: @tailwindcss/postcss가 CSS variable shorthand 기능을 위해
 *       .bg-[var(--color-*)] 같은 와일드카드 규칙을 자동 생성함
 *       → var(--color-*) 는 유효하지 않은 CSS → Turbopack 파서 실패
 *
 * 해결: Tailwind가 생성한 후 Turbopack에 전달되기 전에 해당 규칙을 제거
 */
const removeTailwindColorWildcards = {
  postcssPlugin: 'remove-tailwind-color-wildcards',
  Once(root) {
    root.walkRules((rule) => {
      let hasWildcard = false;
      rule.walkDecls((decl) => {
        if (decl.value && decl.value.includes('*')) {
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

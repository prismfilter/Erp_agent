-- ============================================================================
-- 가입 도메인 제한 훅 (013_restrict_signup_domain.sql)
-- 회사 계정(@prism-filter.com)이 아닌 이메일의 "계정 생성" 자체를 차단한다.
-- (앱단 콜백/미들웨어/API 도메인 검증에 더한 provider-level 방어선)
--
-- ★ 활성화 필요: Supabase 대시보드 → Authentication → Hooks →
--   "Before User Created" 훅으로 아래 함수(hook_restrict_signup_by_email_domain) 지정.
--   지정 전까지는 정의만 되어 있고 동작하지 않는다(앱단 검증이 실제 차단 담당).
-- ============================================================================

create or replace function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  email text;
  domain text;
begin
  email := event->'user'->>'email';
  domain := lower(split_part(coalesce(email, ''), '@', 2));

  if domain = 'prism-filter.com' then
    return '{}'::jsonb; -- 허용
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', '회사 계정(@prism-filter.com)만 가입할 수 있습니다.',
      'http_code', 403
    )
  );
end;
$$;

-- 훅 실행 주체(supabase_auth_admin)에만 실행 권한 부여, 나머지는 회수
grant execute on function public.hook_restrict_signup_by_email_domain to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_email_domain from authenticated, anon, public;

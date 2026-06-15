// 작가 목록 → 구성원(/staff) 통합. 기존 경로는 구성원으로 리다이렉트.

import { redirect } from 'next/navigation';

export default function WritersPage() {
  redirect('/staff');
}

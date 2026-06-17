// 저작물 DB 인덱스 — 하위 메뉴(영구/일반)로 분리됨.
// 기존 /admin/works 북마크·링크 보존을 위해 기본값(영구 저작물 DB)으로 리다이렉트한다.

import { redirect } from 'next/navigation';

export default function WorksIndexPage() {
  redirect('/admin/works/permanent');
}

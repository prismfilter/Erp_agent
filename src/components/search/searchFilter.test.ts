import { describe, it, expect } from 'vitest';
import { matchesQuery, filterAndCap, SCOPE_SOURCES, type ScopeItem } from './searchFilter';

describe('matchesQuery', () => {
  it('빈 query는 항상 매칭', () => {
    expect(matchesQuery('박서준 일반작가', '')).toBe(true);
    expect(matchesQuery('박서준 일반작가', '   ')).toBe(true);
  });
  it('대소문자 무시 부분일치', () => {
    expect(matchesQuery('PRISM Filter', 'prism')).toBe(true);
  });
  it('여러 토큰을 모두 포함해야 매칭', () => {
    expect(matchesQuery('박서준 일반작가', '박서준 일반')).toBe(true);
    expect(matchesQuery('박서준 일반작가', '박서준 전속')).toBe(false);
  });
});

describe('filterAndCap', () => {
  const items: ScopeItem[] = Array.from({ length: 100 }, (_, i) => ({
    id: String(i), primary: `작가${i}`, href: `/x?focus=${i}`, searchText: `작가${i}`,
  }));
  it('상한 개수로 자른다', () => {
    expect(filterAndCap(items, '작가', 50)).toHaveLength(50);
  });
  it('매칭이 없으면 빈 배열', () => {
    expect(filterAndCap(items, 'zzz', 50)).toHaveLength(0);
  });
});

describe('SCOPE_SOURCES href에 포커스 파라미터 포함', () => {
  it('writers → ?focus=id', () => {
    const items = SCOPE_SOURCES.writers!.toItems([
      { id: 'w1', name: '박서준', writer_type: '일반작가' },
    ]);
    expect(items[0].href).toBe('/admin/writers?focus=w1');
    expect(items[0].primary).toBe('박서준');
  });
  it('permWorks → ?writer=&focus=', () => {
    const items = SCOPE_SOURCES.permWorks!.toItems([
      { id: 'k1', no: 1, writer_name: '김용후', song_title: 'X', komca_code: null, artist: null },
    ]);
    expect(items[0].href).toBe(`/admin/works/permanent?writer=${encodeURIComponent('김용후')}&focus=k1`);
  });
  it('service(상세 이동)는 focus 없이 상세 경로', () => {
    const items = SCOPE_SOURCES.service!.toItems([
      { id: 's1', writer_name: '이교창', period_start: '2026-06-01', period_end: '2026-06-30', total_amount: 1000 },
    ]);
    expect(items[0].href).toBe('/settlement/service/s1');
  });
});

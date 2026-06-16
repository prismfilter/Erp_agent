'use client';

// 전역 검색 커맨드 팔레트 — 헤더 검색바 클릭(또는 Cmd/Ctrl+K)으로 가운데 팝업.
// 인보이스(거래처 청구서·내부 지급서)·정산(용역 정산)·관리(작가·구성원) 실데이터를 검색해 이동.
// cmdk가 입력값으로 자동 필터링/정렬/키보드 내비게이션을 처리한다.

import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Wallet, Briefcase, PenSquare, Users, Music } from 'lucide-react';
import { formatWon } from '@/lib/settlement/calculator';

interface InvoiceLite {
  id: string;
  title: string;
  client?: { name?: string | null } | null;
}
interface SettlementLite {
  id: string;
  writer_name: string;
  period_start: string;
  period_end: string;
  total_amount: number;
}
interface WriterLite {
  id: string;
  name: string;
  writer_type: string;
}
interface MemberLite {
  user_id: string;
  name: string | null;
  role: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function safeFetch<T>(url: string, key: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json[key] as T[]) ?? [];
  } catch {
    return [];
  }
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceLite[]>([]);
  const [settlements, setSettlements] = useState<SettlementLite[]>([]);
  const [writers, setWriters] = useState<WriterLite[]>([]);
  const [members, setMembers] = useState<MemberLite[]>([]);

  // 열릴 때 1회 데이터 로드 (소량 데이터셋 → 클라이언트 필터)
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      const [inv, set, wr, mem] = await Promise.all([
        safeFetch<InvoiceLite>('/api/invoices', 'invoices'),
        safeFetch<SettlementLite>('/api/settlements/service', 'settlements'),
        safeFetch<WriterLite>('/api/writers', 'writers'),
        safeFetch<MemberLite>('/api/admin/users', 'users'),
      ]);
      setInvoices(inv);
      setSettlements(set);
      setWriters(wr);
      setMembers(mem);
      setLoaded(true);
    })();
  }, [open, loaded]);

  // 열림 상태 변경 — 닫힐 때 검색어 초기화 (effect 아님 → setState-in-effect 회피)
  const handleOpenChange = (next: boolean) => {
    if (!next) setSearch('');
    onOpenChange(next);
  };

  const go = (path: string) => {
    handleOpenChange(false);
    router.push(path);
  };

  const hasQuery = search.trim().length > 0;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="전체 검색"
      shouldFilter
    >
      <div className="flex items-center gap-2 px-4 border-b border-border">
        <span className="text-primary text-lg">⚡</span>
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="검색어 입력"
        />
      </div>

      <Command.List>
        <Command.Empty>검색 결과가 없습니다.</Command.Empty>

        {/* 빠른 액션 — 섹션 바로가기 */}
        <Command.Group heading="빠른 액션">
          <Command.Item value="거래처 청구서 invoices" onSelect={() => go('/invoices')}>
            <FileText className="h-4 w-4 opacity-70" /> 거래처 청구서
          </Command.Item>
          <Command.Item value="내부 지급서 payouts" onSelect={() => go('/payouts')}>
            <Wallet className="h-4 w-4 opacity-70" /> 내부 지급서
          </Command.Item>
          <Command.Item value="저작권료 정산 royalty" onSelect={() => go('/settlement/royalty')}>
            <Music className="h-4 w-4 opacity-70" /> 저작권료 정산
          </Command.Item>
          <Command.Item value="용역 정산 service" onSelect={() => go('/settlement/service')}>
            <Briefcase className="h-4 w-4 opacity-70" /> 용역 정산
          </Command.Item>
          <Command.Item value="작가 마스터 writers" onSelect={() => go('/admin/writers')}>
            <PenSquare className="h-4 w-4 opacity-70" /> 작가 마스터
          </Command.Item>
          <Command.Item value="구성원 staff" onSelect={() => go('/staff')}>
            <Users className="h-4 w-4 opacity-70" /> 구성원
          </Command.Item>
        </Command.Group>

        {/* 실데이터 검색 결과 — 검색어 입력 시에만 노출 */}
        {hasQuery && (
          <>
            <Command.Group heading="거래처 청구서">
              {invoices.map((i) => (
                <Command.Item
                  key={`inv-${i.id}`}
                  value={`청구서 ${i.title} ${i.client?.name ?? ''}`}
                  onSelect={() => go(`/invoices/${i.id}`)}
                >
                  <FileText className="h-4 w-4 opacity-70" />
                  <span className="flex-1 truncate">{i.title}</span>
                  {i.client?.name && (
                    <span className="text-xs text-muted-foreground">{i.client.name}</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="내부 지급서">
              {invoices.map((i) => (
                <Command.Item
                  key={`pay-${i.id}`}
                  value={`내부지급서 ${i.title} ${i.client?.name ?? ''}`}
                  onSelect={() => go(`/invoices/${i.id}?tab=internal`)}
                >
                  <Wallet className="h-4 w-4 opacity-70" />
                  <span className="flex-1 truncate">{i.title}</span>
                  {i.client?.name && (
                    <span className="text-xs text-muted-foreground">{i.client.name}</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="용역 정산">
              {settlements.map((s) => (
                <Command.Item
                  key={`set-${s.id}`}
                  value={`용역정산 ${s.writer_name}`}
                  onSelect={() => go(`/settlement/service/${s.id}`)}
                >
                  <Briefcase className="h-4 w-4 opacity-70" />
                  <span className="flex-1 truncate">{s.writer_name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {s.period_start}~{s.period_end} · {formatWon(s.total_amount)}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="작가">
              {writers.map((w) => (
                <Command.Item
                  key={`wr-${w.id}`}
                  value={`작가 ${w.name}`}
                  onSelect={() => go('/admin/writers')}
                >
                  <PenSquare className="h-4 w-4 opacity-70" />
                  <span className="flex-1 truncate">{w.name}</span>
                  <span className="text-xs text-muted-foreground">{w.writer_type}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="구성원">
              {members.map((m) => (
                <Command.Item
                  key={`mem-${m.user_id}`}
                  value={`구성원 ${m.name ?? ''}`}
                  onSelect={() => go('/staff')}
                >
                  <Users className="h-4 w-4 opacity-70" />
                  <span className="flex-1 truncate">{m.name || '(이름 없음)'}</span>
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

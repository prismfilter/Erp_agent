'use client';

// 거래처 상세 페이지 — 탭(기본정보·담당정보·은행정보·프로젝트).
// 조회: ADMIN/STAFF · 수정: ADMIN only(EditableField 내부에서 editable로 제어).

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';
import type { Client } from '@/types/invoice';
import { EditableField } from '@/components/clients/EditableField';
import { ClientProjectsTab } from '@/components/clients/ClientProjectsTab';

type TabKey = 'basic' | 'manager' | 'bank' | 'projects';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본정보' },
  { key: 'manager', label: '담당정보' },
  { key: 'bank', label: '은행정보' },
  { key: 'projects', label: '프로젝트' },
];

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('basic');

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '거래처를 불러올 수 없습니다.');
      setClient(data.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchClient(); }, [fetchClient]);

  // 브레드크럼에 거래처명 표시 (언마운트 시 해제 → 경로 기반 라벨로 복귀)
  const setBreadcrumb = useBreadcrumbStore((s) => s.setOverride);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clear);
  useEffect(() => {
    if (client?.name) setBreadcrumb(client.name);
    return () => clearBreadcrumb();
  }, [client?.name, setBreadcrumb, clearBreadcrumb]);

  // 단일 필드 저장 성공 시 로컬 상태 갱신
  const handleSaved = useCallback((field: string, value: string | null) => {
    setClient((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
      </div>
    );
  }
  if (error || !client) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/clients')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 거래처 DB
        </button>
        <div className="p-8 text-center"><p className="text-red-400">오류: {error ?? '거래처를 찾을 수 없습니다.'}</p></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 헤더: 뒤로가기 + 코드·거래처명 */}
      <div className="space-y-3">
        <button
          onClick={() => router.push('/admin/clients')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 거래처 DB
        </button>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{client.client_code}</span>
          <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
        </div>
      </div>

      {/* 탭 버튼 (가운데 정렬) */}
      <div className="flex items-center justify-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition cursor-pointer border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'basic' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 거래처 코드 — 읽기전용 */}
          <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted-foreground text-center">거래처 코드</span>
            <span className="text-sm text-center font-mono tabular-nums text-foreground">{client.client_code}</span>
          </div>
          <EditableField clientId={clientId} field="name" label="거래처명" value={client.name} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="representative" label="대표자" value={client.representative ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="business_number" label="사업자 등록번호" value={client.business_number ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="address" label="주소" value={client.address ?? null} editable={isAdmin} onSaved={handleSaved} />
          {/* 등록일 — 읽기전용 */}
          <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted-foreground text-center">등록일</span>
            <span className="text-sm text-center text-foreground">
              {client.created_at ? new Date(client.created_at).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
        </div>
      )}

      {tab === 'manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EditableField clientId={clientId} field="manager_name" label="담당자" value={client.manager_name ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="contact_phone" label="연락처" value={client.contact_phone ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="contact_email" label="이메일" value={client.contact_email ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="department_title" label="부서 / 직함" value={client.department_title ?? null} editable={isAdmin} onSaved={handleSaved} />
        </div>
      )}

      {tab === 'bank' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EditableField clientId={clientId} field="bank_name" label="은행명" value={client.bank_name ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="account_number" label="계좌번호" value={client.account_number ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="account_holder" label="예금주" value={client.account_holder ?? null} editable={isAdmin} onSaved={handleSaved} />
        </div>
      )}

      {tab === 'projects' && <ClientProjectsTab clientId={clientId} />}
    </div>
  );
}

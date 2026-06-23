'use client';

// 거래처 상세 페이지 — 한 페이지에 섹션(기본정보·담당정보·은행정보·프로젝트) 세로 나열.
// 조회: ADMIN/STAFF · 수정: ADMIN only(EditableField 내부에서 editable로 제어).

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';
import type { Client } from '@/types/invoice';
import { EditableField } from '@/components/clients/EditableField';
import { ClientProjectsTab } from '@/components/clients/ClientProjectsTab';

// 섹션 카드 = 색 채운 제목 바 + 항목/내용 2열 표(가시성·구분감). 라벨 열은 옅은 배경으로 구분.
function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-primary/10 border-b border-border px-4 py-3 text-base font-bold text-foreground text-center">
        {title}
      </div>
      {children}
    </section>
  );
}

// 섹션 카드 내부의 항목/내용 표 (제목 바 아래). DetailRow들을 자식으로 받는다.
function SectionTableBody({ children }: { children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border">{children}</tbody>
    </table>
  );
}

// 표 한 행: 항목(라벨) 셀 + 내용(값) 셀. 값 셀에는 읽기전용 텍스트 또는 EditableField가 들어간다.
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th
        scope="row"
        className="w-40 bg-primary/5 px-4 py-3 text-sm font-medium text-muted-foreground text-center align-middle"
      >
        {label}
      </th>
      <td className="px-4 py-3 text-center align-middle">{children}</td>
    </tr>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="max-w-3xl mx-auto pb-10">
      {/* 헤더: 뒤로가기 + 코드·거래처명 (하단 구분선으로 표 영역과 분리) */}
      <div className="space-y-3 pb-6 border-b border-border">
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

      {/* 섹션 나열 — 각 섹션은 색 채운 제목 바 + 표 카드. 헤더 구분선과 간격(mt-12), 섹션 간 간격(space-y-10) */}
      <div className="mt-12 space-y-10">
        {/* 기본정보 */}
        <SectionCard title="기본정보">
          <SectionTableBody>
            <DetailRow label="거래처 코드">
              <span className="font-mono tabular-nums text-foreground">{client.client_code}</span>
            </DetailRow>
            <DetailRow label="거래처명">
              <EditableField clientId={clientId} field="name" label="거래처명" value={client.name} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="대표자">
              <EditableField clientId={clientId} field="representative" label="대표자" value={client.representative ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="사업자 등록번호">
              <EditableField clientId={clientId} field="business_number" label="사업자 등록번호" value={client.business_number ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="주소">
              <EditableField clientId={clientId} field="address" label="주소" value={client.address ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="등록일">
              <span className="text-foreground">
                {client.created_at ? new Date(client.created_at).toLocaleDateString('ko-KR') : '-'}
              </span>
            </DetailRow>
          </SectionTableBody>
        </SectionCard>

        {/* 담당정보 */}
        <SectionCard title="담당정보">
          <SectionTableBody>
            <DetailRow label="담당자">
              <EditableField clientId={clientId} field="manager_name" label="담당자" value={client.manager_name ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="연락처">
              <EditableField clientId={clientId} field="contact_phone" label="연락처" value={client.contact_phone ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="이메일">
              <EditableField clientId={clientId} field="contact_email" label="이메일" value={client.contact_email ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="부서 / 직함">
              <EditableField clientId={clientId} field="department_title" label="부서 / 직함" value={client.department_title ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
          </SectionTableBody>
        </SectionCard>

        {/* 은행정보 */}
        <SectionCard title="은행정보">
          <SectionTableBody>
            <DetailRow label="은행명">
              <EditableField clientId={clientId} field="bank_name" label="은행명" value={client.bank_name ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="계좌번호">
              <EditableField clientId={clientId} field="account_number" label="계좌번호" value={client.account_number ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="예금주">
              <EditableField clientId={clientId} field="account_holder" label="예금주" value={client.account_holder ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
          </SectionTableBody>
        </SectionCard>

        {/* 프로젝트 — 제목 바 + 청구서 이력 표(자체 렌더) */}
        <SectionCard title="프로젝트">
          <ClientProjectsTab clientId={clientId} />
        </SectionCard>
      </div>
    </div>
  );
}

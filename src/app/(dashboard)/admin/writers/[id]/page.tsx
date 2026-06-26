'use client';

// 작가 상세 — 거래처 상세와 동일 양식. 섹션 카드(기본정보·저작물 요율·계약정보)를 세로 나열.
// 조회: ADMIN/STAFF · 수정: ADMIN only. 필드별 즉시 저장(PATCH /api/writers/[id]).

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';
import type { Writer } from '@/types/invoice';
import { EditableField } from '@/components/clients/EditableField';
import {
  WriterTypeSelect,
  NullableRateCell,
  FeeRateCell,
  DateCell,
  ContractStatusCell,
} from '@/components/writers/WriterTable';
import { PositionSelect } from '@/components/writers/PositionSelect';
import type { PositionCode } from '@/lib/writers/position';

// 섹션 카드 = 색 채운 제목 바 + 항목/내용 2열 표(거래처 상세와 동일).
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

// 표 한 행: 항목(라벨) 셀 + 내용(값) 셀.
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

export default function WriterDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [writer, setWriter] = useState<Writer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWriter = useCallback(async () => {
    try {
      const res = await fetch(`/api/writers/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '작가를 불러올 수 없습니다.');
      setWriter(data.writer);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchWriter(); }, [fetchWriter]);

  // 브레드크럼에 작가명 표시 (언마운트 시 해제 → 경로 기반 라벨로 복귀)
  const setBreadcrumb = useBreadcrumbStore((s) => s.setOverride);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clear);
  useEffect(() => {
    if (writer?.name) setBreadcrumb(writer.name);
    return () => clearBreadcrumb();
  }, [writer?.name, setBreadcrumb, clearBreadcrumb]);

  // 단일 필드 PATCH — 비-text 컨트롤(구분·요율·날짜·상태·포지션)에서 사용
  const patchField = useCallback(async (field: keyof Writer, value: Writer[keyof Writer]) => {
    const res = await fetch(`/api/writers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = (await res.json()).writer as Writer;
      setWriter(updated);
    }
  }, [id]);

  // EditableField(텍스트) 저장 성공 시 로컬 상태만 갱신(PATCH는 EditableField가 자체 수행)
  const handleSaved = useCallback((field: string, value: string | null) => {
    setWriter((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
      </div>
    );
  }
  if (error || !writer) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/writers')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 작가 마스터
        </button>
        <div className="p-8 text-center"><p className="text-red-400">오류: {error ?? '작가를 찾을 수 없습니다.'}</p></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* 헤더: 뒤로가기 + 코드·작가명 (하단 구분선으로 표 영역과 분리) */}
      <div className="space-y-3 pb-6 border-b border-border">
        <button
          onClick={() => router.push('/admin/writers')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 작가 마스터
        </button>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{writer.writer_code}</span>
          <h1 className="text-2xl font-bold text-foreground">{writer.name}</h1>
        </div>
      </div>

      {/* 섹션 나열 — 각 섹션은 색 채운 제목 바 + 표 카드 */}
      <div className="mt-12 space-y-10">
        {/* 기본정보 */}
        <SectionCard title="기본정보">
          <SectionTableBody>
            <DetailRow label="작가 코드">
              <span className="font-mono tabular-nums text-foreground">{writer.writer_code}</span>
            </DetailRow>
            <DetailRow label="작가명">
              <EditableField apiPath={`/api/writers/${id}`} field="name" label="작가명" value={writer.name} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="구분">
              <div className="flex justify-center">
                <WriterTypeSelect value={writer.writer_type} onChange={(v) => { patchField('writer_type', v); }} />
              </div>
            </DetailRow>
            <DetailRow label="영문명">
              <EditableField apiPath={`/api/writers/${id}`} field="english_name" label="영문명" value={writer.english_name ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="활동명">
              <EditableField apiPath={`/api/writers/${id}`} field="stage_name" label="활동명" value={writer.stage_name ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="활동명(EN)">
              <EditableField apiPath={`/api/writers/${id}`} field="stage_name_en" label="활동명(EN)" value={writer.stage_name_en ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="원작자 코드">
              <EditableField apiPath={`/api/writers/${id}`} field="original_writer_code" label="원작자 코드" value={writer.original_writer_code ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="등록일">
              <span className="text-foreground">
                {writer.created_at ? new Date(writer.created_at).toLocaleDateString('ko-KR') : '-'}
              </span>
            </DetailRow>
          </SectionTableBody>
        </SectionCard>

        {/* 저작물 요율 */}
        <SectionCard title="저작물 요율">
          <SectionTableBody>
            <DetailRow label="영구 저작물(%)">
              <NullableRateCell value={writer.permanent_rate} editable={isAdmin} onSave={(v) => patchField('permanent_rate', v)} />
            </DetailRow>
            <DetailRow label="일반 저작물(%)">
              <NullableRateCell value={writer.general_rate} editable={isAdmin} onSave={(v) => patchField('general_rate', v)} />
            </DetailRow>
            <DetailRow label="용역 요율(%)">
              <FeeRateCell value={writer.fee_rate} editable={isAdmin} onSave={(v) => patchField('fee_rate', v)} />
            </DetailRow>
          </SectionTableBody>
        </SectionCard>

        {/* 계약정보 */}
        <SectionCard title="계약정보">
          <SectionTableBody>
            <DetailRow label="재계약일">
              <DateCell value={writer.recontract_date} editable={isAdmin} onSave={(v) => patchField('recontract_date', v)} />
            </DetailRow>
            <DetailRow label="계약 상태">
              <ContractStatusCell value={writer.status} editable={isAdmin} onSave={(v) => patchField('status', v)} />
            </DetailRow>
            <DetailRow label="포지션">
              <div className="flex justify-center">
                <PositionSelect value={writer.position ?? []} editable={isAdmin} onChange={(next: PositionCode[]) => { patchField('position', next); }} />
              </div>
            </DetailRow>
          </SectionTableBody>
        </SectionCard>
      </div>
    </div>
  );
}

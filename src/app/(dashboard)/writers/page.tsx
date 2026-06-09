'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface Writer {
  id: string;
  name: string;
  email?: string;
  writer_type?: string;
  status?: string;
  created_at: string;
}

const writerSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email().optional().or(z.literal('')),
  writer_type: z.enum(['exclusive', 'general']),
  birth_date: z.string().optional().or(z.literal('')),
  bank_account: z.string().optional().or(z.literal('')),
});

type WriterForm = z.infer<typeof writerSchema>;

export default function WritersPage() {
  const [writers, setWriters] = useState<Writer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WriterForm>({
    resolver: zodResolver(writerSchema),
    defaultValues: {
      writer_type: 'exclusive',
    },
  });

  const fetchWriters = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('writers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWriters(data || []);
    } catch (err) {
      console.error('작가 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '작가 목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWriters();
  }, []);

  const onSubmit = async (formData: WriterForm) => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error: insertError } = await supabase.from('writers').insert([
        {
          name: formData.name,
          email: formData.email || null,
          writer_type: formData.writer_type,
          birth_date: formData.birth_date || null,
          bank_account: formData.bank_account || null,
          status: 'active',
        },
      ]);

      if (insertError) throw insertError;

      // 목록 리프레시
      await fetchWriters();
      reset();
      setIsOpen(false);
    } catch (err) {
      console.error('작가 등록 오류:', err);
      setError(err instanceof Error ? err.message : '작가 등록에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)] mb-2">
            전속작가 관리
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            2026년 06월 09일 • 등록된 전속작가 목록
          </p>
        </div>

        {/* + 등록 버튼 */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + 등록
          </SheetTrigger>
          <SheetContent
            className="bg-[var(--color-card)] border-l border-[var(--color-border)]"
            side="right"
          >
            <SheetHeader>
              <SheetTitle className="text-[var(--color-foreground)]">
                전속작가 등록
              </SheetTitle>
              <SheetDescription className="text-[var(--color-muted-foreground)]">
                새로운 전속작가 정보를 입력해주세요
              </SheetDescription>
            </SheetHeader>

            {/* 폼 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
              {/* 이름 */}
              <div>
                <label className="text-sm font-medium text-[var(--color-foreground)]">
                  이름 *
                </label>
                <input
                  {...register('name')}
                  placeholder="작가명"
                  className="w-full mt-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]"
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* 이메일 */}
              <div>
                <label className="text-sm font-medium text-[var(--color-foreground)]">
                  이메일
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@prism-filter.com"
                  className="w-full mt-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]"
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* 작가 유형 */}
              <div>
                <label className="text-sm font-medium text-[var(--color-foreground)]">
                  작가 유형 *
                </label>
                <select
                  {...register('writer_type')}
                  className="w-full mt-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)]"
                >
                  <option value="exclusive">전속작가</option>
                  <option value="general">일반작가</option>
                </select>
              </div>

              {/* 생년월일 */}
              <div>
                <label className="text-sm font-medium text-[var(--color-foreground)]">
                  생년월일
                </label>
                <input
                  {...register('birth_date')}
                  type="date"
                  className="w-full mt-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)]"
                />
              </div>

              {/* 은행 계좌 */}
              <div>
                <label className="text-sm font-medium text-[var(--color-foreground)]">
                  은행 계좌
                </label>
                <input
                  {...register('bank_account')}
                  placeholder="계좌번호"
                  className="w-full mt-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]"
                />
              </div>

              {/* 저장 버튼 */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? '등록 중...' : '저장'}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* 작가 목록 */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-[var(--color-muted-foreground)]">로딩 중...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">오류: {error}</p>
          </div>
        ) : writers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--color-muted-foreground)]">
              등록된 작가가 없습니다. "+ 등록" 버튼으로 첫 작가를 등록해주세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-500/10 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    등록일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {writers.map((writer) => (
                  <tr key={writer.id} className="hover:bg-[var(--color-border)]/30">
                    <td className="px-6 py-4 font-semibold text-[var(--color-foreground)]">
                      {writer.name}
                    </td>
                    <td className="px-6 py-4 text-[var(--color-muted-foreground)] text-sm">
                      {writer.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium">
                        {writer.writer_type === 'exclusive' ? '전속' : '일반'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">
                        {writer.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-muted-foreground)] text-sm">
                      {new Date(writer.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

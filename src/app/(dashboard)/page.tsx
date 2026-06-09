'use client';

import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm">2026년 06월 09일 • 프리즘필터 뮤직그룹 정산 현황</p>
        </div>
        <div className="hidden lg:flex gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">
            📊 Import/Export ▾
          </button>
          <button className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition">
            Explore Account →
          </button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">One Year Statement / Shortcuts Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-l-primary pl-4">
            <p className="text-xs text-muted-foreground mb-1">총 정산액</p>
            <p className="text-2xl font-bold text-foreground">3,800,000원</p>
          </div>
          <div className="border-l-4 border-l-primary pl-4">
            <p className="text-xs text-muted-foreground mb-1">처리 건수</p>
            <p className="text-2xl font-bold text-foreground">2</p>
          </div>
          <div className="border-l-4 border-l-primary pl-4">
            <p className="text-xs text-muted-foreground mb-1">작가 수</p>
            <p className="text-2xl font-bold text-foreground">5</p>
          </div>
        </div>
      </div>

      {/* Explore Project Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Explore Project Overview</h2>
          <button className="text-primary text-sm">← →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: '등록 작가', value: '5', icon: '👥' },
            { label: '처리 정산', value: '2', icon: '📋' },
            { label: '미정산', value: '0', icon: '⏳' },
            { label: '이달 수입', value: '3,800K', icon: '💰' },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                </div>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <p className="text-xs text-green-500 mt-2">↑ 7% This Year</p>
            </div>
          ))}
        </div>
      </div>

      {/* 분기별 정산 */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-4">분기별 정산 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { quarter: '2026 Q1', status: '미정산', percentage: 0 },
            { quarter: '2026 Q2', status: '진행중', percentage: 35 },
            { quarter: '2026 Q3', status: '예정', percentage: 0 },
            { quarter: '2026 Q4', status: '예정', percentage: 0 },
          ].map((q) => (
            <div key={q.quarter} className="bg-card border border-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-foreground">{q.quarter}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2 text-xs">
                    <span className="text-muted-foreground">{q.status}</span>
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">{q.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-primary/10 rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${q.percentage}%` }}></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">정산액</p>
                  <p className="text-lg font-bold text-foreground">0 원</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 정산 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="border-b border-border p-5">
          <h3 className="font-semibold text-foreground">최근 정산</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary/10">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">작가명</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">정산분기</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">지급액</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">상태</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-primary/5">
                <td className="px-6 py-4 text-foreground">홍길동</td>
                <td className="px-6 py-4 text-foreground">2026 Q1</td>
                <td className="px-6 py-4 text-foreground font-semibold text-right">2,300,000 원</td>
                <td className="px-6 py-4"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">완료</span></td>
                <td className="px-6 py-4 text-foreground">2026-04-10</td>
              </tr>
              <tr className="hover:bg-primary/5">
                <td className="px-6 py-4 text-foreground">이순신</td>
                <td className="px-6 py-4 text-foreground">2025 Q4</td>
                <td className="px-6 py-4 text-foreground font-semibold text-right">1,500,000 원</td>
                <td className="px-6 py-4"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">완료</span></td>
                <td className="px-6 py-4 text-foreground">2026-01-15</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

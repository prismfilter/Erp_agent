'use client';

import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* 섹션 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100 mb-2">홈 피드</h1>
        <p className="text-gray-400 text-sm">2026년 06월 09일 • 프리즘필터 뮤직그룹 정산 현황</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-indigo-500 rounded-lg p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 font-medium">총 정산액</span>
            <span className="text-xl">📈</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">3,800,000원</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-indigo-500 rounded-lg p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 font-medium">처리 건수</span>
            <span className="text-xl">📋</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">2</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-indigo-500 rounded-lg p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 font-medium">작가 수</span>
            <span className="text-xl">👥</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">5</div>
        </div>
      </div>

      {/* 로그인 정보 */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-400 mb-1">계정</p>
          <p className="text-sm font-semibold text-gray-100">{user?.email}</p>
        </div>
        <div className="bg-indigo-500 text-white px-3 py-1 rounded text-xs font-medium">
          {user?.role === 'ADMIN' ? '👑 관리자' : user?.role === 'STAFF' ? '💼 직원' : '✍️ 작가'}
        </div>
      </div>

      {/* 분기별 정산 */}
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-4">분기별 정산 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { quarter: '2026 Q1', status: '미정산', percentage: 0 },
            { quarter: '2026 Q2', status: '진행중', percentage: 35 },
            { quarter: '2026 Q3', status: '예정', percentage: 0 },
            { quarter: '2026 Q4', status: '예정', percentage: 0 },
          ].map((q) => (
            <div key={q.quarter} className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-100">{q.quarter}</h3>
                <span className="text-xl">📊</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2 text-xs">
                    <span className="text-gray-400">{q.status}</span>
                    <span className="bg-indigo-500 text-white px-2 py-1 rounded text-xs font-medium">{q.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-indigo-500/10 rounded overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${q.percentage}%` }}></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-gray-400 mb-1">정산액</p>
                  <p className="text-lg font-bold text-gray-100">0 원</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 정산 */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="border-b border-slate-700 p-5">
          <h3 className="font-semibold text-gray-100">최근 정산</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-500/10">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 text-xs uppercase">작가명</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 text-xs uppercase">정산분기</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 text-xs uppercase">지급액</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 text-xs uppercase">상태</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 text-xs uppercase">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              <tr className="hover:bg-slate-700/30">
                <td className="px-6 py-4 text-gray-200">홍길동</td>
                <td className="px-6 py-4 text-gray-200">2026 Q1</td>
                <td className="px-6 py-4 text-gray-200 font-semibold text-right">2,300,000 원</td>
                <td className="px-6 py-4"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">완료</span></td>
                <td className="px-6 py-4 text-gray-200">2026-04-10</td>
              </tr>
              <tr className="hover:bg-slate-700/30">
                <td className="px-6 py-4 text-gray-200">이순신</td>
                <td className="px-6 py-4 text-gray-200">2025 Q4</td>
                <td className="px-6 py-4 text-gray-200 font-semibold text-right">1,500,000 원</td>
                <td className="px-6 py-4"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">완료</span></td>
                <td className="px-6 py-4 text-gray-200">2026-01-15</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

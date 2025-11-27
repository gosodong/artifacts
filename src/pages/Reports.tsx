import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  CalendarIcon,
  ArchiveBoxIcon,
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useArtifactStore } from '../stores/artifactStore';
import { artifactApi } from '../services/api';
import { Toaster, toast } from 'sonner';

interface ReportStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byProject: Record<string, number>;
  byEra: Record<string, number>;
}

const Reports: React.FC = () => {
  const { artifacts, projects, fetchArtifacts, fetchProjects } = useArtifactStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchArtifacts();
        await fetchProjects();
        const apiStats = await artifactApi.getStats();
        setStats({
          total: apiStats.total,
          byStatus: apiStats.byStatus,
          byCategory: apiStats.byCategory,
          byProject: {},
          byEra: {},
        });
      } catch (err) {
        console.error('통계 로드 실패:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchArtifacts, fetchProjects]);

  const byEra = useMemo(() => {
    const map: Record<string, number> = {};
    artifacts.forEach(a => {
      if (a.era) {
        map[a.era] = (map[a.era] || 0) + 1;
      }
    });
    return map;
  }, [artifacts]);

  // 필터링된 유물
  const filteredArtifacts = artifacts.filter(artifact => {
    if (selectedProject !== 'all' && artifact.project !== selectedProject) return false;
    return true;
  });

  // 필터링된 통계 재계산
  const filteredStats = {
    total: filteredArtifacts.length,
    completed: filteredArtifacts.filter(a => a.preservation_status === 'completed').length,
    processing: filteredArtifacts.filter(a => a.preservation_status === 'processing').length,
    pending: filteredArtifacts.filter(a => a.preservation_status === 'pending').length,
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const headers = ['번호', '명칭', '유물번호', '사업', '시대', '출토지', '보존상태', '처리자'];
    const rows = filteredArtifacts.map(a => [
      a.id,
      a.name,
      a.number,
      a.project || '',
      a.era || '',
      a.excavation_site || '',
      a.preservation_status === 'completed' ? '완료' : a.preservation_status === 'processing' ? '처리중' : '대기',
      a.processor || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `보존카드_보고서_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  // 통계 카드 컴포넌트
  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    percentage?: number;
  }> = ({ title, value, icon, color, percentage }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {percentage !== undefined && (
            <p className="text-xs text-gray-400 mt-1">{percentage.toFixed(1)}%</p>
          )}
        </div>
        <div className="p-3 rounded-full bg-opacity-20">{icon}</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Toaster position="top-right" />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보고서</h1>
          <p className="text-gray-600 mt-1">보존카드 현황 및 통계</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          CSV 내보내기
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">필터:</span>
          </div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">모든 사업</option>
            {projects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 보존카드"
          value={filteredStats.total}
          icon={<ArchiveBoxIcon className="h-8 w-8 text-blue-600" />}
          color="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="처리 완료"
          value={filteredStats.completed}
          icon={<CheckCircleIcon className="h-8 w-8 text-green-600" />}
          color="border-l-4 border-l-green-500"
          percentage={filteredStats.total > 0 ? (filteredStats.completed / filteredStats.total) * 100 : 0}
        />
        <StatCard
          title="처리 중"
          value={filteredStats.processing}
          icon={<ClockIcon className="h-8 w-8 text-yellow-600" />}
          color="border-l-4 border-l-yellow-500"
          percentage={filteredStats.total > 0 ? (filteredStats.processing / filteredStats.total) * 100 : 0}
        />
        <StatCard
          title="대기"
          value={filteredStats.pending}
          icon={<ExclamationCircleIcon className="h-8 w-8 text-red-600" />}
          color="border-l-4 border-l-red-500"
          percentage={filteredStats.total > 0 ? (filteredStats.pending / filteredStats.total) * 100 : 0}
        />
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 사업별 현황 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FolderIcon className="h-5 w-5 text-amber-600" />
            사업별 현황
          </h3>
          <div className="space-y-3">
            {projects.slice(0, 8).map(project => {
              const count = artifacts.filter(a => a.project === project).length;
              const percentage = artifacts.length > 0 ? (count / artifacts.length) * 100 : 0;
              return (
                <div key={project} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 truncate" title={project}>{project}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}건</span>
                </div>
              );
            })}
            {projects.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">데이터가 없습니다</p>
            )}
          </div>
        </div>

        {/* 시대별 현황 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-600" />
            시대별 현황
          </h3>
          <div className="space-y-3">
            {Object.entries(byEra).slice(0, 8).map(([era, count]) => {
              const percentage = artifacts.length > 0 ? (count / artifacts.length) * 100 : 0;
              return (
                <div key={era} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 truncate" title={era}>{era}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}건</span>
                </div>
              );
            })}
            {Object.keys(byEra).length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">데이터가 없습니다</p>
            )}
          </div>
        </div>

        {/* 카테고리별 현황 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            카테고리별 현황
          </h3>
          <div className="space-y-3">
            {stats?.byCategory && Object.entries(stats.byCategory).slice(0, 8).map(([category, count]) => {
              const percentage = artifacts.length > 0 ? (count / artifacts.length) * 100 : 0;
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 truncate" title={category}>{category}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}건</span>
                </div>
              );
            })}
            {(!stats?.byCategory || Object.keys(stats.byCategory).length === 0) && (
              <p className="text-gray-500 text-sm text-center py-4">데이터가 없습니다</p>
            )}
          </div>
        </div>

        {/* 보존 상태 요약 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">보존 처리 진행률</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* 원형 프로그레스 */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="16"
                  strokeDasharray={`${(filteredStats.completed / Math.max(filteredStats.total, 1)) * 502} 502`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">
                  {filteredStats.total > 0 ? Math.round((filteredStats.completed / filteredStats.total) * 100) : 0}%
                </span>
                <span className="text-sm text-gray-500">완료율</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{filteredStats.completed}</p>
              <p className="text-xs text-gray-500">완료</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <p className="text-lg font-bold text-yellow-600">{filteredStats.processing}</p>
              <p className="text-xs text-gray-500">처리중</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <p className="text-lg font-bold text-red-600">{filteredStats.pending}</p>
              <p className="text-xs text-gray-500">대기</p>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 등록 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 등록된 보존카드</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">번호</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">명칭</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">사업</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">시대</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">상태</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">등록일</th>
              </tr>
            </thead>
            <tbody>
              {filteredArtifacts.slice(0, 10).map(artifact => (
                <tr key={artifact.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-gray-600">{artifact.number}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{artifact.name}</td>
                  <td className="py-3 px-4 text-gray-600">{artifact.project || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{artifact.era || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      artifact.preservation_status === 'completed' ? 'bg-green-100 text-green-700' :
                      artifact.preservation_status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {artifact.preservation_status === 'completed' ? '완료' :
                       artifact.preservation_status === 'processing' ? '처리중' : '대기'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {artifact.created_at ? new Date(artifact.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;

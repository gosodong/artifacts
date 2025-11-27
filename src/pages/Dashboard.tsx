import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArchiveBoxIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { useArtifactStore } from '../stores/artifactStore';
import { artifactApi } from '../services/api';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{trend}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { fetchArtifacts } = useArtifactStore();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    recent: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const rawSettings = localStorage.getItem('appSettings');
  const appSettings = rawSettings ? JSON.parse(rawSettings) : { itemsPerPage: 20, showThumbnails: true };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [statistics] = await Promise.all([
          artifactApi.getStats(),
          fetchArtifacts()
        ]);
        
        console.log('=== Dashboard 디버깅 ===');
        console.log('API 응답 statistics:', statistics);
        console.log('Recent artifacts:', statistics.recent);
        console.log('Recent artifacts length:', statistics.recent?.length);
        
        setStats({
          total: statistics.total,
          pending: statistics.byStatus.pending || 0,
          processing: statistics.byStatus.processing || 0,
          completed: statistics.byStatus.completed || 0,
          recent: statistics.recent || []
        });
        
        console.log('설정된 stats:', {
          total: statistics.total,
          recentCount: statistics.recent?.length,
          recent: statistics.recent
        });
        console.log('=== 디버깅 종료 ===');
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchArtifacts]);

  const recentVisible = (stats.recent || []).slice(0, appSettings.itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-white">유물 관리시스템</h1>
        <p className="text-amber-100 mt-2">유물 보존카드 등록 및 관리 현황을 확인하세요.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="전체 보존카드"
          value={stats.total}
          icon={ArchiveBoxIcon}
          color="bg-amber-600"
        />
        <StatCard
          title="이번 달 등록"
          value={stats.pending}
          icon={ClockIcon}
          color="bg-blue-500"
        />
        <StatCard
          title="이미지 보유"
          value={stats.processing}
          icon={ExclamationTriangleIcon}
          color="bg-green-500"
        />
        <StatCard
          title="어노테이션 완료"
          value={stats.completed}
          icon={CheckCircleIcon}
          color="bg-purple-500"
        />
      </div>

      {/* Recent Artifacts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">최근 등록 보존카드</h2>
            <Link
              to="/artifacts"
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              전체보기 →
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">데이터를 불러오는 중...</p>
            </div>
          ) : stats.recent.length === 0 ? (
            <div className="text-center py-8">
              <ArchiveBoxIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">등록된 보존카드가 없습니다.</p>
              <Link
                to="/artifacts"
                className="mt-4 inline-flex items-center px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800"
              >
                첫 보존카드 등록하기
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentVisible.map((artifact) => (
                <Link
                  key={artifact.id}
                  to={`/artifacts/${artifact.id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label={`${artifact.name} 상세보기`}
                >
                  <div className="flex items-center space-x-4">
                    {appSettings.showThumbnails && (
                      <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        {artifact.images && artifact.images.length > 0 ? (
                          <img
                            src={`${window.location.origin}${artifact.images[0]}`}
                            alt={artifact.name}
                            className="h-full w-full object-cover rounded-lg"
                            onError={(e) => {
                              console.log(`이미지 로드 실패 - ${artifact.id}:`, artifact.images[0]);
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<svg class=\"h-6 w-6 text-gray-400\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\" /></svg>';
                              }
                            }}
                          />
                        ) : (
                          <ArchiveBoxIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{artifact.name}</h3>
                      <p className="text-sm text-gray-500">{artifact.number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                      {artifact.category || '미분류'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(artifact.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/artifacts"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-amber-700" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">보존카드 관리</h3>
              <p className="text-sm text-gray-500">유물 보존카드 등록 및 수정</p>
            </div>
          </div>
        </Link>

        <Link
          to="/projects"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">사업 관리</h3>
              <p className="text-sm text-gray-500">발굴 사업별 관리</p>
            </div>
          </div>
        </Link>

        <Link
          to="/reports"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">보고서</h3>
              <p className="text-sm text-gray-500">보존카드 통계 및 출력</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;

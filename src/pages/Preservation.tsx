import React, { useState } from 'react';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  PhotoIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useArtifactStore } from '../stores/artifactStore';
import PreservationModal from '../components/Preservation/PreservationModal';
import { Toaster, toast } from 'sonner';

interface PreservationLog {
  id: string;
  action_type: string;
  description: string;
  performed_by: string;
  performed_date: string;
  before_images?: string[];
  after_images?: string[];
  status_before: string;
  status_after: string;
}

interface ArtifactWithLogs {
  id: string;
  name: string;
  number: string;
  preservation_status: string;
  processor: string;
  preservation_date: string;
  images: string[];
  logs: PreservationLog[];
}

const Preservation: React.FC = () => {
  const { artifacts, updateArtifact } = useArtifactStore();
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactWithLogs | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 더미 보존 기록 데이터 (실제로는 백엔드에서 가져와야 함)
  const dummyLogs: PreservationLog[] = [
    {
      id: '1',
      action_type: 'cleaning',
      description: '표면 먼지 제거 및 기본 청소 작업 수행',
      performed_by: '김보존',
      performed_date: '2024-01-15',
      before_images: ['/uploads/before-001.jpg'],
      after_images: ['/uploads/after-001.jpg'],
      status_before: 'pending',
      status_after: 'processing'
    },
    {
      id: '2',
      action_type: 'restoration',
      description: '균열 부위 복원 및 보존 처리',
      performed_by: '이학예',
      performed_date: '2024-01-20',
      before_images: ['/uploads/before-002.jpg'],
      after_images: ['/uploads/after-002.jpg'],
      status_before: 'processing',
      status_after: 'completed'
    }
  ];

  const artifactsWithLogs: ArtifactWithLogs[] = artifacts.map(artifact => ({
    ...artifact,
    logs: dummyLogs // 실제로는 artifact별로 다른 로그를 가져와야 함
  }));

  const filteredArtifacts = artifactsWithLogs.filter(artifact => {
    const matchesSearch = 
      artifact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.processor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || artifact.preservation_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '처리 대기';
      case 'processing':
        return '처리 중';
      case 'completed':
        return '처리 완료';
      default:
        return '알 수 없음';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeText = (actionType: string) => {
    switch (actionType) {
      case 'cleaning':
        return '청소';
      case 'restoration':
        return '복원';
      case 'documentation':
        return '문서화';
      case 'examination':
        return '검토';
      case 'storage':
        return '보관';
      case 'transport':
        return '운송';
      case 'treatment':
        return '치료';
      case 'analysis':
        return '분석';
      default:
        return actionType;
    }
  };

  const handleNewPreservation = (artifact: ArtifactWithLogs) => {
    setSelectedArtifact(artifact);
    setIsModalOpen(true);
  };

  const handleSavePreservation = async (log: PreservationLog) => {
    try {
      if (selectedArtifact) {
        // 유물의 상태 업데이트
        await updateArtifact(selectedArtifact.id, {
          preservation_status: log.status_after as 'pending' | 'processing' | 'completed',
          preservation_date: log.performed_date
        });
        
        toast.success('보존 처리 기록이 저장되었습니다.');
        setIsModalOpen(false);
        setSelectedArtifact(null);
      }
    } catch {
      toast.error('보존 처리 기록 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보존 상태 추적</h1>
          <p className="text-gray-600 mt-1">유물의 보존 처리 상태를 추적하고 관리합니다.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="유물 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="pending">처리 대기</option>
              <option value="processing">처리 중</option>
              <option value="completed">처리 완료</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* Artifacts Grid */}
      {filteredArtifacts.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-500 mb-4">다른 검색어를 시도하거나 필터를 조정해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtifacts.map((artifact) => (
            <div key={artifact.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(artifact.preservation_status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{artifact.name}</h3>
                      <p className="text-sm text-gray-500">{artifact.number}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(artifact.preservation_status)}`}>
                    {getStatusText(artifact.preservation_status)}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{artifact.processor || '미지정'}</span>
                  </div>
                  {artifact.preservation_date && (
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{new Date(artifact.preservation_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Logs */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">최근 처리 기록</h4>
                  <button
                    onClick={() => handleNewPreservation(artifact)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    새 기록
                  </button>
                </div>

                {artifact.logs.length === 0 ? (
                  <p className="text-sm text-gray-500">처리 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {artifact.logs.slice(0, 2).map((log) => (
                      <div key={log.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {getActionTypeText(log.action_type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.performed_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{log.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">by {log.performed_by}</span>
                          <div className="flex items-center space-x-1">
                            {log.before_images && log.before_images.length > 0 && (
                              <PhotoIcon className="h-4 w-4 text-gray-400" title="처리 전 이미지 있음" />
                            )}
                            {log.after_images && log.after_images.length > 0 && (
                              <PhotoIcon className="h-4 w-4 text-blue-400" title="처리 후 이미지 있음" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {artifact.logs.length > 2 && (
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        더보기 ({artifact.logs.length - 2}개)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preservation Modal */}
      {selectedArtifact && (
        <PreservationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedArtifact(null);
          }}
          onSave={handleSavePreservation}
          artifactId={selectedArtifact.id}
          currentStatus={selectedArtifact.preservation_status}
        />
      )}
    </div>
  );
};

export default Preservation;

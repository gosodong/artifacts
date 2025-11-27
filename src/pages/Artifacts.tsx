import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import ArtifactCard from '../components/Artifacts/ArtifactCard';
import ArtifactModal from '../components/Artifacts/ArtifactModal';
import { useArtifactStore, type Artifact as StoreArtifact } from '../stores/artifactStore';
import { artifactApi } from '../services/api';
import { Toaster, toast } from 'sonner';

// Use store Artifact typing throughout this page

const Artifacts: React.FC = () => {
  const navigate = useNavigate();
  const {
    artifacts,
    projects,
    fetchArtifacts,
    fetchProjects,
    deleteArtifact,
    searchArtifacts,
    
  } = useArtifactStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<StoreArtifact | undefined>();
  const [filteredArtifacts, setFilteredArtifacts] = useState<StoreArtifact[]>([]);
  const rawSettings = localStorage.getItem('appSettings');
  const appSettings = rawSettings ? JSON.parse(rawSettings) : { itemsPerPage: 20, defaultView: 'grid' };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(appSettings.defaultView);

  // 고유한 카테고리 목록 추출 (프로젝트는 store에서 가져옴)
  const categories = Array.from(new Set(artifacts.map(a => a.category).filter(Boolean)));

  useEffect(() => {
    fetchArtifacts();
    fetchProjects();
  }, [fetchArtifacts, fetchProjects]);

  useEffect(() => {
    let filtered = artifacts;

    // 검색 필터
    if (searchQuery) {
      filtered = searchArtifacts(searchQuery);
    }

    // 카테고리 필터
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(artifact => artifact.category === categoryFilter);
    }

    // 프로젝트 필터
    if (projectFilter !== 'all') {
      filtered = filtered.filter(artifact => artifact.project === projectFilter);
    }

    setFilteredArtifacts(filtered);
  }, [artifacts, searchQuery, categoryFilter, projectFilter, searchArtifacts]);

  const handleNewArtifact = () => {
    setSelectedArtifact(undefined);
    setIsModalOpen(true);
  };

  const handleEditArtifact = (artifact: StoreArtifact) => {
    setSelectedArtifact(artifact);
    setIsModalOpen(true);
  };

  const handleSaveArtifact = async (artifactData: Partial<StoreArtifact>) => {
    try {
      if (selectedArtifact) {
        // 수정 모드
        await artifactApi.update(selectedArtifact.id, artifactData as Record<string, unknown>);
        toast.success('유물 정보가 수정되었습니다.');
      } else {
        // 신규 등록 모드
        const tempImages = artifactData.images?.filter((img: string) => img.startsWith('temp:')) || [];
        const cleanArtifactData = {
          ...artifactData,
          images: artifactData.images?.filter((img: string) => !img.startsWith('temp:')) || []
        };
        
        // store의 addArtifact 대신 직접 API 호출
          let newArtifact;
        try {
          newArtifact = await artifactApi.create(cleanArtifactData as unknown as Omit<StoreArtifact, 'id' | 'created_at' | 'updated_at'>);
          
          if (!newArtifact || !newArtifact.id) {
            throw new Error('유물 생성 API가 유효한 응답을 반환하지 않았습니다.');
          }
          
          // store에 수동으로 추가
          await fetchArtifacts();
          
        } catch (apiError) {
          console.error('API 호출 실패:', apiError);
          throw new Error(`유물 등록에 실패했습니다: ${(apiError as Error).message}`);
        }
        
        // 임시 이미지가 있다면 실제로 업로드
        if (tempImages.length > 0 && newArtifact && newArtifact.id) {
          const uploadedImages: string[] = [];
          let uploadSuccessCount = 0;
          
          for (const tempImage of tempImages) {
            const blobUrl = tempImage.replace('temp:', '');
            
            try {
              const response = await fetch(blobUrl);
              const blob = await response.blob();
              const file = new File([blob], 'new-image.jpg', { type: blob.type });
              
              const result = await artifactApi.uploadImage(newArtifact.id, file);
              uploadedImages.push(result.file_path);
              uploadSuccessCount++;
              
              // 임시 URL 해제
              URL.revokeObjectURL(blobUrl);
            } catch (error) {
              console.error('임시 이미지 업로드 실패:', error);
              toast.error(`이미지 업로드에 실패했습니다: ${(error as Error).message}`);
            }
          }
          
          // 업로드된 이미지를 포함하도록 유물 정보 업데이트
          if (uploadedImages.length > 0) {
            await artifactApi.update(newArtifact.id, {
              images: [...(cleanArtifactData.images || []), ...uploadedImages]
            } as Record<string, unknown>);
            
            // 이미지 업로드 완료 후 store 새로고침
            await fetchArtifacts();
            
            toast.success(`${uploadSuccessCount}개의 이미지가 성공적으로 업로드되었습니다.`);
          }
        }
        
        toast.success('새 유물이 등록되었습니다.');
      }
      setIsModalOpen(false);
      setSelectedArtifact(undefined);
    } catch (error) {
      console.error('유물 저장 중 오류:', error);
      toast.error(`유물 저장 중 오류가 발생했습니다: ${(error as Error).message}`);
    }
  };

  const handleDeleteArtifact = async (artifact: StoreArtifact) => {
    if (window.confirm(`'${artifact.name}' 유물을 삭제하시겠습니까?`)) {
      try {
        await deleteArtifact(artifact.id);
        toast.success('유물이 삭제되었습니다.');
      } catch (error) {
        toast.error(`유물 삭제 중 오류가 발생했습니다: ${(error as Error).message}`);
      }
    }
  };

  const handleViewArtifact = (artifact: StoreArtifact) => {
    navigate(`/artifacts/${artifact.id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setProjectFilter('all');
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보존카드 관리</h1>
          <p className="text-gray-600 mt-1">총 {filteredArtifacts.length}개의 보존카드가 있습니다.</p>
        </div>
        <button
          onClick={handleNewArtifact}
          className="inline-flex items-center px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          새 보존카드 등록
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
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

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 카테고리</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 사업</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {filteredArtifacts.length}개의 결과
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            필터 초기화
          </button>
        </div>
      </div>

      {/* Artifacts Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredArtifacts.slice(0, appSettings.itemsPerPage).map((artifact) => (
          <ArtifactCard
            key={artifact.id}
            artifact={artifact}
            onView={handleViewArtifact}
            onEdit={handleEditArtifact}
            onDelete={handleDeleteArtifact}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredArtifacts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-500 mb-4">다른 검색어를 시도하거나 필터를 조정해 보세요.</p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            모든 필터 초기화
          </button>
        </div>
      )}

      {/* Artifact Modal */}
      <ArtifactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedArtifact(undefined);
        }}
        onSave={handleSaveArtifact}
        artifact={selectedArtifact}
      />
    </div>
  );
};

export default Artifacts;

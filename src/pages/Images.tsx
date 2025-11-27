import React, { useState, useEffect } from 'react';
import { 
  PhotoIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useArtifactStore } from '../stores/artifactStore';
import { artifactApi } from '../services/api';
import VectorAnnotationEditor from '../components/Images/VectorAnnotationEditor';
import { Toaster, toast } from 'sonner';

interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

interface ImageItem {
  id: string;
  artifactId: string;
  artifactName: string;
  artifactNumber: string;
  filePath: string;
  fileName: string;
  createdAt: string;
  annotations?: Annotation[];
}

const Images: React.FC = () => {
  const { artifacts, fetchArtifacts } = useArtifactStore();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArtifact, setFilterArtifact] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [editorInitialAnnotations, setEditorInitialAnnotations] = useState<unknown>([]);
  const [imageTimestamps, setImageTimestamps] = useState<Record<string, number>>({});

  // 초기 데이터 로딩
  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  useEffect(() => {
    // 디버깅: artifacts 데이터 확인
    console.log('=== Images 페이지 디버깅 ===');
    console.log('전체 artifacts 수:', artifacts.length);
    console.log('각 artifact의 이미지:', artifacts.map(a => ({ id: a.id, name: a.name, images: a.images })));
    
    // 모든 유물의 이미지를 수집하여 하나의 목록으로 만듭니다
    const allImages: ImageItem[] = [];
    
    artifacts.forEach(artifact => {
      console.log(`Artifact ${artifact.id} (${artifact.name}) 이미지:`, artifact.images);
      artifact.images.forEach((imagePath, index) => {
        allImages.push({
          id: `${artifact.id}-${index}`,
          artifactId: artifact.id,
          artifactName: artifact.name,
          artifactNumber: artifact.number,
          filePath: imagePath,
          fileName: imagePath.split('/').pop() || '',
          createdAt: artifact.created_at
        });
      });
    });

    console.log('생성된 이미지 목록:', allImages);
    console.log('=== 디버깅 종료 ===');
    
    setImages(allImages);
    setIsLoading(false);
  }, [artifacts]);

  const filteredImages = images.filter(image => {
    const matchesSearch = 
      image.artifactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.artifactNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesArtifact = filterArtifact === 'all' || image.artifactId === filterArtifact;
    
    return matchesSearch && matchesArtifact;
  });

  console.log('필터링 결과:', {
    전체이미지수: images.length,
    필터링된이미지수: filteredImages.length,
    검색어: searchQuery,
    선택된유물: filterArtifact
  });

  const handleViewImage = (imagePath: string) => {
    const fullImageUrl = imagePath.startsWith('http') ? imagePath : `http://localhost:3001${imagePath}?t=${Date.now()}`;
    window.open(fullImageUrl, '_blank');
  };

  const handleDownloadImage = (imagePath: string, fileName: string) => {
    const fullImageUrl = imagePath.startsWith('http') ? imagePath : `http://localhost:3001${imagePath}`;
    const link = document.createElement('a');
    link.href = fullImageUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteImage = async (image: ImageItem) => {
    if (window.confirm(`'${image.fileName}' 이미지를 삭제하시겠습니까?`)) {
      try {
        await artifactApi.deleteImage(image.artifactId, image.filePath);
        toast.success('이미지가 삭제되었습니다.');
        await fetchArtifacts();
      } catch (error) {
        toast.error(`이미지 삭제 실패: ${(error as Error).message}`);
      }
    }
  };

  const handleAnnotateImage = async (image: ImageItem) => {
    setSelectedImage(image);
    setShowAnnotationEditor(true);
    try {
      const { annotations, canvas } = await artifactApi.getImageAnnotations(image.artifactId, image.filePath);
      console.log('[Images] 어노테이션 로드 결과:', { annotations, canvas });
      const initialData = canvas ?? (annotations.length > 0 ? annotations : []);
      console.log('[Images] 에디터에 전달할 데이터:', initialData);
      setEditorInitialAnnotations(initialData as unknown);
    } catch (error) {
      console.warn('어노테이션 초기 로드 실패:', error);
      setEditorInitialAnnotations([]);
    }
  };

  const handleAnnotationSave = async (annotations: unknown) => {
    if (!selectedImage) return;
    try {
      await artifactApi.saveImageAnnotations(selectedImage.artifactId, selectedImage.filePath, annotations);
      toast.success('어노테이션이 저장되었습니다.');
    } catch (error) {
      toast.error(`어노테이션 저장 실패: ${(error as Error).message}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterArtifact('all');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">이미지 관리</h1>
          <p className="text-gray-600 mt-1">총 {filteredImages.length}개의 이미지가 있습니다.</p>
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
                placeholder="이미지 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Artifact Filter */}
          <div>
            <select
              value={filterArtifact}
              onChange={(e) => setFilterArtifact(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 유물</option>
              {artifacts.map(artifact => (
                <option key={artifact.id} value={artifact.id}>
                  {artifact.name} ({artifact.number})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded mb-3"></div>
                <div className="flex space-x-2">
                  <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">이미지가 없습니다</h3>
          <p className="text-gray-500 mb-4">유물을 등록하면 이미지를 추가할 수 있습니다.</p>
          <a
            href="/artifacts"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            유물 등록하러 가기
          </a>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              총 {filteredImages.length}개의 이미지가 표시됩니다
            </p>
          </div>
          {(() => {
            const raw = localStorage.getItem('appSettings');
            const { itemsPerPage = 20, showThumbnails = true } = raw ? JSON.parse(raw) : {};
            const visible = filteredImages.slice(0, itemsPerPage);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {visible.map((image) => (
                  <div key={image.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Image */}
                    {showThumbnails && (
                      <div className="aspect-w-1 aspect-h-1 bg-gray-100 relative group">
                        <img
                    src={`http://localhost:3001${image.filePath}${imageTimestamps[image.id] ? `?t=${imageTimestamps[image.id]}` : ''}`}
                          alt={image.artifactName}
                          className="w-full h-48 object-cover cursor-pointer group-hover:opacity-90 transition-all duration-300"
                          onClick={() => handleViewImage(image.filePath)}
                          crossOrigin="anonymous"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMzLjMzQzExNC42MDkgMTMzLjMzIDEyNi42NyAxMjEuMjY5IDEyNi42NyAxMDYuNjdDMTI2LjY3IDkyLjA2MDkgMTE0LjYwOSA4MCAxMDAgODBDODUuMzkwNSA4MCA3My4zMzA2IDkyLjA2MDkgNzMuMzMwNiAxMDYuNjdDNzMuMzMwNiAxMjEuMjY5IDg1LjM5MDUgMTMzLjMzIDEwMCAxMzMuMzNaIiBmaWxsbD0iIzk5OTk5OSIvPgo=';
                          }}
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />
                      </div>
                    )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{image.artifactName}</h3>
                  <p className="text-sm text-gray-500 mb-1">{image.artifactNumber}</p>
                  <p className="text-xs text-gray-400 mb-2">{image.fileName}</p>
                  <p className="text-xs text-gray-400 mb-2">
                    업로드: {new Date(image.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                  {image.annotations && image.annotations.length > 0 && (
                    <div className="flex items-center mb-3">
                      <PencilIcon className="h-3 w-3 text-purple-500 mr-1" />
                      <span className="text-xs text-purple-600 font-medium">
                        어노테이션 {image.annotations.length}개
                      </span>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewImage(image.filePath)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="보기"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      보기
                    </button>
                    <button
                      onClick={() => handleAnnotateImage(image)}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      title="어노테이션"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadImage(image.filePath, image.fileName)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="다운로드"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      다운로드
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image)}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      title="삭제"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Annotation Editor Modal */}
      {showAnnotationEditor && selectedImage && (
        <VectorAnnotationEditor
          imageUrl={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${selectedImage.filePath}?t=${Date.now()}`}
          imageName={selectedImage.fileName}
          imagePath={selectedImage.filePath}
          artifactId={selectedImage.artifactId}
          onClose={() => {
            setShowAnnotationEditor(false);
            setSelectedImage(null);
            setEditorInitialAnnotations([]);
          }}
          onSave={handleAnnotationSave}
          onRotateApplied={() => {
            // 이미지 회전 적용 후 캐시 무효화 및 목록 새로고침
            setImageTimestamps(prev => ({
              ...prev,
              [selectedImage.id]: Date.now()
            }));
            setIsLoading(true);
            fetchArtifacts();
          }}
          initialAnnotations={editorInitialAnnotations}
        />
      )}
      
      <Toaster position="top-right" />
    </div>
  );
};

export default Images;

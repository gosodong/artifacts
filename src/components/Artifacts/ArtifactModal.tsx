import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Artifact as StoreArtifact, useArtifactStore } from '../../stores/artifactStore';
import ImageUpload from '../Images/ImageUpload';

interface Artifact {
  id?: string;
  name: string;
  number: string;
  excavation_site: string;
  era: string;
  storage_location: string;
  processor: string;
  images: string[];
  description?: string;
  category: string;
  project: string;
  treatment_location?: string;
  treatment_team?: string;
  preservation_date_from?: string;
  preservation_date_to?: string;
  created_at?: string;
  updated_at?: string;
}

interface ArtifactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (artifact: Partial<StoreArtifact>) => void;
  artifact?: StoreArtifact;
}

const ArtifactModal: React.FC<ArtifactModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  artifact 
}) => {
  const { projects, fetchProjects } = useArtifactStore();
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Artifact>>({
    name: '',
    number: '',
    excavation_site: '',
    era: '',
    storage_location: '',
    processor: '',
    images: [],
    description: '',
    category: '',
    project: '',
    treatment_location: '',
    treatment_team: '',
    preservation_date_from: '',
    preservation_date_to: ''
  });
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (artifact) {
      setFormData(artifact);
    } else {
      setFormData({
        name: '',
        number: '',
        excavation_site: '',
        era: '',
        storage_location: '',
        processor: '',
        images: [],
        description: '',
        category: '',
        project: '',
        treatment_location: '',
        treatment_team: '',
        preservation_date_from: '',
        preservation_date_to: ''
      });
    }
  }, [artifact, isOpen]);

  // 프로젝트 리스트 가져오기
  useEffect(() => {
    if (isOpen) {
      setIsLoadingProjects(true);
      fetchProjects().finally(() => setIsLoadingProjects(false));
    }
  }, [isOpen, fetchProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 새 프로젝트명 처리
    const finalProject = formData.project === '' && newProjectName.trim() 
      ? newProjectName.trim() 
      : formData.project;
    
    // 새 유물 생성 시 임시 이미지 URL을 실제 파일로 변환
    if (!artifact && formData.images && formData.images.length > 0) {
      const uploadedImages: string[] = [];
      
      for (const imageUrl of formData.images) {
        // 임시 URL (blob:)인 경우 실제 파일로 변환하여 업로드
        if (imageUrl.startsWith('blob:')) {
          // 임시 URL을 부모에서 실제 파일로 업로드 처리
          uploadedImages.push(`temp:${imageUrl}`);
        } else {
          uploadedImages.push(imageUrl);
        }
      }
      
      onSave({ ...formData, project: finalProject, images: uploadedImages });
    } else {
      onSave({ ...formData, project: finalProject });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 프로젝트 선택 변경 처리
    if (name === 'project') {
      if (value === 'new') {
        // 새 프로젝트 선택 시 프로젝트명 초기화
        setFormData(prev => ({ ...prev, project: '' }));
      } else {
        setFormData(prev => ({ ...prev, project: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-xl shadow-xl max-h-[95vh] flex flex-col">
          {/* 고정 헤더 */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <Dialog.Title className="text-lg sm:text-xl font-semibold text-gray-900">
              {artifact ? '보존카드 수정' : '새 보존카드 등록'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 스크롤 가능한 폼 영역 */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    유물명 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="유물명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    유물 번호 *
                  </label>
                  <input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: ART-2024-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: 도기, 청동기, 서적"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사업 (선택사항)
                  </label>
                  {isLoadingProjects ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      사업 로딩 중...
                    </div>
                  ) : (
                    <select
                      name="project"
                      value={formData.project}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">사업 선택</option>
                      {projects.map((project) => (
                        <option key={project} value={project}>
                          {project}
                        </option>
                      ))}
                      <option value="new">+ 새 사업 추가</option>
                    </select>
                  )}
                </div>
                
                {/* 새 프로젝트 입력 필드 */}
                {!formData.project && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      새 사업명
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="새 사업명을 입력하세요"
                    />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    발굴지점
                  </label>
                  <input
                      type="text"
                      name="excavation_site"
                      value={formData.excavation_site}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="발굴지점"
                    />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시대
                  </label>
                  <input
                    type="text"
                    name="era"
                    value={formData.era}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: 조선시대, 삼국시대"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보관위치
                  </label>
                  <input
                      type="text"
                      name="storage_location"
                      value={formData.storage_location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="보관위치를 입력하세요"
                    />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리자
                  </label>
                  <input
                    type="text"
                    name="processor"
                    value={formData.processor}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="담당자 이름"
                  />
                </div>
              </div>
            </div>

            {/* 보존처리 정보 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">보존처리 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리장소
                  </label>
                  <input
                    type="text"
                    name="treatment_location"
                    value={formData.treatment_location || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="처리장소를 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리팀
                  </label>
                  <input
                    type="text"
                    name="treatment_team"
                    value={formData.treatment_team || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="처리팀을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보존처리 시작일
                  </label>
                  <input
                    type="date"
                    name="preservation_date_from"
                    value={formData.preservation_date_from || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보존처리 종료일
                  </label>
                  <input
                    type="date"
                    name="preservation_date_to"
                    value={formData.preservation_date_to || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 space-y-4">
              <ImageUpload
                artifactId={artifact?.id || 'new'}
                currentImages={formData.images || []}
                onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="유물에 대한 추가 설명"
                />
              </div>
            </div>

          </form>

          {/* 고정 푸터 (액션 버튼) */}
          <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              취소
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const form = e.currentTarget.closest('.flex-col')?.querySelector('form');
                if (form) form.requestSubmit();
              }}
              className="px-6 py-2.5 text-sm font-medium text-white bg-amber-700 border border-transparent rounded-lg hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              {artifact ? '수정' : '등록'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ArtifactModal;

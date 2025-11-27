import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  CalendarIcon, 
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useArtifactStore, type Artifact } from '../stores/artifactStore';
import { artifactApi } from '../services/api';

interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => void;
  project?: Project;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  project 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'active' as 'active' | 'completed' | 'paused'
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status
      });
    } else {
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'active'
      });
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-2xl w-full mx-auto shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {project ? '프로젝트 수정' : '새 프로젝트'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span className="sr-only">닫기</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프로젝트명 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="프로젝트명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="프로젝트 설명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">진행 중</option>
                  <option value="completed">완료</option>
                  <option value="paused">일시 중단</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {project ? '수정' : '생성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Projects: React.FC = () => {
  const { artifacts } = useArtifactStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [selectedProjectArtifacts, setSelectedProjectArtifacts] = useState<Artifact[]>([]);
  const [isProjectArtifactsModalOpen, setIsProjectArtifactsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 프로젝트 데이터 로딩 - 실제 데이터 사용
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // artifacts가 있으면 프로젝트 목록 가져오기
        if (artifacts.length > 0) {
          const projectNames = await artifactApi.getProjects();
          
          // 프로젝트별 유물 수 계산
          const projectsWithStats: Project[] = projectNames.map((name, index) => {
            const projectArtifacts = artifacts.filter(artifact => artifact.project === name);
            
            return {
              id: `project-${index + 1}`,
              name: name,
              description: `${name} 프로젝트의 유물 관리 (${projectArtifacts.length}개의 유물)`,
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              status: projectArtifacts.length > 0 ? 'active' : 'paused',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });
          
          setProjects(projectsWithStats);
        }
      } catch (error) {
        console.error('프로젝트 데이터 로딩 실패:', error);
      }
    };
    
    loadProjects();
  }, [artifacts]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '진행 중';
      case 'completed':
        return '완료';
      case 'paused':
        return '일시 중단';
      default:
        return '알 수 없음';
    }
  };

  const handleNewProject = () => {
    setSelectedProject(undefined);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSaveProject = (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedProject) {
      // 수정
      setProjects(prev => 
        prev.map(p => 
          p.id === selectedProject.id 
            ? { ...p, ...projectData, updated_at: new Date().toISOString() }
            : p
        )
      );
    } else {
      // 새 프로젝트
      const newProject: Project = {
        ...projectData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProjects(prev => [newProject, ...prev]);
    }
    setIsModalOpen(false);
    setSelectedProject(undefined);
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('이 프로젝트를 삭제하시겠습니까?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  const getProjectArtifacts = (projectName: string) => {
    return artifacts.filter(artifact => artifact.project === projectName);
  };

  const handleViewProjectArtifacts = (project: Project) => {
    const projectArtifacts = getProjectArtifacts(project.name);
    setSelectedProject(project);
    setSelectedProjectArtifacts(projectArtifacts);
    setIsProjectArtifactsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
          <p className="text-gray-600 mt-1">총 {filteredProjects.length}개의 프로젝트가 있습니다.</p>
        </div>
        <button
          onClick={handleNewProject}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          새 프로젝트
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FolderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">진행 중</option>
              <option value="completed">완료</option>
              <option value="paused">일시 중단</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트가 없습니다</h3>
          <p className="text-gray-500 mb-4">새 프로젝트를 생성하여 시작하세요.</p>
          <button
            onClick={handleNewProject}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            첫 프로젝트 생성
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projectArtifacts = getProjectArtifacts(project.name);
            
            return (
              <div 
                key={project.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => handleViewProjectArtifacts(project)}
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FolderIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                </div>

                {/* Details */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{project.start_date} ~ {project.end_date}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <ChartBarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{projectArtifacts.length}개의 유물</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditProject(project)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="편집"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleEditProject(project)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    상세보기
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(undefined);
        }}
        onSave={handleSaveProject}
        project={selectedProject}
      />

      {/* Project Artifacts Modal */}
      {isProjectArtifactsModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedProject.name} - 유물 관리
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    총 {selectedProjectArtifacts.length}개의 유물이 있습니다.
                  </p>
                </div>
                <button
                  onClick={() => setIsProjectArtifactsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {selectedProjectArtifacts.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">유물이 없습니다</h3>
                    <p className="text-gray-500 mb-4">이 프로젝트에 등록된 유물이 없습니다.</p>
                    <button
                      onClick={() => {
                        setIsProjectArtifactsModalOpen(false);
                        // 새 유물 등록 모달로 이동
                        window.location.href = `/artifacts?project=${encodeURIComponent(selectedProject.name)}`;
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      새 유물 등록
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedProjectArtifacts.map((artifact) => (
                      <div key={artifact.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                        {/* Artifact Image */}
                        <div className="aspect-w-1 aspect-h-1 bg-gray-100">
                          {artifact.images && artifact.images.length > 0 ? (
                            <img
                              src={artifact.images[0]}
                              alt={artifact.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMzLjMzQzExNC42MDkgMTMzLjMzIDEyNi42NyAxMjEuMjY5IDEyNi42NyAxMDYuNjdDMTI2LjY3IDkyLjA2MDkgMTE0LjYwOSA4MCAxMDAgODBDODUuMzkwNSA4MCA3My4zMzA2IDkyLjA2MDkgNzMuMzMwNiAxMDYuNjdDNzMuMzMwNiAxMjEuMjY5IDg1LjM5MDUgMTMzLjMzIDEwMCAxMzMuMzNaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0xMDAgMTIwQzEwOC4yODQgMTIwIDExNSAxMTMuMjg0IDExNSAxMDVDMTE1IDk2LjcxNTcgMTA4LjI4NCA5MCAxMDAgOTBDOTEuNzE1NyA5MCA4NSA5Ni43MTU3IDg1IDEwNUM4NSAxMTMuMjg0IDkxLjcxNTcgMTIwIDEwMCAxMjBaIiBfillPSIjOUI5QjlCIi8+Cjwvc3ZnPgo=';
                              }}
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                              <PhotoIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Artifact Info */}
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 mb-1">{artifact.name}</h3>
                          <p className="text-sm text-gray-500 mb-2">{artifact.number}</p>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{artifact.era}</span>
                            <span className={`px-2 py-1 rounded-full ${
                              artifact.preservation_status === 'completed' ? 'bg-green-100 text-green-800' :
                              artifact.preservation_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {artifact.preservation_status === 'completed' ? '완료' :
                               artifact.preservation_status === 'processing' ? '처리중' : '대기'}
                            </span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex space-x-2 mt-3">
                            <button
                              onClick={() => {
                                setIsProjectArtifactsModalOpen(false);
                                window.location.href = `/artifacts/${artifact.id}`;
                              }}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              상세보기
                            </button>
                            <button
                              onClick={() => {
                                setIsProjectArtifactsModalOpen(false);
                                window.location.href = `/images?project=${encodeURIComponent(selectedProject.name)}`;
                              }}
                              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100"
                              title="이미지 관리"
                            >
                              <PhotoIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  프로젝트 기간: {selectedProject.start_date} ~ {selectedProject.end_date}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setIsProjectArtifactsModalOpen(false);
                      window.location.href = `/artifacts?project=${encodeURIComponent(selectedProject.name)}`;
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    새 유물 등록
                  </button>
                  <button
                    onClick={() => setIsProjectArtifactsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;

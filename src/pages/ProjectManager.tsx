import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../stores/projectStore'
import { useAuthStore } from '../stores/authStore'
import { useImageStore } from '../stores/imageStore'
import { Folder, Calendar, Edit, Trash2, Plus, Eye } from 'lucide-react'

export default function ProjectManager() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { projects, isLoading, error, fetchProjects, deleteProject } = useProjectStore()
  const { images } = useImageStore()

  const rawSettings = localStorage.getItem('appSettings')
  const appSettings = rawSettings ? JSON.parse(rawSettings) : { defaultView: 'grid', itemsPerPage: 20, showThumbnails: true }
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(appSettings.defaultView)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user, fetchProjects])

  const handleEditProject = (projectId: string) => {
    navigate(`/editor/${projectId}`)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('정말로 이 사업을 삭제하시겠습니까?')) {
      await deleteProject(projectId)
    }
  }

  const getProjectImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId)
    return image
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">사업 관리</h1>
          <p className="text-gray-600">저장된 편집 사업을 관리하세요</p>
        </div>

        {/* 검색 및 필터 컨트롤 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* 검색 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="사업 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 뷰 모드 토글 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className="space-y-1">
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                </div>
              </button>
            </div>

            {/* 새 프로젝트 버튼 */}
            <button
              onClick={() => navigate('/')} // 이미지 선택 페이지로 이동
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>새 사업</span>
            </button>
          </div>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* 프로젝트 목록 */}
        {!isLoading && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Folder className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">사업이 없습니다</h3>
            <p className="text-gray-600 mb-4">첫 번째 사업을 만들어보세요</p>
            <button
              onClick={() => navigate('/')} // 이미지 선택 페이지로 이동
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>새 사업 만들기</span>
            </button>
          </div>
        )}

        {/* 프로젝트 그리드 */}
        {!isLoading && projects.length > 0 && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {projects.slice(0, appSettings.itemsPerPage).map((project) => {
              const projectImage = getProjectImage(project.image_id)
              
              return (
                <div
                  key={project.id}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                    viewMode === 'list' ? 'flex items-center p-4' : ''
                  }`}
                >
                  {/* 프로젝트 이미지 */}
                  {appSettings.showThumbnails && (
                    <div className={viewMode === 'grid' 
                      ? 'aspect-video bg-gray-100 flex items-center justify-center relative'
                      : 'w-24 h-24 bg-gray-100 flex items-center justify-center flex-shrink-0 rounded-md relative'
                    }>
                      {projectImage ? (
                        <img
                          src={projectImage.url}
                          alt={project.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className="hidden text-gray-400 text-center p-4">
                        <Eye className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-xs">이미지 없음</p>
                      </div>
                      
                      {/* 프로젝트 상태 배지 */}
                      <div className="absolute top-2 right-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          최신
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 프로젝트 정보 */}
                  <div className={viewMode === 'grid' ? 'p-4' : 'ml-4 flex-1'}>
                    <h3 className="font-medium text-gray-900 mb-2" title={project.name}>
                      {project.name}
                    </h3>
                    
                    <div className="space-y-1 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(project.updated_at)}</span>
                      </div>
                      {projectImage && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                          <span className="truncate">{projectImage.filename}</span>
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className={viewMode === 'grid' 
                      ? 'flex space-x-2'
                      : 'flex space-x-2'
                    }>
                      <button
                        onClick={() => handleEditProject(project.id)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center justify-center space-x-1"
                      >
                        <Edit className="h-3 w-3" />
                        <span>편집</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

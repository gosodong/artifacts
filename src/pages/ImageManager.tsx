import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useImageStore } from '../stores/imageStore'
import { useAuthStore } from '../stores/authStore'
import { Upload, Search, Grid, List, Plus, Trash2, Eye } from 'lucide-react'

export default function ImageManager() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { images, isLoading, error, fetchImages, uploadImage, deleteImage, searchImages } = useImageStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const rawSettings = localStorage.getItem('appSettings')
  const parsedSettings = rawSettings ? JSON.parse(rawSettings) : { defaultView: 'grid', itemsPerPage: 20, showThumbnails: true }
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(parsedSettings.defaultView)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchImages()
    }
  }, [user, fetchImages])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadImage(files[i])
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchImages(query)
    } else {
      await fetchImages()
    }
  }

  const handleImageEdit = (imageId: string) => {
    navigate(`/editor/${imageId}`)
  }

  const handleDeleteImage = async (imageId: string) => {
    if (window.confirm('정말로 이 이미지를 삭제하시겠습니까?')) {
      await deleteImage(imageId)
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이미지 관리</h1>
          <p className="text-gray-600">유물 이미지를 업로드하고 관리하세요</p>
        </div>

        {/* 검색 및 업로드 컨트롤 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* 검색 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="이미지 검색..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
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
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            {/* 파일 업로드 */}
            <div className="relative">
              <input
                type="file"
                multiple
                accept="image/*,.svg,.pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                <span>{isUploading ? '업로드 중...' : '이미지 업로드'}</span>
              </button>
            </div>
          </div>

          {/* 파일 형식 안내 */}
          <div className="mt-4 text-sm text-gray-500">
            <p>지원 형식: JPG, PNG, SVG, PDF</p>
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

        {/* 이미지 그리드 */}
        {!isLoading && images.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Upload className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">이미지가 없습니다</h3>
            <p className="text-gray-600 mb-4">첫 번째 이미지를 업로드해보세요</p>
            <label className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer inline-flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>이미지 업로드</span>
              <input
                type="file"
                multiple
                accept="image/*,.svg,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* 이미지 목록 */}
        {!isLoading && images.length > 0 && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {images.slice(0, parsedSettings.itemsPerPage).map((image) => (
              <div
                key={image.id}
                className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'flex items-center p-4' : ''
                }`}
              >
                {/* 이미지 썸네일 */}
                {parsedSettings.showThumbnails && (
                  <div className={viewMode === 'grid' 
                    ? 'aspect-square bg-gray-100 flex items-center justify-center'
                    : 'w-20 h-20 bg-gray-100 flex items-center justify-center flex-shrink-0 rounded-md'
                  }>
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden text-gray-400 text-center p-4">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">이미지를 불러올 수 없습니다</p>
                    </div>
                  </div>
                )}

                {/* 이미지 정보 */}
                <div className={viewMode === 'grid' ? 'p-4' : 'ml-4 flex-1'}>
                  <h3 className="font-medium text-gray-900 truncate" title={image.filename}>
                    {image.filename}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(image.created_at).toLocaleDateString()}
                  </p>
                  {typeof image.metadata?.description === 'string' && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {image.metadata.description}
                    </p>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className={viewMode === 'grid' 
                  ? 'px-4 pb-4 flex space-x-2'
                  : 'ml-4 flex space-x-2'
                }>
                  <button
                    onClick={() => handleImageEdit(image.id)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center justify-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>편집</span>
                  </button>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

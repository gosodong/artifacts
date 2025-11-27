import { create } from 'zustand'
import { supabase } from '../../supabase/config'

interface Image {
  id: string
  user_id: string
  url: string
  filename: string
  file_type: string
  metadata: Record<string, unknown>
  created_at: string
}

interface ImageState {
  images: Image[]
  isLoading: boolean
  error: string | null
  fetchImages: () => Promise<void>
  uploadImage: (file: File, metadata?: Record<string, unknown>) => Promise<void>
  deleteImage: (imageId: string) => Promise<void>
  searchImages: (query: string) => Promise<void>
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  isLoading: false,
  error: null,

  fetchImages: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ images: data || [], isLoading: false })
    } catch (error) {
      console.error('이미지 가져오기 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '이미지를 가져오는 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  uploadImage: async (file: File, metadata: Record<string, unknown> = {}) => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      // 파일 이름 생성
      const timestamp = Date.now()
      const fileName = `${file.name}-${timestamp}`
      const filePath = `${user.id}/${fileName}`

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('artifact-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('artifact-images')
        .getPublicUrl(filePath)

      // 이미지 메타데이터 저장
      const { error: dbError } = await supabase
        .from('images')
        .insert([
          {
            user_id: user.id,
            url: publicUrl,
            filename: file.name,
            file_type: file.type,
            metadata: {
              size: file.size,
              lastModified: file.lastModified,
              ...metadata
            }
          }
        ])

      if (dbError) throw dbError

      // 이미지 목록 새로고침
      await get().fetchImages()
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  deleteImage: async (imageId: string) => {
    set({ isLoading: true, error: null })
    try {
      // 먼저 이미지 정보 가져오기
      const { data: image, error: fetchError } = await supabase
        .from('images')
        .select('*')
        .eq('id', imageId)
        .single()

      if (fetchError) throw fetchError
      if (!image) throw new Error('이미지를 찾을 수 없습니다.')

      // Storage에서 파일 삭제
      const filePath = image.url.split('/').pop() || ''
      const { error: storageError } = await supabase.storage
        .from('artifact-images')
        .remove([filePath])

      if (storageError) throw storageError

      // 데이터베이스에서 이미지 레코드 삭제
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId)

      if (dbError) throw dbError

      // 이미지 목록 새로고침
      await get().fetchImages()
    } catch (error) {
      console.error('이미지 삭제 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '이미지 삭제 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  searchImages: async (query: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .or(`filename.ilike.%${query}%,metadata->>description.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ images: data || [], isLoading: false })
    } catch (error) {
      console.error('이미지 검색 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '이미지 검색 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },
}))

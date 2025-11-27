import { create } from 'zustand'
import { supabase } from '../../supabase/config'
import * as fabric from 'fabric'

interface Layer {
  id: string
  project_id: string
  type: string
  data: unknown
  opacity: number
  visible: boolean
  order_index: number
  created_at: string
}

interface Project {
  id: string
  user_id: string
  image_id: string
  name: string
  canvas_state: unknown
  created_at: string
  updated_at: string
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  layers: Layer[]
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  createProject: (imageId: string, name: string) => Promise<void>
  loadProject: (projectId: string) => Promise<void>
  saveProject: (canvas: fabric.Canvas) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  addLayer: (layer: Omit<Layer, 'id' | 'created_at'>) => Promise<void>
  updateLayer: (layerId: string, updates: Partial<Layer>) => Promise<void>
  deleteLayer: (layerId: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  layers: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      set({ projects: data || [], isLoading: false })
    } catch (error) {
      console.error('프로젝트 가져오기 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '프로젝트를 가져오는 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  createProject: async (imageId: string, name: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            user_id: user.id,
            image_id: imageId,
            name,
            canvas_state: {}
          }
        ])
        .select()
        .single()

      if (error) throw error

      set(state => ({
        projects: [data, ...state.projects],
        currentProject: data,
        isLoading: false
      }))
    } catch (error) {
      console.error('프로젝트 생성 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '프로젝트 생성 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  loadProject: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      const { data: layers, error: layersError } = await supabase
        .from('layers')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true })

      if (layersError) throw layersError

      set({
        currentProject: project,
        layers: layers || [],
        isLoading: false
      })
    } catch (error) {
      console.error('프로젝트 로드 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '프로젝트를 로드하는 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  saveProject: async (canvas: fabric.Canvas) => {
    const { currentProject } = get()
    if (!currentProject) throw new Error('현재 프로젝트가 없습니다.')

    set({ isLoading: true, error: null })
    try {
      const canvasState = JSON.stringify(canvas.toJSON())

      const { error } = await supabase
        .from('projects')
        .update({ 
          canvas_state: canvasState,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProject.id)

      if (error) throw error

      set(state => ({
        currentProject: {
          ...state.currentProject!,
          canvas_state: canvasState,
          updated_at: new Date().toISOString()
        },
        isLoading: false
      }))
    } catch (error) {
      console.error('프로젝트 저장 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '프로젝트 저장 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  deleteProject: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
        isLoading: false
      }))
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '프로젝트 삭제 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  addLayer: async (layer: Omit<Layer, 'id' | 'created_at'>) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('layers')
        .insert([layer])
        .select()
        .single()

      if (error) throw error

      set(state => ({
        layers: [...state.layers, data],
        isLoading: false
      }))
    } catch (error) {
      console.error('레이어 추가 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '레이어 추가 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  updateLayer: async (layerId: string, updates: Partial<Layer>) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('layers')
        .update(updates)
        .eq('id', layerId)

      if (error) throw error

      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === layerId ? { ...layer, ...updates } : layer
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('레이어 업데이트 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '레이어 업데이트 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },

  deleteLayer: async (layerId: string) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('layers')
        .delete()
        .eq('id', layerId)

      if (error) throw error

      set(state => ({
        layers: state.layers.filter(layer => layer.id !== layerId),
        isLoading: false
      }))
    } catch (error) {
      console.error('레이어 삭제 오류:', error)
      set({ 
        error: error instanceof Error ? error.message : '레이어 삭제 중 오류가 발생했습니다.',
        isLoading: false 
      })
    }
  },
}))

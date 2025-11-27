import { create } from 'zustand'
import { supabase } from '../../supabase/config'

interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'expert' | 'admin'
  created_at: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // 사용자 정보 가져오기
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (userError) throw userError

        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('로그인 오류:', error)
      throw error
    }
  },

  signup: async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // 사용자 정보 저장
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              name,
              password_hash: 'temp_hash', // 실제로는 Supabase auth 사용
            },
          ])

        if (insertError) throw insertError

        set({
          user: {
            id: data.user.id,
            email,
            name,
            role: 'user',
            created_at: new Date().toISOString(),
          },
          isAuthenticated: true,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('회원가입 오류:', error)
      throw error
    }
  },

  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    } catch (error) {
      console.error('로그아웃 오류:', error)
      throw error
    }
  },

  checkAuth: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!error && userData) {
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          })
        }
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('인증 확인 오류:', error)
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))
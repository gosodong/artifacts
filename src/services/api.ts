const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api');

export interface Artifact {
  id: string;
  name: string;
  number: string;
  excavation_site: string;
  era: string;
  storage_location: string;
  processor: string;
  preservation_date: string;
  preservation_status: 'pending' | 'processing' | 'completed';
  images: string[];
  description?: string;
  category: string;
  project: string;
  created_at: string;
  updated_at: string;
  preservation_group?: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 에러 처리
const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (!response.ok) {
    let errorMessage = 'API request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid response format');
  }
};

// 유물 API
export const artifactApi = {
  // 모든 유물 조회
  getAll: async (params?: {
    search?: string;
    status?: string;
    category?: string;
    project?: string;
  }): Promise<Artifact[]> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.project) queryParams.append('project', params.project);

    const response = await fetch(`${API_BASE_URL}/artifacts?${queryParams}`);
    const result = await handleResponse<{ artifacts: Artifact[] }>(response);
    return result.data?.artifacts || [];
  },

  // 프로젝트 리스트 가져오기
  getProjects: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/projects`);
    const result = await handleResponse<string[]>(response);
    return result.data || [];
  },

  // 이미지 삭제
  deleteImage: async (artifactId: string, imagePath: string): Promise<void> => {
    const encodedPath = encodeURIComponent(imagePath);
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/images/${encodedPath}`, {
      method: 'DELETE',
    });
    const result = await handleResponse(response);
    if (!result.success) throw new Error(result.error || 'Failed to delete image');
  },

  // 특정 유물 조회
  getById: async (id: string): Promise<Artifact> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${id}`);
    const result = await handleResponse<Artifact>(response);
    if (!result.data) throw new Error('Artifact not found');
    return result.data;
  },

  // 유물 등록
  create: async (artifact: Omit<Artifact, 'id' | 'created_at' | 'updated_at'>): Promise<Artifact> => {
    const response = await fetch(`${API_BASE_URL}/artifacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(artifact),
    });
    const result = await handleResponse<Artifact>(response);
    if (!result.data) throw new Error('Failed to create artifact');
    return result.data;
  },

  // 유물 수정
  update: async (id: string, updates: Partial<Artifact> & Record<string, unknown>): Promise<Artifact> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    const result = await handleResponse<Artifact>(response);
    if (!result.data) throw new Error('Failed to update artifact');
    return result.data;
  },

  // 유물 삭제
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<null>(response);
  },

  // 통계 데이터 조회
  getStats: async (): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    recent: Artifact[];
  }> => {
    const response = await fetch(`${API_BASE_URL}/stats`);
    const result = await handleResponse<{
      total: number;
      byStatus: Record<string, number>;
      byCategory: Record<string, number>;
      recent: Artifact[];
    }>(response);
    if (!result.data) throw new Error('Failed to fetch statistics');
    return result.data;
  },

  // 이미지 업로드
  uploadImage: async (artifactId: string, file: File): Promise<{ file_path: string; file_name: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/images`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await handleResponse<{ file_path: string; file_name: string }>(response);
      
      if (!result.data) throw new Error('Failed to upload image');
      return result.data;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }
  },

  // 이미지 어노테이션 조회
  getImageAnnotations: async (artifactId: string, imagePath: string): Promise<{ annotations: unknown[]; canvas?: unknown }> => {
    const encodedPath = encodeURIComponent(imagePath);
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/annotations?imagePath=${encodedPath}`);
    const result = await handleResponse<{ annotations: unknown[]; canvas?: unknown }>(response);
    const data: any = result.data || {};
    return { annotations: data.annotations || [], canvas: data.canvas };
  },

  // 이미지 어노테이션 저장
  saveImageAnnotations: async (artifactId: string, imagePath: string, annotations: unknown): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath, annotations })
    });
    const result = await handleResponse(response);
    if (!result.success) throw new Error(result.error || 'Failed to save annotations');
  },

  // 이미지 회전 적용 (실제 파일 회전)
  rotateImage: async (artifactId: string, imagePath: string, rotation: number): Promise<{ rotated: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/images/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath, rotation })
    });
    const result = await handleResponse<{ rotated: boolean }>(response);
    if (!result.success) throw new Error(result.error || 'Failed to rotate image');
    return result.data || { rotated: false };
  },
};

// 노트 타입
export interface Note {
  id: string;
  artifact_id: string;
  title: string;
  canvas_data?: unknown;
  created_at: string;
  updated_at: string;
}

// 노트 API
export const noteApi = {
  // 유물의 노트 목록 조회
  getByArtifactId: async (artifactId: string): Promise<Note[]> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/notes`);
    const result = await handleResponse<Note[]>(response);
    return result.data || [];
  },

  // 특정 노트 조회
  getById: async (noteId: string): Promise<Note> => {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`);
    const result = await handleResponse<Note>(response);
    if (!result.data) throw new Error('Note not found');
    return result.data;
  },

  // 노트 생성
  create: async (artifactId: string, title?: string): Promise<Note> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const result = await handleResponse<Note>(response);
    if (!result.data) throw new Error('Failed to create note');
    return result.data;
  },

  // 노트 수정 (저장)
  update: async (noteId: string, data: { title?: string; canvas_data?: unknown }): Promise<Note> => {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<Note>(response);
    if (!result.data) throw new Error('Failed to update note');
    return result.data;
  },

  // 노트 삭제
  delete: async (noteId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'DELETE',
    });
    await handleResponse<null>(response);
  },
};

// 헬스 체크
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await fetch(`${API_BASE_URL}/health`);
  const result = await handleResponse<{ status: string; timestamp: string }>(response);
  if (!result.data) throw new Error('Health check failed');
  return result.data;
};

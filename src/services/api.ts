const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api');

// 이미지 URL을 절대 경로로 변환
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  // 상대 경로인 경우 현재 origin 기준으로 절대 경로 생성
  const baseUrl = window.location.origin;
  return `${baseUrl}${imagePath}`;
};

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

  // 이미지 내보내기
  exportImage: async (
    artifactId: string,
    imagePath: string,
    format: 'png' | 'jpg' | 'jpeg' | 'webp' | 'tiff',
    quality?: number
  ): Promise<{ file_path: string; format: string }> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/images/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath, format, quality })
    });
    const result = await handleResponse<{ file_path: string; format: string }>(response);
    if (!result.data) throw new Error('Failed to export image');
    return result.data;
  },

  // 어노테이션을 SVG로 내보내기
  exportAnnotationsToSVG: async (
    artifactId: string,
    svg: string,
    name?: string
  ): Promise<{ file_path: string }> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/annotations/export-svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svg, name })
    });
    const result = await handleResponse<{ file_path: string }>(response);
    if (!result.data) throw new Error('Failed to export SVG');
    return result.data;
  },

  exportPreservationCardHTML: async (
    artifactId: string,
    html: string,
    name?: string
  ): Promise<{ file_path: string }> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/preservation-card/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, name })
    });
    const result = await handleResponse<{ file_path: string }>(response);
    if (!result.data) throw new Error('Failed to export preservation card');
    return result.data;
  },

  // 타임랩스 프레임 저장
  saveTimelapseFrame: async (
    artifactId: string,
    dataUrl: string,
    timelineId: string,
    stepIndex?: number,
    annotations?: unknown
  ): Promise<{ file_path: string; timeline_id: string; step_index: number | null }> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/timelapse/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_url: dataUrl, timeline_id: timelineId, step_index: stepIndex, annotations })
    });
    const result = await handleResponse<{ file_path: string; timeline_id: string; step_index: number | null }>(response);
    if (!result.data) throw new Error('Failed to save timelapse frame');
    return result.data;
  },

  // 타임랩스 프레임 조회
  getTimelapseFrames: async (
    artifactId: string,
    timelineId: string
  ): Promise<Array<{ file_path: string; file_name: string; step_index: number | null }>> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/timelapse/${timelineId}`);
    const result = await handleResponse<Array<{ file_path: string; file_name: string; step_index: number | null }>>(response);
    if (!result.data) return [];
    return result.data;
  },

  // 통합 상태 조회
  getIntegrationStatus: async (): Promise<{ google: { client_id: boolean; client_secret: boolean; redirect_uri: string }; onedrive: { client_id: boolean; client_secret: boolean; redirect_uri: string } }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/status`)
    const result = await handleResponse<{ google: { client_id: boolean; client_secret: boolean; redirect_uri: string }; onedrive: { client_id: boolean; client_secret: boolean; redirect_uri: string } }>(response)
    if (!result.data) throw new Error('Failed to get integration status')
    return result.data
  },

  // Google OAuth 시작 URL
  getGoogleStartUrl: async (): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/integrations/google/start`)
    const result = await handleResponse<{ url: string }>(response)
    if (!result.data) throw new Error('Failed to get Google start URL')
    return result.data.url
  },

  // OneDrive OAuth 시작 URL
  getOneDriveStartUrl: async (): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/integrations/onedrive/start`)
    const result = await handleResponse<{ url: string }>(response)
    if (!result.data) throw new Error('Failed to get OneDrive start URL')
    return result.data.url
  },

  // 토큰 저장
  saveIntegrationToken: async (provider: 'google' | 'onedrive', token: unknown): Promise<{ stored: boolean; file: string }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${provider}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const result = await handleResponse<{ stored: boolean; file: string }>(response)
    if (!result.data) throw new Error('Failed to store integration token')
    return result.data
  },

  // 백업
  listBackups: async (): Promise<Array<{ name: string; created_at: string }>> => {
    const response = await fetch(`${API_BASE_URL}/backup/list`)
    const result = await handleResponse<Array<{ name: string; created_at: string }>>(response)
    return result.data || []
  },
  createBackup: async (): Promise<{ name: string; path: string }> => {
    const response = await fetch(`${API_BASE_URL}/backup/create`, { method: 'POST' })
    const result = await handleResponse<{ name: string; path: string }>(response)
    if (!result.data) throw new Error('Failed to create backup')
    return result.data
  },
  restoreBackup: async (name: string): Promise<{ restored: boolean; name: string }> => {
    const response = await fetch(`${API_BASE_URL}/backup/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const result = await handleResponse<{ restored: boolean; name: string }>(response)
    if (!result.data) throw new Error('Failed to restore backup')
    return result.data
  },

  // 파일 암호 보호
  protectFile: async (artifactId: string, filePath: string, password: string): Promise<{ file_path: string }> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/protect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_path: filePath, password }) })
    const result = await handleResponse<{ file_path: string }>(response)
    if (!result.data) throw new Error('Failed to protect file')
    return result.data
  },
  unprotectFile: async (artifactId: string, encPath: string, password: string): Promise<{ file_path: string }> => {
    const response = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/unprotect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_path: encPath, password }) })
    const result = await handleResponse<{ file_path: string }>(response)
    if (!result.data) throw new Error('Failed to unprotect file')
    return result.data
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

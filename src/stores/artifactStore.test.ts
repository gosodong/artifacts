import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArtifactStore } from './artifactStore';
import { artifactApi } from '../services/api';

// Mock the API
vi.mock('../src/services/api', () => ({
  artifactApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('useArtifactStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store
    const { result } = renderHook(() => useArtifactStore());
    act(() => {
      result.current.setError(null);
      result.current.artifacts = [];
    });
  });

  describe('fetchArtifacts', () => {
    it('should fetch and set artifacts successfully', async () => {
      const mockArtifacts = [
        {
          id: '1',
          name: '청동 거울',
          number: 'ART-2024-001',
          excavation_site: '경주',
          era: '삼국시대',
          storage_location: '창고 A-1',
          processor: '김보존',
          preservation_date: '2024-01-15',
          preservation_status: 'completed' as const,
          images: [],
          description: '테스트 유물',
          category: '청동기',
          project: '경주 발굴',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      (artifactApi.getAll as unknown as jest.Mock).mockResolvedValueOnce(mockArtifacts);

      const { result } = renderHook(() => useArtifactStore());

      await act(async () => {
        await result.current.fetchArtifacts();
      });

      expect(result.current.artifacts).toEqual(mockArtifacts);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(artifactApi.getAll).toHaveBeenCalledWith();
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch');
      (artifactApi.getAll as unknown as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useArtifactStore());

      await act(async () => {
        await result.current.fetchArtifacts();
      });

      expect(result.current.artifacts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch');
    });
  });

  describe('addArtifact', () => {
    it('should add a new artifact successfully', async () => {
      const newArtifact = {
        name: '새 유물',
        number: 'ART-2024-002',
        excavation_site: '서울',
        era: '조선시대',
        storage_location: '창고 B-1',
        processor: '이학예',
        preservation_date: '2024-02-01',
        preservation_status: 'pending' as const,
        images: [],
        description: '새로운 유물',
        category: '도기',
        project: '서울 조사'
      };

      const createdArtifact = {
        ...newArtifact,
        id: '2',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z'
      };

      (artifactApi.create as unknown as jest.Mock).mockResolvedValueOnce(createdArtifact);

      const { result } = renderHook(() => useArtifactStore());

      await act(async () => {
        await result.current.addArtifact(newArtifact);
      });

      expect(result.current.artifacts).toContainEqual(createdArtifact);
      expect(result.current.isLoading).toBe(false);
      expect(artifactApi.create).toHaveBeenCalledWith(newArtifact);
    });

    it('should handle add errors', async () => {
      const error = new Error('Failed to create');
      (artifactApi.create as unknown as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useArtifactStore());

      await expect(act(async () => {
        await result.current.addArtifact({} as unknown as StoreArtifact);
      })).rejects.toThrow('Failed to create');

      expect(result.current.error).toBe('Failed to create');
    });
  });

  describe('updateArtifact', () => {
    it('should update an artifact successfully', async () => {
      const existingArtifact = {
        id: '1',
        name: '기존 유물',
        number: 'ART-2024-001',
        excavation_site: '경주',
        era: '삼국시대',
        storage_location: '창고 A-1',
        processor: '김보존',
        preservation_date: '2024-01-15',
        preservation_status: 'completed' as const,
        images: [],
        description: '기존 유물',
        category: '청동기',
        project: '경주 발굴',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const updates = { name: '업데이트된 이름' };
      const updatedArtifact = { ...existingArtifact, ...updates };

      // Set initial state
      const { result } = renderHook(() => useArtifactStore());
      act(() => {
        result.current.artifacts = [existingArtifact];
      });

      (artifactApi.update as unknown as jest.Mock).mockResolvedValueOnce(updatedArtifact);

      await act(async () => {
        await result.current.updateArtifact('1', updates);
      });

      expect(result.current.artifacts[0].name).toBe('업데이트된 이름');
      expect(artifactApi.update).toHaveBeenCalledWith('1', updates);
    });
  });

  describe('deleteArtifact', () => {
    it('should delete an artifact successfully', async () => {
      const existingArtifact = {
        id: '1',
        name: '기존 유물',
        number: 'ART-2024-001',
        excavation_site: '경주',
        era: '삼국시대',
        storage_location: '창고 A-1',
        processor: '김보존',
        preservation_date: '2024-01-15',
        preservation_status: 'completed' as const,
        images: [],
        description: '기존 유물',
        category: '청동기',
        project: '경주 발굴',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Set initial state
      const { result } = renderHook(() => useArtifactStore());
      act(() => {
        result.current.artifacts = [existingArtifact];
      });

      (artifactApi.delete as unknown as jest.Mock).mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.deleteArtifact('1');
      });

      expect(result.current.artifacts).toEqual([]);
      expect(artifactApi.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('searchArtifacts', () => {
    it('should search artifacts by name', () => {
      const artifacts = [
        {
          id: '1',
          name: '청동 거울',
          number: 'ART-2024-001',
          excavation_site: '경주',
          era: '삼국시대',
          storage_location: '창고 A-1',
          processor: '김보존',
          preservation_date: '2024-01-15',
          preservation_status: 'completed' as const,
          images: [],
          description: '테스트 유물',
          category: '청동기',
          project: '경주 발굴',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: '도자기 항아리',
          number: 'ART-2024-002',
          excavation_site: '전주',
          era: '조선시대',
          storage_location: '창고 B-1',
          processor: '이학예',
          preservation_date: '2024-02-01',
          preservation_status: 'pending' as const,
          images: [],
          description: '또 다른 유물',
          category: '도기',
          project: '전주 조사',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z'
        }
      ];

      const { result } = renderHook(() => useArtifactStore());
      act(() => {
        result.current.artifacts = artifacts;
      });

      const searchResults = result.current.searchArtifacts('청동');

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('청동 거울');
    });

    it('should search artifacts by number', () => {
      const artifacts = [
        {
          id: '1',
          name: '청동 거울',
          number: 'ART-2024-001',
          excavation_site: '경주',
          era: '삼국시대',
          storage_location: '창고 A-1',
          processor: '김보존',
          preservation_date: '2024-01-15',
          preservation_status: 'completed' as const,
          images: [],
          description: '테스트 유물',
          category: '청동기',
          project: '경주 발굴',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const { result } = renderHook(() => useArtifactStore());
      act(() => {
        result.current.artifacts = artifacts;
      });

      const searchResults = result.current.searchArtifacts('2024-001');

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('1');
    });
  });

  describe('getArtifactsByStatus', () => {
    it('should filter artifacts by status', () => {
      const artifacts = [
        {
          id: '1',
          name: '청동 거울',
          number: 'ART-2024-001',
          excavation_site: '경주',
          era: '삼국시대',
          storage_location: '창고 A-1',
          processor: '김보존',
          preservation_date: '2024-01-15',
          preservation_status: 'completed' as const,
          images: [],
          description: '테스트 유물',
          category: '청동기',
          project: '경주 발굴',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: '도자기 항아리',
          number: 'ART-2024-002',
          excavation_site: '전주',
          era: '조선시대',
          storage_location: '창고 B-1',
          processor: '이학예',
          preservation_date: '2024-02-01',
          preservation_status: 'pending' as const,
          images: [],
          description: '또 다른 유물',
          category: '도기',
          project: '전주 조사',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z'
        }
      ];

      const { result } = renderHook(() => useArtifactStore());
      act(() => {
        result.current.artifacts = artifacts;
      });

      const completedArtifacts = result.current.getArtifactsByStatus('completed');

      expect(completedArtifacts).toHaveLength(1);
      expect(completedArtifacts[0].preservation_status).toBe('completed');
    });
  });
});

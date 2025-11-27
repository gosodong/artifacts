import { describe, it, expect, vi, beforeEach } from 'vitest';
import { artifactApi } from './api';

// Mock fetch
global.fetch = vi.fn();

describe('artifactApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all artifacts successfully', async () => {
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
          preservation_status: 'completed',
          images: [],
          description: '테스트 유물',
          category: '청동기',
          project: '경주 발굴',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { artifacts: mockArtifacts } })
      });

      const result = await artifactApi.getAll();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/artifacts?');
      expect(result).toEqual(mockArtifacts);
    });

    it('should handle search parameters', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { artifacts: [] } })
      });

      await artifactApi.getAll({ search: '청동', status: 'completed' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/artifacts?search=%EC%B2%AD%EB%8F%99&status=completed'
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' })
      });

      await expect(artifactApi.getAll()).rejects.toThrow('Server error');
    });
  });

  describe('create', () => {
    it('should create a new artifact successfully', async () => {
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

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: createdArtifact })
      });

      const result = await artifactApi.create(newArtifact);

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArtifact)
      });
      expect(result).toEqual(createdArtifact);
    });
  });

  describe('update', () => {
    it('should update an artifact successfully', async () => {
      const updates = { name: '업데이트된 이름' };
      const updatedArtifact = {
        id: '1',
        name: '업데이트된 이름',
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
        updated_at: '2024-01-02T00:00:00Z'
      };

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: updatedArtifact })
      });

      const result = await artifactApi.update('1', updates);

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/artifacts/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      expect(result).toEqual(updatedArtifact);
    });
  });

  describe('delete', () => {
    it('should delete an artifact successfully', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await artifactApi.delete('1');

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/artifacts/1', {
        method: 'DELETE'
      });
    });
  });

  describe('getStats', () => {
    it('should fetch statistics successfully', async () => {
      const mockStats = {
        total: 10,
        byStatus: { pending: 3, processing: 4, completed: 3 },
        byCategory: { '청동기': 5, '도기': 3, '서적': 2 },
        recent: []
      };

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats })
      });

      const result = await artifactApi.getStats();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/stats');
      expect(result).toEqual(mockStats);
    });
  });
});

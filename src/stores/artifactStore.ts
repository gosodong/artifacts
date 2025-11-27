import { create } from 'zustand';
import { artifactApi } from '../services/api';

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
  treatment_location?: string;
  treatment_team?: string;
  preservation_date_from?: string;
  preservation_date_to?: string;
  preservation_group?: unknown;
  created_at: string;
  updated_at: string;
}

interface ArtifactStore {
  artifacts: Artifact[];
  projects: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchArtifacts: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  addArtifact: (artifact: Omit<Artifact, 'id' | 'created_at' | 'updated_at'>) => Promise<Artifact>;
  updateArtifact: (id: string, updates: Partial<Artifact>) => Promise<void>;
  deleteArtifact: (id: string) => Promise<void>;
  getArtifactById: (id: string) => Artifact | undefined;
  getArtifactsByStatus: (status: Artifact['preservation_status']) => Artifact[];
  getArtifactsByProject: (project: string) => Artifact[];
  getArtifactsByCategory: (category: string) => Artifact[];
  searchArtifacts: (query: string) => Artifact[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useArtifactStore = create<ArtifactStore>((set, get) => ({
  artifacts: [],
  projects: [],
  isLoading: false,
  error: null,

  fetchArtifacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const artifacts = await artifactApi.getAll();
      set({ artifacts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await artifactApi.getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addArtifact: async (artifact) => {
    set({ isLoading: true, error: null });
    try {
      const newArtifact = await artifactApi.create(artifact);
      set((state) => ({
        artifacts: [newArtifact, ...state.artifacts],
        isLoading: false
      }));
      return newArtifact; // 생성된 유물 반환
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateArtifact: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedArtifact = await artifactApi.update(id, updates);
      set((state) => ({
        artifacts: state.artifacts.map((artifact) =>
          artifact.id === id ? updatedArtifact : artifact
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteArtifact: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await artifactApi.delete(id);
      set((state) => ({
        artifacts: state.artifacts.filter((artifact) => artifact.id !== id),
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  getArtifactById: (id) => {
    return get().artifacts.find((artifact) => artifact.id === id);
  },

  getArtifactsByStatus: (status) => {
    return get().artifacts.filter((artifact) => artifact.preservation_status === status);
  },

  getArtifactsByProject: (project) => {
    return get().artifacts.filter((artifact) => 
      artifact.project.toLowerCase().includes(project.toLowerCase())
    );
  },

  getArtifactsByCategory: (category) => {
    return get().artifacts.filter((artifact) => 
      artifact.category.toLowerCase().includes(category.toLowerCase())
    );
  },

  searchArtifacts: (query) => {
    const lowercaseQuery = query.toLowerCase();
    return get().artifacts.filter((artifact) =>
      artifact.name.toLowerCase().includes(lowercaseQuery) ||
      artifact.number.toLowerCase().includes(lowercaseQuery) ||
      artifact.excavation_site.toLowerCase().includes(lowercaseQuery) ||
      artifact.era.toLowerCase().includes(lowercaseQuery) ||
      artifact.category.toLowerCase().includes(lowercaseQuery) ||
      artifact.project.toLowerCase().includes(lowercaseQuery)
    );
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },
}));

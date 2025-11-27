import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PrinterIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { useArtifactStore, Artifact } from '../stores/artifactStore';
import { artifactApi, noteApi, Note } from '../services/api';
import VectorAnnotationEditor from '../components/Images/VectorAnnotationEditor';
import NoteEditor from '../components/Notes/NoteEditor';
import { Toaster, toast } from 'sonner';

// 보존그룹 항목 타입
interface PreservationGroup {
  beforeState: {
    photo: boolean;
    material: boolean;
    dimensions: boolean;
    investigation: boolean;
  };
  process: {
    stabilization: boolean;
    reinforcement: boolean;
    bonding: boolean;
    restoration: boolean;
  };
  afterState: {
    damsRegistration: boolean;
    precautions: boolean;
  };
}

// 확장된 Artifact 타입
interface ExtendedArtifact extends Artifact {
  treatment_location?: string;
  treatment_team?: string;
  preservation_date_from?: string;
  preservation_date_to?: string;
  preservation_group?: PreservationGroup;
}

const defaultPreservationGroup: PreservationGroup = {
  beforeState: { photo: false, material: false, dimensions: false, investigation: false },
  process: { stabilization: false, reinforcement: false, bonding: false, restoration: false },
  afterState: { damsRegistration: false, precautions: false },
};

const ArtifactDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deleteArtifact } = useArtifactStore();
  const [artifact, setArtifact] = useState<ExtendedArtifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 보존그룹 상태
  const [preservationGroup, setPreservationGroup] = useState<PreservationGroup>(defaultPreservationGroup);

  // 이미지 편집 모달 상태
  const [showEditor, setShowEditor] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editorAnnotations, setEditorAnnotations] = useState<unknown>(null);
  
  // 이미지별 회전 상태 캐시
  // 이미지 회전 캐시는 에디터에서 처리하므로 별도 상태 불필요

  // 노트 상태
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // 기본 정보 편집 모드
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ExtendedArtifact>>({});
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const loadArtifact = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (id) {
        const data = await artifactApi.getById(id);
        setArtifact(data as ExtendedArtifact);
        // 보존그룹 데이터 로드
        if (data && 'preservation_group' in data && data.preservation_group) {
          try {
            const raw = data.preservation_group;
            const pg = typeof raw === 'string' ? JSON.parse(raw) : (raw as PreservationGroup);
            setPreservationGroup(pg);
          } catch {
            setPreservationGroup(defaultPreservationGroup);
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // 노트 목록 로드
  const loadNotes = React.useCallback(async () => {
    if (!id) return;
    setIsLoadingNotes(true);
    try {
      const noteList = await noteApi.getByArtifactId(id);
      setNotes(noteList);
    } catch (err) {
      console.error('노트 목록 로드 실패:', err);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [id]);

  // 이미지별 회전 정보 로드
  // 이미지 회전 정보는 에디터에서 실시간 반영

  useEffect(() => {
    loadArtifact();
    loadNotes();
  }, [loadArtifact, loadNotes]);

  // 이미지 회전 정보의 별도 로드는 불필요

  // 보존그룹 토글 핸들러
  const togglePreservationItem = async (
    section: 'beforeState' | 'process' | 'afterState',
    item: string
  ) => {
    const newGroup = {
      ...preservationGroup,
      [section]: {
        ...preservationGroup[section],
        [item]: !preservationGroup[section][item as keyof typeof preservationGroup[typeof section]],
      },
    };
    setPreservationGroup(newGroup);
    
    // 자동 저장
    if (id) {
      try {
        await artifactApi.update(id, { preservation_group: JSON.stringify(newGroup) });
      } catch (err) {
        console.error('보존그룹 저장 실패:', err);
      }
    }
  };

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await artifactApi.uploadImage(id, files[i]);
      }
      toast.success(`${files.length}개 이미지가 업로드되었습니다.`);
      await loadArtifact();
    } catch (err) {
      toast.error(`업로드 실패: ${(err as Error).message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 이미지 삭제
  const handleDeleteImage = async (imagePath: string) => {
    if (!id || !window.confirm('이 이미지를 삭제하시겠습니까?')) return;
    try {
      await artifactApi.deleteImage(id, imagePath);
      toast.success('이미지가 삭제되었습니다.');
      await loadArtifact();
    } catch (err) {
      toast.error(`삭제 실패: ${(err as Error).message}`);
    }
  };

  // 이미지 편집
  const handleEditImage = async (imagePath: string) => {
    if (!id) return;
    setSelectedImage(imagePath);
    try {
      const { annotations, canvas } = await artifactApi.getImageAnnotations(id, imagePath);
      setEditorAnnotations(canvas ?? (annotations.length > 0 ? annotations : null));
    } catch {
      setEditorAnnotations(null);
    }
    setShowEditor(true);
  };

  // 어노테이션 저장
  const handleSaveAnnotations = async (data: unknown) => {
    if (!id || !selectedImage) return;
    try {
      await artifactApi.saveImageAnnotations(id, selectedImage, data);
      toast.success('어노테이션이 저장되었습니다.');
    } catch (err) {
      toast.error(`저장 실패: ${(err as Error).message}`);
    }
  };

  // 이미지 다운로드
  const handleDownloadImage = (imagePath: string) => {
    const url = imagePath.startsWith('http') ? imagePath : imagePath;
    const link = document.createElement('a');
    link.href = url;
    link.download = imagePath.split('/').pop() || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 보존카드 삭제
  const handleDeleteArtifact = async () => {
    if (!id || !window.confirm('이 보존카드를 삭제하시겠습니까? 모든 이미지도 함께 삭제됩니다.')) return;
    try {
      await deleteArtifact(id);
      toast.success('보존카드가 삭제되었습니다.');
      navigate('/artifacts');
    } catch (err) {
      toast.error(`삭제 실패: ${(err as Error).message}`);
    }
  };

  // 인쇄
  const handlePrint = () => {
    window.print();
  };

  // 편집 모드 시작
  const handleStartEdit = () => {
    if (artifact) {
      setEditForm({
        name: artifact.name,
        number: artifact.number,
        project: artifact.project,
        excavation_site: artifact.excavation_site,
        era: artifact.era,
        storage_location: artifact.storage_location,
        processor: artifact.processor,
        treatment_location: artifact.treatment_location,
        treatment_team: artifact.treatment_team,
        preservation_date_from: artifact.preservation_date_from,
        preservation_date_to: artifact.preservation_date_to,
        description: artifact.description,
      });
      setIsEditMode(true);
    }
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm({});
  };

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await artifactApi.update(id, editForm as Record<string, unknown>);
      toast.success('기본 정보가 저장되었습니다.');
      setIsEditMode(false);
      await loadArtifact();
    } catch (err) {
      toast.error(`저장 실패: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 편집 폼 변경
  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // 노트 생성
  const handleCreateNote = async () => {
    if (!id) return;
    try {
      const newNote = await noteApi.create(id, '새 노트');
      setSelectedNote(newNote);
      setShowNoteEditor(true);
      await loadNotes();
    } catch (err) {
      toast.error(`노트 생성 실패: ${(err as Error).message}`);
    }
  };

  // 노트 열기
  const handleOpenNote = async (note: Note) => {
    try {
      const fullNote = await noteApi.getById(note.id);
      setSelectedNote(fullNote);
      setShowNoteEditor(true);
    } catch (err) {
      toast.error(`노트 로드 실패: ${(err as Error).message}`);
    }
  };

  // 노트 저장
  const handleSaveNote = async (data: { title: string; canvas: unknown }) => {
    if (!selectedNote) return;
    try {
      await noteApi.update(selectedNote.id, {
        title: data.title,
        canvas_data: data.canvas,
      });
      toast.success('노트가 저장되었습니다.');
      await loadNotes();
    } catch (err) {
      toast.error(`노트 저장 실패: ${(err as Error).message}`);
    }
  };

  // 노트 삭제
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('이 노트를 삭제하시겠습니까?')) return;
    try {
      await noteApi.delete(noteId);
      toast.success('노트가 삭제되었습니다.');
      await loadNotes();
    } catch (err) {
      toast.error(`노트 삭제 실패: ${(err as Error).message}`);
    }
  };

  // 보존그룹 체크박스 컴포넌트 (컴팩트 버전)
  const PreservationCheckItem: React.FC<{
    label: string;
    checked: boolean;
    onChange: () => void;
  }> = ({ label, checked, onChange }) => (
    <button
      onClick={onChange}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all text-xs ${
        checked
          ? 'border-amber-400 bg-amber-50 text-amber-700'
          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
      }`}
    >
      {checked ? (
        <CheckCircleSolidIcon className="h-3.5 w-3.5 text-amber-500" />
      ) : (
        <CheckCircleIcon className="h-3.5 w-3.5 text-gray-300" />
      )}
      <span className="font-medium">{label}</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">보존카드 상세</h1>
        <p className="text-gray-600 mb-4">{error || '보존카드 정보를 불러올 수 없습니다.'}</p>
        <button
          onClick={() => navigate('/artifacts')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <Toaster position="top-right" />

      {/* 헤더 - 인쇄 시 숨김 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/artifacts')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">보존처리 카드</h1>
                <p className="text-sm text-gray-500">{artifact.number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <PrinterIcon className="h-4 w-4" />
                인쇄
              </button>
              {isEditMode ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-700 rounded-lg hover:bg-amber-800 disabled:opacity-50"
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4" />
                  수정
                </button>
              )}
              <button
                onClick={handleDeleteArtifact}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100"
              >
                <TrashIcon className="h-4 w-4" />
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 보고서 본문 */}
      <div className="max-w-6xl mx-auto px-6 py-8 print:px-0 print:py-0">
        {/* 보고서 컨테이너 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
          
          {/* 보고서 헤더 */}
          <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-8 py-5 print:bg-amber-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="h-7 w-7" />
                <div>
                  <h1 className="text-xl font-bold">보존처리 카드</h1>
                  <p className="text-amber-200 text-xs">Conservation Treatment Card</p>
                </div>
              </div>
              <div className="text-right print:block hidden">
                <p className="text-amber-200 text-xs">문서번호</p>
                <p className="font-mono font-semibold">{artifact.number}</p>
              </div>
            </div>
          </div>

          {/* 기본 메타 정보 */}
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
              기본 정보
              {isEditMode && <span className="text-xs text-amber-600 font-normal">(편집 중)</span>}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 사업명 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">사업명</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.project || ''}
                    onChange={(e) => handleEditFormChange('project', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.project || '-'}</dd>
                )}
              </div>
              {/* 명칭 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">명칭</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.name}</dd>
                )}
              </div>
              {/* 번호 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">번호</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.number || ''}
                    onChange={(e) => handleEditFormChange('number', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.number}</dd>
                )}
              </div>
              {/* 출토지 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">출토지</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.excavation_site || ''}
                    onChange={(e) => handleEditFormChange('excavation_site', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.excavation_site || '-'}</dd>
                )}
              </div>
              {/* 시대 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">시대</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.era || ''}
                    onChange={(e) => handleEditFormChange('era', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.era || '-'}</dd>
                )}
              </div>
              {/* 소장처 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">소장처</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.storage_location || ''}
                    onChange={(e) => handleEditFormChange('storage_location', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.storage_location || '-'}</dd>
                )}
              </div>
              {/* 처리자 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">처리자</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.processor || ''}
                    onChange={(e) => handleEditFormChange('processor', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.processor || '-'}</dd>
                )}
              </div>
              {/* 보존처리일 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">보존처리일</dt>
                {isEditMode ? (
                  <div className="flex gap-1 items-center">
                    <input
                      type="date"
                      value={editForm.preservation_date_from || ''}
                      onChange={(e) => handleEditFormChange('preservation_date_from', e.target.value)}
                      className="flex-1 text-xs text-gray-900 bg-white border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <span className="text-gray-400">~</span>
                    <input
                      type="date"
                      value={editForm.preservation_date_to || ''}
                      onChange={(e) => handleEditFormChange('preservation_date_to', e.target.value)}
                      className="flex-1 text-xs text-gray-900 bg-white border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">
                    {artifact.preservation_date_from && artifact.preservation_date_to
                      ? `${artifact.preservation_date_from} ~ ${artifact.preservation_date_to}`
                      : artifact.preservation_date || '-'}
                  </dd>
                )}
              </div>
              {/* 처리장소 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">처리장소</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.treatment_location || ''}
                    onChange={(e) => handleEditFormChange('treatment_location', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.treatment_location || '-'}</dd>
                )}
              </div>
              {/* 처리팀 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">처리팀</dt>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.treatment_team || ''}
                    onChange={(e) => handleEditFormChange('treatment_team', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <dd className="text-sm font-semibold text-gray-900">{artifact.treatment_team || '-'}</dd>
                )}
              </div>
            </div>
          </div>

          {/* 보존그룹 - 컴팩트 버전 */}
          <div className="px-8 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              보존처리 그룹
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. 보존처리 전 상태 */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  보존처리 전 상태
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <PreservationCheckItem
                    label="사진"
                    checked={preservationGroup.beforeState.photo}
                    onChange={() => togglePreservationItem('beforeState', 'photo')}
                  />
                  <PreservationCheckItem
                    label="재질"
                    checked={preservationGroup.beforeState.material}
                    onChange={() => togglePreservationItem('beforeState', 'material')}
                  />
                  <PreservationCheckItem
                    label="제원"
                    checked={preservationGroup.beforeState.dimensions}
                    onChange={() => togglePreservationItem('beforeState', 'dimensions')}
                  />
                  <PreservationCheckItem
                    label="조사"
                    checked={preservationGroup.beforeState.investigation}
                    onChange={() => togglePreservationItem('beforeState', 'investigation')}
                  />
                </div>
              </div>

              {/* 2. 보존처리 과정 */}
              <div className="bg-green-50 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  보존처리 과정
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <PreservationCheckItem
                    label="안정화"
                    checked={preservationGroup.process.stabilization}
                    onChange={() => togglePreservationItem('process', 'stabilization')}
                  />
                  <PreservationCheckItem
                    label="강화"
                    checked={preservationGroup.process.reinforcement}
                    onChange={() => togglePreservationItem('process', 'reinforcement')}
                  />
                  <PreservationCheckItem
                    label="접합"
                    checked={preservationGroup.process.bonding}
                    onChange={() => togglePreservationItem('process', 'bonding')}
                  />
                  <PreservationCheckItem
                    label="복원"
                    checked={preservationGroup.process.restoration}
                    onChange={() => togglePreservationItem('process', 'restoration')}
                  />
                </div>
              </div>

              {/* 3. 보존처리 후 상태 */}
              <div className="bg-purple-50 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-purple-800 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                  보존처리 후 상태
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <PreservationCheckItem
                    label="DAMS등록"
                    checked={preservationGroup.afterState.damsRegistration}
                    onChange={() => togglePreservationItem('afterState', 'damsRegistration')}
                  />
                  <PreservationCheckItem
                    label="주의점"
                    checked={preservationGroup.afterState.precautions}
                    onChange={() => togglePreservationItem('afterState', 'precautions')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
              상세 설명
            </h2>
            {isEditMode ? (
              <textarea
                value={editForm.description || ''}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                rows={4}
                className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                placeholder="유물에 대한 상세 설명을 입력하세요"
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {artifact.description || '설명이 없습니다.'}
              </p>
            )}
          </div>

          {/* 이미지 관리 */}
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
                <PhotoIcon className="h-5 w-5" />
                이미지 관리 ({artifact.images?.length || 0})
              </h2>
              <div className="relative print:hidden">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-700 rounded-lg hover:bg-amber-800 disabled:opacity-50"
                  disabled={isUploading}
                >
                  <PlusIcon className="h-4 w-4" />
                  {isUploading ? '업로드 중...' : '이미지 추가'}
                </button>
              </div>
            </div>

            {artifact.images && artifact.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {artifact.images.map((img, idx) => (
                  <div key={idx} className="group relative aspect-square">
                    <img
                      src={img}
                      alt={`${artifact.name} 이미지 ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                      crossOrigin="anonymous"
                    />
                    {/* 호버 시 액션 버튼 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 print:hidden">
                      <button
                        onClick={() => window.open(`${img}`, '_blank')}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 shadow-lg"
                        title="보기"
                      >
                        <EyeIcon className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => handleEditImage(img)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 shadow-lg"
                        title="편집"
                      >
                        <PencilIcon className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDownloadImage(img)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 shadow-lg"
                        title="다운로드"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 shadow-lg"
                        title="삭제"
                      >
                        <TrashIcon className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <PhotoIcon className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 text-sm font-medium">이미지가 없습니다</p>
                <p className="text-gray-400 text-xs mt-1">위 버튼을 클릭하여 이미지를 추가하세요</p>
              </div>
            )}
          </div>

          {/* 노트 관리 */}
          <div className="px-8 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
                <BookOpenIcon className="h-5 w-5" />
                노트 ({notes.length})
              </h2>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-700 rounded-lg hover:bg-amber-800 print:hidden"
              >
                <PlusIcon className="h-4 w-4" />
                노트 추가
              </button>
            </div>

            {isLoadingNotes ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700"></div>
              </div>
            ) : notes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleOpenNote(note)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <BookOpenIcon className="h-5 w-5 text-amber-700" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 line-clamp-1">{note.title}</h3>
                          <p className="text-xs text-gray-500">
                            {note.updated_at ? new Date(note.updated_at).toLocaleDateString('ko-KR') : '-'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all print:hidden"
                        title="삭제"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="h-20 bg-white rounded-lg border border-amber-100 flex items-center justify-center">
                      <span className="text-xs text-gray-400">클릭하여 편집</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-dashed border-amber-300">
                <BookOpenIcon className="h-12 w-12 text-amber-400 mb-3" />
                <p className="text-amber-700 text-sm font-medium">노트가 없습니다</p>
                <p className="text-amber-500 text-xs mt-1">위 버튼을 클릭하여 노트를 추가하세요</p>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>등록일: {artifact.created_at ? new Date(artifact.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                <span>수정일: {artifact.updated_at ? new Date(artifact.updated_at).toLocaleDateString('ko-KR') : '-'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>이미지: {artifact.images?.length || 0}건</span>
                <span>노트: {notes.length}건</span>
              </div>
            </div>
            {/* 인쇄용 서명란 */}
            <div className="hidden print:block mt-8 pt-6 border-t border-gray-300">
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-8">작성자</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm">{artifact.processor || '　'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-8">검토자</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm"> </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-8">승인자</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm"> </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 편집 모달 */}
      {showEditor && selectedImage && artifact && (
        <VectorAnnotationEditor
          imageUrl={`${selectedImage}?t=${Date.now()}`}
          imageName={selectedImage.split('/').pop() || '이미지'}
          imagePath={selectedImage}
          artifactId={artifact.id}
          onClose={() => {
            setShowEditor(false);
            setSelectedImage(null);
            setEditorAnnotations(null);
          }}
          onSave={handleSaveAnnotations}
          onRotateApplied={() => {
            // 이미지 회전 적용 후 새로고침
            loadArtifact();
          }}
          initialAnnotations={editorAnnotations}
        />
      )}

      {/* 노트 편집 모달 */}
      {showNoteEditor && selectedNote && (
        <NoteEditor
          noteId={selectedNote.id}
          noteTitle={selectedNote.title}
          onClose={() => {
            setShowNoteEditor(false);
            setSelectedNote(null);
          }}
          onSave={handleSaveNote}
          initialData={selectedNote.canvas_data ? { canvas: selectedNote.canvas_data } : undefined}
        />
      )}
    </div>
  );
};

export default ArtifactDetail;

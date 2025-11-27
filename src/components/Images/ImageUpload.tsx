import React, { useState, useRef } from 'react';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  PencilIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { artifactApi } from '../../services/api';
import { toast } from 'sonner';
import VectorAnnotationEditor from './VectorAnnotationEditor';

interface ImageUploadProps {
  artifactId: string;
  currentImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  artifactId,
  currentImages,
  onImagesChange,
  maxImages = 10,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 편집 모달 상태
  const [showEditor, setShowEditor] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editorAnnotations, setEditorAnnotations] = useState<unknown>(null);

  // 이미지별 회전 상태 캐시
  const [imageRotations, setImageRotations] = useState<Record<string, number>>({});
  // 이미지 캐시 무효화용 타임스탬프
  const [imageTimestamps, setImageTimestamps] = useState<Record<string, number>>({});

  // 이미지 회전 정보 로드
  React.useEffect(() => {
    const loadRotations = async () => {
      if (artifactId === 'new') return;
      
      const rotations: Record<string, number> = {};
      for (const imageUrl of currentImages) {
        if (imageUrl.startsWith('blob:')) continue;
        try {
          const { canvas } = await artifactApi.getImageAnnotations(artifactId, imageUrl);
          if (typeof canvas === 'object' && canvas !== null && 'imageRotation' in (canvas as Record<string, unknown>)) {
            const rot = (canvas as { imageRotation?: number }).imageRotation;
            if (typeof rot === 'number') {
              rotations[imageUrl] = rot;
            }
          }
        } catch {
          // 무시
        }
      }
      setImageRotations(rotations);
    };
    loadRotations();
  }, [artifactId, currentImages]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (currentImages.length + files.length > maxImages) {
      toast.error(`최대 ${maxImages}개의 이미지만 업로드 가능합니다.`);
      return;
    }

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} 파일이 너무 큽니다. (최대 10MB)`);
          continue;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name} 파일 형식이 지원되지 않습니다.`);
          continue;
        }


        if (artifactId === 'new') {
          const tempImageUrl = URL.createObjectURL(file);
          newImages.push(tempImageUrl);
          toast.success(`${file.name} 준비 완료`);
        } else {
          try {
            const result = await artifactApi.uploadImage(artifactId, file);
            newImages.push(result.file_path);
            toast.success(`${file.name} 업로드 완료`);
          } catch {
            toast.error(`${file.name} 업로드 실패`);
          }
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...currentImages, ...newImages]);
      }
    } catch {
      toast.error('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = currentImages[index];
    const isTemp = imageUrl.startsWith('blob:');

    if (!isTemp && artifactId !== 'new') {
      // 서버에서 이미지 삭제
      try {
        await artifactApi.deleteImage(artifactId, imageUrl);
        toast.success('이미지가 삭제되었습니다.');
      } catch {
        toast.error('이미지 삭제 실패');
        return;
      }
    }

    const updatedImages = currentImages.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
  };

  const handleViewImage = (imageUrl: string) => {
    const fullUrl = imageUrl.startsWith('http') || imageUrl.startsWith('blob:')
      ? imageUrl
      : imageUrl;
    window.open(fullUrl, '_blank');
  };

  const handleDownloadImage = (imageUrl: string) => {
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : imageUrl;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = imageUrl.split('/').pop() || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditImage = async (imageUrl: string) => {
    if (artifactId === 'new' || imageUrl.startsWith('blob:')) {
      toast.error('저장된 이미지만 편집할 수 있습니다.');
      return;
    }

    setEditingImage(imageUrl);
    try {
      const { annotations, canvas } = await artifactApi.getImageAnnotations(artifactId, imageUrl);
      setEditorAnnotations(canvas ?? (annotations.length > 0 ? annotations : null));
    } catch {
      setEditorAnnotations(null);
    }
    setShowEditor(true);
  };

  const handleSaveAnnotations = async (data: unknown) => {
    if (!editingImage || artifactId === 'new') return;
    try {
      await artifactApi.saveImageAnnotations(artifactId, editingImage, data);
      // 회전 상태 즉시 반영
      if (typeof data === 'object' && data !== null && 'imageRotation' in data) {
        const rotation = (data as { imageRotation: number }).imageRotation;
        if (typeof rotation === 'number') {
          setImageRotations(prev => ({ ...prev, [editingImage]: rotation }));
        }
      }
      toast.success('어노테이션이 저장되었습니다.');
    } catch {
      toast.error('어노테이션 저장 실패');
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">이미지 관리</label>
        <span className="text-sm text-gray-500">
          {currentImages.length} / {maxImages}
        </span>
      </div>

      {/* 이미지 목록 */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {currentImages.map((imageUrl, index) => {
            const isTemp = imageUrl.startsWith('blob:');
            const timestamp = imageTimestamps[imageUrl] || '';
            const imgSrc = isTemp ? imageUrl : `http://localhost:3001${imageUrl}${timestamp ? `?t=${timestamp}` : ''}`;

            return (
              <div
                key={index}
                className="relative group bg-gray-100 rounded-lg overflow-hidden"
              >
                {/* 이미지 */}
                <div className="aspect-square overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={`이미지 ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      transform: imageRotations[imageUrl] ? `rotate(${imageRotations[imageUrl]}deg)` : undefined,
                    }}
                  />
                </div>

                {/* 호버 오버레이 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  {/* 보기 */}
                  <button
                    type="button"
                    onClick={() => handleViewImage(imageUrl)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 shadow"
                    title="보기"
                  >
                    <EyeIcon className="h-4 w-4 text-gray-700" />
                  </button>

                  {/* 편집 (저장된 이미지만) */}
                  {!isTemp && artifactId !== 'new' && (
                    <button
                      type="button"
                      onClick={() => handleEditImage(imageUrl)}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 shadow"
                      title="편집"
                    >
                      <PencilIcon className="h-4 w-4 text-blue-600" />
                    </button>
                  )}

                  {/* 다운로드 (저장된 이미지만) */}
                  {!isTemp && (
                    <button
                      type="button"
                      onClick={() => handleDownloadImage(imageUrl)}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 shadow"
                      title="다운로드"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 text-green-600" />
                    </button>
                  )}

                  {/* 삭제 */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 shadow"
                    title="삭제"
                  >
                    <XMarkIcon className="h-4 w-4 text-red-600" />
                  </button>
                </div>

                {/* 임시 이미지 배지 */}
                {isTemp && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded">
                    저장 대기
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 업로드 영역 */}
      {currentImages.length < maxImages && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex items-center justify-center gap-3">
            {isUploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            ) : (
              <ArrowUpTrayIcon className="h-5 w-5 text-gray-400" />
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              {isUploading ? '업로드 중...' : '이미지 추가'}
            </button>

            <span className="text-xs text-gray-400">PNG, JPG, WEBP (최대 10MB)</span>
          </div>
        </div>
      )}

      {/* 이미지 편집 모달 */}
      {showEditor && editingImage && (
        <VectorAnnotationEditor
          imageUrl={`${editingImage}?t=${Date.now()}`}
          imageName={editingImage.split('/').pop() || '이미지'}
          imagePath={editingImage}
          artifactId={artifactId}
          onClose={() => {
            setShowEditor(false);
            setEditingImage(null);
            setEditorAnnotations(null);
          }}
          onSave={handleSaveAnnotations}
          onRotateApplied={() => {
            // 이미지 회전이 적용되면 캐시 무효화
            setImageRotations(prev => {
              const newRotations = { ...prev };
              delete newRotations[editingImage];
              return newRotations;
            });
            // 타임스탬프 갱신으로 이미지 리로드
            setImageTimestamps(prev => ({
              ...prev,
              [editingImage]: Date.now()
            }));
          }}
          initialAnnotations={editorAnnotations}
        />
      )}
    </div>
  );
};

export default ImageUpload;

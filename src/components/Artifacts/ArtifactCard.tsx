import React from 'react';
import { CalendarIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/outline';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useLongPress, useTabletGestures } from '../../hooks/useTouchGestures';

interface Artifact {
  id: string;
  name: string;
  number: string;
  excavation_site: string;
  era: string;
  storage_location: string;
  processor: string;
  images: string[];
  description?: string;
  category: string;
  project: string;
}

interface ArtifactCardProps {
  artifact: Artifact;
  onView: (artifact: Artifact) => void;
  onEdit?: (artifact: Artifact) => void;
  onDelete: (artifact: Artifact) => void;
}

const ArtifactCard: React.FC<ArtifactCardProps> = ({ 
  artifact, 
  onView, 
  onDelete 
}) => {
  const { isTablet } = useTabletGestures();

  // 롱 프레스로 삭제 메뉴 표시 (태블릿용)
  const longPressProps = useLongPress(
    () => {
      if (isTablet && window.confirm(`'${artifact.name}' 유물을 삭제하시겠습니까?`)) {
        onDelete(artifact);
      }
    },
    () => onView(artifact),
    { delay: 500 }
  );

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer select-none"
      {...(isTablet ? longPressProps : {})}
    >
      {/* Image */}
      {(() => {
        const raw = localStorage.getItem('appSettings');
        const { showThumbnails = true } = raw ? JSON.parse(raw) : {};
        if (!showThumbnails) return null;
        return (
          <div className="aspect-w-16 aspect-h-9 bg-gray-100">
            {artifact.images.length > 0 ? (
              <img
                src={artifact.images[0]}
                alt={artifact.name}
                className="w-full h-48 object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">이미지 없음</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{artifact.name}</h3>
          <p className="text-sm text-gray-500">{artifact.number}</p>
        </div>

        {/* Description */}
        {artifact.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{artifact.description}</p>
        )}

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>{artifact.excavation_site}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>{artifact.era}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>{artifact.processor}</span>
          </div>
        </div>

        {/* Category and Project */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            {artifact.category}
          </span>
          <span className="text-xs text-gray-500">{artifact.project}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            onClick={() => onView(artifact)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="상세 보기"
          >
            <EyeIcon className="h-4 w-4" />
            <span>상세보기</span>
          </button>
          <button
            onClick={() => onDelete(artifact)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="삭제"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtifactCard;

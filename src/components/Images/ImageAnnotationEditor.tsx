import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

interface ImageAnnotationEditorProps {
  imageUrl: string;
  imageName: string;
  onClose: () => void;
  onSave: (annotations: Annotation[]) => void;
  initialAnnotations?: Annotation[];
  autoStart?: boolean;
}

const ImageAnnotationEditor: React.FC<ImageAnnotationEditorProps> = ({
  imageUrl,
  imageName,
  onClose,
  onSave,
  initialAnnotations = [],
  autoStart = true
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState<boolean>(autoStart);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  const drawAnnotations = React.useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing annotations
    annotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      
      // Draw annotation text
      ctx.fillStyle = annotation.color;
      ctx.font = '14px Arial';
      ctx.fillText(annotation.text, annotation.x + 5, annotation.y - 5);
    });

    // Draw current annotation being drawn
    if (currentAnnotation) {
      ctx.strokeStyle = currentAnnotation.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(currentAnnotation.x, currentAnnotation.y, currentAnnotation.width, currentAnnotation.height);
    }
  }, [annotations, currentAnnotation]);

  useEffect(() => {
    if (imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      
      const loadImage = () => {
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        setImageLoaded(true);
        drawAnnotations();
      };
      
      if (img.complete) {
        loadImage();
      } else {
        img.onload = loadImage;
        img.onerror = () => {
          console.error('이미지 로딩 실패:', imageUrl);
        };
      }
    }
  }, [imageUrl, drawAnnotations]);

  useEffect(() => {
    if (imageLoaded) {
      drawAnnotations();
    }
  }, [annotations, imageLoaded, currentAnnotation, drawAnnotations]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showAnnotationPanel) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentAnnotation({
      id: Date.now().toString(),
      x,
      y,
      width: 0,
      height: 0,
      text: '새 어노테이션',
      color: colors[annotations.length % colors.length]
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = x - startPoint.x;
    const height = y - startPoint.y;
    
    setCurrentAnnotation({
      ...currentAnnotation,
      width: Math.abs(width),
      height: Math.abs(height),
      x: width < 0 ? x : startPoint.x,
      y: height < 0 ? y : startPoint.y
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation) return;
    
    setIsDrawing(false);
    if (currentAnnotation.width > 10 && currentAnnotation.height > 10) {
      setAnnotations([...annotations, currentAnnotation]);
    }
    setCurrentAnnotation(null);
  };

  // 선택된 어노테이션 관리

  const updateAnnotationText = (annotationId: string, text: string) => {
    setAnnotations(annotations.map(ann => 
      ann.id === annotationId ? { ...ann, text } : ann
    ));
  };

  const deleteAnnotation = (annotationId: string) => {
    setAnnotations(annotations.filter(ann => ann.id !== annotationId));
    setSelectedAnnotation(null);
  };

  const handleSave = () => {
    onSave(annotations);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">이미지 어노테이션 - {imageName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAnnotationPanel(!showAnnotationPanel)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showAnnotationPanel 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              어노테이션 추가
            </button>
            <span className="text-sm text-gray-500">
              {annotations.length}개의 어노테이션
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              저장
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              취소
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Image Viewer */}
          <div className="flex-1 relative overflow-auto bg-gray-100 p-4">
            <div className="flex justify-center items-center min-h-full">
              <div 
                className={`relative inline-block ${showAnnotationPanel ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={imageName}
                  className="max-w-full max-h-[calc(90vh-200px)] border border-gray-300 rounded shadow-sm"
                  crossOrigin="anonymous"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Annotation Panel */}
          {showAnnotationPanel && (
            <div className="w-80 border-l bg-white p-4 overflow-y-auto flex-shrink-0">
              <h3 className="font-semibold text-gray-900 mb-4">어노테이션 목록</h3>
              <div className="space-y-3">
                {annotations.map((annotation, index) => (
                  <div
                    key={annotation.id}
                    className={`p-3 border rounded-lg ${
                      selectedAnnotation === annotation.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className="text-sm font-medium">어노테이션 {index + 1}</span>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(annotation.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                    <input
                      type="text"
                      value={annotation.text}
                      onChange={(e) => updateAnnotationText(annotation.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="어노테이션 텍스트"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      위치: ({Math.round(annotation.x)}, {Math.round(annotation.y)}) | 
                      크기: {Math.round(annotation.width)}×{Math.round(annotation.height)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImageAnnotationEditor;

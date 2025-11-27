import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PencilIcon, 
  BackspaceIcon, 
  ArrowUturnLeftIcon, 
  ArrowUturnRightIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

interface ImageEditorProps {
  imageUrl: string;
  onSave: (annotatedImage: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
}

const ImageEditor: React.FC<ImageEditorProps> = ({
  imageUrl,
  onSave,
  onCancel,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(2);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [history, setHistory] = useState<DrawingPath[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 색상 팔레트
  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  // 도구 너비 옵션
  const widths = [1, 2, 3, 5, 8, 12];

  // 이미지 로드
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // 캔버스 크기 설정
      canvas.width = width;
      canvas.height = height;
      
      // 이미지 비율 계산
      const scale = Math.min(width / img.width, height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // 중앙 정렬을 위한 위치 계산
      const x = (width - scaledWidth) / 2;
      const y = (height - scaledHeight) / 2;
      
      // 이미지 그리기
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      setImageLoaded(true);
    };

    img.src = imageUrl;
  }, [imageUrl, width, height]);

  // 그리기 경로 재그리기
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 배경 이미지 다시 그리기
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      
      const scale = Math.min(width / img.width, height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (width - scaledWidth) / 2;
      const y = (height - scaledHeight) / 2;
      
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      // 모든 그리기 경로 다시 그리기
      paths.forEach(path => {
        drawPath(ctx, path);
      });
      
      // 현재 그리는 경로가 있다면 그리기
      if (currentPath) {
        drawPath(ctx, currentPath);
      }
    };

    img.src = imageUrl;
  }, [imageUrl, width, height, paths, currentPath]);

  // 개별 경로 그리기
  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);

    // 곡선으로 부드럽게 그리기
    for (let i = 1; i < path.points.length - 1; i++) {
      const midPoint = {
        x: (path.points[i].x + path.points[i + 1].x) / 2,
        y: (path.points[i].y + path.points[i + 1].y) / 2
      };
      ctx.quadraticCurveTo(path.points[i].x, path.points[i].y, midPoint.x, midPoint.y);
    }

    // 마지막 점까지 그리기
    if (path.points.length > 1) {
      const lastPoint = path.points[path.points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    }

    // 스타일 적용
    ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = path.tool === 'highlighter' ? `${path.color}40` : path.color;
    ctx.lineWidth = path.tool === 'highlighter' ? path.width * 3 : path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.stroke();
  };

  // 마우스/터치 이벤트
  const getPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!imageLoaded) return;
    
    const point = getPoint(e);
    const newPath: DrawingPath = {
      points: [point],
      color: currentColor,
      width: currentWidth,
      tool: currentTool
    };
    
    setCurrentPath(newPath);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!isDrawing || !currentPath || !imageLoaded) return;
    
    const point = getPoint(e);
    setCurrentPath(prev => ({
      ...prev!,
      points: [...prev!.points, point]
    }));
    
    redrawCanvas();
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentPath) return;
    
    const newPaths = [...paths, currentPath];
    setPaths(newPaths);
    setCurrentPath(null);
    setIsDrawing(false);
    
    // 히스토리에 추가
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPaths);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 실행 취소
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
    }
  };

  // 재실행
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
    }
  };

  // 저장
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');
    onSave(dataURL);
  };

  // 경로가 변경될 때마다 다시 그리기
  useEffect(() => {
    redrawCanvas();
  }, [paths, currentPath, redrawCanvas]);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentTool('pen')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'pen' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
              title="펜"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setCurrentTool('highlighter')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'highlighter' 
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
              title="형광펜"
            >
              <CircleStackIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setCurrentTool('eraser')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'eraser' 
                  ? 'bg-red-100 text-red-700 border border-red-300' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
              title="지우개"
            >
              <BackspaceIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Colors */}
          <div className="flex items-center space-x-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  currentColor === color 
                    ? 'border-gray-800 scale-110' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Width */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">굵기:</span>
            <select
              value={currentWidth}
              onChange={(e) => setCurrentWidth(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {widths.map(width => (
                <option key={width} value={width}>
                  {width}px
                </option>
              ))}
            </select>
          </div>

          {/* History */}
          <div className="flex items-center space-x-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="실행 취소"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="재실행"
            >
              <ArrowUturnRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            
            <button
              onClick={saveImage}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="p-4 bg-gray-50">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
            style={{ maxWidth: '100%', height: 'auto' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            width={width}
            height={height}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="text-sm text-gray-600 space-y-1">
          <p>• 마우스나 터치로 그림을 그릴 수 있습니다.</p>
          <p>• 도구, 색상, 굵기를 선택하여 다양한 효과를 낼 수 있습니다.</p>
          <p>• 실행 취소/재실행 버튼으로 실수를 되돌릴 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;

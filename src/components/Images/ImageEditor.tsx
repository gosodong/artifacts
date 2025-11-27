import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PencilIcon, 
  BackspaceIcon, 
  ArrowUturnLeftIcon, 
  ArrowUturnRightIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface StrokePoint {
  x: number;
  y: number;
  w: number;
}

interface DrawingPath {
  points: StrokePoint[];
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
  const [showSettings, setShowSettings] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

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

    for (let i = 1; i < path.points.length; i++) {
      const p0 = path.points[i - 1];
      const p1 = path.points[i];
      ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = path.tool === 'highlighter' ? `${path.color}40` : path.color;
      const baseWidth = path.tool === 'highlighter' ? path.width * 3 : path.width;
      const segWidth = Math.max(0.5, baseWidth * (p1.w || 1));
      ctx.lineWidth = segWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
      ctx.stroke();
    }
  };

  // 마우스/터치 이벤트
  const getPoint = (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, w: 1 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    let pressure = 1;

    if ('pointerType' in e) {
      clientX = (e as React.PointerEvent).clientX;
      clientY = (e as React.PointerEvent).clientY;
      const p = (e as React.PointerEvent).pressure;
      pressure = typeof p === 'number' && p > 0 ? p : 1;
    } else if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      w: Math.min(1, Math.max(0.2, pressure))
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
      {/* Compact Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Drawing Tools */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'pen' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="펜"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setCurrentTool('highlighter')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'highlighter' 
                    ? 'bg-yellow-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="형광펜"
              >
                <CircleStackIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'eraser' 
                    ? 'bg-red-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="지우개"
              >
                <BackspaceIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Color Picker Button */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                title="색상 선택"
              >
                <div 
                  className="w-6 h-6 rounded border-2 border-gray-300"
                  style={{ backgroundColor: currentColor }}
                />
                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
              </button>
              
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setCurrentColor(color);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                          currentColor === color 
                            ? 'border-gray-800 ring-2 ring-blue-500' 
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg border transition-colors ${
                showSettings 
                  ? 'bg-gray-200 text-gray-700 border-gray-400' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="설정"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Center: History Controls */}
          <div className="flex items-center bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="실행 취소"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="재실행"
            >
              <ArrowUturnRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            
            <button
              onClick={saveImage}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
          </div>
        </div>

        {/* Settings Panel (Collapsible) */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">굵기:</span>
                <div className="flex items-center gap-1">
                  {widths.map(width => (
                    <button
                      key={width}
                      onClick={() => setCurrentWidth(width)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        currentWidth === width
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {width}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  현재 도구: <span className="font-medium text-gray-700">
                    {currentTool === 'pen' ? '펜' : currentTool === 'highlighter' ? '형광펜' : '지우개'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="p-4 bg-gray-50">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
            style={{ maxWidth: '100%', height: 'auto' }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            width={width}
            height={height}
          />
        </div>
      </div>

      {/* Compact Instructions */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500 text-center">
          마우스나 터치로 그림을 그릴 수 있습니다 • 설정 버튼으로 굵기 조절
        </p>
      </div>
    </div>
  );
};

export default ImageEditor;

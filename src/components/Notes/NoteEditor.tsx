import React, { useEffect, useRef, useState, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  Pencil,
  Highlighter,
  Type,
  Eraser,
  Save,
  Undo2,
  Redo2,
  Trash2,
  Minus,
  Plus,
} from 'lucide-react';
import * as fabric from 'fabric';

interface NoteEditorProps {
  noteId: string;
  noteTitle?: string;
  onClose: () => void;
  onSave: (data: unknown) => void;
  initialData?: unknown;
}

// RGBA 변환 함수
const toRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  noteTitle = '새 노트',
  onClose,
  onSave,
  initialData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 도구 상태
  const [selectedTool, setSelectedTool] = useState<string>('pen');
  const [brushColor, setBrushColor] = useState('#1e3a8a');
  const [brushWidth, setBrushWidth] = useState(3);
  const [title, setTitle] = useState(noteTitle);
  const [isSaving, setIsSaving] = useState(false);

  // Undo/Redo 스택
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isUndoRedoRef = useRef(false);

  // Refs for event handlers
  const selectedToolRef = useRef(selectedTool);
  const brushColorRef = useRef(brushColor);
  const brushWidthRef = useRef(brushWidth);

  const paletteColors = [
    '#000000',
    '#1e3a8a',
    '#EF4444',
    '#F59E0B',
    '#10B981',
    '#06B6D4',
    '#6366F1',
    '#F472B6',
  ];

  // Sync refs
  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);
  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);
  useEffect(() => {
    brushWidthRef.current = brushWidth;
  }, [brushWidth]);

  // 캔버스 상태 저장
  const saveCanvasState = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    setUndoStack(prev => [...prev.slice(-29), json]);
    setRedoStack([]);
  }, []);

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    fabricCanvasRef.current = canvas;

    // 브러시 설정
    const PencilBrushCtor = (fabric as unknown as { PencilBrush: new (c: fabric.Canvas) => fabric.BaseBrush }).PencilBrush;
    canvas.freeDrawingBrush = new PencilBrushCtor(canvas);
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColorRef.current as string;
      canvas.freeDrawingBrush.width = brushWidthRef.current;
    }

    // 초기 데이터 로드
    if (typeof initialData === 'object' && initialData !== null && 'canvas' in initialData) {
      // fabric.js v6에서 loadFromJSON 버그 우회
      // objects 배열을 직접 추가하는 방식 사용
      setTimeout(async () => {
        try {
          const canvasData = (initialData as { canvas: unknown }).canvas;
          const jsonData = typeof canvasData === 'string' 
            ? JSON.parse(canvasData) 
            : canvasData as { objects?: unknown[]; background?: string };
          
          if (jsonData.objects && Array.isArray(jsonData.objects)) {
            for (const objData of jsonData.objects) {
              try {
                const obj = await fabric.util.enlivenObjects([objData as Record<string, unknown>]);
                if (obj && obj[0]) {
                  canvas.add(obj[0] as fabric.FabricObject);
                }
              } catch (objErr) {
                console.warn('객체 로드 실패:', objErr);
              }
            }
          }
          
          canvas.backgroundColor = jsonData.background || '#ffffff';
          canvas.renderAll();
          saveCanvasState();
        } catch (e) {
          console.error('노트 데이터 로드 실패:', e);
        }
      }, 100);
    } else {
      // 초기 상태 저장
      saveCanvasState();
    }

    // 오브젝트 추가 시 상태 저장
    canvas.on('object:added', () => {
      if (!isUndoRedoRef.current) {
        saveCanvasState();
      }
    });

    canvas.on('object:modified', () => {
      if (!isUndoRedoRef.current) {
        saveCanvasState();
      }
    });

    // 리사이즈 핸들러
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      canvas.setDimensions({ width: newWidth, height: newHeight });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [initialData, saveCanvasState]);

  // 도구 변경 시 캔버스 모드 설정
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (selectedTool === 'pen' || selectedTool === 'highlighter') {
      canvas.isDrawingMode = true;
      if (!canvas.freeDrawingBrush) {
        const PencilBrushCtor2 = (fabric as unknown as { PencilBrush: new (c: fabric.Canvas) => fabric.BaseBrush }).PencilBrush;
        canvas.freeDrawingBrush = new PencilBrushCtor2(canvas);
      }
      const color = selectedTool === 'highlighter' ? toRgba(brushColor, 0.4) : brushColor;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color as string;
        canvas.freeDrawingBrush.width = selectedTool === 'highlighter' ? brushWidth * 3 : brushWidth;
      }
    } else if (selectedTool === 'eraser') {
      canvas.isDrawingMode = true;
      const PencilBrushCtor3 = (fabric as unknown as { PencilBrush: new (c: fabric.Canvas) => fabric.BaseBrush }).PencilBrush;
      canvas.freeDrawingBrush = new PencilBrushCtor3(canvas);
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.freeDrawingBrush.width = brushWidth * 5;
      }
    } else {
      canvas.isDrawingMode = false;
    }

    canvas.selection = selectedTool === 'select';
  }, [selectedTool, brushColor, brushWidth]);

  // 텍스트 추가
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const text = new fabric.Textbox('텍스트를 입력하세요', {
      left: canvas.getWidth() / 2 - 80,
      top: canvas.getHeight() / 2 - 15,
      fill: brushColor,
      fontSize: 18,
      fontFamily: 'Pretendard, sans-serif',
      width: 200,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    setSelectedTool('select');
  };

  // 캔버스 상태 복원 헬퍼 함수
  const restoreCanvasState = useCallback(async (canvas: fabric.Canvas, stateJson: string) => {
    try {
      const jsonData = JSON.parse(stateJson);
      
      // 기존 객체 모두 제거
      const objects = canvas.getObjects();
      objects.forEach(obj => canvas.remove(obj));
      
      // 새 객체 추가
      if (jsonData.objects && Array.isArray(jsonData.objects)) {
        for (const objData of jsonData.objects) {
          try {
            const obj = await fabric.util.enlivenObjects([objData]);
            if (obj && obj[0]) {
              canvas.add(obj[0] as fabric.FabricObject);
            }
          } catch (objErr) {
            console.warn('객체 복원 실패:', objErr);
          }
        }
      }
      
      canvas.backgroundColor = jsonData.background || '#ffffff';
      canvas.renderAll();
    } catch (e) {
      console.error('캔버스 상태 복원 실패:', e);
    }
  }, []);

  // Undo
  const handleUndo = useCallback(async () => {
    if (undoStack.length <= 1) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isUndoRedoRef.current = true;
    const currentState = undoStack[undoStack.length - 1];
    const prevState = undoStack[undoStack.length - 2];

    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));

    await restoreCanvasState(canvas, prevState);
    isUndoRedoRef.current = false;
  }, [undoStack, restoreCanvasState]);

  // Redo
  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isUndoRedoRef.current = true;
    const nextState = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(prev => prev.slice(0, -1));

    await restoreCanvasState(canvas, nextState);
    isUndoRedoRef.current = false;
  }, [redoStack, restoreCanvasState]);

  // 전체 지우기
  const handleClear = useCallback(() => {
    if (!window.confirm('노트 내용을 모두 지우시겠습니까?')) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // fabric.js v6에서는 getObjects()로 모든 객체를 가져와서 제거
    const objects = canvas.getObjects();
    objects.forEach(obj => canvas.remove(obj));
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    saveCanvasState();
  }, [saveCanvasState]);

  // 저장
  const handleSave = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const canvasJson = canvas.toJSON();
      const saveData = {
        title,
        canvas: canvasJson,
        updatedAt: new Date().toISOString(),
      };
      await onSave(saveData);
    } finally {
      setIsSaving(false);
    }
  }, [title, onSave]);

  // 키보드 단축키
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
        e.preventDefault();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if (isCtrl && e.key.toLowerCase() === 's') {
        handleSave();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleSave]);

  // 툴 버튼 컴포넌트
  const ToolButton: React.FC<{
    tool: string;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
  }> = ({ tool, icon, label, onClick }) => (
    <button
      type="button"
      onClick={onClick || (() => setSelectedTool(tool))}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
        selectedTool === tool
          ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
          : 'bg-white text-gray-600 hover:bg-gray-100'
      }`}
      title={label}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pencil className="h-6 w-6" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-b border-white/50 focus:border-white outline-none text-lg font-semibold placeholder-white/70"
              placeholder="노트 제목"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 툴바 */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* 도구 버튼들 */}
            <div className="flex items-center gap-2">
              <ToolButton tool="pen" icon={<Pencil className="h-5 w-5" />} label="펜" />
              <ToolButton tool="highlighter" icon={<Highlighter className="h-5 w-5" />} label="형광펜" />
              <ToolButton tool="text" icon={<Type className="h-5 w-5" />} label="텍스트" onClick={addText} />
              <ToolButton tool="eraser" icon={<Eraser className="h-5 w-5" />} label="지우개" />
              <ToolButton tool="select" icon={<span className="text-lg">↖</span>} label="선택" />
            </div>

            {/* 색상 팔레트 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 mr-1">색상</span>
              <div className="flex gap-1">
                {paletteColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      brushColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 굵기 조절 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">굵기</span>
              <button
                onClick={() => setBrushWidth(Math.max(1, brushWidth - 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{brushWidth}</span>
              <button
                onClick={() => setBrushWidth(Math.min(20, brushWidth + 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Undo/Redo/Clear */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={undoStack.length <= 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                title="실행 취소 (Ctrl+Z)"
              >
                <Undo2 className="h-5 w-5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                title="다시 실행 (Ctrl+Y)"
              >
                <Redo2 className="h-5 w-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={handleClear}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                title="전체 지우기"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 캔버스 영역 */}
        <div
          ref={containerRef}
          className="flex-1 bg-gray-50 p-4 overflow-hidden"
          style={{ minHeight: '400px' }}
        >
          <div className="w-full h-full bg-white rounded-lg shadow-inner border border-gray-200 overflow-hidden">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Ctrl+Z: 실행 취소 | Ctrl+Y: 다시 실행 | Ctrl+S: 저장</span>
          <span>노트 ID: {noteId}</span>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;

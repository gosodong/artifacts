import React, { useEffect, useRef, useState, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  Pencil,
  Highlighter,
  Move,
  Type,
  Minus,
  Square,
  Circle as CircleIcon,
  Save,
  X as XIcon,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import * as fabric from 'fabric';

type SerializedObject = Record<string, unknown>;

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  objects: SerializedObject[];
}

interface VectorAnnotationEditorProps {
  imageUrl: string;
  imageName: string;
  imagePath?: string; // 서버 경로 (회전 적용용)
  artifactId?: string; // 유물 ID (회전 적용용)
  onClose: () => void;
  onSave: (annotations: unknown) => void;
  onRotateApplied?: () => void; // 회전 적용 후 콜백
  initialAnnotations?: unknown;
}

const VectorAnnotationEditor: React.FC<VectorAnnotationEditorProps> = ({
  imageUrl,
  imageName,
  imagePath,
  artifactId,
  onClose,
  onSave,
  onRotateApplied,
  initialAnnotations,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // 레이어 상태
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-1', name: '레이어 1', visible: true, objects: [] },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-1');

  // 도구 상태
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [brushColor, setBrushColor] = useState('#1e3a8a');
  const [brushWidth, setBrushWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);
  const bgImageRef = useRef<fabric.Image | null>(null);

  // Refs
  const selectedToolRef = useRef<string>('select');
  const brushColorRef = useRef<string>(brushColor);
  const brushWidthRef = useRef<number>(brushWidth);
  const activeLayerIdRef = useRef<string>('layer-1');
  const layersRef = useRef<Layer[]>(layers);
  const isDrawingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggingShapeRef = useRef<fabric.Object | null>(null);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<Layer[][]>([]);
  const [redoStack, setRedoStack] = useState<Layer[][]>([]);

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
  useEffect(() => {
    if (selectedTool === 'pen') {
      setBrushWidth(2);
    } else if (selectedTool === 'highlighter') {
      setBrushWidth(10);
    } else if (selectedTool === 'line' || selectedTool === 'rect' || selectedTool === 'circle') {
      setBrushWidth(1);
    }
  }, [selectedTool]);
  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const toRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(
      h.length === 3
        ? h
            .split('')
            .map((c) => c + c)
            .join('')
        : h,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const genId = () => `obj-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  // 레이어에 오브젝트 추가
  const addObjectToActiveLayer = useCallback((obj: fabric.Object) => {
    const objJson = (obj as fabric.Object).toJSON() as unknown as SerializedObject;
    const objId = genId();
    objJson.id = objId;
    objJson.layerId = activeLayerIdRef.current;

    setLayers((prev) => {
      const newLayers = prev.map((layer) => {
        if (layer.id === activeLayerIdRef.current) {
          return { ...layer, objects: [...layer.objects, objJson] };
        }
        return layer;
      });
      // Undo 스택에 이전 상태 저장
      setUndoStack((stack) => [...stack.slice(-49), prev]);
      setRedoStack([]);
      return newLayers;
    });
  }, []);

  // 캔버스에 레이어 오브젝트들 렌더링
  const renderLayersToCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // 배경 이미지 보존
    const bgImage = (canvas as unknown as { backgroundImage?: fabric.Image | null }).backgroundImage || null;

    // 모든 오브젝트 제거
    canvas.clear();

    // 배경 이미지 복원
    if (bgImage) {
      (canvas as unknown as { backgroundImage?: fabric.Image | null }).backgroundImage = bgImage;
    }

    // 레이어 순서대로 오브젝트 추가
    const allObjects: SerializedObject[] = [];
    layersRef.current.forEach((layer) => {
      if (layer.visible) {
        layer.objects.forEach((objJson) => {
          allObjects.push({ ...objJson, layerId: layer.id });
        });
      }
    });

    if (allObjects.length === 0) {
      canvas.requestRenderAll();
      return;
    }

    const enliven = fabric.util.enlivenObjects as unknown as (objects: SerializedObject[]) => Promise<fabric.Object[]>;
    enliven(allObjects).then((objects: fabric.Object[]) => {
      objects.forEach((obj) => {
        obj.selectable = true;
        obj.evented = true;
        canvas.add(obj);
      });
      canvas.requestRenderAll();
    });
  }, []);


  // 초기 어노테이션 로드
  useEffect(() => {
    if (!initialAnnotations) return;

    console.log('[Editor] 초기 데이터 로드:', initialAnnotations);

    // 새 형식 (version 2.0)
    if (
      typeof initialAnnotations === 'object' &&
      initialAnnotations !== null &&
      (initialAnnotations as { version?: string }).version === '2.0' &&
      Array.isArray((initialAnnotations as { layers?: Layer[] }).layers)
    ) {
      console.log('[Editor] v2.0 형식 감지');
      const layersData = (initialAnnotations as { layers: Layer[] }).layers;
      setLayers(layersData);
      if (layersData.length > 0) {
        setActiveLayerId(layersData[0].id);
      }
      // 회전 상태 복원
      const rotation = (initialAnnotations as { imageRotation?: number }).imageRotation;
      if (typeof rotation === 'number') {
        setImageRotation(rotation);
      }
      return;
    }

    // 이전 형식 (version 1.0)
    if (
      typeof initialAnnotations === 'object' &&
      initialAnnotations !== null &&
      (initialAnnotations as { version?: string }).version === '1.0' &&
      Array.isArray((initialAnnotations as { layers?: unknown[] }).layers)
    ) {
      console.log('[Editor] v1.0 형식 감지, 변환 중...');
      const rawLayers = (initialAnnotations as { layers: unknown[] }).layers;
      const convertedLayers: Layer[] = rawLayers.map(
        (l: unknown, idx: number) => ({
          id: `layer-${idx + 1}`,
          name: (l as { layerName?: string }).layerName || `레이어 ${idx + 1}`,
          visible: (l as { visible?: boolean }).visible !== false,
          objects: (l as { objects?: SerializedObject[] }).objects || [],
        })
      );
      setLayers(convertedLayers.length > 0 ? convertedLayers : [{ id: 'layer-1', name: '레이어 1', visible: true, objects: [] }]);
      if (convertedLayers.length > 0) {
        setActiveLayerId(convertedLayers[0].id);
      }
      return;
    }

    // 배열 형식 (레거시)
    if (Array.isArray(initialAnnotations) && initialAnnotations.length > 0) {
      console.log('[Editor] 배열 형식 감지');
      setLayers([
        {
          id: 'layer-1',
          name: '레이어 1',
          visible: true,
          objects: initialAnnotations as SerializedObject[],
        },
      ]);
      return;
    }

    console.log('[Editor] 기본 빈 레이어 사용');
  }, [initialAnnotations]);

  // 레이어 변경 시 캔버스 다시 렌더링
  useEffect(() => {
    renderLayersToCanvas();
  }, [layers, renderLayersToCanvas]);

  // 회전 상태 변경 시 배경 이미지에 적용
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const bgImage = bgImageRef.current;
    if (!canvas || !bgImage) return;
    
    bgImage.set({ angle: imageRotation });
    canvas.requestRenderAll();
  }, [imageRotation]);

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000,
      height: 700,
      selection: true,
      preserveObjectStacking: true,
    });
    fabricCanvasRef.current = canvas;

    // 배경 이미지 로드
    const imgEl = new Image();
    imgEl.crossOrigin = 'anonymous';
    imgEl.src = imageUrl;
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl);
      const cw = canvas.getWidth();
      const ch = canvas.getHeight();
      const iw = img.width || cw;
      const ih = img.height || ch;
      const scale = Math.min(cw / iw, ch / ih);
      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        left: cw / 2,
        top: ch / 2,
        selectable: false,
        evented: false,
      });
      bgImageRef.current = img;
      (canvas as unknown as { backgroundImage?: fabric.Image | null }).backgroundImage = img;
      canvas.requestRenderAll();
      setBgLoaded(true);

      // 초기 레이어 렌더링
      renderLayersToCanvas();
    };
    imgEl.onerror = () => setBgError(true);

    // path:created 이벤트 (펜/형광펜)
    canvas.on('path:created', (e: any) => {
      const path = (e as unknown as { path?: fabric.Path }).path;
      if (!path) return;

      const tool = selectedToolRef.current;
      const color =
        tool === 'highlighter'
          ? toRgba(brushColorRef.current, 0.4)
          : brushColorRef.current;

      path.set({
        stroke: color,
        strokeWidth: brushWidthRef.current,
        fill: 'transparent',
        opacity: tool === 'highlighter' ? 0.4 : 1,
        selectable: true,
        evented: true,
      });

      // 캔버스에서 제거하고 레이어에 추가
      canvas.remove(path);
      addObjectToActiveLayer(path);
    });


    // 마우스 이벤트 (도형 그리기)
    const handleMouseDown = (opt: fabric.TEvent) => {
      const tool = selectedToolRef.current;
      if (tool === 'pen' || tool === 'highlighter' || tool === 'select') return;

      const pointer = canvas.getPointer(opt.e as MouseEvent);
      dragStartRef.current = { x: pointer.x, y: pointer.y };
      isDrawingRef.current = true;

      let obj: fabric.Object | null = null;
      const color = brushColorRef.current;
      const width = brushWidthRef.current;

      if (tool === 'line') {
        obj = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: color,
          strokeWidth: width,
          selectable: true,
        });
      } else if (tool === 'rect') {
        obj = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: 'transparent',
          stroke: color,
          strokeWidth: width,
          selectable: true,
        });
      } else if (tool === 'circle') {
        obj = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 1,
          fill: 'transparent',
          stroke: color,
          strokeWidth: width,
          selectable: true,
        });
      }

      if (obj) {
        draggingShapeRef.current = obj;
        canvas.add(obj);
        canvas.requestRenderAll();
      }
    };

    const handleMouseMove = (opt: fabric.TEvent) => {
      if (!isDrawingRef.current || !draggingShapeRef.current || !dragStartRef.current)
        return;

      const pointer = canvas.getPointer(opt.e as MouseEvent);
      const sx = dragStartRef.current.x;
      const sy = dragStartRef.current.y;
      const obj = draggingShapeRef.current;

      if (obj.type === 'line') {
        (obj as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
      } else if (obj.type === 'rect') {
        const left = Math.min(sx, pointer.x);
        const top = Math.min(sy, pointer.y);
        (obj as fabric.Rect).set({
          left,
          top,
          width: Math.abs(pointer.x - sx),
          height: Math.abs(pointer.y - sy),
        });
      } else if (obj.type === 'circle') {
        const dx = pointer.x - sx;
        const dy = pointer.y - sy;
        const radius = Math.sqrt(dx * dx + dy * dy) / 2;
        (obj as fabric.Circle).set({
          left: Math.min(sx, pointer.x),
          top: Math.min(sy, pointer.y),
          radius,
        });
      }

      obj.setCoords();
      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current || !draggingShapeRef.current) return;

      const obj = draggingShapeRef.current;
      isDrawingRef.current = false;
      draggingShapeRef.current = null;
      dragStartRef.current = null;

      const bounds = (obj as fabric.Object).getBoundingRect();
      if (bounds.width < 4 && bounds.height < 4) {
        canvas.remove(obj);
        return;
      }

      // 캔버스에서 제거하고 레이어에 추가
      canvas.remove(obj);
      addObjectToActiveLayer(obj);
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [imageUrl, addObjectToActiveLayer, renderLayersToCanvas]);

  // 도구 변경 시 캔버스 모드 설정
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const isDraw = selectedTool === 'pen' || selectedTool === 'highlighter';
    canvas.isDrawingMode = isDraw;

    if (isDraw) {
      if (!canvas.freeDrawingBrush) {
        const PencilBrushCtor = (fabric as unknown as { PencilBrush: new (c: fabric.Canvas) => fabric.BaseBrush }).PencilBrush;
        canvas.freeDrawingBrush = new PencilBrushCtor(canvas);
      }
      const color =
        selectedTool === 'highlighter'
          ? toRgba(brushColor, 0.4)
          : brushColor;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color as string;
        canvas.freeDrawingBrush.width = brushWidth;
      }
    }

    canvas.selection = selectedTool === 'select';
  }, [selectedTool, brushColor, brushWidth]);


  // 레이어 관리 함수들
  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: `레이어 ${layers.length + 1}`,
      visible: true,
      objects: [],
    };
    setUndoStack((stack) => [...stack.slice(-49), layers]);
    setRedoStack([]);
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newId);
  };

  const deleteLayer = (layerId: string) => {
    if (layers.length <= 1) return; // 최소 1개 레이어 유지
    setUndoStack((stack) => [...stack.slice(-49), layers]);
    setRedoStack([]);
    setLayers((prev) => {
      const newLayers = prev.filter((l) => l.id !== layerId);
      if (activeLayerId === layerId && newLayers.length > 0) {
        setActiveLayerId(newLayers[0].id);
      }
      return newLayers;
    });
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const renameLayer = (layerId: string, newName: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, name: newName } : l))
    );
  };

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((stack) => [...stack, layers]);
    setUndoStack((stack) => stack.slice(0, -1));
    setLayers(prev);
  }, [undoStack, layers]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((stack) => [...stack, layers]);
    setRedoStack((stack) => stack.slice(0, -1));
    setLayers(next);
  }, [redoStack, layers]);

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
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoStack, redoStack, layers, handleUndo, handleRedo]);

  // 줌
  const handleZoomIn = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const nz = Math.min(zoom + 0.1, 3);
    setZoom(nz);
    canvas.setZoom(nz);
  };

  const handleZoomOut = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const nz = Math.max(zoom - 0.1, 0.5);
    setZoom(nz);
    canvas.setZoom(nz);
  };

  // 이미지 회전
  const handleRotateImage = (direction: 'cw' | 'ccw') => {
    const canvas = fabricCanvasRef.current;
    const bgImage = bgImageRef.current;
    if (!canvas || !bgImage) return;

    const delta = direction === 'cw' ? 90 : -90;
    const newRotation = (imageRotation + delta) % 360;
    setImageRotation(newRotation);

    bgImage.set({ angle: newRotation });
    canvas.requestRenderAll();
  };

  // 텍스트 추가
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const text = new fabric.Textbox('텍스트', {
      left: canvas.getWidth() / 2 - 40,
      top: canvas.getHeight() / 2 - 10,
      fill: brushColor,
      fontSize: 20,
    });
    addObjectToActiveLayer(text);
  };

  // 저장
  const handleSave = async () => {
    console.log('[Editor] 저장 시작');
    console.log('[Editor] 레이어 수:', layers.length);
    layers.forEach((l, i) => {
      console.log(`[Editor] 레이어 ${i + 1} (${l.name}): ${l.objects.length}개 오브젝트`);
    });

    // 회전이 있고 imagePath와 artifactId가 있으면 실제 이미지 파일 회전
    console.log('[Editor] 회전 체크:', { imageRotation, imagePath, artifactId });
    if (imageRotation !== 0 && imagePath && artifactId) {
      try {
        console.log('[Editor] 이미지 회전 API 호출 시작');
        const { artifactApi } = await import('../../services/api');
        await artifactApi.rotateImage(artifactId, imagePath, imageRotation);
        console.log('[Editor] 이미지 파일 회전 적용 완료');
        
        // 회전이 적용되었으므로 저장 데이터에서는 0으로 설정
        const saveData = {
          version: '2.0',
          layers: layers,
          imageRotation: 0, // 파일에 적용되었으므로 0
        };
        onSave(saveData);
        onRotateApplied?.(); // 부모에게 회전 적용 알림
      } catch (error) {
        console.error('[Editor] 이미지 회전 실패:', error);
        // 회전 실패 시 회전 정보만 저장
        const saveData = {
          version: '2.0',
          layers: layers,
          imageRotation: imageRotation,
        };
        onSave(saveData);
      }
    } else {
      const saveData = {
        version: '2.0',
        layers: layers,
        imageRotation: imageRotation,
      };
      onSave(saveData);
    }

    console.log('[Editor] 저장 완료');
    onClose();
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            이미지 상세 - {imageName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 툴바 */}
        <div className="p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex flex-col gap-3">
            {/* 도구 버튼들 */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedTool('select')}
                className={`inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md border ${
                  selectedTool === 'select'
                    ? 'bg-blue-100 text-blue-600 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:bg-gray-50`}
              >
                <Move className="h-4 w-4" />
                <span>선택</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTool('pen')}
                className={`inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md border ${
                  selectedTool === 'pen'
                    ? 'bg-blue-100 text-blue-600 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:bg-gray-50`}
              >
                <Pencil className="h-4 w-4" />
                <span>펜</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTool('highlighter')}
                className={`inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md border ${
                  selectedTool === 'highlighter'
                    ? 'bg-blue-100 text-blue-600 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:bg-gray-50`}
              >
                <Highlighter className="h-4 w-4" />
                <span>형광펜</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTool('line')}
                className={`inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md border ${
                  selectedTool === 'line'
                    ? 'bg-blue-100 text-blue-600 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:bg-gray-50`}
              >
                <Minus className="h-4 w-4" />
                <span>직선</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTool('rect')}
                className={`inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md border ${
                  selectedTool === 'rect'
                    ? 'bg-blue-100 text-blue-600 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:bg-gray-50`}
              >
                <Square className="h-4 w-4" />
                <span>사각형</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTool('circle')}
                className={`inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md border ${
                  selectedTool === 'circle'
                    ? 'bg-blue-100 text-blue-600 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:bg-gray-50`}
              >
                <CircleIcon className="h-4 w-4" />
                <span>원</span>
              </button>
              <button
                type="button"
                onClick={addText}
                className="inline-flex items-center gap-1 h-9 px-3 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <Type className="h-4 w-4" />
                <span>텍스트</span>
              </button>
            </div>


            {/* 색상, 두께, 줌, 저장 */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {paletteColors.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setBrushColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      brushColor === c ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">두께</span>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-600 w-10">{brushWidth}px</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="h-9 px-3 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-sm text-gray-600 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="h-9 px-3 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  +
                </button>
              </div>

              {/* 이미지 회전 */}
              <div className="flex items-center gap-1 border-l border-gray-300 pl-3">
                <button
                  type="button"
                  onClick={() => handleRotateImage('ccw')}
                  className="h-9 px-3 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  title="반시계 방향 회전"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500 w-10 text-center">{imageRotation}°</span>
                <button
                  type="button"
                  onClick={() => handleRotateImage('cw')}
                  className="h-9 px-3 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  title="시계 방향 회전"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="h-9 px-3 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  title="되돌리기 (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="h-9 px-3 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  title="다시실행 (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  <span>저장</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400"
                >
                  <XIcon className="h-4 w-4" />
                  <span>취소</span>
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* 메인 영역 */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* 캔버스 */}
          <div className="flex-1 bg-gray-100 p-4 overflow-auto">
            <div
              className="bg-white rounded-lg shadow-lg inline-block relative"
              style={{ width: 1000, height: 700 }}
            >
              {!bgLoaded && !bgError && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                  이미지를 불러오는 중...
                </div>
              )}
              {bgError && (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm">
                  이미지 로드 실패
                </div>
              )}
              <canvas ref={canvasRef} className="absolute inset-0" />
            </div>
          </div>

          {/* 레이어 패널 */}
          <div className="w-72 border-l bg-white p-4 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">레이어</h3>
              <button
                type="button"
                onClick={addLayer}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                새 레이어
              </button>
            </div>

            {/* 현재 활성 레이어 표시 */}
            <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
              현재 활성: <strong>{activeLayer?.name || '없음'}</strong>
            </div>

            {/* 레이어 목록 */}
            <div className="space-y-2">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`p-3 rounded-lg border transition-all ${
                    activeLayerId === layer.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleLayerVisibility(layer.id)}
                        className="text-gray-600 hover:text-gray-800"
                        title={layer.visible ? '숨기기' : '보이기'}
                      >
                        {layer.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <div>
                        <input
                          type="text"
                          value={layer.name}
                          onChange={(e) => renameLayer(layer.id, e.target.value)}
                          className="text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-24"
                        />
                        <p className="text-xs text-gray-500">
                          {layer.objects.length}개 오브젝트
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {activeLayerId !== layer.id && (
                        <button
                          type="button"
                          onClick={() => setActiveLayerId(layer.id)}
                          className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          활성화
                        </button>
                      )}
                      {activeLayerId === layer.id && (
                        <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white">
                          활성
                        </span>
                      )}
                      {layers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteLayer(layer.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="레이어 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VectorAnnotationEditor;

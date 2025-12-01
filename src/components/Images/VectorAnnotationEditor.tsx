import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Pencil, Highlighter, Type, Minus, Square, Circle as CircleIcon, Save, X as XIcon,
  Undo2, Redo2, Trash2, RotateCw, RotateCcw, Plus, Eye, EyeOff, MousePointer,
  ZoomIn, ZoomOut, ChevronDown, ChevronRight, Settings, Layers, Download, Upload,
  Lock, Unlock, Copy, Clipboard, Ruler, Triangle, Play, Pause, Clock, Cloud,
  Shield, FolderOpen, FileText, Brush, Eraser, Move, Grid, Magnet, Palette,
} from 'lucide-react';
import * as fabric from 'fabric';

// ============ Types ============
type SerializedObject = Record<string, unknown>;
type PageKey = 'before' | 'during' | 'after';
type MeasureMode = 'none' | 'distance' | 'angle' | 'area';
type BrushType = 'pencil' | 'marker' | 'highlighter' | 'watercolor' | 'airbrush' | 'calligraphy' | 'crayon' | 'charcoal' | 'ink' | 'spray' | 'neon' | 'dotted' | 'pattern' | 'gradient' | 'textured';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  isReference: boolean;
  objects: SerializedObject[];
}

interface PageData {
  layers: Layer[];
  rotation: number;
}

interface TimelapseFrame {
  id: string;
  timestamp: number;
  data: string;
}

interface VectorAnnotationEditorProps {
  imageUrl: string;
  imageName: string;
  imagePath?: string;
  artifactId?: string;
  onClose: () => void;
  onSave: (annotations: unknown) => void;
  onRotateApplied?: () => void;
  initialAnnotations?: unknown;
}

// ============ Constants ============
const COLORS = ['#000000', '#1e3a8a', '#EF4444', '#F59E0B', '#10B981', '#6366F1', '#F472B6', '#8B5CF6', '#06B6D4', '#ffffff'];
const BRUSH_TYPES: { id: BrushType; name: string; icon: string }[] = [
  { id: 'pencil', name: '연3필', icon: '✏️' },
  { id: 'marker', name: '마커', icon: '🖊️' },
  { id: 'highlighter', name: '형광펜', icon: '🖍️' },
  { id: 'watercolor', name: '수채화', icon: '🎨' },
  { id: 'airbrush', name: '에어브러시', icon: '💨' },
  { id: 'calligraphy', name: '캘리그라피', icon: '🖋️' },
  { id: 'crayon', name: '크레용', icon: '🖍️' },
  { id: 'charcoal', name: '목탄', icon: '⬛' },
  { id: 'ink', name: '잉크', icon: '🖤' },
  { id: 'neon', name: '네온', icon: '💡' },
  { id: 'dotted', name: '점선', icon: '⚫' },
  { id: 'pattern', name: '패턴', icon: '🔲' },
  { id: 'gradient', name: '그라데이션', icon: '🌈' },
  { id: 'textured', name: '텍스처', icon: '🧱' },
  { id: 'spray', name: '스프레이', icon: '💦' },
];

// ============ Component ============
const VectorAnnotationEditor: React.FC<VectorAnnotationEditorProps> = ({
  imageUrl, imageName, imagePath, artifactId, onClose, onSave, onRotateApplied, initialAnnotations,
}) => {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const bgImageRef = useRef<fabric.Image | null>(null);

  // Layer state
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-1', name: '레이어 1', visible: true, locked: false, opacity: 1, isReference: false, objects: [] },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');

  // Page state (전/중/후)
  const [currentPage, setCurrentPage] = useState<PageKey>('before');
  const [pages, setPages] = useState<Record<PageKey, PageData>>({
    before: { layers: [], rotation: 0 },
    during: { layers: [], rotation: 0 },
    after: { layers: [], rotation: 0 },
  });

  // Tool state
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [brushType, setBrushType] = useState<BrushType>('pencil');
  const [brushColor, setBrushColor] = useState('#1e3a8a');
  const [brushWidth, setBrushWidth] = useState(3);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [pressureSensitivity, setPressureSensitivity] = useState(true);

  // View state
  const [zoom, setZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20); // 그리드 간격 (픽셀)
  const gridLinesRef = useRef<fabric.Object[]>([]);

  // Measure state
  const [measureMode, setMeasureMode] = useState<MeasureMode>('none');
  const [measureUnit, setMeasureUnit] = useState<'px' | 'cm' | 'mm' | 'in' | 'm' | 'ft'>('px');
  const [measureScale, setMeasureScale] = useState(1); // px당 실제 단위
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [calibrationDistance, setCalibrationDistance] = useState<string>('10'); // 기준 거리 입력값
  const [calibrationPixels, setCalibrationPixels] = useState<number>(0); // 캘리브레이션용 픽셀 거리
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [measureResults, setMeasureResults] = useState<{ type: string; value: string; timestamp: number }[]>([]);
  const [liveMeasureValue, setLiveMeasureValue] = useState<string>('');
  const measurePointsRef = useRef<{ x: number; y: number }[]>([]);
  const measurePreviewRef = useRef<fabric.Object[]>([]);
  const measureLabelRef = useRef<fabric.Text | null>(null);

  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);
  const [lastSaved, setLastSaved] = useState<string>('');

  // Timelapse state
  const [timelapseEnabled, setTimelapseEnabled] = useState(false);
  const [timelapseFrames, setTimelapseFrames] = useState<TimelapseFrame[]>([]);

  // UI state
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>('layers');
  const [showSettings, setShowSettings] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');

  // History (Undo/Redo)
  const [undoStack, setUndoStack] = useState<Layer[][]>([]);
  const [redoStack, setRedoStack] = useState<Layer[][]>([]);
  const [historyLimit, setHistoryLimit] = useState(50);

  // Refs for callbacks
  const layersRef = useRef<Layer[]>(layers);
  const activeLayerIdRef = useRef<string>(activeLayerId);
  const selectedToolRef = useRef<string>(selectedTool);
  const brushColorRef = useRef<string>(brushColor);
  const brushWidthRef = useRef<number>(brushWidth);
  const isDrawingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggingShapeRef = useRef<fabric.Object | null>(null);
  const pendingLayerUpdateRef = useRef<boolean>(false);

  // Sync refs (only when not pending update from drawing)
  useEffect(() => { 
    if (!pendingLayerUpdateRef.current) {
      layersRef.current = layers; 
    }
  }, [layers]);
  useEffect(() => { activeLayerIdRef.current = activeLayerId; }, [activeLayerId]);
  useEffect(() => { selectedToolRef.current = selectedTool; }, [selectedTool]);
  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
  useEffect(() => { brushWidthRef.current = brushWidth; }, [brushWidth]);
  
  // Sync pending layer updates to state periodically
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (pendingLayerUpdateRef.current && !fabricCanvasRef.current?.isDrawingMode) {
        setLayers([...layersRef.current]);
        pendingLayerUpdateRef.current = false;
      }
    }, 500);
    return () => clearInterval(syncInterval);
  }, []);

  const activeLayer = layers.find(l => l.id === activeLayerId);

  // ============ History Functions ============
  const saveState = useCallback(() => {
    const state = JSON.parse(JSON.stringify(layersRef.current));
    setUndoStack(prev => [...prev.slice(-(historyLimit - 1)), state]);
    setRedoStack([]);
  }, [historyLimit]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, JSON.parse(JSON.stringify(layersRef.current))]);
    setUndoStack(u => u.slice(0, -1));
    setLayers(prev);
    layersRef.current = prev;
    // renderLayersToCanvas will be called by useEffect
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, JSON.parse(JSON.stringify(layersRef.current))]);
    setRedoStack(r => r.slice(0, -1));
    setLayers(next);
    layersRef.current = next;
    // renderLayersToCanvas will be called by useEffect
  }, [redoStack]);

  // ============ Layer Functions ============
  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `레이어 ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      isReference: false,
      objects: [],
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    saveState();
  };

  const deleteLayer = (layerId: string) => {
    if (layers.length <= 1) return;
    
    // 새 레이어 목록 생성
    const newLayers = layersRef.current.filter(l => l.id !== layerId);
    
    // layersRef와 state 모두 업데이트
    layersRef.current = newLayers;
    setLayers(newLayers);
    
    // 삭제된 레이어가 활성 레이어였다면 다른 레이어로 전환
    if (activeLayerId === layerId) {
      const newActiveId = newLayers[0]?.id || '';
      setActiveLayerId(newActiveId);
      activeLayerIdRef.current = newActiveId;
    }
    
    // 캔버스 다시 렌더링 (삭제된 레이어의 객체들 제거)
    setTimeout(() => renderLayersToCanvas(), 0);
    
    saveState();
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev => {
      const newLayers = prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l);
      layersRef.current = newLayers;
      return newLayers;
    });
    // Trigger re-render after visibility change
    setTimeout(() => renderLayersToCanvas(), 0);
  };

  const toggleLayerLock = (layerId: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l));
  };

  const toggleReferenceLayer = (layerId: string) => {
    setLayers(prev => {
      const newLayers = prev.map(l => l.id === layerId ? { ...l, isReference: !l.isReference } : l);
      layersRef.current = newLayers;
      return newLayers;
    });
    setTimeout(() => renderLayersToCanvas(), 0);
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
    setLayers(prev => {
      const newLayers = prev.map(l => l.id === layerId ? { ...l, opacity } : l);
      layersRef.current = newLayers;
      return newLayers;
    });
    // Debounce opacity changes
    setTimeout(() => renderLayersToCanvas(), 100);
  };

  const moveLayer = (layerId: string, direction: 'up' | 'down') => {
    const idx = layers.findIndex(l => l.id === layerId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= layers.length) return;
    const newLayers = [...layers];
    [newLayers[idx], newLayers[newIdx]] = [newLayers[newIdx], newLayers[idx]];
    setLayers(newLayers);
    saveState();
  };

  const renameLayer = (layerId: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, name } : l));
  };

  // Layer drag and drop handlers
  const handleLayerDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  };

  const handleLayerDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedLayerId !== layerId) {
      setDragOverLayerId(layerId);
    }
  };

  const handleLayerDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleLayerDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const draggedIdx = layers.findIndex(l => l.id === draggedLayerId);
    const targetIdx = layers.findIndex(l => l.id === targetLayerId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newLayers = [...layers];
    const [draggedLayer] = newLayers.splice(draggedIdx, 1);
    newLayers.splice(targetIdx, 0, draggedLayer);
    
    setLayers(newLayers);
    saveState();
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  // ============ Render Layers to Canvas (Optimized) ============
  const isDrawingModeRef = useRef(false);
  const needsRenderRef = useRef(false);
  const isPanningRef = useRef(false);
  const panLastRef = useRef<{x:number;y:number}|null>(null);
  
  const renderLayersToCanvas = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    const bgImage = bgImageRef.current;
    if (!canvas) return;
    
    // Skip render if currently drawing
    if (isDrawingModeRef.current || canvas.isDrawingMode) {
      needsRenderRef.current = true;
      return;
    }

    // Batch remove objects
    const objectsToRemove = canvas.getObjects().filter(obj => obj !== bgImage);
    if (objectsToRemove.length > 0) {
      canvas.remove(...objectsToRemove);
    }

    // Render each layer's objects
    const objectsToAdd: fabric.FabricObject[] = [];
    
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      
      for (const objData of layer.objects) {
        try {
          const objs = await fabric.util.enlivenObjects([objData as Record<string, unknown>]);
          if (objs[0]) {
            const obj = objs[0] as fabric.FabricObject;
            obj.set({ 
              opacity: (obj.opacity || 1) * layer.opacity,
              selectable: !layer.isReference,
              evented: !layer.isReference,
            });
            objectsToAdd.push(obj);
          }
        } catch (e) {
          // Silent fail
        }
      }
    }

    // Batch add objects
    if (objectsToAdd.length > 0) {
      canvas.add(...objectsToAdd);
    }

    if (bgImage) {
      canvas.sendObjectToBack(bgImage);
    }
    canvas.requestRenderAll();
    needsRenderRef.current = false;
  }, []);

  // Force render function for explicit calls
  const forceRender = useCallback(() => {
    renderLayersToCanvas();
  }, [renderLayersToCanvas]);
  
  // ============ Page Functions (전/중/후) ============
  const switchPage = (page: PageKey) => {
    // Save current page
    setPages(prev => ({
      ...prev,
      [currentPage]: { layers: layersRef.current, rotation: imageRotation },
    }));
    // Load new page
    const pageData = pages[page];
    if (pageData.layers.length > 0) {
      setLayers(pageData.layers);
      layersRef.current = pageData.layers;
      setImageRotation(pageData.rotation);
    } else {
      const defaultLayers = [{ id: 'layer-1', name: '레이어 1', visible: true, locked: false, opacity: 1, isReference: false, objects: [] }];
      setLayers(defaultLayers);
      layersRef.current = defaultLayers;
    }
    setCurrentPage(page);
    // Render after page switch
    setTimeout(() => renderLayersToCanvas(), 100);
  };

  // ============ Timelapse Functions ============
  const captureTimelapseFrame = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const frame: TimelapseFrame = {
      id: `frame-${Date.now()}`,
      timestamp: Date.now(),
      data: canvas.toDataURL({ format: 'png' } as any),
    };
    setTimelapseFrames(prev => [...prev, frame]);
  };

  // ============ Auto-save ============
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const interval = setInterval(() => {
      handleSave();
      setLastSaved(new Date().toLocaleTimeString());
    }, autoSaveInterval * 1000);
    return () => clearInterval(interval);
  }, [autoSaveEnabled, autoSaveInterval]);

  // ============ Measure Functions ============
  const formatMeasureValue = (value: number, unit: string, isArea = false) => {
    const precision = unit === 'px' ? 0 : 2;
    const unitSuffix = isArea ? `${unit}²` : unit;
    return `${value.toFixed(precision)} ${unitSuffix}`;
  };

  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const pxDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    return pxDist * measureScale;
  };

  const calculateAngle = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
    const a = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const b = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angle = Math.abs((a - b) * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  const calculateArea = (points: { x: number; y: number }[]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area / 2) * measureScale * measureScale;
  };

  const calculatePerimeter = (points: { x: number; y: number }[]) => {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      perimeter += Math.sqrt(Math.pow(points[j].x - points[i].x, 2) + Math.pow(points[j].y - points[i].y, 2));
    }
    return perimeter * measureScale;
  };

  // 측정 미리보기 업데이트
  const updateMeasurePreview = useCallback((currentPoint?: { x: number; y: number }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // 기존 미리보기 제거
    measurePreviewRef.current.forEach(obj => canvas.remove(obj));
    measurePreviewRef.current = [];
    if (measureLabelRef.current) {
      canvas.remove(measureLabelRef.current);
      measureLabelRef.current = null;
    }

    const pts = [...measurePointsRef.current];
    if (currentPoint) pts.push(currentPoint);
    if (pts.length === 0) return;

    const previewObjects: fabric.Object[] = [];

    // 포인트 마커 그리기
    pts.forEach((pt, idx) => {
      const circle = new fabric.Circle({
        left: pt.x - 6,
        top: pt.y - 6,
        radius: 6,
        fill: idx === 0 ? '#10B981' : '#3B82F6',
        stroke: 'white',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      previewObjects.push(circle);

      // 포인트 번호 표시
      const label = new fabric.Text(`${idx + 1}`, {
        left: pt.x - 4,
        top: pt.y - 5,
        fontSize: 10,
        fill: 'white',
        fontWeight: 'bold',
        selectable: false,
        evented: false,
      });
      previewObjects.push(label);
    });

    let measureText = '';

    if (measureMode === 'distance') {
      if (pts.length >= 2) {
        // 거리 측정 선
        const line = new fabric.Line([pts[0].x, pts[0].y, pts[1].x, pts[1].y], {
          stroke: '#3B82F6',
          strokeWidth: 2,
          strokeDashArray: [8, 4],
          selectable: false,
          evented: false,
        });
        previewObjects.push(line);

        // 끝점 화살표
        const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        const arrowSize = 10;
        const arrow = new fabric.Polygon([
          { x: pts[1].x, y: pts[1].y },
          { x: pts[1].x - arrowSize * Math.cos(angle - Math.PI / 6), y: pts[1].y - arrowSize * Math.sin(angle - Math.PI / 6) },
          { x: pts[1].x - arrowSize * Math.cos(angle + Math.PI / 6), y: pts[1].y - arrowSize * Math.sin(angle + Math.PI / 6) },
        ], {
          fill: '#3B82F6',
          selectable: false,
          evented: false,
        });
        previewObjects.push(arrow);

        const dist = calculateDistance(pts[0], pts[1]);
        measureText = formatMeasureValue(dist, measureUnit);
      }
    } else if (measureMode === 'angle') {
      if (pts.length >= 2) {
        const line1 = new fabric.Line([pts[0].x, pts[0].y, pts[1].x, pts[1].y], {
          stroke: '#F59E0B',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        previewObjects.push(line1);
      }
      if (pts.length >= 3) {
        const line2 = new fabric.Line([pts[1].x, pts[1].y, pts[2].x, pts[2].y], {
          stroke: '#F59E0B',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        previewObjects.push(line2);

        // 각도 호 그리기
        const angle = calculateAngle(pts[0], pts[1], pts[2]);
        const startAngle = Math.atan2(pts[0].y - pts[1].y, pts[0].x - pts[1].x);
        const endAngle = Math.atan2(pts[2].y - pts[1].y, pts[2].x - pts[1].x);
        
        // 각도 호를 위한 경로
        const arcRadius = 30;
        const arcPath = new fabric.Path(
          `M ${pts[1].x + arcRadius * Math.cos(startAngle)} ${pts[1].y + arcRadius * Math.sin(startAngle)} ` +
          `A ${arcRadius} ${arcRadius} 0 0 ${endAngle > startAngle ? 1 : 0} ${pts[1].x + arcRadius * Math.cos(endAngle)} ${pts[1].y + arcRadius * Math.sin(endAngle)}`,
          {
            stroke: '#F59E0B',
            strokeWidth: 2,
            fill: 'transparent',
            selectable: false,
            evented: false,
          }
        );
        previewObjects.push(arcPath);

        measureText = `${angle.toFixed(1)}°`;
      }
    } else if (measureMode === 'area') {
      if (pts.length >= 2) {
        // 다각형 외곽선
        for (let i = 0; i < pts.length - 1; i++) {
          const line = new fabric.Line([pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y], {
            stroke: '#8B5CF6',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          previewObjects.push(line);
        }
        // 마지막 점과 첫 점 연결 (닫힌 도형 미리보기)
        if (pts.length >= 3) {
          const closingLine = new fabric.Line([pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y], {
            stroke: '#8B5CF6',
            strokeWidth: 2,
            strokeDashArray: [4, 4],
            selectable: false,
            evented: false,
          });
          previewObjects.push(closingLine);

          // 면적 채우기
          const polygon = new fabric.Polygon(pts, {
            fill: 'rgba(139, 92, 246, 0.15)',
            stroke: 'transparent',
            selectable: false,
            evented: false,
          });
          previewObjects.push(polygon);

          const area = calculateArea(pts);
          const perimeter = calculatePerimeter(pts);
          measureText = `면적: ${formatMeasureValue(area, measureUnit, true)}\n둘레: ${formatMeasureValue(perimeter, measureUnit)}`;
        }
      }
    }

    // 측정값 라벨
    if (measureText && pts.length >= 2) {
      const labelPos = measureMode === 'angle' && pts.length >= 3
        ? { x: pts[1].x + 40, y: pts[1].y - 10 }
        : measureMode === 'area' && pts.length >= 3
        ? pts.reduce((acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }), { x: 0, y: 0 })
        : { x: (pts[0].x + pts[pts.length - 1].x) / 2, y: (pts[0].y + pts[pts.length - 1].y) / 2 - 25 };

      const textBg = new fabric.Rect({
        left: labelPos.x - 5,
        top: labelPos.y - 5,
        width: measureText.length * 7 + 10,
        height: measureMode === 'area' && pts.length >= 3 ? 36 : 20,
        fill: 'rgba(0, 0, 0, 0.8)',
        rx: 4,
        ry: 4,
        selectable: false,
        evented: false,
      });
      previewObjects.push(textBg);

      const textLabel = new fabric.Text(measureText, {
        left: labelPos.x,
        top: labelPos.y,
        fontSize: 12,
        fill: 'white',
        fontFamily: 'monospace',
        selectable: false,
        evented: false,
      });
      previewObjects.push(textLabel);
      measureLabelRef.current = textLabel;

      setLiveMeasureValue(measureText);
    }

    // 캔버스에 추가
    previewObjects.forEach(obj => canvas.add(obj));
    measurePreviewRef.current = previewObjects;
    canvas.requestRenderAll();
  }, [measureMode, measureUnit, measureScale]);

  // 측정 취소
  const cancelMeasurement = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      measurePreviewRef.current.forEach(obj => canvas.remove(obj));
      measurePreviewRef.current = [];
      if (measureLabelRef.current) {
        canvas.remove(measureLabelRef.current);
        measureLabelRef.current = null;
      }
      canvas.requestRenderAll();
    }
    measurePointsRef.current = [];
    setLiveMeasureValue('');
    setMeasureMode('none');
  }, []);

  // 측정 완료 및 저장
  const completeMeasurement = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const pts = measurePointsRef.current;
    if (!canvas || pts.length < 2) return;

    // 캘리브레이션 모드인 경우
    if (isCalibrating && measureMode === 'distance' && pts.length >= 2) {
      const pxDist = Math.sqrt(Math.pow(pts[1].x - pts[0].x, 2) + Math.pow(pts[1].y - pts[0].y, 2));
      setCalibrationPixels(pxDist);
      setShowScaleDialog(true);
      
      // 미리보기 정리
      measurePreviewRef.current.forEach(obj => canvas.remove(obj));
      measurePreviewRef.current = [];
      measurePointsRef.current = [];
      setLiveMeasureValue('');
      setMeasureMode('none');
      canvas.requestRenderAll();
      return;
    }

    let result = '';
    let measureObj: fabric.Object | null = null;
    const measureColor = measureMode === 'distance' ? '#3B82F6' : measureMode === 'angle' ? '#F59E0B' : '#8B5CF6';

    if (measureMode === 'distance' && pts.length >= 2) {
      const dist = calculateDistance(pts[0], pts[1]);
      result = formatMeasureValue(dist, measureUnit);
      
      const line = new fabric.Line([pts[0].x, pts[0].y, pts[1].x, pts[1].y], {
        stroke: measureColor,
        strokeWidth: 2,
        strokeDashArray: [8, 4],
      });
      
      // 끝점 마커
      const startMarker = new fabric.Circle({ left: pts[0].x - 4, top: pts[0].y - 4, radius: 4, fill: measureColor });
      const endMarker = new fabric.Circle({ left: pts[1].x - 4, top: pts[1].y - 4, radius: 4, fill: measureColor });
      
      const labelBg = new fabric.Rect({
        left: (pts[0].x + pts[1].x) / 2 - result.length * 3.5 - 5,
        top: (pts[0].y + pts[1].y) / 2 - 25,
        width: result.length * 7 + 10,
        height: 20,
        fill: 'rgba(59, 130, 246, 0.9)',
        rx: 4,
        ry: 4,
      });
      
      const label = new fabric.Text(result, {
        left: (pts[0].x + pts[1].x) / 2 - result.length * 3.5,
        top: (pts[0].y + pts[1].y) / 2 - 22,
        fontSize: 12,
        fill: 'white',
        fontFamily: 'monospace',
      });
      
      measureObj = new fabric.Group([line, startMarker, endMarker, labelBg, label]);
      
    } else if (measureMode === 'angle' && pts.length >= 3) {
      const angle = calculateAngle(pts[0], pts[1], pts[2]);
      result = `${angle.toFixed(1)}°`;
      
      const line1 = new fabric.Line([pts[0].x, pts[0].y, pts[1].x, pts[1].y], { stroke: measureColor, strokeWidth: 2 });
      const line2 = new fabric.Line([pts[1].x, pts[1].y, pts[2].x, pts[2].y], { stroke: measureColor, strokeWidth: 2 });
      
      const vertexMarker = new fabric.Circle({ left: pts[1].x - 5, top: pts[1].y - 5, radius: 5, fill: measureColor });
      
      const labelBg = new fabric.Rect({
        left: pts[1].x + 35,
        top: pts[1].y - 15,
        width: result.length * 8 + 10,
        height: 22,
        fill: 'rgba(245, 158, 11, 0.9)',
        rx: 4,
        ry: 4,
      });
      
      const label = new fabric.Text(result, {
        left: pts[1].x + 40,
        top: pts[1].y - 12,
        fontSize: 13,
        fill: 'white',
        fontWeight: 'bold',
      });
      
      measureObj = new fabric.Group([line1, line2, vertexMarker, labelBg, label]);
      
    } else if (measureMode === 'area' && pts.length >= 3) {
      const area = calculateArea(pts);
      const perimeter = calculatePerimeter(pts);
      result = `${formatMeasureValue(area, measureUnit, true)}`;
      
      const polygon = new fabric.Polygon(pts, {
        fill: 'rgba(139, 92, 246, 0.2)',
        stroke: measureColor,
        strokeWidth: 2,
      });
      
      const centroid = pts.reduce((acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }), { x: 0, y: 0 });
      
      const labelText = `면적: ${result}\n둘레: ${formatMeasureValue(perimeter, measureUnit)}`;
      const labelBg = new fabric.Rect({
        left: centroid.x - 50,
        top: centroid.y - 20,
        width: 100,
        height: 40,
        fill: 'rgba(139, 92, 246, 0.9)',
        rx: 4,
        ry: 4,
      });
      
      const label = new fabric.Text(labelText, {
        left: centroid.x - 45,
        top: centroid.y - 16,
        fontSize: 11,
        fill: 'white',
        fontFamily: 'monospace',
        lineHeight: 1.3,
      });
      
      measureObj = new fabric.Group([polygon, labelBg, label]);
    }

    if (measureObj) {
      // 직접 레이어에 추가 (addObjectToActiveLayer 순환 참조 방지)
      const layer = layersRef.current.find(l => l.id === activeLayerIdRef.current);
      if (layer && !layer.locked) {
        canvas.add(measureObj);
        const serialized = measureObj.toObject() as SerializedObject;
        canvas.remove(measureObj);
        
        setLayers(prev => prev.map(l => {
          if (l.id === activeLayerIdRef.current) {
            return { ...l, objects: [...l.objects, serialized] };
          }
          return l;
        }));
      }
      
      // 결과 기록
      setMeasureResults(prev => [...prev.slice(-9), {
        type: measureMode,
        value: result,
        timestamp: Date.now(),
      }]);
    }

    // 미리보기 정리
    measurePreviewRef.current.forEach(obj => canvas.remove(obj));
    measurePreviewRef.current = [];
    if (measureLabelRef.current) {
      canvas.remove(measureLabelRef.current);
      measureLabelRef.current = null;
    }
    
    measurePointsRef.current = [];
    setLiveMeasureValue('');
    canvas.requestRenderAll();
  }, [measureMode, measureUnit, measureScale, isCalibrating]);

  // 마지막 포인트 삭제 (Undo 한 점)
  const undoLastMeasurePoint = useCallback(() => {
    if (measurePointsRef.current.length > 0) {
      measurePointsRef.current.pop();
      updateMeasurePreview();
    }
  }, [updateMeasurePreview]);

  // ============ File Export Functions ============
  const exportAsFormat = async (format: 'svg' | 'png' | 'jpg' | 'pdf') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      if (format === 'svg') {
        const svg = canvas.toSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        downloadBlob(blob, `${imageName.replace(/\.[^.]+$/, '')}.svg`);
      } else if (format === 'png' || format === 'jpg') {
        const dataUrl = canvas.toDataURL({ format: format === 'jpg' ? 'jpeg' : 'png', quality: 1, multiplier: 2 } as any);
        const link = document.createElement('a');
        link.download = `${imageName.replace(/\.[^.]+$/, '')}.${format}`;
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        // PDF export requires server-side processing
        if (artifactId) {
          const { artifactApi } = await import('../../services/api');
          const svg = canvas.toSVG();
          await artifactApi.exportAnnotationsToSVG(artifactId, svg, imageName.replace(/\.[^.]+$/, ''));
          alert('PDF 내보내기가 서버에서 처리됩니다.');
        }
      }
    } catch (e) {
      console.error(`Export as ${format} failed:`, e);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ============ Password Protection ============
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [filePassword, setFilePassword] = useState('');

  const togglePasswordProtection = () => {
    if (passwordProtected) {
      setPasswordProtected(false);
      setFilePassword('');
    } else {
      const pwd = prompt('파일 보호 암호를 입력하세요:');
      if (pwd && pwd.length >= 4) {
        setFilePassword(pwd);
        setPasswordProtected(true);
      } else if (pwd) {
        alert('암호는 4자 이상이어야 합니다.');
      }
    }
  };

  // ============ Canvas Functions ============
  const addObjectToActiveLayer = useCallback((obj: fabric.Object) => {
    const canvas = fabricCanvasRef.current;
    const layer = layersRef.current.find(l => l.id === activeLayerIdRef.current);
    if (!canvas || !layer || layer.locked) return;
    
    // Add to canvas temporarily for serialization
    canvas.add(obj);
    const serialized = obj.toObject() as SerializedObject;
    canvas.remove(obj);
    
    // Update layer state
    setLayers(prev => prev.map(l => {
      if (l.id === activeLayerIdRef.current) {
        return { ...l, objects: [...l.objects, serialized] };
      }
      return l;
    }));
    saveState();
  }, [saveState]);

  const addText = () => {
    console.log('addText 호출됨');
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('캔버스 없음');
      return;
    }
    
    const layer = layersRef.current.find(l => l.id === activeLayerIdRef.current);
    if (!layer || layer.locked) {
      console.log('레이어 없음 또는 잠김:', layer);
      return;
    }
    
    console.log('fabric 객체:', Object.keys(fabric));
    
    // Fabric.js 6.x에서는 Textbox 클래스 접근 방식이 다를 수 있음
    const TextboxClass = (fabric as any).Textbox || (fabric as any).FabricText || fabric.Textbox;
    console.log('TextboxClass:', TextboxClass);
    
    let text: fabric.Object;
    try {
      text = new TextboxClass('텍스트 입력', {
        left: 150,
        top: 150,
        fontSize: 20,
        fill: brushColor,
        fontFamily: 'sans-serif',
        width: 200,
        editable: true,
        selectable: true,
      });
    } catch (e) {
      // 폴백: IText 사용
      console.log('Textbox 생성 실패, IText로 폴백:', e);
      const ITextClass = (fabric as any).IText || (fabric as any).FabricText;
      text = new ITextClass('텍스트 입력', {
        left: 150,
        top: 150,
        fontSize: 20,
        fill: brushColor,
        fontFamily: 'sans-serif',
        selectable: true,
      });
    }
    
    ;(text as any).objectId = `obj-${Date.now()}`;
    // 캔버스에 직접 추가하고 레이어 데이터도 업데이트
    canvas.add(text);
    canvas.setActiveObject(text);
    
    const serialized = text.toObject() as SerializedObject;
    
    const newLayers = layersRef.current.map(l => {
      if (l.id === activeLayerIdRef.current) {
        return { ...l, objects: [...l.objects, serialized] };
      }
      return l;
    });
    
    layersRef.current = newLayers;
    setLayers(newLayers);
    
    canvas.requestRenderAll();
    saveState();
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const activeObjs = canvas.getActiveObjects();
    if (activeObjs.length === 0) return;
    
    // 캔버스에서 선택된 객체들 제거
    activeObjs.forEach(obj => {
      if (obj !== bgImageRef.current) {
        canvas.remove(obj);
      }
    });
    
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    
    // 캔버스에 남아있는 객체들을 직렬화하여 현재 레이어에 저장
    const remainingObjects = canvas.getObjects()
      .filter(obj => obj !== bgImageRef.current)
      .map(obj => obj.toObject() as SerializedObject);
    
    // 현재 활성 레이어만 업데이트 (다른 레이어는 유지)
    const newLayers = layersRef.current.map(layer => {
      if (layer.id === activeLayerIdRef.current) {
        return { ...layer, objects: remainingObjects };
      }
      return layer;
    });
    
    layersRef.current = newLayers;
    setLayers(newLayers);
    
    console.log('삭제 후 레이어 상태:', JSON.stringify(newLayers.map(l => ({ id: l.id, objectCount: l.objects.length }))));
    
    saveState();
  };

  const handleZoom = (delta: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const center = new fabric.Point((canvas.getWidth() || 0)/2, (canvas.getHeight() || 0)/2);
    const newZoom = Math.max(0.25, Math.min(4, zoom + delta));
    canvas.zoomToPoint(center, newZoom);
    setZoom(newZoom);
    canvas.requestRenderAll();
  };

  const handleRotate = (direction: 'cw' | 'ccw') => {
    const newRotation = (imageRotation + (direction === 'cw' ? 90 : -90) + 360) % 360;
    setImageRotation(newRotation);
    const bgImage = bgImageRef.current;
    if (bgImage) {
      bgImage.rotate((bgImage.angle || 0) + (direction === 'cw' ? 90 : -90));
      fabricCanvasRef.current?.requestRenderAll();
    }
  };

  // ============ Grid Functions ============
  const drawGrid = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // 기존 그리드 라인 제거
    gridLinesRef.current.forEach(line => canvas.remove(line));
    gridLinesRef.current = [];
    
    if (!gridEnabled) {
      canvas.requestRenderAll();
      return;
    }
    
    const width = canvas.width || 1000;
    const height = canvas.height || 700;
    const lines: fabric.Object[] = [];
    
    // 세로선
    for (let x = 0; x <= width; x += gridSize) {
      const line = new fabric.Line([x, 0, x, height], {
        stroke: x % (gridSize * 5) === 0 ? '#94a3b8' : '#e2e8f0',
        strokeWidth: x % (gridSize * 5) === 0 ? 1 : 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      lines.push(line);
    }
    
    // 가로선
    for (let y = 0; y <= height; y += gridSize) {
      const line = new fabric.Line([0, y, width, y], {
        stroke: y % (gridSize * 5) === 0 ? '#94a3b8' : '#e2e8f0',
        strokeWidth: y % (gridSize * 5) === 0 ? 1 : 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      lines.push(line);
    }
    
    // 그리드를 배경 바로 위에 추가
    lines.forEach(line => {
      canvas.add(line);
    });
    
    // 배경 이미지를 맨 뒤로 보내기
    if (bgImageRef.current) {
      canvas.sendObjectToBack(bgImageRef.current);
    }
    
    gridLinesRef.current = lines;
    canvas.requestRenderAll();
  }, [gridEnabled, gridSize]);

  // 그리드 토글 시 다시 그리기
  useEffect(() => {
    drawGrid();
  }, [drawGrid, gridEnabled, gridSize]);

  // ============ Snap Functions ============
  const snapToGrid = useCallback((value: number) => {
    if (!snapEnabled) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapEnabled, gridSize]);

  // 스냅 이벤트 핸들러
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const handleObjectMoving = (e: any) => {
      if (!snapEnabled) return;
      const obj = e.target;
      if (!obj || obj === bgImageRef.current) return;
      
      obj.set({
        left: snapToGrid(obj.left || 0),
        top: snapToGrid(obj.top || 0),
      });
    };
    
    const handleObjectScaling = (e: any) => {
      if (!snapEnabled) return;
      const obj = e.target;
      if (!obj || obj === bgImageRef.current) return;
      
      const width = obj.width * obj.scaleX;
      const height = obj.height * obj.scaleY;
      const snappedWidth = snapToGrid(width);
      const snappedHeight = snapToGrid(height);
      
      obj.set({
        scaleX: snappedWidth / obj.width,
        scaleY: snappedHeight / obj.height,
      });
    };
    
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectScaling);
    
    return () => {
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:scaling', handleObjectScaling);
    };
  }, [snapEnabled, snapToGrid]);

  // ============ Export Functions ============
  const exportAsSVG = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !artifactId) return;
    try {
      const svg = canvas.toSVG();
      const { artifactApi } = await import('../../services/api');
      await artifactApi.exportAnnotationsToSVG(artifactId, svg, imageName.replace(/\.[^.]+$/, ''));
    } catch (e) { console.error('SVG export failed:', e); }
  };

  const exportAsPDF = async () => {
    // PDF export logic would go here
    console.log('PDF export not yet implemented');
  };

  // ============ Save Function ============
  const handleSave = async () => {
    // 저장 전에 pending 업데이트를 강제로 동기화
    if (pendingLayerUpdateRef.current) {
      setLayers([...layersRef.current]);
      pendingLayerUpdateRef.current = false;
    }
    
    // layersRef.current를 사용하여 최신 데이터 저장 (브러시 드로잉 포함)
    const saveData: Record<string, unknown> = {
      version: '2.0',
      layers: layersRef.current,
      pages,
      imageRotation,
      currentPage,
      timelapseFrames: timelapseEnabled ? timelapseFrames : [],
      passwordProtected,
      // Note: actual password encryption should be done server-side
    };
    
    if (imageRotation !== 0 && imagePath && artifactId) {
      try {
        const { artifactApi } = await import('../../services/api');
        await artifactApi.rotateImage(artifactId, imagePath, imageRotation);
        saveData.imageRotation = 0;
        onRotateApplied?.();
      } catch (e) { console.error('Rotation failed:', e); }
    }
    
    // If password protected, encrypt data server-side
    if (passwordProtected && filePassword && artifactId) {
      try {
        const { artifactApi } = await import('../../services/api');
        // Server will handle encryption - use regular save with password in data
        await artifactApi.saveImageAnnotations(artifactId, imagePath || '', { ...saveData, protected: true, password: filePassword });
      } catch (e) {
        console.error('Protected save failed:', e);
      }
    }
    
    console.log('저장할 데이터:', JSON.stringify({
      version: saveData.version,
      layerCount: (saveData.layers as any[])?.length,
      objectCounts: (saveData.layers as any[])?.map((l: any) => ({ id: l.id, count: l.objects?.length }))
    }));
    
    onSave(saveData);
    setLastSaved(new Date().toLocaleTimeString());
  };

  // ============ Canvas Initialization ============
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000, height: 700, backgroundColor: '#f3f4f6', selection: true,
    });
    fabricCanvasRef.current = canvas;

    // Load background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const fabricImg = new fabric.FabricImage(img, { selectable: false, evented: false });
      const scale = Math.min((canvas.width! - 40) / img.width, (canvas.height! - 40) / img.height);
      fabricImg.scale(scale);
      fabricImg.set({
        left: (canvas.width! - img.width * scale) / 2,
        top: (canvas.height! - img.height * scale) / 2,
      });
      bgImageRef.current = fabricImg;
      canvas.add(fabricImg);
      canvas.sendObjectToBack(fabricImg);
      canvas.requestRenderAll();
      setBgLoaded(true);

      // Load initial annotations
      if (initialAnnotations && typeof initialAnnotations === 'object') {
        const data = initialAnnotations as any;
        if (data.layers?.length > 0) {
          setLayers(data.layers);
          layersRef.current = data.layers;
          // Render layers after loading
          setTimeout(() => renderLayersToCanvas(), 100);
        }
        if (data.pages) setPages(data.pages);
        if (typeof data.imageRotation === 'number') setImageRotation(data.imageRotation);
        if (data.currentPage) setCurrentPage(data.currentPage);
      }
    };
    img.onerror = () => setBgError(true);
    let finalUrl = imageUrl;
    if (imageUrl.startsWith('/uploads') || imageUrl.startsWith('/images')) {
      finalUrl = `${window.location.origin}${imageUrl}`;
    }
    img.src = finalUrl;

    // Mouse events for shapes
    canvas.on('mouse:down', (e) => {
      if (selectedToolRef.current === 'move') {
        isPanningRef.current = true;
        panLastRef.current = { x: (e.e as any).clientX, y: (e.e as any).clientY };
        canvas.setCursor('grabbing');
        return;
      }
      const tool = selectedToolRef.current;
      const isShapeTool = ['line', 'rect', 'circle', 'triangle'].includes(tool);
      
      if (!isShapeTool && measureMode === 'none') return;
      
      // Disable selection and deselect all objects when drawing shapes
      canvas.discardActiveObject();
      canvas.selection = false;
      
      const pointer = canvas.getPointer(e.e);
      
      if (measureMode !== 'none') {
        measurePointsRef.current.push({ x: pointer.x, y: pointer.y });
        updateMeasurePreview();
        
        // 거리 측정은 2점, 각도 측정은 3점에서 자동 완료
        if (measureMode === 'distance' && measurePointsRef.current.length >= 2) {
          setTimeout(() => completeMeasurement(), 100);
        } else if (measureMode === 'angle' && measurePointsRef.current.length >= 3) {
          setTimeout(() => completeMeasurement(), 100);
        }
        return;
      }

      dragStartRef.current = { x: pointer.x, y: pointer.y };
      isDrawingRef.current = true;
      let shape: fabric.Object | null = null;
      if (tool === 'line') {
        shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: brushColorRef.current, strokeWidth: brushWidthRef.current, selectable: false, evented: false,
        });
      } else if (tool === 'rect') {
        shape = new fabric.Rect({
          left: pointer.x, top: pointer.y, width: 0, height: 0,
          stroke: brushColorRef.current, strokeWidth: brushWidthRef.current, fill: 'transparent', selectable: false, evented: false,
        });
      } else if (tool === 'circle') {
        shape = new fabric.Ellipse({
          left: pointer.x, top: pointer.y, rx: 0, ry: 0,
          stroke: brushColorRef.current, strokeWidth: brushWidthRef.current, fill: 'transparent', selectable: false, evented: false,
        });
      } else if (tool === 'triangle') {
        shape = new fabric.Triangle({
          left: pointer.x, top: pointer.y, width: 0, height: 0,
          stroke: brushColorRef.current, strokeWidth: brushWidthRef.current, fill: 'transparent', selectable: false, evented: false,
        });
      }
      if (shape) { draggingShapeRef.current = shape; canvas.add(shape); }
    });

    canvas.on('mouse:move', (e) => {
      if (isPanningRef.current && canvas.viewportTransform) {
        const last = panLastRef.current;
        if (last) {
          const dx = (e.e as any).clientX - last.x;
          const dy = (e.e as any).clientY - last.y;
          const v = canvas.viewportTransform;
          v[4] += dx;
          v[5] += dy;
          canvas.requestRenderAll();
          panLastRef.current = { x: (e.e as any).clientX, y: (e.e as any).clientY };
        }
      }
      const pointer = canvas.getPointer(e.e);
      
      // 측정 모드 실시간 미리보기
      if (measureMode !== 'none' && measurePointsRef.current.length > 0) {
        updateMeasurePreview({ x: pointer.x, y: pointer.y });
      }
      
      // 도형 그리기
      if (!isDrawingRef.current || !dragStartRef.current || !draggingShapeRef.current) return;
      const shape = draggingShapeRef.current;
      const start = dragStartRef.current;
      if (shape instanceof fabric.Line) {
        shape.set({ x2: pointer.x, y2: pointer.y });
      } else if (shape instanceof fabric.Rect || shape instanceof fabric.Triangle) {
        shape.set({
          left: Math.min(start.x, pointer.x), top: Math.min(start.y, pointer.y),
          width: Math.abs(pointer.x - start.x), height: Math.abs(pointer.y - start.y),
        });
      } else if (shape instanceof fabric.Ellipse) {
        shape.set({
          left: Math.min(start.x, pointer.x), top: Math.min(start.y, pointer.y),
          rx: Math.abs(pointer.x - start.x) / 2, ry: Math.abs(pointer.y - start.y) / 2,
        });
      }
      canvas.requestRenderAll();
    });
    
    // 더블클릭으로 면적 측정 완료
    canvas.on('mouse:dblclick', () => {
      if (measureMode === 'area' && measurePointsRef.current.length >= 3) {
        completeMeasurement();
      }
    });

    canvas.on('mouse:up', () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        panLastRef.current = null;
        canvas.setCursor('default');
      }
      if (isDrawingRef.current && draggingShapeRef.current) {
        const shape = draggingShapeRef.current;
        shape.set({ selectable: true, evented: true });
        
        // Keep object on canvas, just update layer state
        const serialized = shape.toObject() as SerializedObject;
        
        // Update ref only during drawing, sync state later
        const currentLayers = layersRef.current;
        layersRef.current = currentLayers.map(layer => {
          if (layer.id === activeLayerIdRef.current) {
            return { ...layer, objects: [...layer.objects, serialized] };
          }
          return layer;
        });
        pendingLayerUpdateRef.current = true;
      }
      isDrawingRef.current = false;
      
      // Restore selection capability only if select tool is active
      if (selectedToolRef.current === 'select') {
        canvas.selection = true;
      }
      dragStartRef.current = null;
      draggingShapeRef.current = null;
    });

    canvas.on('mouse:wheel', (opt: any) => {
      let z = canvas.getZoom();
      z *= 0.999 ** opt.e.deltaY;
      z = Math.min(4, Math.max(0.25, z));
      const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
      canvas.zoomToPoint(point, z);
      setZoom(z);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('text:changed', (e: any) => {
      const obj = e.target as any;
      if (!obj) return;
      const id = obj.objectId;
      if (!id) return;
      const serialized = (obj as fabric.Object).toObject() as SerializedObject;
      const currentLayers = layersRef.current;
      layersRef.current = currentLayers.map(layer => {
        if (layer.id === activeLayerIdRef.current) {
          const updated = layer.objects.map(o => {
            return (o as any).objectId === id ? serialized : o;
          });
          return { ...layer, objects: updated };
        }
        return layer;
      });
      pendingLayerUpdateRef.current = true;
      setLayers([...layersRef.current]);
    });

    canvas.on('text:editing:exited', (e: any) => {
      const obj = e.target as any;
      if (!obj) return;
      const id = obj.objectId;
      if (!id) return;
      const serialized = (obj as fabric.Object).toObject() as SerializedObject;
      const currentLayers = layersRef.current;
      layersRef.current = currentLayers.map(layer => {
        if (layer.id === activeLayerIdRef.current) {
          const updated = layer.objects.map(o => {
            return (o as any).objectId === id ? serialized : o;
          });
          return { ...layer, objects: updated };
        }
        return layer;
      });
      pendingLayerUpdateRef.current = true;
      setLayers([...layersRef.current]);
    });
    
    // Handle path created (free drawing) - OPTIMIZED: update ref only
    canvas.on('path:created', (e: any) => {
      const path = e.path;
      if (!path) return;
      
      const serialized = path.toObject() as SerializedObject;
      
      // Update ref only, don't trigger React re-render during drawing
      const currentLayers = layersRef.current;
      const newLayers = currentLayers.map(layer => {
        if (layer.id === activeLayerIdRef.current) {
          return { ...layer, objects: [...layer.objects, serialized] };
        }
        return layer;
      });
      layersRef.current = newLayers;
      pendingLayerUpdateRef.current = true;
      
      // 드로잉 완료 후 즉시 상태 동기화 (저장 시 누락 방지)
      setTimeout(() => {
        if (pendingLayerUpdateRef.current) {
          setLayers([...layersRef.current]);
          pendingLayerUpdateRef.current = false;
        }
      }, 100);
    });

    return () => { canvas.dispose(); fabricCanvasRef.current = null; };
  }, [imageUrl, initialAnnotations, measureMode]);

  // ============ Custom Brush Classes ============
  const createSprayBrush = (canvas: fabric.Canvas, color: string, width: number) => {
    const SprayBrush = (fabric as any).SprayBrush;
    if (SprayBrush) {
      const brush = new SprayBrush(canvas);
      brush.color = color;
      brush.width = width;
      brush.density = 20;
      brush.dotWidth = 2;
      brush.dotWidthVariance = 1;
      return brush;
    }
    return null;
  };

  const createCircleBrush = (canvas: fabric.Canvas, color: string, width: number) => {
    const CircleBrush = (fabric as any).CircleBrush;
    if (CircleBrush) {
      const brush = new CircleBrush(canvas);
      brush.color = color;
      brush.width = width;
      return brush;
    }
    return null;
  };

  // 네온 효과 브러시 - 글로우 효과가 있는 밝은 선
  const createNeonBrush = (canvas: fabric.Canvas, color: string, width: number) => {
    const PencilBrush = (fabric as any).PencilBrush;
    const brush = new PencilBrush(canvas);
    brush.color = color;
    brush.width = width;
    brush.strokeLineCap = 'round';
    brush.strokeLineJoin = 'round';
    // 네온 효과를 위한 shadow 설정
    brush.shadow = new fabric.Shadow({
      color: color,
      blur: width * 3,
      offsetX: 0,
      offsetY: 0,
    });
    return brush;
  };

  // 점선 브러시 - 대시 패턴
  const createDottedBrush = (canvas: fabric.Canvas, color: string, width: number) => {
    const PencilBrush = (fabric as any).PencilBrush;
    const brush = new PencilBrush(canvas);
    brush.color = color;
    brush.width = width;
    brush.strokeLineCap = 'round';
    brush.strokeDashArray = [width * 2, width * 3]; // 점선 패턴
    return brush;
  };

  // 패턴 브러시 - 반복 패턴 효과
  const createPatternBrush = (canvas: fabric.Canvas, color: string, width: number) => {
    const PatternBrush = (fabric as any).PatternBrush;
    if (PatternBrush) {
      const brush = new PatternBrush(canvas);
      // 간단한 사각형 패턴 생성
      brush.getPatternSrc = function() {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternCanvas.height = width * 4;
        const ctx = patternCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, width * 2, width * 2);
          ctx.fillRect(width * 2, width * 2, width * 2, width * 2);
        }
        return patternCanvas;
      };
      return brush;
    }
    // 폴백: 일반 브러시
    const PencilBrush = (fabric as any).PencilBrush;
    const brush = new PencilBrush(canvas);
    brush.color = color;
    brush.width = width;
    return brush;
  };

  // 그라데이션 브러시 - HSL 색상 변화
  const gradientHueRef = useRef(0);
  const createGradientBrush = (canvas: fabric.Canvas, baseColor: string, width: number) => {
    const PencilBrush = (fabric as any).PencilBrush;
    const brush = new PencilBrush(canvas);
    brush.width = width;
    brush.strokeLineCap = 'round';
    // 초기 색상 설정 (그라데이션은 mouse:move에서 동적으로 변경)
    brush.color = baseColor;
    return brush;
  };

  // 텍스처 브러시 - 거친 질감 효과
  const createTexturedBrush = (canvas: fabric.Canvas, color: string, width: number) => {
    const SprayBrush = (fabric as any).SprayBrush;
    if (SprayBrush) {
      const brush = new SprayBrush(canvas);
      brush.color = color;
      brush.width = width * 6;
      brush.density = 40;
      brush.dotWidth = Math.max(1, width / 3);
      brush.dotWidthVariance = width / 2;
      brush.randomOpacity = true;
      return brush;
    }
    // 폴백
    const PencilBrush = (fabric as any).PencilBrush;
    const brush = new PencilBrush(canvas);
    brush.color = color;
    brush.width = width * 2;
    return brush;
  };

  // ============ Tool Change Effect with Brush Customization ============
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    if (selectedTool === 'pen' || selectedTool === 'highlighter' || selectedTool === 'brush') {
      canvas.isDrawingMode = true;
      
      const PencilBrush = (fabric as any).PencilBrush;
      let brush: any = null;
      let color = brushColor;
      let width = brushWidth;
      
      switch (brushType) {
        case 'spray': {
          // 스프레이 브러시 - 점들이 흩뿌려지는 효과
          brush = createSprayBrush(canvas, brushColor, brushWidth * 20);
          if (brush) {
            brush.density = 30 + brushWidth * 2;
            brush.dotWidth = Math.max(1, brushWidth / 2);
            brush.dotWidthVariance = brushWidth / 3;
          }
          break;
        }
        case 'airbrush': {
          // 에어브러시 - 부드러운 스프레이 효과
          brush = createSprayBrush(canvas, `${brushColor}60`, brushWidth * 15);
          if (brush) {
            brush.density = 50;
            brush.dotWidth = 1;
            brush.dotWidthVariance = 0.5;
          }
          break;
        }
        case 'highlighter': {
          // 형광펜 - 반투명 넓은 선, 부드러운 끝
          brush = new PencilBrush(canvas);
          brush.color = `${brushColor}60`;
          brush.width = brushWidth * 5;
          brush.strokeLineCap = 'butt';
          brush.strokeLineJoin = 'round';
          brush.decimate = 3; // 형광펜은 약간 거친 느낌
          break;
        }
        case 'marker': {
          // 마커 - 굵고 선명한 선, 부드러운 곡선
          brush = new PencilBrush(canvas);
          brush.color = brushColor;
          brush.width = brushWidth * 2;
          brush.strokeLineCap = 'round';
          brush.strokeLineJoin = 'round';
          brush.decimate = 1; // 더 정밀한 선
          break;
        }
        case 'watercolor': {
          // 수채화 - 반투명하고 부드러운 효과
          brush = createCircleBrush(canvas, `${brushColor}40`, brushWidth * 3);
          if (!brush) {
            brush = new PencilBrush(canvas);
            brush.color = `${brushColor}40`;
            brush.width = brushWidth * 3;
          }
          break;
        }
        case 'calligraphy': {
          // 캘리그라피 - 가변 굵기, 부드러운 연결
          brush = new PencilBrush(canvas);
          brush.color = brushColor;
          brush.width = brushWidth * 1.5;
          brush.strokeLineCap = 'round';
          brush.strokeLineJoin = 'round';
          brush.decimate = 1;
          break;
        }
        case 'crayon': {
          // 크레용 - 거친 질감 효과 (점들로 시뮬레이션)
          brush = createSprayBrush(canvas, brushColor, brushWidth * 8);
          if (brush) {
            brush.density = 100;
            brush.dotWidth = 2;
            brush.dotWidthVariance = 1;
          } else {
            brush = new PencilBrush(canvas);
            brush.color = brushColor;
            brush.width = brushWidth * 2;
          }
          break;
        }
        case 'charcoal': {
          // 목탄 - 거칠고 진한 효과
          brush = createSprayBrush(canvas, `${brushColor}CC`, brushWidth * 10);
          if (brush) {
            brush.density = 80;
            brush.dotWidth = 3;
            brush.dotWidthVariance = 2;
          } else {
            brush = new PencilBrush(canvas);
            brush.color = `${brushColor}CC`;
            brush.width = brushWidth * 2.5;
          }
          break;
        }
        case 'ink': {
          // 잉크 - 선명하고 가는 선, 매끄러운 곡선
          brush = new PencilBrush(canvas);
          brush.color = brushColor;
          brush.width = Math.max(1, brushWidth * 0.7);
          brush.strokeLineCap = 'round';
          brush.strokeLineJoin = 'round';
          brush.decimate = 0.5; // 매우 정밀한 선
          break;
        }
        case 'neon': {
          // 네온 - 글로우 효과
          brush = createNeonBrush(canvas, brushColor, brushWidth);
          break;
        }
        case 'dotted': {
          // 점선 - 대시 패턴
          brush = createDottedBrush(canvas, brushColor, brushWidth);
          break;
        }
        case 'pattern': {
          // 패턴 - 반복 패턴
          brush = createPatternBrush(canvas, brushColor, brushWidth);
          break;
        }
        case 'gradient': {
          // 그라데이션 - 무지개 색상 변화
          brush = createGradientBrush(canvas, brushColor, brushWidth);
          gradientHueRef.current = 0; // 그라데이션 시작점 리셋
          break;
        }
        case 'textured': {
          // 텍스처 - 거친 질감
          brush = createTexturedBrush(canvas, brushColor, brushWidth);
          break;
        }
        default: {
          // 연필 (기본) - 부드러운 곡선을 위한 최적화
          brush = new PencilBrush(canvas);
          brush.color = brushColor;
          brush.width = brushWidth;
          brush.strokeLineCap = 'round';
          brush.strokeLineJoin = 'round';
          brush.decimate = 2; // 포인트 간소화로 부드러운 선
          break;
        }
      }
      
      if (brush) {
        // 공통 브러시 설정 - 부드러운 렌더링
        brush.strokeLineCap = brush.strokeLineCap || 'round';
        brush.strokeLineJoin = brush.strokeLineJoin || 'round';
        if (brush.decimate === undefined) {
          brush.decimate = 2; // 기본 간소화 값
        }
        canvas.freeDrawingBrush = brush;
      }
    } else {
      canvas.isDrawingMode = false;
    }
    
    // Disable selection for shape drawing tools to prevent selecting existing objects while drawing
    const isShapeTool = ['line', 'rect', 'circle', 'triangle'].includes(selectedTool);
    const isSelectTool = selectedTool === 'select';
    canvas.selection = isSelectTool;
    
    // Update existing objects' selectable/evented properties based on current tool
    canvas.getObjects().forEach(obj => {
      if (obj !== bgImageRef.current) {
        obj.set({ 
          selectable: isSelectTool, 
          evented: isSelectTool || isShapeTool ? false : true 
        });
      }
    });
    
    // For select tool, re-enable object interaction
    if (isSelectTool) {
      canvas.getObjects().forEach(obj => {
        if (obj !== bgImageRef.current) {
          obj.set({ selectable: true, evented: true });
        }
      });
    }
    
    canvas.requestRenderAll();
  }, [selectedTool, brushColor, brushWidth, brushType, brushOpacity]);

  // Separate effect for pressure sensitivity to avoid re-registering on every brush change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !pressureSensitivity) return;
    
    let lastPressureUpdate = 0;
    const handlePressure = (e: any) => {
      // Throttle pressure updates to 60fps
      const now = Date.now();
      if (now - lastPressureUpdate < 16) return;
      lastPressureUpdate = now;
      
      if (canvas.isDrawingMode && e.e instanceof PointerEvent && canvas.freeDrawingBrush) {
        const pressure = e.e.pressure || 0.5;
        const baseWidth = brushWidthRef.current;
        canvas.freeDrawingBrush.width = baseWidth * (0.3 + pressure * 0.7);
      }
    };
    
    canvas.on('mouse:move', handlePressure);
    return () => {
      canvas.off('mouse:move', handlePressure);
    };
  }, [pressureSensitivity]);

  // Gradient brush color cycling effect
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || brushType !== 'gradient') return;
    
    let lastGradientUpdate = 0;
    const handleGradientColor = (e: any) => {
      const now = Date.now();
      if (now - lastGradientUpdate < 50) return; // 20fps for color change
      lastGradientUpdate = now;
      
      if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
        // HSL 색상 순환 (무지개 효과)
        gradientHueRef.current = (gradientHueRef.current + 5) % 360;
        const hue = gradientHueRef.current;
        canvas.freeDrawingBrush.color = `hsl(${hue}, 80%, 50%)`;
      }
    };
    
    canvas.on('mouse:move', handleGradientColor);
    return () => {
      canvas.off('mouse:move', handleGradientColor);
    };
  }, [brushType]);

  // ============ Keyboard Shortcuts ============
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const isTyping = ae && ['input','textarea'].includes(ae.tagName.toLowerCase());
      const activeObj = fabricCanvasRef.current?.getActiveObject() as any;
      const isTextEditing = activeObj && (activeObj.isEditing === true);
      if (isTyping || isTextEditing) {
        return;
      }
      // 측정 모드 단축키
      if (measureMode !== 'none') {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelMeasurement();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (measureMode === 'area' && measurePointsRef.current.length >= 3) {
            completeMeasurement();
          }
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          undoLastMeasurePoint();
          return;
        }
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); handleUndo(); }
        if (e.key === 'y') { e.preventDefault(); handleRedo(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.key === 'v') setSelectedTool('select');
      if (e.key === 'p') setSelectedTool('pen');
      if (e.key === 'h') setSelectedTool('highlighter');
      // 측정 도구 단축키
      if (e.key === 'm') setMeasureMode(measureMode === 'distance' ? 'none' : 'distance');
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) setMeasureMode(measureMode === 'angle' ? 'none' : 'angle');
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) setMeasureMode(measureMode === 'area' ? 'none' : 'area');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, measureMode, cancelMeasurement, completeMeasurement, undoLastMeasurePoint]);

  // ============ UI Components ============
  const ToolButton = ({ tool, icon: Icon, title, active }: { tool: string; icon: any; title: string; active?: boolean }) => (
    <button
      onClick={() => setSelectedTool(tool)}
      className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${
        (active ?? selectedTool === tool) ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'
      }`}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const AccordionPanel = ({ title, icon: Icon, children, id }: { title: string; icon: any; children: React.ReactNode; id: string }) => (
    <div className="border-b">
      <button
        onClick={() => setActivePanel(activePanel === id ? null : id)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{title}</span>
        {activePanel === id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {activePanel === id && <div className="px-3 py-2 bg-gray-50">{children}</div>}
    </div>
  );

  // ============ Render ============
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-900 truncate max-w-[200px]">{imageName}</h2>
            <div className="flex items-center gap-1 text-xs">
              <span className="px-2 py-0.5 bg-gray-200 rounded">{Math.round(zoom * 100)}%</span>
              <span className="px-2 py-0.5 bg-gray-200 rounded">{imageRotation}°</span>
              {lastSaved && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">저장됨 {lastSaved}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Page Tabs */}
            <div className="flex items-center bg-gray-200 rounded-lg p-0.5">
              {(['before', 'during', 'after'] as PageKey[]).map(page => (
                <button
                  key={page}
                  onClick={() => switchPage(page)}
                  className={`px-3 py-1 text-xs rounded ${currentPage === page ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                >
                  {page === 'before' ? '전' : page === 'during' ? '중' : '후'}
                </button>
              ))}
            </div>
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              <Save className="h-4 w-4" /> 저장
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar - 2줄 구성 */}
        <div className="border-b bg-white">
          {/* 첫 번째 줄: 도구 선택 */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100">
            {/* 선택/이동 도구 */}
            <div className="flex items-center bg-gray-100 rounded p-0.5">
              <ToolButton tool="select" icon={MousePointer} title="선택 (V)" />
              <ToolButton tool="move" icon={Move} title="이동" />
            </div>
            
            {/* 드로잉 도구 */}
            <div className="flex items-center bg-gray-100 rounded p-0.5">
              <ToolButton tool="pen" icon={Pencil} title="펜 (P)" />
              <ToolButton tool="highlighter" icon={Highlighter} title="형광펜 (H)" />
              <ToolButton tool="brush" icon={Brush} title="브러시" />
              <ToolButton tool="eraser" icon={Eraser} title="지우개" />
            </div>
            
            {/* 도형 도구 */}
            <div className="flex items-center bg-gray-100 rounded p-0.5">
              <ToolButton tool="line" icon={Minus} title="직선" />
              <ToolButton tool="rect" icon={Square} title="사각형" />
              <ToolButton tool="circle" icon={CircleIcon} title="원" />
              <ToolButton tool="triangle" icon={Triangle} title="삼각형" />
              <button onClick={addText} className="h-8 w-8 flex items-center justify-center rounded text-gray-600 hover:bg-gray-200" title="텍스트">
                <Type className="h-4 w-4" />
              </button>
            </div>
            
            {/* 측정 도구 */}
            <div className="flex items-center bg-gray-100 rounded p-0.5">
              <button
                onClick={() => setMeasureMode(measureMode === 'distance' ? 'none' : 'distance')}
                className={`h-8 px-2 flex items-center gap-1 rounded text-xs ${measureMode === 'distance' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                title="거리 측정 (M)"
              >
                <Ruler className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMeasureMode(measureMode === 'angle' ? 'none' : 'angle')}
                className={`h-8 px-2 flex items-center gap-1 rounded text-xs ${measureMode === 'angle' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                title="각도 측정 (A)"
              >
                <Triangle className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMeasureMode(measureMode === 'area' ? 'none' : 'area')}
                className={`h-8 px-2 flex items-center gap-1 rounded text-xs ${measureMode === 'area' ? 'bg-purple-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                title="면적 측정 (R)"
              >
                <Square className="h-4 w-4" />
              </button>
            </div>
            
            {/* 히스토리 */}
            <div className="flex items-center gap-0.5 px-2 border-l">
              <button onClick={handleUndo} disabled={undoStack.length === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="실행취소 (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </button>
              <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="다시실행 (Ctrl+Y)">
                <Redo2 className="h-4 w-4" />
              </button>
              <button onClick={deleteSelected} className="p-1.5 rounded hover:bg-gray-100 text-red-500" title="삭제 (Delete)">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            {/* 뷰 컨트롤 */}
            <div className="flex items-center gap-0.5 px-2 border-l">
              <button onClick={() => handleZoom(-0.1)} className="p-1.5 rounded hover:bg-gray-100" title="축소"><ZoomOut className="h-4 w-4" /></button>
              <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => handleZoom(0.1)} className="p-1.5 rounded hover:bg-gray-100" title="확대"><ZoomIn className="h-4 w-4" /></button>
              <button onClick={() => handleRotate('ccw')} className="p-1.5 rounded hover:bg-gray-100" title="반시계 회전"><RotateCcw className="h-4 w-4" /></button>
              <button onClick={() => handleRotate('cw')} className="p-1.5 rounded hover:bg-gray-100" title="시계 회전"><RotateCw className="h-4 w-4" /></button>
            </div>
            
            {/* 그리드/스냅/설정 */}
            <div className="flex items-center gap-1 ml-auto">
              <button 
                onClick={() => setGridEnabled(!gridEnabled)} 
                className={`p-1.5 rounded ${gridEnabled ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`} 
                title={`그리드 ${gridEnabled ? 'OFF' : 'ON'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              {gridEnabled && (
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="text-xs bg-gray-50 border border-gray-200 rounded px-1 py-1 w-14"
                  title="그리드 크기"
                >
                  <option value={10}>10px</option>
                  <option value={20}>20px</option>
                  <option value={25}>25px</option>
                  <option value={50}>50px</option>
                </select>
              )}
              <button 
                onClick={() => setSnapEnabled(!snapEnabled)} 
                className={`p-1.5 rounded ${snapEnabled ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'}`} 
                title={`스냅 ${snapEnabled ? 'OFF' : 'ON'} (객체 이동 시 그리드에 맞춤)`}
              >
                <Magnet className="h-4 w-4" />
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded ${showSettings ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="설정">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* 두 번째 줄: 속성 설정 */}
          <div className="flex items-center gap-3 px-3 py-1.5">
            {/* 브러시 타입 */}
            <div className="flex items-center gap-1">
              <Palette className="h-4 w-4 text-gray-400" />
              <select
                value={brushType}
                onChange={(e) => setBrushType(e.target.value as BrushType)}
                className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                title="브러시 타입"
              >
                {BRUSH_TYPES.map(bt => (
                  <option key={bt.id} value={bt.id}>{bt.icon} {bt.name}</option>
                ))}
              </select>
            </div>
            
            {/* 색상 */}
            <div className="flex items-center gap-1 px-2 border-l">
              <span className="text-xs text-gray-500">색상</span>
              {COLORS.slice(0, 8).map(c => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  className={`w-5 h-5 rounded-full border ${brushColor === c ? 'ring-2 ring-blue-400 ring-offset-1' : 'border-gray-300'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer" />
            </div>
            
            {/* 굵기 */}
            <div className="flex items-center gap-2 px-2 border-l">
              <span className="text-xs text-gray-500">굵기</span>
              <input type="range" min={1} max={30} value={brushWidth} onChange={e => setBrushWidth(Number(e.target.value))} className="w-20" />
              <span className="text-xs text-gray-600 w-6">{brushWidth}px</span>
            </div>
            
            {/* 측정 단위/스케일 */}
            <div className="flex items-center gap-1 px-2 border-l">
              <span className="text-xs text-gray-500">단위</span>
              <select
                value={measureUnit}
                onChange={(e) => setMeasureUnit(e.target.value as typeof measureUnit)}
                className="text-xs bg-gray-50 border border-gray-200 rounded px-1 py-1"
                title="측정 단위"
              >
                <option value="px">px</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="in">in</option>
                <option value="ft">ft</option>
              </select>
              <button
                onClick={() => setShowScaleDialog(true)}
                className={`h-6 px-2 text-xs rounded border ${measureScale !== 1 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'} hover:bg-gray-100`}
                title="스케일 캘리브레이션"
              >
                {measureScale !== 1 ? `×${measureScale.toFixed(3)}` : '스케일'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-4 relative">
            <div className="relative bg-white rounded shadow-lg">
              {!bgLoaded && !bgError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              )}
              {bgError && <div className="absolute inset-0 flex items-center justify-center text-red-500">이미지 로드 실패</div>}
              <canvas ref={canvasRef} />
            </div>
            
            {/* 레이어 잠금/참조 상태 안내 */}
            {activeLayer && (activeLayer.locked || activeLayer.isReference) && (
              <div className="absolute bottom-4 right-4 bg-amber-50 border border-amber-300 rounded-lg shadow-lg p-3 max-w-xs z-10">
                <div className="flex items-center gap-2">
                  {activeLayer.locked ? (
                    <Lock className="h-5 w-5 text-amber-600" />
                  ) : (
                    <Shield className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {activeLayer.locked ? '레이어 잠김' : '참조 레이어'}
                    </p>
                    <p className="text-xs text-amber-600">
                      {activeLayer.locked 
                        ? '이 레이어는 잠겨있어 편집할 수 없습니다.' 
                        : '참조 레이어는 편집이 불가능합니다.'}
                    </p>
                    <button
                      onClick={() => {
                        if (activeLayer.locked) {
                          toggleLayerLock(activeLayer.id);
                        } else {
                          toggleReferenceLayer(activeLayer.id);
                        }
                      }}
                      className="mt-2 text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded"
                    >
                      {activeLayer.locked ? '잠금 해제' : '참조 해제'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* 설정 패널 */}
            {showSettings && (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-lg p-4 w-64 z-20">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">에디터 설정</span>
                  <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded">
                    <XIcon className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4 text-xs">
                  {/* 캔버스 설정 */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">캔버스</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">그리드 표시</span>
                        <button
                          onClick={() => setGridEnabled(!gridEnabled)}
                          className={`w-10 h-5 rounded-full transition-colors ${gridEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${gridEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {gridEnabled && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">그리드 크기</span>
                          <select
                            value={gridSize}
                            onChange={(e) => setGridSize(Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 rounded px-2 py-1"
                          >
                            <option value={10}>10px</option>
                            <option value={20}>20px</option>
                            <option value={25}>25px</option>
                            <option value={50}>50px</option>
                          </select>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">스냅 활성화</span>
                        <button
                          onClick={() => setSnapEnabled(!snapEnabled)}
                          className={`w-10 h-5 rounded-full transition-colors ${snapEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${snapEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 브러시 설정 */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">브러시</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">필압 감지</span>
                        <button
                          onClick={() => setPressureSensitivity(!pressureSensitivity)}
                          className={`w-10 h-5 rounded-full transition-colors ${pressureSensitivity ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${pressureSensitivity ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">불투명도</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.1}
                            value={brushOpacity}
                            onChange={(e) => setBrushOpacity(Number(e.target.value))}
                            className="w-16"
                          />
                          <span className="w-8 text-right">{Math.round(brushOpacity * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 자동 저장 */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">자동 저장</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">활성화</span>
                        <button
                          onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                          className={`w-10 h-5 rounded-full transition-colors ${autoSaveEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${autoSaveEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {autoSaveEnabled && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">저장 간격</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={10}
                              max={300}
                              value={autoSaveInterval}
                              onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                              className="w-14 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-right"
                            />
                            <span>초</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 히스토리 */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">히스토리</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">최대 기록 수</span>
                      <select
                        value={historyLimit}
                        onChange={(e) => setHistoryLimit(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1"
                      >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 측정 모드 가이드 패널 */}
            {measureMode !== 'none' && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-lg p-4 max-w-xs z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${
                    measureMode === 'distance' ? 'bg-blue-500' : 
                    measureMode === 'angle' ? 'bg-amber-500' : 'bg-purple-500'
                  }`} />
                  <span className="font-medium text-sm">
                    {measureMode === 'distance' ? '거리 측정' : 
                     measureMode === 'angle' ? '각도 측정' : '면적 측정'}
                  </span>
                  <button 
                    onClick={cancelMeasurement}
                    className="ml-auto p-1 hover:bg-gray-100 rounded"
                    title="취소 (ESC)"
                  >
                    <XIcon className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                
                {/* 측정 가이드 */}
                <div className="text-xs text-gray-600 space-y-1 mb-3">
                  {measureMode === 'distance' && (
                    <>
                      <p>• 시작점 클릭 → 끝점 클릭</p>
                      <p>• 두 점 사이의 거리를 측정합니다</p>
                    </>
                  )}
                  {measureMode === 'angle' && (
                    <>
                      <p>• 첫 번째 점 → 꼭지점 → 세 번째 점</p>
                      <p>• 세 점이 이루는 각도를 측정합니다</p>
                    </>
                  )}
                  {measureMode === 'area' && (
                    <>
                      <p>• 다각형의 꼭지점들을 순서대로 클릭</p>
                      <p>• 더블클릭 또는 Enter로 완료</p>
                      <p>• Backspace로 마지막 점 삭제</p>
                    </>
                  )}
                </div>
                
                {/* 현재 측정값 */}
                {liveMeasureValue && (
                  <div className={`p-2 rounded text-sm font-mono ${
                    measureMode === 'distance' ? 'bg-blue-50 text-blue-700' : 
                    measureMode === 'angle' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {liveMeasureValue.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
                
                {/* 포인트 카운터 */}
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>포인트: {measurePointsRef.current.length}</span>
                  {measureMode === 'area' && measurePointsRef.current.length >= 3 && (
                    <button
                      onClick={completeMeasurement}
                      className="ml-auto px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                    >
                      완료 (Enter)
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* 측정 결과 히스토리 */}
            {measureResults.length > 0 && measureMode === 'none' && (
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 max-w-xs z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">최근 측정 결과</span>
                  <button 
                    onClick={() => setMeasureResults([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    지우기
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {measureResults.slice(-5).reverse().map((result, idx) => (
                    <div key={result.timestamp} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        result.type === 'distance' ? 'bg-blue-500' : 
                        result.type === 'angle' ? 'bg-amber-500' : 'bg-purple-500'
                      }`} />
                      <span className="font-mono">{result.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="w-72 border-l bg-white flex-col overflow-hidden hidden md:flex">
            {/* Layers Panel */}
            <AccordionPanel title="레이어" icon={Layers} id="layers">
              <div className="space-y-1">
                <button onClick={addLayer} className="w-full flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
                  <Plus className="h-3 w-3" /> 새 레이어
                </button>
                {layers.map((layer, idx) => (
                  <div
                    key={layer.id}
                    draggable
                    onDragStart={(e) => handleLayerDragStart(e, layer.id)}
                    onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                    onDragLeave={handleLayerDragLeave}
                    onDrop={(e) => handleLayerDrop(e, layer.id)}
                    onDragEnd={handleLayerDragEnd}
                    onClick={() => !layer.locked && setActiveLayerId(layer.id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-grab active:cursor-grabbing transition-all ${
                      activeLayerId === layer.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'
                    } ${layer.isReference ? 'border-l-2 border-l-orange-400' : ''} ${
                      draggedLayerId === layer.id ? 'opacity-50' : ''
                    } ${dragOverLayerId === layer.id ? 'border-t-2 border-t-blue-500' : ''}`}
                  >
                    <div className="text-gray-300 cursor-grab mr-1">⋮⋮</div>
                    <button onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} className="p-0.5">
                      {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-gray-400" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); toggleLayerLock(layer.id); }} className="p-0.5">
                      {layer.locked ? <Lock className="h-3 w-3 text-red-500" /> : <Unlock className="h-3 w-3 text-gray-400" />}
                    </button>
                    {editingLayerId === layer.id ? (
                      <input
                        type="text"
                        value={editingLayerName}
                        onChange={(e) => setEditingLayerName(e.target.value)}
                        onBlur={() => {
                          if (editingLayerName.trim()) {
                            renameLayer(layer.id, editingLayerName.trim());
                          }
                          setEditingLayerId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingLayerName.trim()) {
                              renameLayer(layer.id, editingLayerName.trim());
                            }
                            setEditingLayerId(null);
                          } else if (e.key === 'Escape') {
                            setEditingLayerId(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="flex-1 px-1 py-0.5 text-xs border border-blue-400 rounded bg-white focus:outline-none"
                      />
                    ) : (
                      <span 
                        className="flex-1 truncate cursor-text hover:text-blue-600"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingLayerId(layer.id);
                          setEditingLayerName(layer.name);
                        }}
                        title="더블클릭하여 이름 편집"
                      >
                        {layer.name}
                      </span>
                    )}
                    <span className="text-gray-400 text-[10px]">{layer.objects.length}</span>
                    {layers.length > 1 && (
                      <button 
                        onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }} 
                        className="p-0.5 text-gray-400 hover:text-red-500"
                        title="레이어 삭제"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {activeLayer && (
                <div className="mt-2 pt-2 border-t space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">투명도</span>
                    <input
                      type="range" min={0} max={1} step={0.1} value={activeLayer.opacity}
                      onChange={e => setLayerOpacity(activeLayerId, Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-8">{Math.round(activeLayer.opacity * 100)}%</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox" checked={activeLayer.isReference}
                      onChange={() => toggleReferenceLayer(activeLayerId)}
                    />
                    <span>참조 레이어 (고정)</span>
                  </label>
                </div>
              )}
            </AccordionPanel>

            {/* Brush Settings */}
            <AccordionPanel title="브러시 설정" icon={Brush} id="brush">
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-1">
                  {BRUSH_TYPES.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBrushType(b.id)}
                      className={`p-1.5 text-xs rounded ${brushType === b.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                      title={b.name}
                    >
                      {b.icon}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-12">불투명도</span>
                  <input type="range" min={0.1} max={1} step={0.1} value={brushOpacity} onChange={e => setBrushOpacity(Number(e.target.value))} className="flex-1" />
                  <span className="w-8">{Math.round(brushOpacity * 100)}%</span>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={pressureSensitivity} onChange={e => setPressureSensitivity(e.target.checked)} />
                  <span>필압 감지</span>
                </label>
              </div>
            </AccordionPanel>

            {/* Measure Settings */}
            <AccordionPanel title="측정" icon={Ruler} id="measure">
              <div className="space-y-2 text-xs">
                <div className="flex gap-1">
                  <button onClick={() => setMeasureMode('distance')} className={`flex-1 py-1 rounded ${measureMode === 'distance' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>거리</button>
                  <button onClick={() => setMeasureMode('angle')} className={`flex-1 py-1 rounded ${measureMode === 'angle' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>각도</button>
                  <button onClick={() => setMeasureMode('area')} className={`flex-1 py-1 rounded ${measureMode === 'area' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>면적</button>
                </div>
                {measureMode !== 'none' && (
                  <div className="p-2 bg-yellow-50 rounded text-yellow-700">
                    {measureMode === 'distance' && '캔버스에서 2점을 클릭하세요'}
                    {measureMode === 'angle' && '캔버스에서 3점을 클릭하세요'}
                    {measureMode === 'area' && '캔버스에서 다각형 꼭지점을 클릭하세요'}
                    <div className="mt-1">포인트: {measurePointsRef.current.length}개</div>
                  </div>
                )}
                {measureMode !== 'none' && (
                  <div className="flex gap-1">
                    <button onClick={completeMeasurement} className="flex-1 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">측정 완료</button>
                    <button onClick={() => { measurePointsRef.current = []; setMeasureMode('none'); }} className="flex-1 py-1.5 bg-gray-300 rounded hover:bg-gray-400">취소</button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">단위</span>
                  <select value={measureUnit} onChange={e => setMeasureUnit(e.target.value as typeof measureUnit)} className="flex-1 px-2 py-1 border rounded">
                    <option value="px">px</option>
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">스케일</span>
                  <input type="number" step="0.01" value={measureScale} onChange={e => setMeasureScale(Number(e.target.value))} className="flex-1 px-2 py-1 border rounded" />
                </div>
              </div>
            </AccordionPanel>

            {/* Timelapse */}
            <AccordionPanel title="타임랩스" icon={Clock} id="timelapse">
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={timelapseEnabled} onChange={e => setTimelapseEnabled(e.target.checked)} />
                  <span>타임랩스 활성화</span>
                </label>
                {timelapseEnabled && (
                  <>
                    <button onClick={captureTimelapseFrame} className="w-full py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                      프레임 캡처 ({timelapseFrames.length})
                    </button>
                  </>
                )}
              </div>
            </AccordionPanel>

            {/* Auto-save & Export */}
            <AccordionPanel title="저장 및 내보내기" icon={Save} id="export">
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={autoSaveEnabled} onChange={e => setAutoSaveEnabled(e.target.checked)} />
                  <span>자동 저장</span>
                  <input
                    type="number" min={10} max={300} value={autoSaveInterval}
                    onChange={e => setAutoSaveInterval(Number(e.target.value))}
                    className="w-12 px-1 py-0.5 border rounded"
                    disabled={!autoSaveEnabled}
                  />
                  <span>초</span>
                </label>
                <div className="space-y-1">
                  <p className="text-gray-500 mb-1">내보내기 형식:</p>
                  <div className="grid grid-cols-4 gap-1">
                    <button onClick={() => exportAsFormat('svg')} className="py-1.5 bg-gray-100 rounded hover:bg-gray-200">SVG</button>
                    <button onClick={() => exportAsFormat('png')} className="py-1.5 bg-gray-100 rounded hover:bg-gray-200">PNG</button>
                    <button onClick={() => exportAsFormat('jpg')} className="py-1.5 bg-gray-100 rounded hover:bg-gray-200">JPG</button>
                    <button onClick={() => exportAsFormat('pdf')} className="py-1.5 bg-gray-100 rounded hover:bg-gray-200">PDF</button>
                  </div>
                  <p className="text-gray-400 mt-1">* TIFF, PSD는 서버에서 처리됩니다</p>
                </div>
              </div>
            </AccordionPanel>

            {/* Security & Password */}
            <AccordionPanel title="보안" icon={Shield} id="security">
              <div className="space-y-2 text-xs">
                <div className={`p-2 rounded ${passwordProtected ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      {passwordProtected ? <Lock className="h-3 w-3 text-green-600" /> : <Unlock className="h-3 w-3" />}
                      {passwordProtected ? '암호 보호됨' : '암호 미설정'}
                    </span>
                    <button 
                      onClick={togglePasswordProtection}
                      className={`px-2 py-1 rounded ${passwordProtected ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                    >
                      {passwordProtected ? '해제' : '설정'}
                    </button>
                  </div>
                </div>
                <p className="text-gray-400">* 암호 보호 시 서버에서 암호화됩니다</p>
              </div>
            </AccordionPanel>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-1 border-t bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>도구: {selectedTool}</span>
            <span>레이어: {activeLayer?.name}</span>
            <span>히스토리: {undoStack.length}/{historyLimit}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>V: 선택 | P: 펜 | H: 형광펜 | Ctrl+Z: 실행취소 | Ctrl+S: 저장</span>
          </div>
        </div>
      </div>

      {/* 스케일 캘리브레이션 다이얼로그 */}
      {showScaleDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">스케일 캘리브레이션</h3>
              <button onClick={() => setShowScaleDialog(false)} className="p-1 hover:bg-gray-100 rounded">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 방법 1: 직접 입력 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-3">방법 1: 직접 스케일 입력</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">1 픽셀 =</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={measureScale}
                    onChange={(e) => setMeasureScale(Math.max(0.0001, Number(e.target.value)))}
                    className="w-24 px-2 py-1 border rounded text-sm"
                  />
                  <select
                    value={measureUnit}
                    onChange={(e) => setMeasureUnit(e.target.value as typeof measureUnit)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="in">in</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>

              {/* 방법 2: 캘리브레이션 */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-sm mb-3">방법 2: 기준선으로 캘리브레이션</h4>
                <p className="text-xs text-gray-600 mb-3">
                  이미지에서 알려진 길이의 두 점을 클릭한 후, 실제 거리를 입력하세요.
                </p>
                
                {!isCalibrating ? (
                  <button
                    onClick={() => {
                      setIsCalibrating(true);
                      setShowScaleDialog(false);
                      setMeasureMode('distance');
                      measurePointsRef.current = [];
                    }}
                    className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    기준선 그리기 시작
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">측정된 픽셀:</span>
                      <span className="font-mono font-medium">{calibrationPixels.toFixed(1)} px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">실제 거리:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={calibrationDistance}
                        onChange={(e) => setCalibrationDistance(e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                      <select
                        value={measureUnit}
                        onChange={(e) => setMeasureUnit(e.target.value as typeof measureUnit)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="m">m</option>
                        <option value="in">in</option>
                        <option value="ft">ft</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (calibrationPixels > 0 && Number(calibrationDistance) > 0) {
                          setMeasureScale(Number(calibrationDistance) / calibrationPixels);
                          setIsCalibrating(false);
                        }
                      }}
                      disabled={calibrationPixels <= 0}
                      className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                    >
                      스케일 적용
                    </button>
                  </div>
                )}
              </div>

              {/* 프리셋 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-3">일반적인 스케일 프리셋</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setMeasureScale(0.1); setMeasureUnit('mm'); }}
                    className="py-2 px-3 bg-white border rounded text-xs hover:bg-gray-50"
                  >
                    1px = 0.1mm (고해상도)
                  </button>
                  <button
                    onClick={() => { setMeasureScale(0.264583); setMeasureUnit('mm'); }}
                    className="py-2 px-3 bg-white border rounded text-xs hover:bg-gray-50"
                  >
                    96 DPI (화면)
                  </button>
                  <button
                    onClick={() => { setMeasureScale(0.084667); setMeasureUnit('mm'); }}
                    className="py-2 px-3 bg-white border rounded text-xs hover:bg-gray-50"
                  >
                    300 DPI (인쇄)
                  </button>
                  <button
                    onClick={() => { setMeasureScale(1); setMeasureUnit('px'); }}
                    className="py-2 px-3 bg-white border rounded text-xs hover:bg-gray-50"
                  >
                    초기화 (픽셀)
                  </button>
                </div>
              </div>

              {/* 현재 설정 표시 */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-800">
                  <strong>현재 스케일:</strong> 1px = {measureScale.toFixed(6)} {measureUnit}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  100px = {(100 * measureScale).toFixed(2)} {measureUnit}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowScaleDialog(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VectorAnnotationEditor;

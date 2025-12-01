import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as fabric from 'fabric'
import { useImageStore } from '../stores/imageStore'
import { useProjectStore } from '../stores/projectStore'
import { useAuthStore } from '../stores/authStore'
import { 
  Pen, 
  Square, 
  Circle, 
  Type, 
  ArrowRight, 
  Highlighter,
  Save,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Trash2,
  Move,
  Maximize2,
  Minimize2
} from 'lucide-react'

export default function Editor() {
  const { imageId } = useParams<{ imageId: string }>()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  
  const { user } = useAuthStore()
  const { images } = useImageStore()
  const { 
    currentProject, 
    layers, 
    createProject, 
    saveProject, 
    addLayer, 
    updateLayer, 
    deleteLayer 
  } = useProjectStore()

  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [zoom, setZoom] = useState(1)
  const [brushColor, setBrushColor] = useState('#1e3a8a')
  const [brushWidth, setBrushWidth] = useState(2)
  const [isPanning, setIsPanning] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const lastPosRef = useRef<{x:number;y:number}|null>(null)
  useEffect(() => {
    if (selectedTool === 'pen') {
      setBrushWidth(2)
    } else if (selectedTool === 'highlighter') {
      setBrushWidth(10)
    }
  }, [selectedTool])

  const currentImage = images.find(img => img.id === imageId)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!currentImage) {
      navigate('/')
      return
    }

    // Fabric.js 캔버스 초기화
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#f3f4f6',
        selection: true,
        preserveObjectStacking: true
      })

      fabricCanvasRef.current = canvas

      // 이미지 로드
      fabric.Image.fromURL(currentImage.url).then((img) => {
        // 캔버스 크기에 맞게 이미지 조정
        const canvasWidth = canvas.width!
        const canvasHeight = canvas.height!
        const scale = Math.min(canvasWidth / (img.width || 1), canvasHeight / (img.height || 1))
        
        img.set({
          scaleX: scale * 0.8,
          scaleY: scale * 0.8,
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
          selectable: false
        })

        canvas.add(img)
        canvas.renderAll()
      }).catch((error) => {
        console.error('이미지 로드 실패:', error)
      })

      canvas.isDrawingMode = selectedTool === 'pen' || selectedTool === 'highlighter'
      if (canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = brushColor
        canvas.freeDrawingBrush.width = brushWidth
      }

      canvas.on('mouse:wheel', (opt: any) => {
        let z = canvas.getZoom()
        z *= 0.999 ** opt.e.deltaY
        z = Math.min(3, Math.max(0.5, z))
        const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY)
        canvas.zoomToPoint(point, z)
        setZoom(z)
        opt.e.preventDefault()
        opt.e.stopPropagation()
      })

      canvas.on('mouse:down', (opt: any) => {
        if (selectedTool === 'move') {
          setIsPanning(true)
          lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY }
          canvas.setCursor('grabbing')
        }
      })

      canvas.on('mouse:move', (opt: any) => {
        if (isPanning && canvas.viewportTransform) {
          const v = canvas.viewportTransform
          const last = lastPosRef.current
          if (last) {
            const dx = opt.e.clientX - last.x
            const dy = opt.e.clientY - last.y
            v[4] += dx
            v[5] += dy
            canvas.requestRenderAll()
            lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY }
          }
        }
      })

      canvas.on('mouse:up', () => {
        if (isPanning) {
          setIsPanning(false)
          canvas.setCursor('default')
        }
      })

      canvas.on('path:created', (e) => {
        const path = e.path
        if (path) {
          addLayer({
            project_id: currentProject?.id || '',
            type: selectedTool,
            data: path.toJSON(),
            opacity: selectedTool === 'highlighter' ? 0.5 : 1,
            visible: true,
            order_index: layers.length
          })
        }
      })
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [currentImage, user, navigate, selectedTool, brushColor, brushWidth, addLayer, layers.length])

  useEffect(() => {
    if (imageId && !currentProject) {
      createProject(imageId, `${currentImage?.filename || '새 사업'} 편집`)
    }
  }, [imageId, currentProject?.id, currentImage?.filename, createProject])

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool)
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.isDrawingMode = tool === 'pen' || tool === 'highlighter'
      if (fabricCanvasRef.current.isDrawingMode) {
        const width = tool === 'pen' ? 2 : tool === 'highlighter' ? 10 : brushWidth
        fabricCanvasRef.current.freeDrawingBrush.color = brushColor
        fabricCanvasRef.current.freeDrawingBrush.width = width
      }
      if (tool === 'move') {
        fabricCanvasRef.current.isDrawingMode = false
      }
    }
  }

  const handleZoomIn = () => {
    if (fabricCanvasRef.current) {
      const c = fabricCanvasRef.current
      const center = new fabric.Point(c.getWidth() / 2, c.getHeight() / 2)
      const newZoom = Math.min(zoom + 0.1, 3)
      c.zoomToPoint(center, newZoom)
      setZoom(newZoom)
    }
  }

  const handleZoomOut = () => {
    if (fabricCanvasRef.current) {
      const c = fabricCanvasRef.current
      const center = new fabric.Point(c.getWidth() / 2, c.getHeight() / 2)
      const newZoom = Math.max(zoom - 0.1, 0.5)
      c.zoomToPoint(center, newZoom)
      setZoom(newZoom)
    }
  }

  const handleSave = async () => {
    if (fabricCanvasRef.current && currentProject) {
      await saveProject(fabricCanvasRef.current)
    }
  }

  const handleAddShape = (type: 'rectangle' | 'circle' | 'arrow') => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    let shape: fabric.Object

    switch (type) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 60,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: 1
        })
        break
      case 'circle':
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: 1
        })
        break
      case 'arrow':
        shape = new fabric.Path('M 0 0 L 100 0 M 75 -10 L 100 0 L 75 10', {
          left: 100,
          top: 100,
          stroke: brushColor,
          strokeWidth: 1,
          fill: 'transparent'
        })
        break
      default:
        return
    }

    canvas.add(shape)
    canvas.setActiveObject(shape)
    canvas.renderAll()

    // 레이어로 저장
    addLayer({
      project_id: currentProject?.id || '',
      type: type,
      data: shape.toJSON(),
      opacity: 1,
      visible: true,
      order_index: layers.length
    })
  }

  const handleAddText = () => {
    if (!fabricCanvasRef.current) return

    const text = new fabric.Text('텍스트를 입력하세요', {
      left: 100,
      top: 100,
      fill: brushColor,
      fontSize: 20
    })

    fabricCanvasRef.current.add(text)
    fabricCanvasRef.current.setActiveObject(text)
    fabricCanvasRef.current.renderAll()

    // 레이어로 저장
    addLayer({
      project_id: currentProject?.id || '',
      type: 'text',
      data: text.toJSON(),
      opacity: 1,
      visible: true,
      order_index: layers.length
    })
  }

  const toggleLayerVisibility = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (layer) {
      updateLayer(layerId, { visible: !layer.visible })
    }
  }

  if (!currentImage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">이미지를 찾을 수 없습니다</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex ${fullscreen ? 'overflow-hidden' : ''}`}>
      <div className={`bg-white shadow-lg flex flex-col items-center py-4 space-y-2 ${fullscreen ? 'hidden' : 'w-20'}`}>
        <button
          onClick={() => handleToolSelect('select')}
          className={`p-3 rounded-lg ${selectedTool === 'select' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="선택"
        >
          <div className="w-5 h-5 border-2 border-current rounded-sm"></div>
        </button>
        <button
          onClick={() => handleToolSelect('move')}
          className={`p-3 rounded-lg ${selectedTool === 'move' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="이동"
        >
          <Move className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => handleToolSelect('pen')}
          className={`p-3 rounded-lg ${selectedTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="펜"
        >
          <Pen className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => handleToolSelect('highlighter')}
          className={`p-3 rounded-lg ${selectedTool === 'highlighter' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="형광펜"
        >
          <Highlighter className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => handleAddShape('rectangle')}
          className="p-3 rounded-lg text-gray-600 hover:bg-gray-100"
          title="사각형"
        >
          <Square className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => handleAddShape('circle')}
          className="p-3 rounded-lg text-gray-600 hover:bg-gray-100"
          title="원"
        >
          <Circle className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => handleAddShape('arrow')}
          className="p-3 rounded-lg text-gray-600 hover:bg-gray-100"
          title="화살표"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        
        <button
          onClick={handleAddText}
          className="p-3 rounded-lg text-gray-600 hover:bg-gray-100"
          title="텍스트"
        >
          <Type className="h-5 w-5" />
        </button>
      </div>

      <div className={`flex-1 flex flex-col ${fullscreen ? 'h-screen' : ''}`}>
        {/* 상단 툴바 */}
        <div className={`bg-white shadow-sm ${fullscreen ? 'p-2' : 'p-4'} flex items-center justify-between`}>
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {currentImage.filename} 편집
            </h1>
            
            {/* 색상 선택 */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">색상:</label>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300"
              />
            </div>
            
            {/* 굵기 선택 */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">굵기:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600 w-8">{brushWidth}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 줌 컨트롤 */}
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              title="축소"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              title="확대"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              title={fullscreen ? '축소 화면' : '전체 화면'}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            
            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>저장</span>
            </button>
            
            {/* 나가기 */}
            <button
              onClick={() => navigate('/')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              나가기
            </button>
          </div>
        </div>

        {/* 캔버스 */}
        <div className={`flex-1 bg-gray-100 ${fullscreen ? 'p-0' : 'p-8'} overflow-auto`}>
          <div className={`bg-white rounded-lg shadow-lg inline-block ${fullscreen ? 'w-full h-full' : ''}`}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
      <div className={`bg-white shadow-lg ${fullscreen ? 'hidden' : 'w-80'}`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">레이어</h2>
        </div>
        
        <div className="p-4">
          <div className="space-y-2">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                className={`flex items-center justify-between p-3 rounded-lg border border-gray-200`}
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleLayerVisibility(layer.id)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      레이어 {layers.length - index}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{layer.type}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteLayer(layer.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {layers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">레이어가 없습니다</p>
                <p className="text-xs mt-1">도구를 사용하여 주석을 추가하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

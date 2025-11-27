import {
  PencilIcon,
  PaintBrushIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  MinusIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  HandRaisedIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  PlayCircleIcon,
  PlusCircleIcon,
  BackspaceIcon
} from '@heroicons/react/24/outline';
import CircleIcon from '@/components/Icons/CircleIcon';
import PentagonIcon from '@/components/Icons/PentagonIcon';
import RulerIcon from '@/components/Icons/RulerIcon';
import SquareIcon from '@/components/Icons/SquareIcon';
import { SizePreset, ToolGroup } from '@/types/toolbar';

export const sizePresets: Record<string, SizePreset> = {
  compact: {
    name: 'compact',
    buttonSize: 'sm',
    iconSize: 16,
    spacing: 2,
    groupSpacing: 4
  },
  comfortable: {
    name: 'comfortable',
    buttonSize: 'md',
    iconSize: 20,
    spacing: 4,
    groupSpacing: 8
  },
  spacious: {
    name: 'spacious',
    buttonSize: 'lg',
    iconSize: 24,
    spacing: 6,
    groupSpacing: 12
  }
};

export const defaultToolGroups: ToolGroup[] = [
  {
    id: 'drawing',
    name: 'Drawing Tools',
    icon: PaintBrushIcon,
    order: 1,
    visible: true,
    tools: [
      {
        id: 'pen',
        name: 'Pen',
        icon: PencilIcon,
        action: () => console.log('Pen tool selected'),
        shortcut: 'P',
        visible: true
      },
      {
        id: 'highlighter',
        name: 'Highlighter',
        icon: PaintBrushIcon,
        action: () => console.log('Highlighter tool selected'),
        shortcut: 'H',
        visible: true
      },
      {
        id: 'eraser',
        name: 'Eraser',
        icon: BackspaceIcon,
        action: () => console.log('Eraser tool selected'),
        shortcut: 'E',
        visible: true
      }
    ]
  },
  {
    id: 'shapes',
    name: 'Shape Tools',
    icon: SquareIcon,
    order: 2,
    visible: true,
    tools: [
      {
        id: 'line',
        name: 'Line',
        icon: MinusIcon,
        action: () => console.log('Line tool selected'),
        shortcut: 'L',
        visible: true
      },
      {
        id: 'circle',
        name: 'Circle',
        icon: PlayCircleIcon,
        action: () => console.log('Circle tool selected'),
        shortcut: 'C',
        visible: true
      },
      {
        id: 'rectangle',
        name: 'Rectangle',
        icon: PlusCircleIcon,
        action: () => console.log('Rectangle tool selected'),
        shortcut: 'R',
        visible: true
      }
    ]
  },
  {
    id: 'annotation',
    name: 'Annotation Tools',
    icon: ArrowRightIcon,
    order: 3,
    visible: true,
    tools: [
      {
        id: 'arrow',
        name: 'Arrow',
        icon: ArrowRightIcon,
        action: () => console.log('Arrow tool selected'),
        shortcut: 'A',
        visible: true
      },
      {
        id: 'text',
        name: 'Text',
        icon: DocumentTextIcon,
        action: () => console.log('Text tool selected'),
        shortcut: 'T',
        visible: true
      }
    ]
  },
  {
    id: 'transform',
    name: 'Transform Tools',
    icon: ArrowsUpDownIcon,
    order: 4,
    visible: true,
    tools: [
      {
        id: 'move',
        name: 'Move',
        icon: HandRaisedIcon,
        action: () => console.log('Move tool selected'),
        shortcut: 'V',
        visible: true
      },
      {
        id: 'rotate',
        name: 'Rotate',
        icon: ArrowPathIcon,
        action: () => console.log('Rotate tool selected'),
        shortcut: 'O',
        visible: true
      }
    ]
  },
  {
    id: 'view',
    name: 'View Tools',
    icon: MagnifyingGlassPlusIcon,
    order: 5,
    visible: true,
    tools: [
      {
        id: 'zoom-in',
        name: 'Zoom In',
        icon: MagnifyingGlassPlusIcon,
        action: () => console.log('Zoom In tool selected'),
        shortcut: 'Ctrl++',
        visible: true
      },
      {
        id: 'zoom-out',
        name: 'Zoom Out',
        icon: MagnifyingGlassMinusIcon,
        action: () => console.log('Zoom Out tool selected'),
        shortcut: 'Ctrl+-',
        visible: true
      }
    ]
  },
  {
    id: 'history',
    name: 'History Tools',
    icon: ArrowUturnLeftIcon,
    order: 6,
    visible: true,
    tools: [
      {
        id: 'undo',
        name: 'Undo',
        icon: ArrowUturnLeftIcon,
        action: () => console.log('Undo tool selected'),
        shortcut: 'Ctrl+Z',
        visible: true
      },
      {
        id: 'redo',
        name: 'Redo',
        icon: ArrowUturnRightIcon,
        action: () => console.log('Redo tool selected'),
        shortcut: 'Ctrl+Y',
        visible: true
      }
    ]
  }
];
import { ComponentType } from 'react';

export interface SizePreset {
  name: string;
  buttonSize: 'sm' | 'md' | 'lg';
  iconSize: number;
  spacing: number;
  groupSpacing: number;
}

export interface Tool {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
  visible: boolean;
}

export interface ToolGroup {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  order: number;
  visible: boolean;
  tools: Tool[];
}

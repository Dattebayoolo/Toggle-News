/*!
 * Toggle UI Library v1.0.0
 * Modern Material 3 inspired toggle & switch UI system
 * https://github.com/Dattebayoolo/Toggle-Ui-Library
 * MIT License
 */
import type { ChangeEvent, ReactElement } from 'react';

export interface BaseToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}

export interface SegmentedSwitchProps {
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  className?: string;
}

export declare function M3Switch(props: BaseToggleProps): ReactElement;
export declare function M3IconSwitch(props: BaseToggleProps): ReactElement;
export declare function M3HaloSwitch(props: BaseToggleProps): ReactElement;
export declare function IOSSwitch(props: BaseToggleProps): ReactElement;
export declare function DayNightSwitch(props: BaseToggleProps): ReactElement;
export declare function JellySwitch(props: BaseToggleProps): ReactElement;
export declare function CyberpunkSwitch(props: BaseToggleProps): ReactElement;
export declare function NeumorphicSwitch(props: BaseToggleProps): ReactElement;
export declare function EqualizerSwitch(props: BaseToggleProps): ReactElement;
export declare function EyeSwitch(props: BaseToggleProps): ReactElement;
export declare function MinimalSwitch(props: BaseToggleProps): ReactElement;
export declare function NatureSwitch(props: BaseToggleProps): ReactElement;
export declare function HeartSwitch(props: BaseToggleProps): ReactElement;
export declare function SegmentedToggle(props: BaseToggleProps): ReactElement;
export declare function PixelSwitch(props: BaseToggleProps): ReactElement;
export declare function RocketSwitch(props: BaseToggleProps): ReactElement;
export declare function LockSwitch(props: BaseToggleProps): ReactElement;
export declare function WifiSwitch(props: BaseToggleProps): ReactElement;
export declare function MarbleSwitch(props: BaseToggleProps): ReactElement;
export declare function HolographicSwitch(props: BaseToggleProps): ReactElement;
export declare function WorkspaceSwitch(props: BaseToggleProps): ReactElement;
export declare function TactileSwitch(props: BaseToggleProps): ReactElement;
export declare function LavaSwitch(props: BaseToggleProps): ReactElement;
export declare function CoffeeSwitch(props: BaseToggleProps): ReactElement;
export declare function GeminiSwitch(props: BaseToggleProps): ReactElement;

export declare const TOGGLE_COMPONENTS: {
  M3Switch: typeof M3Switch;
  M3IconSwitch: typeof M3IconSwitch;
  M3HaloSwitch: typeof M3HaloSwitch;
  IOSSwitch: typeof IOSSwitch;
  DayNightSwitch: typeof DayNightSwitch;
  JellySwitch: typeof JellySwitch;
  CyberpunkSwitch: typeof CyberpunkSwitch;
  NeumorphicSwitch: typeof NeumorphicSwitch;
  EqualizerSwitch: typeof EqualizerSwitch;
  EyeSwitch: typeof EyeSwitch;
  MinimalSwitch: typeof MinimalSwitch;
  NatureSwitch: typeof NatureSwitch;
  HeartSwitch: typeof HeartSwitch;
  SegmentedToggle: typeof SegmentedToggle;
  PixelSwitch: typeof PixelSwitch;
  RocketSwitch: typeof RocketSwitch;
  LockSwitch: typeof LockSwitch;
  WifiSwitch: typeof WifiSwitch;
  MarbleSwitch: typeof MarbleSwitch;
  HolographicSwitch: typeof HolographicSwitch;
  WorkspaceSwitch: typeof WorkspaceSwitch;
  TactileSwitch: typeof TactileSwitch;
  LavaSwitch: typeof LavaSwitch;
  CoffeeSwitch: typeof CoffeeSwitch;
  GeminiSwitch: typeof GeminiSwitch;
};

export interface ToggleCatalogItem {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description: string;
  html: string;
  css: string;
  react: string;
}

export declare const TOGGLE_CATALOG: ToggleCatalogItem[];

export declare class SoundEngine {
  constructor();
  audioCtx: any;
  enabled: boolean;
  init(): void;
  playToggle(isOn: boolean): void;
  playSpring(): void;
  toggleSound(): boolean;
}

export declare const soundEngine: SoundEngine | null;

export interface ToggleStudioState {
  width: number;
  height: number;
  thumbSize: number;
  trackRadius: number;
  thumbRadius: number;
  padding: number;
  speed: number;
  activeColor: string;
  inactiveColor: string;
  thumbColor: string;
  glowBlur: number;
  isChecked: boolean;
  activeTab: "css" | "html" | "react";
}

export declare class ToggleStudio {
  constructor();
  state: ToggleStudioState;
  update(): void;
  generateCode(type: "css" | "html" | "react"): string;
}

declare const _default: {
  SoundEngine: typeof SoundEngine;
  soundEngine: SoundEngine | null;
  ToggleStudio: typeof ToggleStudio;
  TOGGLE_CATALOG: ToggleCatalogItem[];
  M3Switch: typeof M3Switch;
  M3IconSwitch: typeof M3IconSwitch;
  M3HaloSwitch: typeof M3HaloSwitch;
  IOSSwitch: typeof IOSSwitch;
  DayNightSwitch: typeof DayNightSwitch;
  JellySwitch: typeof JellySwitch;
  CyberpunkSwitch: typeof CyberpunkSwitch;
  NeumorphicSwitch: typeof NeumorphicSwitch;
  EqualizerSwitch: typeof EqualizerSwitch;
  EyeSwitch: typeof EyeSwitch;
  MinimalSwitch: typeof MinimalSwitch;
  NatureSwitch: typeof NatureSwitch;
  HeartSwitch: typeof HeartSwitch;
  SegmentedToggle: typeof SegmentedToggle;
  PixelSwitch: typeof PixelSwitch;
  RocketSwitch: typeof RocketSwitch;
  LockSwitch: typeof LockSwitch;
  WifiSwitch: typeof WifiSwitch;
  MarbleSwitch: typeof MarbleSwitch;
  HolographicSwitch: typeof HolographicSwitch;
  WorkspaceSwitch: typeof WorkspaceSwitch;
  TactileSwitch: typeof TactileSwitch;
  LavaSwitch: typeof LavaSwitch;
  CoffeeSwitch: typeof CoffeeSwitch;
  GeminiSwitch: typeof GeminiSwitch;
};
export default _default;

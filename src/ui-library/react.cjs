/*!
 * Toggle UI Library v1.0.0
 * Modern Material 3 inspired toggle & switch UI system
 * https://github.com/Dattebayoolo/Toggle-Ui-Library
 * MIT License
 */
const React = require('react');
const { useState } = React;

/** Material 3 Switch */
function M3Switch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-m3">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb" />
      </span>
    </label>
  );
}

/** M3 Iconic Switch */
function M3IconSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-m3-icon">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb">
          <span className="material-symbols-rounded thumb-icon">{checked ? 'check' : 'close'}</span>
        </span>
      </span>
    </label>
  );
}

/** Material Touch Halo */
function M3HaloSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-m3-halo">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="halo" /></span>
      </span>
    </label>
  );
}

/** iOS 18 Liquid Glass */
function IOSSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-ios">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Celestial Day & Night */
function DayNightSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-daynight">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="clouds" />
        <span className="stars">★ ★</span>
        <span className="thumb"><span className="moon-crater" /></span>
      </span>
    </label>
  );
}

/** Squishy Jelly Spring */
function JellySwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-squish">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Cyberpunk Plasma Tube */
function CyberpunkSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-cyberpunk">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="neon-bar" /></span>
      </span>
    </label>
  );
}

/** Neumorphic Tactile */
function NeumorphicSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-neumorphic">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="led-dot" /></span>
      </span>
    </label>
  );
}

/** Equalizer Waves */
function EqualizerSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-equalizer">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="wave-bars">
          <span className="bar" /><span className="bar" /><span className="bar" /><span className="bar" />
        </span>
        <span className="thumb"><span className="material-symbols-rounded">graphic_eq</span></span>
      </span>
    </label>
  );
}

/** Password Peek Eye */
function EyeSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-eye">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb">
          <span className="material-symbols-rounded">{checked ? 'visibility' : 'visibility_off'}</span>
        </span>
      </span>
    </label>
  );
}

/** Minimalist Swiss Pill */
function MinimalSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-minimal">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Nature Sprout & Bloom */
function NatureSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-nature">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="material-symbols-rounded sprout-icon">eco</span></span>
      </span>
    </label>
  );
}

/** Heart Like Micro-burst */
function HeartSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-heart">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="material-symbols-rounded">favorite</span></span>
      </span>
    </label>
  );
}

/** Segmented Tri-State */
function SegmentedToggle({ value, onChange }) {
  return (
    <div className="toggle-segmented">
      {['Off', 'Auto', 'On'].map(opt => (
        <button key={opt} className={value === opt ? 'active' : ''} onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/** 8-Bit Retro Pixel */
function PixelSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-pixel">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Rocket Ignition Thruster */
function RocketSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-rocket">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="material-symbols-rounded rocket-icon">rocket_launch</span></span>
      </span>
    </label>
  );
}

/** Security Padlock */
function LockSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-lock">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb">
          <span className="material-symbols-rounded">{checked ? 'lock_open' : 'lock'}</span>
        </span>
      </span>
    </label>
  );
}

/** Wifi Signal Radiator */
function WifiSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-wifi">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb">
          <span className="material-symbols-rounded">{checked ? 'wifi' : 'wifi_off'}</span>
        </span>
      </span>
    </label>
  );
}

/** Refraction Glass Marble */
function MarbleSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-marble">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Holographic Spectrum Shift */
function HolographicSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-gradient">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Workspace Theme Switch */
function WorkspaceSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-workspace">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb">
          <span className="material-symbols-rounded">{checked ? 'dark_mode' : 'light_mode'}</span>
        </span>
      </span>
    </label>
  );
}

/** Tactile Grip Ridge */
function TactileSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-tactile">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="ridge" /><span className="ridge" /><span className="ridge" /></span>
      </span>
    </label>
  );
}

/** Viscous Lava Lamp */
function LavaSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-lava">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Warm Morning Coffee */
function CoffeeSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-coffee">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="material-symbols-rounded">coffee</span></span>
      </span>
    </label>
  );
}

/** Gemini AI Sparkle */
function GeminiSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-gemini">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="material-symbols-rounded">auto_awesome</span></span>
      </span>
    </label>
  );
}

module.exports = {
  M3Switch,
  M3IconSwitch,
  M3HaloSwitch,
  IOSSwitch,
  DayNightSwitch,
  JellySwitch,
  CyberpunkSwitch,
  NeumorphicSwitch,
  EqualizerSwitch,
  EyeSwitch,
  MinimalSwitch,
  NatureSwitch,
  HeartSwitch,
  SegmentedToggle,
  PixelSwitch,
  RocketSwitch,
  LockSwitch,
  WifiSwitch,
  MarbleSwitch,
  HolographicSwitch,
  WorkspaceSwitch,
  TactileSwitch,
  LavaSwitch,
  CoffeeSwitch,
  GeminiSwitch,
  TOGGLE_COMPONENTS: {
    M3Switch,
    M3IconSwitch,
    M3HaloSwitch,
    IOSSwitch,
    DayNightSwitch,
    JellySwitch,
    CyberpunkSwitch,
    NeumorphicSwitch,
    EqualizerSwitch,
    EyeSwitch,
    MinimalSwitch,
    NatureSwitch,
    HeartSwitch,
    SegmentedToggle,
    PixelSwitch,
    RocketSwitch,
    LockSwitch,
    WifiSwitch,
    MarbleSwitch,
    HolographicSwitch,
    WorkspaceSwitch,
    TactileSwitch,
    LavaSwitch,
    CoffeeSwitch,
    GeminiSwitch
  }
};

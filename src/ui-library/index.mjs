/*!
 * Toggle UI Library v1.0.0
 * Modern Material 3 inspired toggle & switch UI system
 * https://github.com/Dattebayoolo/Toggle-Ui-Library
 * MIT License
 */
import React, { useState } from 'react';

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = localStorage.getItem('toggle_sound_enabled') === 'true';
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playToggle(isOn) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      const startTime = this.audioCtx.currentTime;
      const duration = 0.06;

      // Frequency glide: Crisp pop for ON, softer thud for OFF
      const startFreq = isOn ? 740 : 420;
      const endFreq = isOn ? 520 : 280;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

      // Fast exponential envelope to avoid clicks
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  playSpring() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const startTime = this.audioCtx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, startTime);
      osc.frequency.linearRampToValueAtTime(800, startTime + 0.08);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    } catch (e) {}
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('toggle_sound_enabled', this.enabled);
    if (this.enabled) {
      this.init();
      this.playToggle(true);
    }
    return this.enabled;
  }
}
export const soundEngine = typeof window !== 'undefined' ? new SoundEngine() : null;
export { SoundEngine };

class ToggleStudio {
  constructor() {
    this.state = {
      width: 60,
      height: 32,
      thumbSize: 24,
      trackRadius: 9999,
      thumbRadius: 9999,
      padding: 4,
      speed: 300,
      activeColor: '#0b57d0',
      inactiveColor: '#e1e3e1',
      thumbColor: '#ffffff',
      glowBlur: 0,
      isChecked: true,
      activeTab: 'css'
    };

    this.initElements();
    this.attachListeners();
    this.update();
  }

  initElements() {
    this.previewStage = document.getElementById('studioPreviewStage');
    this.previewToggle = document.getElementById('studioCustomToggle');
    this.previewInput = document.getElementById('studioCustomInput');
    this.previewTrack = document.getElementById('studioCustomTrack');
    this.previewThumb = document.getElementById('studioCustomThumb');
    this.codeDisplay = document.getElementById('studioCodeDisplay');
    this.statusPill = document.getElementById('studioStatePill');

    // Controls
    this.ctrlWidth = document.getElementById('ctrlWidth');
    this.ctrlHeight = document.getElementById('ctrlHeight');
    this.ctrlTrackRadius = document.getElementById('ctrlTrackRadius');
    this.ctrlThumbRadius = document.getElementById('ctrlThumbRadius');
    this.ctrlSpeed = document.getElementById('ctrlSpeed');
    this.ctrlGlow = document.getElementById('ctrlGlow');

    // Colors
    this.ctrlActiveColor = document.getElementById('ctrlActiveColor');
    this.ctrlInactiveColor = document.getElementById('ctrlInactiveColor');
    this.ctrlThumbColor = document.getElementById('ctrlThumbColor');

    // Value Labels
    this.valWidth = document.getElementById('valWidth');
    this.valHeight = document.getElementById('valHeight');
    this.valTrackRadius = document.getElementById('valTrackRadius');
    this.valThumbRadius = document.getElementById('valThumbRadius');
    this.valSpeed = document.getElementById('valSpeed');
    this.valGlow = document.getElementById('valGlow');
  }

  attachListeners() {
    if (!this.ctrlWidth) return;

    const bindSlider = (elem, key, valElem, unit = 'px') => {
      elem.addEventListener('input', (e) => {
        this.state[key] = Number(e.target.value);
        if (valElem) valElem.textContent = `${this.state[key]}${unit}`;
        this.update();
      });
    };

    bindSlider(this.ctrlWidth, 'width', this.valWidth, 'px');
    bindSlider(this.ctrlHeight, 'height', this.valHeight, 'px');
    bindSlider(this.ctrlTrackRadius, 'trackRadius', this.valTrackRadius, 'px');
    bindSlider(this.ctrlThumbRadius, 'thumbRadius', this.valThumbRadius, 'px');
    bindSlider(this.ctrlSpeed, 'speed', this.valSpeed, 'ms');
    bindSlider(this.ctrlGlow, 'glowBlur', this.valGlow, 'px');

    const bindColor = (elem, key) => {
      elem.addEventListener('input', (e) => {
        this.state[key] = e.target.value;
        this.update();
      });
    };

    bindColor(this.ctrlActiveColor, 'activeColor');
    bindColor(this.ctrlInactiveColor, 'inactiveColor');
    bindColor(this.ctrlThumbColor, 'thumbColor');

    if (this.previewInput) {
      this.previewInput.addEventListener('change', (e) => {
        this.state.isChecked = e.target.checked;
        if (window.soundEngine) {
          window.soundEngine.playToggle(this.state.isChecked);
        }
        this.updateVisualState();
      });
    }

    // Backdrop controls
    document.querySelectorAll('.backdrop-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const bg = dot.dataset.bg;
        if (this.previewStage) {
          this.previewStage.style.background = bg;
        }
      });
    });

    // Tab buttons
    document.querySelectorAll('.studio-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.studio-tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.state.activeTab = tab.dataset.tab;
        this.updateCode();
      });
    });

    // Copy Button
    const copyBtn = document.getElementById('studioCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const code = this.generateCode(this.state.activeTab);
        navigator.clipboard.writeText(code).then(() => {
          if (window.showSnackbar) {
            window.showSnackbar(`Custom ${this.state.activeTab.toUpperCase()} copied to clipboard!`);
          }
        });
      });
    }
  }

  update() {
    // Recalculate thumb size based on height
    const calculatedThumbSize = Math.max(12, this.state.height - (this.state.padding * 2));
    this.state.thumbSize = calculatedThumbSize;
    this.state.travelDistance = this.state.width - calculatedThumbSize - (this.state.padding * 2);

    // Apply inline style variables to the custom preview toggle
    if (this.previewToggle) {
      this.previewToggle.style.width = `${this.state.width}px`;
      this.previewToggle.style.height = `${this.state.height}px`;

      this.previewTrack.style.borderRadius = `${this.state.trackRadius}px`;
      this.previewTrack.style.transition = `all ${this.state.speed}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;

      this.previewThumb.style.width = `${calculatedThumbSize}px`;
      this.previewThumb.style.height = `${calculatedThumbSize}px`;
      this.previewThumb.style.top = `${this.state.padding}px`;
      this.previewThumb.style.left = `${this.state.padding}px`;
      this.previewThumb.style.borderRadius = `${this.state.thumbRadius}px`;
      this.previewThumb.style.backgroundColor = this.state.thumbColor;
      this.previewThumb.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      this.previewThumb.style.transition = `transform ${this.state.speed}ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color ${this.state.speed}ms ease`;
    }

    this.updateVisualState();
    this.updateCode();
  }

  updateVisualState() {
    if (!this.previewTrack || !this.previewThumb) return;

    if (this.state.isChecked) {
      this.previewTrack.style.backgroundColor = this.state.activeColor;
      this.previewThumb.style.transform = `translateX(${this.state.travelDistance}px)`;
      if (this.state.glowBlur > 0) {
        this.previewTrack.style.boxShadow = `0 0 ${this.state.glowBlur}px ${this.state.activeColor}`;
      } else {
        this.previewTrack.style.boxShadow = 'none';
      }
      if (this.statusPill) {
        this.statusPill.textContent = 'ACTIVE';
        this.statusPill.classList.add('active');
      }
    } else {
      this.previewTrack.style.backgroundColor = this.state.inactiveColor;
      this.previewThumb.style.transform = 'translateX(0px)';
      this.previewTrack.style.boxShadow = 'none';
      if (this.statusPill) {
        this.statusPill.textContent = 'INACTIVE';
        this.statusPill.classList.remove('active');
      }
    }
  }

  generateCode(type) {
    if (type === 'html') {
      return `<!-- Custom Generated Toggle -->
<label class="custom-switch" aria-label="Custom Switch">
  <input type="checkbox" ${this.state.isChecked ? 'checked' : ''} />
  <span class="custom-track">
    <span class="custom-thumb"></span>
  </span>
</label>`;
    }

    if (type === 'react') {
      return `import React, { useState } from 'react';
import './custom-switch.css';

export function CustomSwitch({ defaultChecked = ${this.state.isChecked}, onChange }) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = (e) => {
    setChecked(e.target.checked);
    if (onChange) onChange(e.target.checked);
  };

  return (
    <label className="custom-switch">
      <input type="checkbox" checked={checked} onChange={handleToggle} />
      <span className="custom-track">
        <span className="custom-thumb" />
      </span>
    </label>
  );
}
export { ToggleStudio };

export const TOGGLE_CATALOG = [
  {
    "id": "m3-standard",
    "name": "Material 3 Switch",
    "category": "material",
    "tags": [
      "Material 3",
      "Pure CSS",
      "Expanding Thumb"
    ],
    "description": "Material Design 3 specification switch with expanding thumb and tonal container.",
    "html": "<label class=\"toggle-base toggle-m3\" aria-label=\"Material 3 Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-m3 {\n  position: relative;\n  display: inline-flex;\n  width: 52px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-m3 input {\n  position: absolute;\n  opacity: 0;\n  width: 0;\n  height: 0;\n}\n.toggle-m3 .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background-color: #e1e3e1;\n  border: 2px solid #74777f;\n  transition: all 250ms cubic-bezier(0.2, 0, 0, 1);\n}\n.toggle-m3 .thumb {\n  position: absolute;\n  top: 8px;\n  left: 8px;\n  width: 16px;\n  height: 16px;\n  border-radius: 9999px;\n  background-color: #74777f;\n  transition: all 250ms cubic-bezier(0.2, 0, 0, 1);\n}\n.toggle-m3 input:checked + .track {\n  background-color: #0b57d0;\n  border-color: #0b57d0;\n}\n.toggle-m3 input:checked + .track .thumb {\n  top: 4px;\n  left: 4px;\n  width: 24px;\n  height: 24px;\n  transform: translateX(20px);\n  background-color: #ffffff;\n}",
    "react": "export function M3Switch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-m3\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\" />\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "m3-icon",
    "name": "M3 Iconic Switch",
    "category": "material",
    "tags": [
      "Material 3",
      "Icon Thumb",
      "Material Symbols"
    ],
    "description": "Material You switch featuring morphing checkmark and cross icons embedded in the sliding thumb.",
    "html": "<label class=\"toggle-base toggle-m3-icon\" aria-label=\"M3 Iconic Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded thumb-icon\">check</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-m3-icon {\n  position: relative;\n  display: inline-flex;\n  width: 52px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-m3-icon input {\n  position: absolute;\n  opacity: 0;\n}\n.toggle-m3-icon .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background-color: #e1e3e1;\n  border: 2px solid #74777f;\n  transition: all 250ms cubic-bezier(0.2, 0, 0, 1);\n}\n.toggle-m3-icon .thumb {\n  position: absolute;\n  top: 4px;\n  left: 4px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background-color: #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: transform 250ms cubic-bezier(0.2, 0, 0, 1);\n}\n.toggle-m3-icon input:checked + .track {\n  background-color: #0b57d0;\n  border-color: #0b57d0;\n}\n.toggle-m3-icon input:checked + .track .thumb {\n  transform: translateX(20px);\n}",
    "react": "export function M3IconSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-m3-icon\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\">\n          <span className=\"material-symbols-rounded thumb-icon\">{checked ? 'check' : 'close'}</span>\n        </span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "m3-halo",
    "name": "Material Touch Halo",
    "category": "material",
    "tags": [
      "Material 3",
      "Ripple",
      "State Layers"
    ],
    "description": "Material You state layer with expansive touch halo and spring motion.",
    "html": "<label class=\"toggle-base toggle-m3-halo\" aria-label=\"Material Touch Halo\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"halo\"></span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-m3-halo {\n  position: relative;\n  display: inline-flex;\n  width: 54px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-m3-halo input { position: absolute; opacity: 0; }\n.toggle-m3-halo .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #edf2f7;\n  border: 2px solid #cbd5e1;\n  transition: all 250ms ease;\n}\n.toggle-m3-halo .thumb {\n  position: absolute;\n  top: 4px;\n  left: 4px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background: #64748b;\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-m3-halo .halo {\n  position: absolute;\n  inset: -8px;\n  border-radius: 9999px;\n  background: transparent;\n  pointer-events: none;\n  transition: all 200ms ease;\n  transform: scale(0.6);\n  opacity: 0;\n}\n.toggle-m3-halo:hover .halo {\n  background: #0b57d0;\n  opacity: 0.15;\n  transform: scale(1);\n}\n.toggle-m3-halo input:checked + .track {\n  background: #0b57d0;\n  border-color: #0b57d0;\n}\n.toggle-m3-halo input:checked + .track .thumb {\n  transform: translateX(22px);\n  background: #ffffff;\n}",
    "react": "export function M3HaloSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-m3-halo\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"halo\" /></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "ios-fluid",
    "name": "iOS 18 Liquid Glass",
    "category": "ios",
    "tags": [
      "iOS",
      "Spring Physics",
      "Vibrant"
    ],
    "description": "Ultra-clean Apple iOS toggle with spring bounce physics, layered soft shadow, and thumb stretch on press.",
    "html": "<label class=\"toggle-base toggle-ios\" aria-label=\"iOS Fluid Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-ios {\n  position: relative;\n  display: inline-flex;\n  width: 51px;\n  height: 31px;\n  cursor: pointer;\n}\n.toggle-ios input { position: absolute; opacity: 0; }\n.toggle-ios .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background-color: #e9e9ea;\n  transition: background-color 300ms cubic-bezier(0.16, 1, 0.3, 1);\n}\n.toggle-ios .thumb {\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 27px;\n  height: 27px;\n  border-radius: 9999px;\n  background-color: #ffffff;\n  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-ios input:checked + .track {\n  background-color: #34c759;\n}\n.toggle-ios input:checked + .track .thumb {\n  transform: translateX(20px);\n}",
    "react": "export function IOSSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-ios\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\"><span className=\"thumb\" /></span>\n    </label>\n  );\n}"
  },
  {
    "id": "day-night",
    "name": "Celestial Day & Night",
    "category": "celestial",
    "tags": [
      "Illustrated",
      "Sun & Moon",
      "Clouds & Stars"
    ],
    "description": "Poetic celestial switch featuring fluffy day clouds and a glowing sun transitioning to a starry night with moon craters.",
    "html": "<label class=\"toggle-base toggle-daynight\" aria-label=\"Day Night Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"clouds\"></span>\n    <span class=\"stars\">★ ★</span>\n    <span class=\"thumb\">\n      <span class=\"moon-crater\"></span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-daynight {\n  position: relative;\n  display: inline-flex;\n  width: 76px;\n  height: 36px;\n  cursor: pointer;\n}\n.toggle-daynight input { position: absolute; opacity: 0; }\n.toggle-daynight .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: linear-gradient(135deg, #42a5f5, #29b6f6);\n  overflow: hidden;\n  transition: background 500ms ease;\n}\n.toggle-daynight .thumb {\n  position: absolute;\n  top: 4px;\n  left: 4px;\n  width: 28px;\n  height: 28px;\n  border-radius: 9999px;\n  background: #ffca28;\n  box-shadow: 0 0 10px rgba(255, 202, 40, 0.8);\n  transition: transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-daynight input:checked + .track {\n  background: linear-gradient(135deg, #0d1b2a, #1b263b);\n}\n.toggle-daynight input:checked + .track .thumb {\n  transform: translateX(40px);\n  background: #eceff1;\n  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);\n}",
    "react": "export function DayNightSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-daynight\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"clouds\" />\n        <span className=\"stars\">★ ★</span>\n        <span className=\"thumb\"><span className=\"moon-crater\" /></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "squish-jelly",
    "name": "Squishy Jelly Spring",
    "category": "physics",
    "tags": [
      "Elastic",
      "Stretch",
      "Physics"
    ],
    "description": "Elastic rubber toggle where the knob elongates and squishes dynamically as it slides across the track.",
    "html": "<label class=\"toggle-base toggle-squish\" aria-label=\"Squishy Jelly Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-squish {\n  position: relative;\n  display: inline-flex;\n  width: 60px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-squish input { position: absolute; opacity: 0; }\n.toggle-squish .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #edf2f7;\n  border: 2px solid #cbd5e1;\n  transition: all 300ms ease;\n}\n.toggle-squish .thumb {\n  position: absolute;\n  top: 4px;\n  left: 4px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background: #64748b;\n  transition: transform 400ms cubic-bezier(0.34, 1.7, 0.64, 1), width 250ms ease;\n}\n.toggle-squish:active .thumb { width: 32px; }\n.toggle-squish input:checked + .track {\n  background: #d3e3fd;\n  border-color: #0b57d0;\n}\n.toggle-squish input:checked + .track .thumb {\n  transform: translateX(28px);\n  background: #0b57d0;\n}",
    "react": "export function JellySwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-squish\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\"><span className=\"thumb\" /></span>\n    </label>\n  );\n}"
  },
  {
    "id": "cyberpunk-neon",
    "name": "Cyberpunk Plasma Tube",
    "category": "glow",
    "tags": [
      "Neon",
      "Dark Tech",
      "Scanlines"
    ],
    "description": "Futuristic sci-fi switch with CRT scanline backdrop, glowing cyan tube, and laser neon aura.",
    "html": "<label class=\"toggle-base toggle-cyberpunk\" aria-label=\"Cyberpunk Neon Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"neon-bar\"></span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-cyberpunk {\n  position: relative;\n  display: inline-flex;\n  width: 68px;\n  height: 34px;\n  cursor: pointer;\n}\n.toggle-cyberpunk input { position: absolute; opacity: 0; }\n.toggle-cyberpunk .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 6px;\n  background: #0a0b10;\n  border: 1px solid #222938;\n  overflow: hidden;\n  transition: all 300ms ease;\n}\n.toggle-cyberpunk .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 26px;\n  height: 26px;\n  border-radius: 4px;\n  background: #1e2230;\n  border: 1px solid #485269;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: transform 300ms cubic-bezier(0.2, 0.9, 0.3, 1.2);\n}\n.toggle-cyberpunk input:checked + .track {\n  border-color: #00ffea;\n  box-shadow: 0 0 14px rgba(0, 255, 234, 0.4);\n}\n.toggle-cyberpunk input:checked + .track .thumb {\n  transform: translateX(34px);\n  background: #002b28;\n  border-color: #00ffea;\n  box-shadow: 0 0 10px #00ffea;\n}",
    "react": "export function CyberpunkSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-cyberpunk\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"neon-bar\" /></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "neumorphic-soft",
    "name": "Neumorphic Tactile",
    "category": "retro",
    "tags": [
      "Neumorphic",
      "Soft UI",
      "LED Indicator"
    ],
    "description": "Soft tactile switch with realistic convex and concave shadow morph and glowing blue LED status dot.",
    "html": "<label class=\"toggle-base toggle-neumorphic\" aria-label=\"Neumorphic Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"led-dot\"></span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-neumorphic {\n  position: relative;\n  display: inline-flex;\n  width: 64px;\n  height: 34px;\n  cursor: pointer;\n}\n.toggle-neumorphic input { position: absolute; opacity: 0; }\n.toggle-neumorphic .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #e2e8f0;\n  box-shadow: inset 3px 3px 6px #cbd5e1, inset -3px -3px 6px #ffffff;\n  transition: all 300ms ease;\n}\n.toggle-neumorphic .thumb {\n  position: absolute;\n  top: 4px;\n  left: 4px;\n  width: 26px;\n  height: 26px;\n  border-radius: 9999px;\n  background: #e2e8f0;\n  box-shadow: 3px 3px 6px #cbd5e1, -3px -3px 6px #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-neumorphic .led-dot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: #94a3b8;\n  transition: all 300ms ease;\n}\n.toggle-neumorphic input:checked + .track .thumb {\n  transform: translateX(30px);\n}\n.toggle-neumorphic input:checked + .track .led-dot {\n  background: #3b82f6;\n  box-shadow: 0 0 8px #3b82f6;\n}",
    "react": "export function NeumorphicSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-neumorphic\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"led-dot\" /></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "sound-equalizer",
    "name": "Equalizer Waves",
    "category": "micro",
    "tags": [
      "Audio",
      "Dancing Bars",
      "Sound Wave"
    ],
    "description": "Live audio equalizer switch with 4 rhythmically bouncing equalizer bars when activated.",
    "html": "<label class=\"toggle-base toggle-equalizer\" aria-label=\"Equalizer Sound Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"wave-bars\">\n      <span class=\"bar\"></span>\n      <span class=\"bar\"></span>\n      <span class=\"bar\"></span>\n      <span class=\"bar\"></span>\n    </span>\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">graphic_eq</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-equalizer {\n  position: relative;\n  display: inline-flex;\n  width: 66px;\n  height: 34px;\n  cursor: pointer;\n}\n.toggle-equalizer input { position: absolute; opacity: 0; }\n.toggle-equalizer .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #edf2f7;\n  border: 2px solid #cbd5e1;\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  padding-right: 12px;\n  transition: all 300ms ease;\n}\n.toggle-equalizer .wave-bars { display: flex; gap: 2px; }\n.toggle-equalizer .bar {\n  width: 2.5px;\n  height: 4px;\n  background: #94a3b8;\n  border-radius: 2px;\n}\n.toggle-equalizer .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 26px;\n  height: 26px;\n  border-radius: 9999px;\n  background: #0b57d0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #fff;\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-equalizer input:checked + .track .thumb { transform: translateX(32px); }\n.toggle-equalizer input:checked + .track .bar {\n  background: #0b57d0;\n  animation: equalize 0.8s ease-in-out infinite alternate;\n}\n@keyframes equalize { 0% { height: 4px; } 100% { height: 16px; } }",
    "react": "export function EqualizerSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-equalizer\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"wave-bars\">\n          <span className=\"bar\" /><span className=\"bar\" /><span className=\"bar\" /><span className=\"bar\" />\n        </span>\n        <span className=\"thumb\"><span className=\"material-symbols-rounded\">graphic_eq</span></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "password-eye",
    "name": "Password Peek Eye",
    "category": "micro",
    "tags": [
      "Eye",
      "Password Show",
      "Morph"
    ],
    "description": "Password show/hide toggle where an animated eye opens wide on activation and shuts closed when hidden.",
    "html": "<label class=\"toggle-base toggle-eye\" aria-label=\"Password Eye Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">visibility</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-eye {\n  position: relative;\n  display: inline-flex;\n  width: 58px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-eye input { position: absolute; opacity: 0; }\n.toggle-eye .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #edf2f7;\n  border: 2px solid #cbd5e1;\n  transition: all 300ms ease;\n}\n.toggle-eye .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background: #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n  color: #64748b;\n}\n.toggle-eye input:checked + .track {\n  background: #0b57d0;\n  border-color: #0b57d0;\n}\n.toggle-eye input:checked + .track .thumb {\n  transform: translateX(26px);\n  color: #0b57d0;\n}",
    "react": "export function EyeSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-eye\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\">\n          <span className=\"material-symbols-rounded\">{checked ? 'visibility' : 'visibility_off'}</span>\n        </span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "minimalist-swiss",
    "name": "Minimalist Swiss Pill",
    "category": "minimal",
    "tags": [
      "Swiss Design",
      "Hairline",
      "Monochrome"
    ],
    "description": "Understated Swiss monochrome toggle with razor-thin outline and micro dot indicator.",
    "html": "<label class=\"toggle-base toggle-minimal\" aria-label=\"Minimal Swiss Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-minimal {\n  position: relative;\n  display: inline-flex;\n  width: 48px;\n  height: 24px;\n  cursor: pointer;\n}\n.toggle-minimal input { position: absolute; opacity: 0; }\n.toggle-minimal .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  border: 1px solid #74777f;\n  background: transparent;\n  transition: all 250ms ease;\n}\n.toggle-minimal .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 16px;\n  height: 16px;\n  border-radius: 9999px;\n  background: #74777f;\n  transition: transform 250ms cubic-bezier(0.2, 0, 0, 1);\n}\n.toggle-minimal input:checked + .track {\n  border-color: #1f1f1f;\n  background: #1f1f1f;\n}\n.toggle-minimal input:checked + .track .thumb {\n  transform: translateX(24px);\n  background: #ffffff;\n}",
    "react": "export function MinimalSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-minimal\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\"><span className=\"thumb\" /></span>\n    </label>\n  );\n}"
  },
  {
    "id": "nature-sprout",
    "name": "Nature Sprout & Bloom",
    "category": "micro",
    "tags": [
      "Eco",
      "Botanical",
      "Organic"
    ],
    "description": "Organic switch with fertile soil tones blossoming into a fresh green seedling with budding leaves.",
    "html": "<label class=\"toggle-base toggle-nature\" aria-label=\"Nature Sprout Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded sprout-icon\">eco</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-nature {\n  position: relative;\n  display: inline-flex;\n  width: 60px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-nature input { position: absolute; opacity: 0; }\n.toggle-nature .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #d7ccc8;\n  transition: background 350ms ease;\n}\n.toggle-nature .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 26px;\n  height: 26px;\n  border-radius: 9999px;\n  background: #8d6e63;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #fff;\n  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-nature input:checked + .track { background: #c8e6c9; }\n.toggle-nature input:checked + .track .thumb {\n  transform: translateX(28px);\n  background: #2e7d32;\n}",
    "react": "export function NatureSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-nature\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"material-symbols-rounded sprout-icon\">eco</span></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "heart-like",
    "name": "Heart Like Micro-burst",
    "category": "micro",
    "tags": [
      "Heart",
      "Social",
      "Confetti Burst"
    ],
    "description": "Delightful social like switch bursting with joyful heart particle animation upon activation.",
    "html": "<label class=\"toggle-base toggle-heart\" aria-label=\"Heart Like Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">favorite</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-heart {\n  position: relative;\n  display: inline-flex;\n  width: 58px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-heart input { position: absolute; opacity: 0; }\n.toggle-heart .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #edf2f7;\n  border: 2px solid #cbd5e1;\n  transition: all 300ms ease;\n}\n.toggle-heart .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background: #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #9ca3af;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-heart input:checked + .track {\n  background: #ffe4e6;\n  border-color: #f43f5e;\n}\n.toggle-heart input:checked + .track .thumb {\n  transform: translateX(26px);\n  background: #f43f5e;\n  color: #ffffff;\n}",
    "react": "export function HeartSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-heart\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"material-symbols-rounded\">favorite</span></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "segmented-tri",
    "name": "Segmented Tri-State",
    "category": "segmented",
    "tags": [
      "3-Way",
      "Segmented",
      "Auto"
    ],
    "description": "Sliding segmented control pill supporting three states: Off, Automatic, and Always On.",
    "html": "<div class=\"toggle-segmented\" role=\"radiogroup\" aria-label=\"Mode Selection\">\n  <input type=\"radio\" id=\"seg-off\" name=\"mode\" value=\"off\" checked />\n  <label for=\"seg-off\">Off</label>\n  <input type=\"radio\" id=\"seg-auto\" name=\"mode\" value=\"auto\" />\n  <label for=\"seg-auto\">Auto</label>\n  <input type=\"radio\" id=\"seg-on\" name=\"mode\" value=\"on\" />\n  <label for=\"seg-on\">On</label>\n</div>",
    "css": ".toggle-segmented {\n  position: relative;\n  display: inline-flex;\n  background: #edf2f7;\n  border-radius: 9999px;\n  padding: 3px;\n  gap: 2px;\n}\n.toggle-segmented input[type=\"radio\"] { display: none; }\n.toggle-segmented label {\n  padding: 6px 14px;\n  font-size: 12px;\n  font-weight: 600;\n  color: #64748b;\n  border-radius: 9999px;\n  cursor: pointer;\n  transition: color 200ms ease;\n}\n.toggle-segmented input:checked + label {\n  color: #ffffff;\n  background: #0b57d0;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);\n}",
    "react": "export function SegmentedToggle({ value, onChange }) {\n  return (\n    <div className=\"toggle-segmented\">\n      {['Off', 'Auto', 'On'].map(opt => (\n        <button key={opt} className={value === opt ? 'active' : ''} onClick={() => onChange(opt)}>\n          {opt}\n        </button>\n      ))}\n    </div>\n  );\n}"
  },
  {
    "id": "pixel-arcade",
    "name": "8-Bit Retro Pixel",
    "category": "retro",
    "tags": [
      "8-Bit",
      "Chunky",
      "Arcade"
    ],
    "description": "Nostalgic 80s arcade switch with stepped pixel movement, chunky borders, and classic game palette.",
    "html": "<label class=\"toggle-base toggle-pixel\" aria-label=\"8-Bit Pixel Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-pixel {\n  position: relative;\n  display: inline-flex;\n  width: 62px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-pixel input { position: absolute; opacity: 0; }\n.toggle-pixel .track {\n  position: absolute;\n  inset: 0;\n  background: #474747;\n  border: 3px solid #000;\n  box-shadow: inset -2px -2px 0 0 #2b2b2b, inset 2px 2px 0 0 #707070;\n}\n.toggle-pixel .thumb {\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 22px;\n  height: 22px;\n  background: #dc2626;\n  border: 2px solid #000;\n  box-shadow: inset -2px -2px 0 0 #991b1b, inset 2px 2px 0 0 #f87171;\n  transition: transform 150ms steps(4);\n}\n.toggle-pixel input:checked + .track {\n  background: #16a34a;\n}\n.toggle-pixel input:checked + .track .thumb {\n  transform: translateX(30px);\n  background: #facc15;\n}",
    "react": "export function PixelSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-pixel\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\"><span className=\"thumb\" /></span>\n    </label>\n  );\n}"
  },
  {
    "id": "space-rocket",
    "name": "Rocket Ignition Thruster",
    "category": "micro",
    "tags": [
      "Cosmic",
      "Rocket",
      "Orange Flare"
    ],
    "description": "Launch vehicle switch pointing forward and firing orange thruster flames upon activation.",
    "html": "<label class=\"toggle-base toggle-rocket\" aria-label=\"Rocket Thruster Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded rocket-icon\">rocket_launch</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-rocket {\n  position: relative;\n  display: inline-flex;\n  width: 68px;\n  height: 34px;\n  cursor: pointer;\n}\n.toggle-rocket input { position: absolute; opacity: 0; }\n.toggle-rocket .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #1e1b4b;\n  border: 1px solid #312e81;\n  overflow: hidden;\n  transition: all 300ms ease;\n}\n.toggle-rocket .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 28px;\n  height: 28px;\n  border-radius: 9999px;\n  background: #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #4338ca;\n  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);\n  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-rocket .rocket-icon {\n  font-size: 18px;\n  transform: rotate(45deg);\n}\n.toggle-rocket input:checked + .track {\n  background: #0f172a;\n  border-color: #f97316;\n  box-shadow: 0 0 12px rgba(249, 115, 22, 0.3);\n}\n.toggle-rocket input:checked + .track .thumb {\n  transform: translateX(34px);\n  background: #f97316;\n  color: #ffffff;\n}",
    "react": "export function RocketSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-rocket\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"material-symbols-rounded rocket-icon\">rocket_launch</span></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "security-lock",
    "name": "Security Padlock",
    "category": "micro",
    "tags": [
      "Security",
      "Padlock",
      "Unlock"
    ],
    "description": "Security switch where a padlock shackle springs open and turns emerald green upon unlocking.",
    "html": "<label class=\"toggle-base toggle-lock\" aria-label=\"Security Lock Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">lock_open</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-lock {\n  position: relative;\n  display: inline-flex;\n  width: 60px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-lock input { position: absolute; opacity: 0; }\n.toggle-lock .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #edf2f7;\n  border: 2px solid #cbd5e1;\n  transition: all 300ms ease;\n}\n.toggle-lock .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background: #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #64748b;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-lock input:checked + .track {\n  background: #10b981;\n  border-color: #10b981;\n}\n.toggle-lock input:checked + .track .thumb {\n  transform: translateX(28px);\n  color: #10b981;\n}",
    "react": "export function LockSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-lock\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\">\n          <span className=\"material-symbols-rounded\">{checked ? 'lock_open' : 'lock'}</span>\n        </span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "wifi-broadcast",
    "name": "Wifi Signal Radiator",
    "category": "micro",
    "tags": [
      "Wifi",
      "Radio",
      "Network"
    ],
    "description": "Connectivity switch radiating wireless broadcast waves.",
    "html": "<label class=\"toggle-base toggle-wifi\" aria-label=\"Wifi Signal Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">wifi</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-wifi {\n  position: relative;\n  display: inline-flex;\n  width: 60px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-wifi input { position: absolute; opacity: 0; }\n.toggle-wifi .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #edf2f7;\n  border: 2px solid #cbd5e1;\n  transition: all 300ms ease;\n}\n.toggle-wifi .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background: #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #64748b;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-wifi input:checked + .track {\n  background: #4285f4;\n  border-color: #4285f4;\n}\n.toggle-wifi input:checked + .track .thumb {\n  transform: translateX(28px);\n  color: #4285f4;\n}",
    "react": "export function WifiSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-wifi\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\">\n          <span className=\"material-symbols-rounded\">{checked ? 'wifi' : 'wifi_off'}</span>\n        </span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "glass-marble",
    "name": "Refraction Glass Marble",
    "category": "physics",
    "tags": [
      "Glass",
      "Marble",
      "Refraction"
    ],
    "description": "Realistic glass sphere with specular caustic highlight and smooth wall bounce physics.",
    "html": "<label class=\"toggle-base toggle-marble\" aria-label=\"Glass Marble Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-marble {\n  position: relative;\n  display: inline-flex;\n  width: 62px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-marble input { position: absolute; opacity: 0; }\n.toggle-marble .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #cbd5e1;\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);\n  transition: background 350ms ease;\n}\n.toggle-marble .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 26px;\n  height: 26px;\n  border-radius: 9999px;\n  background: radial-gradient(circle at 35% 35%, #ffffff 0%, #94a3b8 70%, #64748b 100%);\n  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);\n  transition: transform 450ms cubic-bezier(0.34, 1.7, 0.64, 1);\n}\n.toggle-marble input:checked + .track { background: #93c5fd; }\n.toggle-marble input:checked + .track .thumb {\n  transform: translateX(30px);\n  background: radial-gradient(circle at 35% 35%, #ffffff 0%, #60a5fa 70%, #2563eb 100%);\n}",
    "react": "export function MarbleSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-marble\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\"><span className=\"thumb\" /></span>\n    </label>\n  );\n}"
  },
  {
    "id": "holographic-gradient",
    "name": "Holographic Spectrum Shift",
    "category": "glow",
    "tags": [
      "Gradient",
      "Rainbow",
      "Hologram"
    ],
    "description": "Dynamic iridescent spectrum gradient shifting fluidly across purple, pink and sunset orange.",
    "html": "<label class=\"toggle-base toggle-gradient\" aria-label=\"Gradient Holographic Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-gradient {\n  position: relative;\n  display: inline-flex;\n  width: 64px;\n  height: 34px;\n  cursor: pointer;\n}\n.toggle-gradient input { position: absolute; opacity: 0; }\n.toggle-gradient .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: linear-gradient(135deg, #a855f7, #ec4899, #f97316);\n  background-size: 200% 200%;\n  background-position: 0% 50%;\n  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.25);\n  transition: background-position 500ms ease;\n}\n.toggle-gradient .thumb {\n  position: absolute;\n  top: 4px;\n  left: 4px;\n  width: 26px;\n  height: 26px;\n  border-radius: 9999px;\n  background: #ffffff;\n  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);\n  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-gradient input:checked + .track {\n  background-position: 100% 50%;\n  box-shadow: 0 3px 12px rgba(249, 115, 22, 0.4);\n}\n.toggle-gradient input:checked + .track .thumb {\n  transform: translateX(30px);\n}",
    "react": "export function HolographicSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-gradient\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\"><span className=\"thumb\" /></span>\n    </label>\n  );\n}"
  },
  {
    "id": "workspace-theme",
    "name": "Workspace Theme Switch",
    "category": "material",
    "tags": [
      "Dark Mode",
      "Sun/Moon",
      "Workspace"
    ],
    "description": "Dark theme switch with rotating solar and lunar glyphs.",
    "html": "<label class=\"toggle-base toggle-workspace\" aria-label=\"Workspace Theme Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">light_mode</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-workspace {\n  position: relative;\n  display: inline-flex;\n  width: 58px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-workspace input { position: absolute; opacity: 0; }\n.toggle-workspace .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #f1f3f4;\n  border: 1px solid #dadce0;\n  transition: all 300ms ease;\n}\n.toggle-workspace .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 24px;\n  height: 24px;\n  border-radius: 9999px;\n  background: #ffffff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #ea4335;\n  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3);\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-workspace input:checked + .track {\n  background: #202124;\n  border-color: #5f6368;\n}\n.toggle-workspace input:checked + .track .thumb {\n  transform: translateX(26px);\n  background: #3c4043;\n  color: #8ab4f8;\n}",
    "react": "export function WorkspaceSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-workspace\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\">\n          <span className=\"material-symbols-rounded\">{checked ? 'dark_mode' : 'light_mode'}</span>\n        </span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "tactile-ridge",
    "name": "Tactile Grip Ridge",
    "category": "retro",
    "tags": [
      "Tactile",
      "Groove",
      "Hardware"
    ],
    "description": "Industrial hardware toggle with textured thumb ridges for enhanced tactile feel.",
    "html": "<label class=\"toggle-base toggle-tactile\" aria-label=\"Tactile Ridge Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"ridge\"></span>\n      <span class=\"ridge\"></span>\n      <span class=\"ridge\"></span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-tactile {\n  position: relative;\n  display: inline-flex;\n  width: 60px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-tactile input { position: absolute; opacity: 0; }\n.toggle-tactile .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 8px;\n  background: #e2e8f0;\n  border: 2px solid #cbd5e1;\n  transition: all 250ms ease;\n}\n.toggle-tactile .thumb {\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 24px;\n  height: 24px;\n  border-radius: 6px;\n  background: #f8fafc;\n  border: 1px solid #94a3b8;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 2px;\n  transition: transform 300ms cubic-bezier(0.2, 0, 0, 1);\n}\n.toggle-tactile .ridge {\n  width: 2px;\n  height: 12px;\n  background: #94a3b8;\n  border-radius: 1px;\n}\n.toggle-tactile input:checked + .track {\n  background: #d3e3fd;\n  border-color: #0b57d0;\n}\n.toggle-tactile input:checked + .track .thumb {\n  transform: translateX(28px);\n  border-color: #0b57d0;\n}\n.toggle-tactile input:checked + .track .ridge {\n  background: #0b57d0;\n}",
    "react": "export function TactileSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-tactile\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"ridge\" /><span className=\"ridge\" /><span className=\"ridge\" /></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "fluid-lava",
    "name": "Viscous Lava Lamp",
    "category": "physics",
    "tags": [
      "Liquid",
      "Organic Blob",
      "Morph"
    ],
    "description": "Organic blob toggle that morphs its border radius as it glides like molten liquid wax.",
    "html": "<label class=\"toggle-base toggle-lava\" aria-label=\"Fluid Lava Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\"></span>\n  </span>\n</label>",
    "css": ".toggle-lava {\n  position: relative;\n  display: inline-flex;\n  width: 64px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-lava input { position: absolute; opacity: 0; }\n.toggle-lava .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #cbd5e1;\n  transition: background 400ms ease;\n}\n.toggle-lava .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 26px;\n  height: 26px;\n  border-radius: 50% 45% 50% 45%;\n  background: #64748b;\n  transition: transform 500ms cubic-bezier(0.68, -0.55, 0.27, 1.55), border-radius 400ms ease;\n}\n.toggle-lava input:checked + .track { background: #fed7aa; }\n.toggle-lava input:checked + .track .thumb {\n  transform: translateX(32px);\n  border-radius: 45% 50% 45% 50%;\n  background: #ea580c;\n}",
    "react": "export function LavaSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-lava\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\"><span className=\"thumb\" /></span>\n    </label>\n  );\n}"
  },
  {
    "id": "steaming-coffee",
    "name": "Warm Morning Coffee",
    "category": "celestial",
    "tags": [
      "Coffee",
      "Warmth",
      "Morning"
    ],
    "description": "Comforting switch warming up from a neutral mug to a steaming, aromatic golden brew.",
    "html": "<label class=\"toggle-base toggle-coffee\" aria-label=\"Steaming Coffee Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">coffee</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-coffee {\n  position: relative;\n  display: inline-flex;\n  width: 60px;\n  height: 32px;\n  cursor: pointer;\n}\n.toggle-coffee input { position: absolute; opacity: 0; }\n.toggle-coffee .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #e5e7eb;\n  transition: background 300ms ease;\n}\n.toggle-coffee .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 26px;\n  height: 26px;\n  border-radius: 9999px;\n  background: #9ca3af;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #ffffff;\n  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1), background 300ms ease;\n}\n.toggle-coffee input:checked + .track { background: #fde68a; }\n.toggle-coffee input:checked + .track .thumb {\n  transform: translateX(28px);\n  background: #b45309;\n}",
    "react": "export function CoffeeSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-coffee\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"material-symbols-rounded\">coffee</span></span>\n      </span>\n    </label>\n  );\n}"
  },
  {
    "id": "gemini-sparkle",
    "name": "Gemini AI Sparkle",
    "category": "glow",
    "tags": [
      "AI",
      "Sparkles",
      "Gradient"
    ],
    "description": "Generative AI switch with rotating multi-colored sparkle star and cosmic glow.",
    "html": "<label class=\"toggle-base toggle-gemini\" aria-label=\"Gemini AI Switch\">\n  <input type=\"checkbox\" />\n  <span class=\"track\">\n    <span class=\"thumb\">\n      <span class=\"material-symbols-rounded\">auto_awesome</span>\n    </span>\n  </span>\n</label>",
    "css": ".toggle-gemini {\n  position: relative;\n  display: inline-flex;\n  width: 68px;\n  height: 34px;\n  cursor: pointer;\n}\n.toggle-gemini input { position: absolute; opacity: 0; }\n.toggle-gemini .track {\n  position: absolute;\n  inset: 0;\n  border-radius: 9999px;\n  background: #1e1f20;\n  border: 1px solid #3c4043;\n  transition: all 400ms ease;\n  overflow: hidden;\n}\n.toggle-gemini .thumb {\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 28px;\n  height: 28px;\n  border-radius: 9999px;\n  background: #3c4043;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #c4c7c5;\n  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.toggle-gemini input:checked + .track {\n  background: linear-gradient(135deg, #1b0933, #041e49);\n  border-color: #a855f7;\n  box-shadow: 0 0 12px rgba(168, 85, 247, 0.35);\n}\n.toggle-gemini input:checked + .track .thumb {\n  transform: translateX(34px);\n  background: linear-gradient(135deg, #a855f7, #3b82f6);\n  color: #ffffff;\n  box-shadow: 0 0 10px rgba(168, 85, 247, 0.6);\n}",
    "react": "export function GeminiSwitch({ checked, onChange }) {\n  return (\n    <label className=\"toggle-base toggle-gemini\">\n      <input type=\"checkbox\" checked={checked} onChange={onChange} />\n      <span className=\"track\">\n        <span className=\"thumb\"><span className=\"material-symbols-rounded\">auto_awesome</span></span>\n      </span>\n    </label>\n  );\n}"
  }
];

/** Material 3 Switch */
export function M3Switch({ checked, onChange }) {
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
export function M3IconSwitch({ checked, onChange }) {
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
export function M3HaloSwitch({ checked, onChange }) {
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
export function IOSSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-ios">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Celestial Day & Night */
export function DayNightSwitch({ checked, onChange }) {
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
export function JellySwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-squish">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Cyberpunk Plasma Tube */
export function CyberpunkSwitch({ checked, onChange }) {
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
export function NeumorphicSwitch({ checked, onChange }) {
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
export function EqualizerSwitch({ checked, onChange }) {
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
export function EyeSwitch({ checked, onChange }) {
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
export function MinimalSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-minimal">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Nature Sprout & Bloom */
export function NatureSwitch({ checked, onChange }) {
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
export function HeartSwitch({ checked, onChange }) {
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
export function SegmentedToggle({ value, onChange }) {
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
export function PixelSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-pixel">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Rocket Ignition Thruster */
export function RocketSwitch({ checked, onChange }) {
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
export function LockSwitch({ checked, onChange }) {
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
export function WifiSwitch({ checked, onChange }) {
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
export function MarbleSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-marble">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Holographic Spectrum Shift */
export function HolographicSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-gradient">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Workspace Theme Switch */
export function WorkspaceSwitch({ checked, onChange }) {
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
export function TactileSwitch({ checked, onChange }) {
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
export function LavaSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-lava">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

/** Warm Morning Coffee */
export function CoffeeSwitch({ checked, onChange }) {
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
export function GeminiSwitch({ checked, onChange }) {
  return (
    <label className="toggle-base toggle-gemini">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="track">
        <span className="thumb"><span className="material-symbols-rounded">auto_awesome</span></span>
      </span>
    </label>
  );
}

export const TOGGLE_COMPONENTS = {
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
};

export default {
  SoundEngine,
  soundEngine,
  ToggleStudio,
  TOGGLE_CATALOG,
  ...TOGGLE_COMPONENTS
};

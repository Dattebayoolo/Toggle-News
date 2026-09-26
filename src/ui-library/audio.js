/* ==========================================================================
   WEB AUDIO API SOUND SYNTHESIZER
   Tactile, subtle, organic haptic clicks for toggle interactions
   ========================================================================== */

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

window.soundEngine = new SoundEngine();

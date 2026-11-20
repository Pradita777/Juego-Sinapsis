// Procedural Web Audio API synthesizer — zero external assets

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, durationSec: number, type: OscillatorType, gainPeak: number, delaySec = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  playStart(): void {
    this.tone(440, 0.14, 'triangle', 0.12, 0);
    this.tone(554.37, 0.16, 'triangle', 0.12, 0.07);
    this.tone(659.25, 0.22, 'sine', 0.14, 0.14);
  }

  playCorrect(combo = 1): void {
    const semitoneBoost = Math.min(8, Math.max(0, combo - 1));
    const base = 523.25 * Math.pow(2, semitoneBoost / 12);
    this.tone(base, 0.12, 'triangle', 0.13, 0);
    this.tone(base * 1.25, 0.16, 'sine', 0.11, 0.055);
  }

  playMemoryNote(stepIndex: number): void {
    const pentatonic = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0, 987.77];
    const freq = pentatonic[stepIndex % pentatonic.length];
    this.tone(freq, 0.18, 'sine', 0.13, 0);
  }

  playWrong(): void {
    this.tone(220, 0.14, 'sawtooth', 0.07, 0);
    this.tone(174.61, 0.2, 'triangle', 0.09, 0.07);
  }

  playRuleSwitch(): void {
    this.tone(587.33, 0.1, 'sine', 0.1, 0);
    this.tone(880, 0.16, 'triangle', 0.12, 0.07);
  }

  playLevelUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.2, 'triangle', 0.13, idx * 0.08);
    });
  }

  playComplete(): void {
    this.tone(440, 0.15, 'triangle', 0.11, 0);
    this.tone(554.37, 0.15, 'triangle', 0.11, 0.08);
    this.tone(659.25, 0.26, 'sine', 0.13, 0.16);
  }
}

export const synthAudio = new SynthAudioEngine();

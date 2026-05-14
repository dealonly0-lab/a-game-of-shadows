type OscKind = OscillatorType;

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceOscillators: OscillatorNode[] = [];
  private unlocked = false;

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.62;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.unlocked = true;
    this.startAmbience();
  }

  playCountdownTick(): void {
    this.tone({ frequency: 520, endFrequency: 310, duration: 0.09, gain: 0.08, type: 'triangle' });
  }

  playRoundStart(): void {
    this.tone({ frequency: 160, endFrequency: 420, duration: 0.38, gain: 0.09, type: 'sawtooth' });
    this.noiseBurst(0.24, 0.035, 900);
  }

  playBeam(isPlayer: boolean): void {
    this.tone({
      frequency: isPlayer ? 780 : 540,
      endFrequency: isPlayer ? 1180 : 760,
      duration: 0.13,
      gain: isPlayer ? 0.075 : 0.048,
      type: 'sawtooth'
    });
    this.noiseBurst(0.08, isPlayer ? 0.04 : 0.025, 1700);
  }

  playImpact(): void {
    this.tone({ frequency: 210, endFrequency: 92, duration: 0.16, gain: 0.055, type: 'triangle' });
    this.noiseBurst(0.12, 0.045, 640);
  }

  playKill(byPlayer: boolean): void {
    this.tone({ frequency: byPlayer ? 96 : 72, endFrequency: byPlayer ? 42 : 36, duration: 0.58, gain: byPlayer ? 0.12 : 0.15, type: 'sawtooth' });
    this.tone({ frequency: byPlayer ? 620 : 260, endFrequency: byPlayer ? 980 : 120, duration: 0.22, gain: 0.055, type: 'triangle' });
    this.noiseBurst(0.32, byPlayer ? 0.06 : 0.09, 360);
  }

  playExposedPulse(intensity: number): void {
    if (intensity <= 0.05) return;
    this.tone({ frequency: 84 + intensity * 80, endFrequency: 70, duration: 0.09, gain: 0.018 + intensity * 0.028, type: 'sine' });
  }

  private startAmbience(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.ambienceGain) return;

    this.ambienceGain = context.createGain();
    this.ambienceGain.gain.value = 0.032;
    this.ambienceGain.connect(master);

    for (const [frequency, type, gain] of [
      [42, 'sine', 0.7],
      [57, 'triangle', 0.45],
      [91, 'sine', 0.22]
    ] as const) {
      const osc = context.createOscillator();
      const oscGain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      oscGain.gain.value = gain;
      osc.connect(oscGain);
      oscGain.connect(this.ambienceGain);
      osc.start();
      this.ambienceOscillators.push(osc);
    }
  }

  private tone(options: { frequency: number; endFrequency?: number; duration: number; gain: number; type: OscKind }): void {
    if (!this.canPlay()) return;
    const context = this.context!;
    const master = this.master!;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = options.type;
    osc.frequency.setValueAtTime(options.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency ?? options.frequency), now + options.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.gain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + options.duration + 0.02);
  }

  private noiseBurst(duration: number, gainValue: number, filterFrequency: number): void {
    if (!this.canPlay()) return;
    const context = this.context!;
    const master = this.master!;
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  private canPlay(): boolean {
    return Boolean(this.unlocked && this.context && this.master);
  }
}

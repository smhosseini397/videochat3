class SoundService {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: any = null;
  private ringbackInterval: any = null;
  private isRinging: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play realistic incoming call ringtone (Marimba/Chime melody loop)
  startIncomingRingtone() {
    if (this.isRinging) return;
    this.isRinging = true;

    const playMelody = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        const notes = [
          { f: 523.25, d: 0.15, o: 0.0 },   // C5
          { f: 659.25, d: 0.15, o: 0.2 },   // E5
          { f: 783.99, d: 0.25, o: 0.4 },   // G5
          { f: 1046.50, d: 0.35, o: 0.7 },  // C6
          { f: 880.00, d: 0.20, o: 1.15 },  // A5
          { f: 1046.50, d: 0.40, o: 1.4 },  // C6
        ];

        notes.forEach(({ f, d, o }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + o);

          gain.gain.setValueAtTime(0.001, now + o);
          gain.gain.exponentialRampToValueAtTime(0.4, now + o + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + o + d);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + o);
          osc.stop(now + o + d + 0.1);
        });
      } catch (e) {
        console.warn('Audio ringtone playback error:', e);
      }
    };

    playMelody();
    this.ringtoneInterval = setInterval(playMelody, 2400);
  }

  stopIncomingRingtone() {
    this.isRinging = false;
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // Outgoing phone call beep (Ringback tone)
  startOutgoingRingback() {
    this.stopOutgoingRingback();

    const playBeep = () => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // 440 Hz
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now); // 480 Hz

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
        gain.gain.setValueAtTime(0.15, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      } catch (e) {
        console.warn('Ringback audio error:', e);
      }
    };

    playBeep();
    this.ringbackInterval = setInterval(playBeep, 3500);
  }

  stopOutgoingRingback() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
  }

  // Connected tone
  playConnectedTone() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  // End call beep
  playEndCallTone() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      [0, 0.18, 0.36].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now + offset);

        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch {}
  }

  // New message notification
  playMessagePing() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }
}

export const soundService = new SoundService();

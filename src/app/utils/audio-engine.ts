// Web Audio APIを使用した音声エンジン

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: Map<number, { 
    osc: OscillatorNode; 
    osc2: OscillatorNode;
    gain: GainNode;
    gain2: GainNode;
  }> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3; // マスターボリューム
      this.masterGain.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  // MIDI番号から周波数を計算
  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  // 音を鳴らす
  playNote(midiNote: number, velocity: number = 100) {
    if (!this.audioContext || !this.masterGain) {
      this.initialize();
      if (!this.audioContext || !this.masterGain) return;
    }

    // AudioContextをresumeする（ブラウザの自動再生ポリシー対策）
    if (this.audioContext!.state === 'suspended') {
      this.audioContext!.resume();
    }

    // すでに鳴っている同じ音を停止
    this.stopNote(midiNote);

    const frequency = this.midiToFrequency(midiNote);
    const now = this.audioContext!.currentTime;

    // オシレーター（基音）
    const oscillator = this.audioContext!.createOscillator();
    oscillator.type = 'triangle'; // ピアノっぽい音にするため三角波を使用
    oscillator.frequency.value = frequency;

    // 倍音を追加してよりリッチな音に
    const oscillator2 = this.audioContext!.createOscillator();
    oscillator2.type = 'sine';
    oscillator2.frequency.value = frequency * 2;

    // ゲインノード（音量エンベロープ用）
    const gainNode = this.audioContext!.createGain();
    const velocity01 = velocity / 127;
    
    // ADSR エンベロープ（簡易版）
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity01 * 0.8, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(velocity01 * 0.6, now + 0.1); // Decay
    gainNode.gain.setValueAtTime(velocity01 * 0.6, now + 0.1); // Sustain

    // 倍音用のゲイン（少し小さく）
    const gainNode2 = this.audioContext!.createGain();
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(velocity01 * 0.3, now + 0.01);
    gainNode2.gain.exponentialRampToValueAtTime(velocity01 * 0.2, now + 0.1);

    // 接続
    oscillator.connect(gainNode);
    oscillator2.connect(gainNode2);
    gainNode.connect(this.masterGain!);
    gainNode2.connect(this.masterGain!);

    // 再生開始
    oscillator.start(now);
    oscillator2.start(now);

    // アクティブなオシレーターとして保存（倍音も含めて）
    this.activeOscillators.set(midiNote, { 
      osc: oscillator,
      osc2: oscillator2,
      gain: gainNode,
      gain2: gainNode2
    });
  }

  // 和音を鳴らす（指定時間後に停止）
  playChord(midiNotes: number[], durationMs: number = 800, velocity: number = 100) {
    if (!this.audioContext || !this.masterGain) return;
    midiNotes.forEach((note) => this.playNote(note, velocity));
    const releaseAt = this.audioContext.currentTime + durationMs / 1000;
    midiNotes.forEach((note) => {
      const t = setTimeout(() => {
        this.stopNote(note);
        clearTimeout(t);
      }, durationMs);
    });
  }

  // 音を止める
  stopNote(midiNote: number) {
    const active = this.activeOscillators.get(midiNote);
    if (!active || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const releaseTime = 0.05; // 50msに短縮（残響を最小限に）
    
    // Release エンベロープ（両方のゲインに適用）
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(active.gain.gain.value, now);
    active.gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
    
    active.gain2.gain.cancelScheduledValues(now);
    active.gain2.gain.setValueAtTime(active.gain2.gain.value, now);
    active.gain2.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
    
    // オシレーターを完全に停止（両方）
    try {
      active.osc.stop(now + releaseTime);
      active.osc2.stop(now + releaseTime);
    } catch (e) {
      // すでに停止している場合のエラーを無視
    }
    
    // マップから即座に削除
    this.activeOscillators.delete(midiNote);
  }

  // すべての音を即座に止める
  stopAll() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    this.activeOscillators.forEach((active) => {
      // 即座にゲインを0にする
      active.gain.gain.cancelScheduledValues(now);
      active.gain.gain.setValueAtTime(0, now);
      
      active.gain2.gain.cancelScheduledValues(now);
      active.gain2.gain.setValueAtTime(0, now);
      
      // オシレーターを即座に停止
      try {
        active.osc.stop(now);
        active.osc2.stop(now);
      } catch (e) {
        // すでに停止している場合のエラーを無視
      }
    });
    
    // すべてクリア
    this.activeOscillators.clear();
  }
}

// シングルトンインスタンス
export const audioEngine = new AudioEngine();

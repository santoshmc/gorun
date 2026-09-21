/**
 * Sounds are synthesised with the Web Audio API rather than shipped as audio
 * files, so the app stays dependency-free and works offline with no assets.
 */
export type SoundKey = 'pop' | 'tick' | 'success' | 'error' | 'whoosh' | 'swoosh';

interface Tone {
  frequency: number;
  /** Seconds from the start of the sound. */
  at: number;
  duration: number;
  gain: number;
  type: OscillatorType;
}

const RECIPES: Record<SoundKey, Tone[]> = {
  pop: [{ frequency: 660, at: 0, duration: 0.08, gain: 0.18, type: 'sine' }],
  tick: [{ frequency: 1200, at: 0, duration: 0.03, gain: 0.05, type: 'sine' }],
  success: [
    { frequency: 523.25, at: 0, duration: 0.12, gain: 0.16, type: 'triangle' },
    { frequency: 659.25, at: 0.1, duration: 0.12, gain: 0.16, type: 'triangle' },
    { frequency: 783.99, at: 0.2, duration: 0.22, gain: 0.18, type: 'triangle' },
  ],
  error: [
    { frequency: 320, at: 0, duration: 0.1, gain: 0.14, type: 'square' },
    { frequency: 240, at: 0.09, duration: 0.14, gain: 0.12, type: 'square' },
  ],
  whoosh: [{ frequency: 480, at: 0, duration: 0.24, gain: 0.12, type: 'sawtooth' }],
  swoosh: [{ frequency: 560, at: 0, duration: 0.12, gain: 0.08, type: 'sine' }],
};

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
let unlocked = false;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  );
}

export function isAudioSupported(): boolean {
  return audioContextCtor() !== undefined;
}

/** Browsers block audio until a user gesture, so this must run from one. */
export function unlockAudio(): void {
  const Ctor = audioContextCtor();
  if (!Ctor) return;

  try {
    context ??= new Ctor();
    void context.resume();
    unlocked = true;
  } catch {
    // Audio is a non-essential enhancement; never let it break the app.
    unlocked = false;
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function playSound(key: SoundKey): void {
  if (!unlocked || !context) return;

  try {
    const start = context.currentTime;
    for (const tone of RECIPES[key]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, start + tone.at);

      gain.gain.setValueAtTime(0.0001, start + tone.at);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + tone.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.duration);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + tone.at);
      oscillator.stop(start + tone.at + tone.duration + 0.02);
    }
  } catch {
    // Ignore playback failures.
  }
}

/** Test seam. */
export function resetAudioForTests(): void {
  context = null;
  unlocked = false;
}

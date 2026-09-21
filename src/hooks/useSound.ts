import { useCallback, useEffect, useRef } from 'react';
import { isAudioUnlocked, playSound, unlockAudio, type SoundKey } from '@/lib/sound';
import { useSettingsStore } from '@/store/settingsStore';

export function useSound() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const toggleSound = useSettingsStore((state) => state.toggleSound);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unlock = () => unlockAudio();

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      mountedRef.current = false;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback(
    (key: SoundKey) => {
      if (!soundEnabled) return;
      if (!isAudioUnlocked()) unlockAudio();
      playSound(key);
    },
    [soundEnabled]
  );

  return { play, soundEnabled, toggleSound };
}

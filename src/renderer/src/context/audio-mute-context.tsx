import { createContext, useContext } from 'react';
import { useLocalStorage } from '@/hooks/utils/use-local-storage';

interface AudioMuteState {
  muted: boolean;
  setMuted: (value: boolean) => void;
  toggleMuted: () => void;
}

const AudioMuteContext = createContext<AudioMuteState | null>(null);

/**
 * TTS 语音输出静音开关(只影响前端播放,不影响文字与后端合成)
 */
export function AudioMuteProvider({ children }: { children: React.ReactNode }) {
  // 键带 V2:默认静音;老设备里旧的 ttsMuted=false 不迁移,按新默认来
  const [muted, setMuted] = useLocalStorage('ttsMutedV2', true);
  const toggleMuted = (): void => setMuted(!muted);

  return (
    <AudioMuteContext.Provider value={{ muted, setMuted, toggleMuted }}>
      {children}
    </AudioMuteContext.Provider>
  );
}

export function useAudioMute() {
  const ctx = useContext(AudioMuteContext);
  if (!ctx) {
    throw new Error('useAudioMute must be used within AudioMuteProvider');
  }
  return ctx;
}

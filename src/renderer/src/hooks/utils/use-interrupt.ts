import { useAiState } from '@/context/ai-state-context';
import { useWebSocket } from '@/context/websocket-context';
import { useChatHistory } from '@/context/chat-history-context';
import { audioTaskQueue } from '@/utils/task-queue';
import { useSubtitle } from '@/context/subtitle-context';
import { audioManager } from '@/utils/audio-manager';

export const useInterrupt = () => {
  const { aiState, setAiState } = useAiState();
  const { sendMessage } = useWebSocket();
  const { fullResponse, clearResponse } = useChatHistory();
  // const { currentModel } = useLive2DModel();
  const { subtitleText, setSubtitleText } = useSubtitle();

  const interrupt = (sendSignal = true) => {
    if (aiState !== 'thinking-speaking') return;
    console.log('Interrupting conversation chain');

    // 直接用全局音频管理器停播:useInterrupt 会被 VADProvider 在渲染期调用,
    // 不能再走 useAudioTask→useVAD 的 hook 链(会读到自己尚未提供的 Context)
    audioManager.stopCurrentAudioAndLipSync();

    audioTaskQueue.clearQueue();

    setAiState('interrupted');

    if (sendSignal) {
      sendMessage({
        type: 'interrupt-signal',
        text: fullResponse,
      });
    }

    clearResponse();

    if (subtitleText === 'Thinking...') {
      setSubtitleText('');
    }
    console.log('Interrupted!');
  };

  return { interrupt };
};

import { Box, Text } from '@chakra-ui/react';
import { memo } from 'react';
import { canvasStyles } from './canvas-styles';
import { useSubtitleDisplay } from '@/hooks/canvas/use-subtitle-display';
import { useSubtitle } from '@/context/subtitle-context';

// Type definitions
interface SubtitleTextProps {
  text: string
}

// Reusable components
const SubtitleText = memo(({ text }: SubtitleTextProps) => (
  <Text {...canvasStyles.subtitle.text}>
    {/* 去掉后端附带的情绪/动作标记,如 [joy]、[f01] */}
    {text.replace(/\s*\[[^\]]*\]\s*/g, ' ').trim()}
  </Text>
));

SubtitleText.displayName = 'SubtitleText';

// Main component
const Subtitle = memo((): JSX.Element | null => {
  const { subtitleText, isLoaded } = useSubtitleDisplay();
  const { showSubtitle } = useSubtitle();

  if (!isLoaded || !subtitleText || !showSubtitle) return null;

  return (
    <Box {...canvasStyles.subtitle.container}>
      <SubtitleText text={subtitleText} />
    </Box>
  );
});

Subtitle.displayName = 'Subtitle';

export default Subtitle;

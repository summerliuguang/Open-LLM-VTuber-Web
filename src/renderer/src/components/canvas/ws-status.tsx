import { Box } from '@chakra-ui/react';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { canvasStyles } from './canvas-styles';
import { useWSStatus } from '@/hooks/canvas/use-ws-status';

// Type definitions
interface StatusContentProps {
  textKey: string
}

// Reusable components
const StatusContent: React.FC<StatusContentProps> = ({ textKey }) => {
  const { t } = useTranslation();
  return t(textKey);
};
const MemoizedStatusContent = memo(StatusContent);

// Main component
const WebSocketStatus = memo(({ compact = false }: { compact?: boolean }): JSX.Element => {
  const {
    color, textKey, handleClick, isDisconnected,
  } = useWSStatus();

  if (compact) {
    // 顶栏内嵌的小圆点+短文字版本
    return (
      <Box
        display="flex"
        alignItems="center"
        gap="4px"
        onClick={handleClick}
        cursor={isDisconnected ? 'pointer' : 'default'}
        px={1}
        fontSize="10px"
        color="white"
      >
        <Box
          width="8px"
          height="8px"
          borderRadius="full"
          backgroundColor={color}
        />
        <MemoizedStatusContent textKey={textKey} />
      </Box>
    );
  }

  return (
    <Box
      {...canvasStyles.wsStatus.container}
      backgroundColor={color}
      onClick={handleClick}
      cursor={isDisconnected ? 'pointer' : 'default'}
      _hover={{
        opacity: isDisconnected ? 0.8 : 1,
      }}
    >
      <MemoizedStatusContent textKey={textKey} />
    </Box>
  );
});

WebSocketStatus.displayName = 'WebSocketStatus';

export default WebSocketStatus;

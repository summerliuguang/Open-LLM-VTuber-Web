/* eslint-disable react/require-default-props */
/* 手机端顶部标题栏:左侧菜单键(打开设置抽屉),中间模型名(点击重命名),右侧历史/新建 */
import { useState } from 'react';
import { Box, Flex, IconButton, Dialog, Input, Button } from '@chakra-ui/react';
import { FiMenu, FiClock, FiPlus } from 'react-icons/fi';
import { useConfig } from '@/context/character-config-context';
import { useSidebar } from '@/hooks/sidebar/use-sidebar';
import HistoryDrawer from '@/components/sidebar/history-drawer';

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

function savedCharName(confName: string): string {
  try {
    return localStorage.getItem(`ollvtCharName:${confName}`) || confName;
  } catch {
    return confName;
  }
}

export function MobileHeader({ onMenuOpen }: MobileHeaderProps): JSX.Element {
  const { confName } = useConfig();
  const { createNewHistory } = useSidebar();
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const shownName = savedCharName(confName);

  const saveName = (): void => {
    const name = draft.trim();
    try {
      if (name) {
        localStorage.setItem(`ollvtCharName:${confName}`, name);
      } else {
        localStorage.removeItem(`ollvtCharName:${confName}`);
      }
    } catch {
      /* localStorage 不可用时忽略 */
    }
    setEditing(false);
  };

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      zIndex={30}
      bg="blackAlpha.600"
      backdropFilter="blur(10px)"
      paddingTop="env(safe-area-inset-top)"
    >
      <Flex align="center" px={2} height="48px" gap={1}>
        <IconButton
          aria-label="打开菜单"
          variant="ghost"
          size="lg"
          onClick={onMenuOpen}
        >
          <FiMenu />
        </IconButton>

        <Box
          flex={1}
          textAlign="center"
          cursor="pointer"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          fontWeight="bold"
          fontSize="md"
          paddingX={2}
          color="white"
          textShadow="0 1px 3px rgba(0,0,0,0.9)"
          minW={0}
          onClick={() => {
            setDraft(savedCharName(confName));
            setEditing(true);
          }}
          title="点击重命名"
        >
          {shownName}
        </Box>

        <HistoryDrawer>
          <IconButton aria-label="历史对话" variant="ghost" size="lg">
            <FiClock />
          </IconButton>
        </HistoryDrawer>

        <IconButton
          aria-label="新建对话"
          variant="ghost"
          size="lg"
          onClick={createNewHistory}
        >
          <FiPlus />
        </IconButton>
      </Flex>

      <Dialog.Root
        open={editing}
        onOpenChange={(e) => setEditing(e.open)}
        size="sm"
      >
        <Dialog.Backdrop />
        <Dialog.Content bg="gray.800" color="white">
          <Dialog.Header>
            <Dialog.Title>重命名</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="输入模型/角色名称"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
              }}
            />
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            </Dialog.ActionTrigger>
            <Button colorPalette="blue" onClick={saveName}>
              保存
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}

export default MobileHeader;

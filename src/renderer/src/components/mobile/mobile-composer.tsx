/* 手机端底部输入条,样式对齐 LiteGate 对话测试(playground):
   圆角卡片内:自适应高度的文本框 + 下排 [😀表情][麦克风][打断][模型切换chip] ... [圆形发送键];
   模型 chip 点开上方弹出菜单,列出后端 /live2d-models/info 的全部模型,点击即切换;
   😀 点开右侧竖排表情/动作快捷按钮列,不遮挡模型主体。 */
import { useEffect, useRef, useState } from 'react';
import {
  Box, Flex, IconButton, Textarea, Text,
} from '@chakra-ui/react';
import { BsMicFill, BsMicMuteFill } from 'react-icons/bs';
import { IoHandRightSharp } from 'react-icons/io5';
import { FiChevronUp, FiSend, FiSmile } from 'react-icons/fi';
import { RiShirtLine } from 'react-icons/ri';
import { Switch } from '@/components/ui/switch';
import { useTextInput } from '@/hooks/footer/use-text-input';
import { useMicToggle } from '@/hooks/utils/use-mic-toggle';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useAiState, AiStateEnum } from '@/context/ai-state-context';
import { useWebSocket } from '@/context/websocket-context';
import { useLive2DConfig } from '@/context/live2d-config-context';
import {
  getExpressions, getMotionGroups, playMotion, setExpression,
  getParts, setPartVisible,
  modelNameFromUrl, getBaseScale,
  type MotionGroupInfo, type PartInfo,
} from '@/utils/live2d-control';
import {
  getModelDisplayName, getPartDisplayName, sortByChineseName,
} from '@/utils/model-names';

interface CharacterInfo {
  name: string;
  avatar: string | null;
  model_path: string;
}

/** 没有缩放记忆的模型给这个默认值(过大的模型如 shizuku 全身可见) */
const DEFAULT_MODEL_SCALE = 0.6;

function currentModelName(url: string | undefined): string {
  return modelNameFromUrl(url) || '选择模型';
}

export function MobileComposer(): JSX.Element {
  const {
    inputText, setInputText, handleSend, handleKeyPress,
    handleCompositionStart, handleCompositionEnd,
  } = useTextInput();
  const { handleMicToggle, micOn } = useMicToggle();
  const { interrupt } = useInterrupt();
  const { aiState } = useAiState();
  const { baseUrl } = useWebSocket();
  const { modelInfo, setModelInfo } = useLive2DConfig();

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [expressions, setExpressions] = useState<string[]>([]);
  const [motionGroups, setMotionGroups] = useState<MotionGroupInfo[]>([]);
  const [parts, setParts] = useState<PartInfo[]>([]);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stripTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 右侧快捷列:'expr'=表情动作 'parts'=换装 'none'=收起
  const [stripMode, setStripMode] = useState<'none' | 'expr' | 'parts'>('none');

  // 文本框自适应高度(上限约 5 行)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [inputText]);

  // 快捷列打开期间轮询模型状态(模型异步加载)
  useEffect(() => {
    if (stripMode === 'none') {
      if (stripTimerRef.current) clearInterval(stripTimerRef.current);
      return;
    }
    const refresh = () => {
      setExpressions(getExpressions());
      setMotionGroups(getMotionGroups());
      setParts(getParts());
    };
    refresh();
    stripTimerRef.current = setInterval(refresh, 1000);
    return () => { if (stripTimerRef.current) clearInterval(stripTimerRef.current); };
  }, [stripMode]);

  const openMenu = async () => {
    if (!menuOpen && characters.length === 0) {
      try {
        const res = await fetch(`${baseUrl}/live2d-models/info`);
        const data = await res.json();
        setCharacters(sortByChineseName(
          data.characters || [],
          (c: CharacterInfo) => getModelDisplayName(c.name),
        ));
      } catch (error) {
        console.error('[MobileComposer] 获取模型列表失败:', error);
      }
    }
    setMenuOpen((v) => !v);
  };

  const switchModel = (c: CharacterInfo) => {
    const url = `${baseUrl}/${c.model_path}`;
    if (modelInfo?.url !== url) {
      // 加载一律用默认大小:优先该模型本次会话记录的加载基准,否则通用默认
      const target = getBaseScale(c.name) ?? DEFAULT_MODEL_SCALE;
      // setModelInfo 内部会把 kScale 乘 2,这里先除回来
      setModelInfo({ ...modelInfo, url, kScale: target / 2 });
    }
    setMenuOpen(false);
  };

  const handleInterrupt = () => {
    if (aiState === AiStateEnum.THINKING_SPEAKING) {
      interrupt();
    }
  };

  const modelName = currentModelName(modelInfo?.url);

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      zIndex={20}
      px={2}
      pt={2}
      pb="calc(0.5rem + env(safe-area-inset-bottom))"
    >
      {/* 右侧竖排换装开关列 */}
      {stripMode === 'parts' && (
        <Box
          position="fixed"
          right={2}
          top="50%"
          transform="translateY(-60%)"
          zIndex={35}
          display="flex"
          flexDirection="column"
          gap={1}
          bg="rgba(20, 22, 30, 0.72)"
          backdropFilter="blur(8px)"
          border="1px solid"
          borderColor="whiteAlpha.250"
          borderRadius="14px"
          p={2}
          width="164px"
          maxHeight="56vh"
          overflowY="auto"
        >
          {parts.length === 0 && (
            <Text fontSize="10px" color="whiteAlpha.600" p={1}>模型加载中…</Text>
          )}
          {parts.map((part) => (
            <Flex key={part.id} align="center" gap={1} width="100%">
              <Text
                fontSize="10px"
                color="white"
                flex={1}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                title={part.id}
              >
                {getPartDisplayName(part.id)}
              </Text>
              <Switch
                size="sm"
                colorPalette="blue"
                checked={part.visible}
                onCheckedChange={(d) => {
                  const visible = d.checked;
                  setPartVisible(part.index, visible);
                  setParts((prev) => prev.map((x) => (x.index === part.index ? { ...x, visible } : x)));
                }}
              />
            </Flex>
          ))}
        </Box>
      )}

      {/* 右侧竖排表情/动作快捷列 */}
      {stripMode === 'expr' && (
        <Box
          position="fixed"
          right={2}
          top="50%"
          transform="translateY(-60%)"
          zIndex={35}
          display="flex"
          flexDirection="column"
          gap={1}
          bg="rgba(20, 22, 30, 0.72)"
          backdropFilter="blur(8px)"
          border="1px solid"
          borderColor="whiteAlpha.250"
          borderRadius="14px"
          p={1}
          maxHeight="52vh"
          overflowY="auto"
        >
          {expressions.length === 0 && motionGroups.length === 0 && (
            <Text fontSize="10px" color="whiteAlpha.600" p={1}>模型加载中…</Text>
          )}
          {expressions.map((name) => (
            <Box
              key={`e-${name}`}
              as="button"
              onClick={() => setExpression(name)}
              fontSize="10px"
              color="white"
              bg="whiteAlpha.200"
              borderRadius="8px"
              px={1}
              py="6px"
              maxWidth="52px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {name}
            </Box>
          ))}
          {motionGroups.map((g) =>
            g.files.map((_, idx) => (
              <Box
                key={`m-${g.name}-${idx}`}
                as="button"
                onClick={() => playMotion(g.name, idx)}
                fontSize="10px"
                color="white"
                bg="teal.700"
                borderRadius="8px"
                px={1}
                py="6px"
                maxWidth="52px"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {g.name ? `${g.name}${g.count > 1 ? idx + 1 : ''}` : `动作${idx + 1}`}
              </Box>
            )),
          )}
        </Box>
      )}

      {menuOpen && (
        <Box
          position="absolute"
          left={2}
          right={2}
          bottom="100%"
          zIndex={40}
          bg="gray.800"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="14px"
          boxShadow="0 8px 28px rgba(0,0,0,0.5)"
          maxHeight="38vh"
          overflowY="auto"
          p={1}
        >
          {characters.length === 0 && (
            <Text fontSize="xs" color="whiteAlpha.600" p={2}>模型列表加载中…</Text>
          )}
          {characters.map((c) => {
            const active = modelInfo?.url?.includes(`/live2d-models/${c.name}/`);
            return (
              <Flex
                key={c.name}
                as="button"
                align="center"
                gap={2}
                width="100%"
                p={2}
                borderRadius="10px"
                cursor="pointer"
                bg={active ? 'whiteAlpha.200' : 'transparent'}
                _hover={{ bg: 'whiteAlpha.100' }}
                onClick={() => switchModel(c)}
              >
                {c.avatar && (
                  <Box
                    as="img"
                    src={`${baseUrl}/${c.avatar}`}
                    alt={c.name}
                    width="28px"
                    height="28px"
                    borderRadius="full"
                    objectFit="cover"
                  />
                )}
                <Text fontSize="sm" flex={1} textAlign="left" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {getModelDisplayName(c.name)}
                </Text>
                {active && <Text fontSize="xs" color="blue.300">当前</Text>}
              </Flex>
            );
          })}
        </Box>
      )}

      <Box
        bg="rgba(30, 32, 40, 0.92)"
        backdropFilter="blur(10px)"
        border="1px solid"
        borderColor="whiteAlpha.250"
        borderRadius="16px"
        px={3}
        pt={2}
        pb={1}
        _focusWithin={{ borderColor: 'blue.400' }}
      >
        <Textarea
          ref={taRef}
          value={inputText}
          onChange={(e) => setInputText(e)}
          onKeyDown={handleKeyPress}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="输入消息，Enter 发送"
          rows={1}
          border="none"
          bg="transparent"
          color="white"
          fontSize="15px"
          px={0}
          py={1}
          minHeight="auto"
          overflowY="auto"
          resize="none"
          _focus={{ border: 'none', outline: 'none' }}
        />
        <Flex align="center" gap={1} mt={1}>
          <IconButton
            aria-label="表情动作"
            variant="ghost"
            size="sm"
            color={stripMode === 'expr' ? 'blue.300' : 'whiteAlpha.700'}
            onClick={() => setStripMode((m) => (m === 'expr' ? 'none' : 'expr'))}
          >
            <FiSmile />
          </IconButton>
          <IconButton
            aria-label="换装"
            variant="ghost"
            size="sm"
            color={stripMode === 'parts' ? 'blue.300' : 'whiteAlpha.700'}
            onClick={() => setStripMode((m) => (m === 'parts' ? 'none' : 'parts'))}
          >
            <RiShirtLine />
          </IconButton>
          <IconButton
            aria-label={micOn ? '关闭麦克风' : '打开麦克风'}
            variant="ghost"
            size="sm"
            color={micOn ? 'green.400' : 'whiteAlpha.700'}
            onClick={handleMicToggle}
          >
            {micOn ? <BsMicFill /> : <BsMicMuteFill />}
          </IconButton>
          <IconButton
            aria-label="打断"
            variant="ghost"
            size="sm"
            color="whiteAlpha.700"
            onClick={handleInterrupt}
          >
            <IoHandRightSharp />
          </IconButton>

          <Flex
            as="button"
            align="center"
            gap={1}
            border="1px solid"
            borderColor="whiteAlpha.300"
            bg="whiteAlpha.100"
            borderRadius="999px"
            px={3}
            py={1}
            ml={1}
            maxWidth="45%"
            cursor="pointer"
            onClick={openMenu}
          >
            <Text fontSize="xs" color="white" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {getModelDisplayName(modelName)}
            </Text>
            <FiChevronUp size={12} />
          </Flex>

          <IconButton
            aria-label="发送"
            ml="auto"
            size="sm"
            borderRadius="999px"
            width="34px"
            height="34px"
            minWidth="34px"
            bg="blue.500"
            color="white"
            _hover={{ bg: 'blue.400' }}
            onClick={() => handleSend()}
          >
            <FiSend />
          </IconButton>
        </Flex>
      </Box>
    </Box>
  );
}

export default MobileComposer;

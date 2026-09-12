/* Live2D 动作/表情控制面板：枚举当前模型的表情与动作组直接播放，
   支持导入 .exp3.json / .motion3.json 预设并持久化（按模型隔离存 localStorage）。
   被 setting-ui 的 Tab 和 mobile header 的抽屉共用。 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Stack, Box, Flex, Text, Button, IconButton, SimpleGrid,
  Input, Separator, Badge,
} from '@chakra-ui/react';
import { FiUpload, FiPlay, FiTrash2, FiRotateCcw } from 'react-icons/fi';
import { useLive2DConfig } from '@/context/live2d-config-context';
import {
  getExpressions, getMotionGroups, playMotion, playRandomMotion,
  setExpression, getManualExpression, clearManualExpression, resetToDefault,
  getPresets, deletePreset, importPresetFile, playExpressionPreset,
  playMotionPreset, restorePresetsForCurrentModel, setModelUrl,
  type MotionGroupInfo, type Live2DPreset,
} from '@/utils/live2d-control';

const panelBtn = {
  size: 'sm',
  variant: 'outline',
  colorPalette: 'gray',
  justifyContent: 'center',
  color: 'whiteAlpha.900',
  borderColor: 'whiteAlpha.400',
} as const;

function Live2DControlPanel(): JSX.Element {
  const { modelInfo } = useLive2DConfig();
  const [expressions, setExpressions] = useState<string[]>([]);
  const [motionGroups, setMotionGroups] = useState<MotionGroupInfo[]>([]);
  const [presets, setPresets] = useState<Live2DPreset[]>([]);
  const [manual, setManual] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setExpressions(getExpressions());
    setMotionGroups(getMotionGroups());
    setPresets(getPresets());
    setManual(getManualExpression());
  }, []);

  // 注入模型 URL（预设隔离 key）+ 模型就绪后恢复已保存的表情预设
  useEffect(() => {
    setModelUrl(modelInfo?.url);
    restorePresetsForCurrentModel();
  }, [modelInfo?.url]);

  // 模型异步加载，面板可见期间轮询刷新
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const results: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const r = await importPresetFile(file);
        results.push(
          `${file.name}（${r.type === 'expression' ? '表情' : '动作'}）${r.autoApplied ? '已应用' : '已保存'}`,
        );
      } catch (err: any) {
        results.push(`${file.name} 失败：${err?.message || '未知错误'}`);
      }
    }
    setBusy(false);
    flash(results.join('；'));
    refresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePlayPreset = (preset: Live2DPreset) => {
    const ok = preset.type === 'expression'
      ? playExpressionPreset(preset)
      : playMotionPreset(preset);
    if (ok && preset.type === 'expression') setManual(preset.id);
    flash(ok ? `播放 ${preset.name}` : '播放失败：模型可能尚未加载完成');
    refresh();
  };

  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    refresh();
  };

  const handleReset = () => {
    clearManualExpression();
    resetToDefault();
    flash('已恢复默认表情');
    refresh();
  };

  const noModel = expressions.length === 0 && motionGroups.length === 0;

  return (
    <Stack gap={4} p={2}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {message && (
        <Text fontSize="xs" color="blue.300" wordBreak="break-all">{message}</Text>
      )}

      {/* 表情 */}
      <Box>
        <Flex align="center" mb={2} gap={2}>
          <Text fontSize="sm" fontWeight="bold">表情</Text>
          {manual && (
            <Badge colorPalette="purple" size="sm">手动：{manual}</Badge>
          )}
          <IconButton
            ml="auto"
            aria-label="恢复默认表情"
            title="恢复默认表情"
            variant="ghost"
            size="xs"
            onClick={handleReset}
          >
            <FiRotateCcw />
          </IconButton>
        </Flex>
        {expressions.length === 0 ? (
          <Text fontSize="xs" color="gray.400">模型暂无表情（或未加载完成）</Text>
        ) : (
          <SimpleGrid columns={3} gap={2}>
            {expressions.map((name) => (
              <Button
                key={name}
                {...panelBtn}
                colorPalette={manual === name ? 'purple' : 'gray'}
                onClick={() => { setExpression(name); refresh(); }}
                title={`应用表情 ${name}`}
              >
                <Text maxW="100%" overflow="hidden" textOverflow="ellipsis">{name}</Text>
              </Button>
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* 动作组 */}
      <Box>
        <Text fontSize="sm" fontWeight="bold" mb={2}>动作</Text>
        {motionGroups.length === 0 ? (
          <Text fontSize="xs" color="gray.400">模型暂无动作（或未加载完成）</Text>
        ) : (
          <Stack gap={3}>
            {motionGroups.map((group) => (
              <Box key={group.name}>
                <Flex align="center" gap={2} mb={1}>
                  <Text fontSize="xs" color="gray.300">{group.name || '(默认)'}</Text>
                  <Badge size="sm" colorPalette="gray">{group.count} 个</Badge>
                  {group.count > 1 && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="blue"
                      ml="auto"
                      onClick={() => { playRandomMotion(group.name); }}
                    >
                      随机
                    </Button>
                  )}
                </Flex>
                <SimpleGrid columns={group.count > 4 ? 4 : group.count} gap={2}>
                  {group.files.map((_, idx) => (
                    <Button
                      key={idx}
                      {...panelBtn}
                      onClick={() => { playMotion(group.name, idx); }}
                      title={`播放 ${group.name} #${idx + 1}`}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                </SimpleGrid>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Separator />

      {/* 导入预设 */}
      <Box>
        <Text fontSize="sm" fontWeight="bold" mb={2}>导入预设</Text>
        <Text fontSize="xs" color="gray.400" mb={2}>
          支持 Cubism 表情文件 .exp3.json 与动作文件 .motion3.json，导入后保存为本模型的预设，可反复使用。
        </Text>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={handlePickFiles}
          disabled={busy}
          loading={busy}
        >
          <FiUpload />
          选择文件导入
        </Button>
      </Box>

      {/* 已保存预设 */}
      {presets.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            本模型预设（{presets.length}）
          </Text>
          <Stack gap={2}>
            {presets.map((preset) => (
              <Flex key={preset.id} align="center" gap={2}>
                <Badge colorPalette={preset.type === 'expression' ? 'purple' : 'teal'} size="sm">
                  {preset.type === 'expression' ? '表情' : '动作'}
                </Badge>
                <Text fontSize="xs" flex={1} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {preset.name}
                </Text>
                <IconButton
                  aria-label={`播放 ${preset.name}`}
                  variant="ghost"
                  size="xs"
                  onClick={() => handlePlayPreset(preset)}
                >
                  <FiPlay />
                </IconButton>
                <IconButton
                  aria-label={`删除 ${preset.name}`}
                  variant="ghost"
                  size="xs"
                  colorPalette="red"
                  onClick={() => handleDeletePreset(preset.id)}
                >
                  <FiTrash2 />
                </IconButton>
              </Flex>
            ))}
          </Stack>
        </Box>
      )}

      {noModel && (
        <Text fontSize="xs" color="gray.500">
          等待 Live2D 模型加载……若长时间为空，请先在 Live2D 设置中选择模型。
        </Text>
      )}
    </Stack>
  );
}

export default Live2DControlPanel;

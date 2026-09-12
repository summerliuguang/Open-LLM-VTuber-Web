/* 语言模型设置:读取/修改后端 conf.yaml 的 LLM 接入配置
   (供应商 + base_url + api_key + model),保存后页面重连生效。 */
import { useEffect, useState } from 'react';
import { Stack, Text, Button } from '@chakra-ui/react';
import { createListCollection } from '@chakra-ui/react';
import { useWebSocket } from '@/context/websocket-context';
import { SelectField, InputField } from './common';
import { settingStyles } from './setting-styles';

const PROVIDERS = [
  { label: 'OpenAI 兼容（LiteGate/中转/本地）', value: 'openai_compatible_llm' },
  { label: 'Claude', value: 'claude_llm' },
  { label: 'Ollama（本地）', value: 'ollama_llm' },
  { label: 'LM Studio（本地）', value: 'lmstudio_llm' },
];

function LlmSettings(): JSX.Element {
  const { baseUrl } = useWebSocket();
  const [provider, setProvider] = useState<string[]>(['openai_compatible_llm']);
  const [baseUrl_, setBaseUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [masked, setMasked] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    fetch(`${baseUrl}/api/llm-config`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setMsg(`读取失败：${d.error}`); return; }
        setProvider([d.provider || 'openai_compatible_llm']);
        setBaseUrl(d.base_url || '');
        setModel(d.model || '');
        setMasked(d.api_key_masked || '');
      })
      .catch((e) => setMsg(`读取失败：${e.message}`));
  }, [baseUrl]);

  const handleSave = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`${baseUrl}/api/llm-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider[0],
          base_url: baseUrl_,
          api_key: apiKey,
          model,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg('已保存，正在重连以加载新模型…');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setMsg(`保存失败：${d.error || res.status}`);
      }
    } catch (e: any) {
      setMsg(`保存失败：${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack {...settingStyles.common.container} gap={4}>
      <SelectField
        label="供应商"
        value={provider}
        onChange={(v) => setProvider(v)}
        collection={createListCollection({ items: PROVIDERS })}
        placeholder="选择语言模型供应商"
      />
      <InputField
        label="Base URL"
        value={baseUrl_}
        onChange={setBaseUrl}
        placeholder="例如 http://127.0.0.1:8080/v1"
      />
      <InputField
        label="API Key"
        value={apiKey}
        onChange={setApiKey}
        placeholder={masked ? `已保存：${masked}（留空表示不修改）` : 'sk-...'}
      />
      <InputField
        label="模型"
        value={model}
        onChange={setModel}
        placeholder="例如 nvidia/nemotron-3-ultra-550b-a55b:free"
      />
      {msg && <Text fontSize="xs" color="blue.300">{msg}</Text>}
      <Button
        colorPalette="blue"
        onClick={handleSave}
        disabled={busy || !baseUrl_ || !model}
        loading={busy}
      >
        保存并重连
      </Button>
    </Stack>
  );
}

export default LlmSettings;

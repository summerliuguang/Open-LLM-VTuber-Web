/* eslint-disable no-underscore-dangle */
/* Live2D 运行时控制：表情/动作枚举与播放、导入 .exp3.json/.motion3.json、预设持久化。
   依赖 use-live2d-model.ts 暴露的 window.getLAppAdapter / window.Live2DDebug。 */

export interface MotionGroupInfo {
  name: string;
  count: number;
  files: string[];
}

export interface Live2DPreset {
  id: string;
  name: string;
  type: 'motion' | 'expression';
  size: number;
  /** 文件内容 base64，用于换模型/刷新后重新注册 */
  data: string;
}

interface Model3MotionMeta {
  FadeInTime?: number;
  FadeOutTime?: number;
}

function getModel(): any {
  const adapter = (window as any).getLAppAdapter?.();
  return adapter?.getModel() ?? null;
}

let currentModelUrl = '';

/** 由 UI 层（useLive2DConfig.modelInfo.url）注入当前模型 URL，作为预设隔离 key */
export function setModelUrl(url: string | undefined): void {
  currentModelUrl = url || '';
}

/** 当前模型 key（model3.json URL），预设按它隔离 */
export function getModelKey(): string {
  return currentModelUrl || 'unknown';
}

export function getExpressions(): string[] {
  const model = getModel();
  if (!model?._modelSetting) return [];
  const count = model._modelSetting.getExpressionCount();
  const names: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const n = model._modelSetting.getExpressionName(i);
    if (n) names.push(n);
  }
  // 导入的表情也列出来（不在 modelSetting 里）
  const size = model._expressions?.getSize?.() ?? 0;
  for (let i = 0; i < size; i += 1) {
    const n = model._expressions._keyValues[i]?.first;
    if (n && !names.includes(n)) names.push(n);
  }
  return names;
}

export function getMotionGroups(): MotionGroupInfo[] {
  const model = getModel();
  if (!model?._modelSetting) return [];
  const setting = model._modelSetting;
  const groups: MotionGroupInfo[] = [];
  const count = setting.getMotionGroupCount();
  for (let i = 0; i < count; i += 1) {
    const name = setting.getMotionGroupName(i);
    const cnt = setting.getMotionCount(name);
    const files: string[] = [];
    for (let j = 0; j < cnt; j += 1) {
      files.push(setting.getMotionFileName(name, j) ?? '');
    }
    groups.push({ name, count: cnt, files });
  }
  return groups;
}

export function playMotion(group: string, index: number): boolean {
  const model = getModel();
  if (!model) return false;
  try {
    return !!model.startMotion(group, index, 3);
  } catch (error) {
    console.error('[Live2DControl] playMotion failed:', error);
    return false;
  }
}

export function playRandomMotion(group: string): boolean {
  const model = getModel();
  if (!model) return false;
  try {
    return !!model.startRandomMotion(group, 3);
  } catch (error) {
    console.error('[Live2DControl] playRandomMotion failed:', error);
    return false;
  }
}

export function setExpression(name: string): boolean {
  const model = getModel();
  if (!model) return false;
  try {
    model.setExpression(name);
    // 手动选择的表情在回到 IDLE 后不被自动重置
    (window as any).__live2dManualExpression = name;
    return true;
  } catch (error) {
    console.error('[Live2DControl] setExpression failed:', error);
    return false;
  }
}

/** 手动锁定的表情（null 表示跟随默认/自动） */
export function getManualExpression(): string | null {
  return (window as any).__live2dManualExpression ?? null;
}

export function clearManualExpression(): void {
  (window as any).__live2dManualExpression = null;
}

/** 清除手动表情并恢复模型默认表情 */
export function resetToDefault(): void {
  clearManualExpression();
  const model = getModel();
  if (!model?._modelSetting) return;
  if (model._modelSetting.getExpressionCount() > 0) {
    model.setExpression(model._modelSetting.getExpressionName(0));
  }
}

/** 按内容识别文件类型：exp3.json 有 "Type":"Live2D Expression"，motion3.json 有 Curves/Meta */
function detectPresetType(json: any, fileName: string): 'motion' | 'expression' {
  if (json?.Type === 'Live2D Expression') return 'expression';
  if (json?.Curves || json?.Meta) return 'motion';
  if (fileName.toLowerCase().endsWith('.exp3.json')) return 'expression';
  if (fileName.toLowerCase().endsWith('.motion3.json')) return 'motion';
  throw new Error('无法识别文件类型，仅支持 .motion3.json / .exp3.json');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function stripExtension(name: string): string {
  return name.replace(/\.(motion3|exp3)\.json$/i, '').replace(/\.json$/i, '');
}

/** 把一份表情/动作数据注册进当前模型（不播放）。返回是否成功 */
function registerPreset(preset: Live2DPreset): boolean {
  const model = getModel();
  if (!model) return false;
  try {
    const buffer = base64ToArrayBuffer(preset.data);
    if (preset.type === 'motion') {
      const motion = model.loadMotion(buffer, buffer.byteLength, preset.name, null);
      if (!motion) return false;
      // 动作不做持久注册（缓存按 group_index 组织），播放时即时加载
    } else {
      // 用预设名作注册键，表情按钮直接显示该名字
      const expression = model.loadExpression(buffer, buffer.byteLength, preset.name);
      if (!expression) return false;
      model._expressions.setValue(preset.name, expression);
    }
    return true;
  } catch (error) {
    console.error('[Live2DControl] registerPreset failed:', error);
    return false;
  }
}

/** 播放一个已注册/导入的表情预设 */
export function playExpressionPreset(preset: Live2DPreset): boolean {
  const model = getModel();
  if (!model) return false;
  if (model._expressions.getValue(preset.name) == null) {
    if (!registerPreset(preset)) return false;
  }
  return setExpression(preset.name);
}

/** 播放一个导入的动作预设（即时加载播放，无需注册） */
export function playMotionPreset(preset: Live2DPreset): boolean {
  const model = getModel();
  if (!model) return false;
  try {
    const buffer = base64ToArrayBuffer(preset.data);
    const motion = model.loadMotion(buffer, buffer.byteLength, preset.id, null);
    if (!motion) return false;
    model._motionManager.startMotionPriority(motion, true, 3);
    return true;
  } catch (error) {
    console.error('[Live2DControl] playMotionPreset failed:', error);
    return false;
  }
}

// ---------- 预设持久化（localStorage，按模型隔离） ----------

const PRESETS_KEY = 'live2dPresets';

function readAllPresets(): Record<string, Live2DPreset[]> {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getPresets(): Live2DPreset[] {
  return readAllPresets()[getModelKey()] || [];
}

export function savePreset(preset: Live2DPreset): boolean {
  try {
    const all = readAllPresets();
    const list = all[getModelKey()] || [];
    list.push(preset);
    all[getModelKey()] = list;
    localStorage.setItem(PRESETS_KEY, JSON.stringify(all));
    return true;
  } catch (error) {
    console.error('[Live2DControl] savePreset failed (可能超出 localStorage 容量):', error);
    return false;
  }
}

export function deletePreset(id: string): void {
  try {
    const all = readAllPresets();
    all[getModelKey()] = (all[getModelKey()] || []).filter((p) => p.id !== id);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(all));
  } catch (error) {
    console.error('[Live2DControl] deletePreset failed:', error);
  }
}

/**
 * 导入预设文件：读取→识别类型→保存→立即生效。
 * @returns 导入结果（type/name），失败抛错
 */
export async function importPresetFile(file: File): Promise<{ type: 'motion' | 'expression'; name: string; autoApplied: boolean }> {
  const buffer = await file.arrayBuffer();
  let json: any = {};
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error('不是有效的 JSON 文件');
  }
  const type = detectPresetType(json, file.name);
  const name = stripExtension(file.name);
  const preset: Live2DPreset = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    size: buffer.byteLength,
    data: arrayBufferToBase64(buffer),
  };
  if (!savePreset(preset)) {
    throw new Error('保存预设失败（可能文件过大，超出浏览器本地存储容量）');
  }
  const autoApplied = type === 'expression'
    ? playExpressionPreset(preset)
    : playMotionPreset(preset);
  return { type, name, autoApplied };
}

/**
 * 把本模型已保存的预设重新注册进当前模型实例（换模型/刷新后调用）。
 * 幂等：以 window.__live2dRestoredForUrl 记录已恢复的模型 URL。
 */
export function restorePresetsForCurrentModel(): boolean {
  if (!currentModelUrl) return false;
  if ((window as any).__live2dRestoredForUrl === currentModelUrl) return true;
  const model = getModel();
  if (!model?._modelSetting) return false; // 模型还没加载完
  const presets = getPresets();
  let ok = true;
  presets.forEach((p) => {
    if (p.type === 'expression' && model._expressions.getValue(p.name) == null) {
      if (!registerPreset(p)) ok = false;
    }
  });
  (window as any).__live2dRestoredForUrl = currentModelUrl;
  return ok;
}

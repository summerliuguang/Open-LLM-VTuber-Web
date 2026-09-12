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

// ---------- 按模型记忆缩放（切换/刷新后恢复用户捏合调整的大小） ----------

export function modelNameFromUrl(url: string | undefined): string {
  const m = url?.match(/live2d-models\/([^/]+)\//);
  return m ? m[1] : '';
}

/** 从当前活动模型的 _modelHomeDir 取模型名(不依赖 React 状态,无时序问题) */
export function getActiveModelName(): string {
  const dir: string = getModel()?._modelHomeDir || '';
  // homeDir 形如 .../live2d-models/<名>/ 或 .../live2d-models/<名>/runtime/,取 live2d-models 的下一段
  const segs = dir.replace(/\/+$/, '').split('/');
  const idx = segs.lastIndexOf('live2d-models');
  if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
  return modelNameFromUrl(currentModelUrl);
}

/**
 * 缩放基准:每个模型记录"加载完成时的默认大小",捏合只允许在基准的 0.2~3 倍之间;
 * 加载一律用默认大小,不恢复上次捏合的缩放。
 */
const baseScales: Record<string, number> = {};

const ZOOM_MIN_RATIO = 0.2; // 相对默认尺寸的下限
const ZOOM_MAX_RATIO = 3.0; // 相对默认尺寸的上限
const PINCH_DAMPING = 0.45; // 捏合灵敏度阻尼(1=跟手速度,越小越慢)

export function getBaseScale(name: string): number | undefined {
  const v = baseScales[name];
  return typeof v === 'number' && v > 0 ? v : undefined;
}

/** 读取模型矩阵上当前生效的缩放值 */
export function getAppliedScale(): number {
  const model = getModel();
  const s = model?._modelMatrix?._tr?.[0];
  return typeof s === 'number' && s > 0 ? s : 1;
}

/**
 * 判断当前是否走"竖屏 + 大画布模型"分支:
 * 该分支每帧 setWidth(2.0*userScale) 重建矩阵,直接改矩阵会被下一帧覆盖,
 * 必须经 manager.setUserScale 调整;小画布模型则直接改矩阵。
 */
function isFitBranchModel(): boolean {
  const model = getModel();
  const core = model?.getModel?.();
  if (!core?.getCanvasWidth) return false;
  return core.getCanvasWidth() > 1.0 && window.innerWidth < window.innerHeight;
}

/** 取 Live2DManager 单例(window.getLive2DManager 由 WebSDK main.ts 暴露) */
function getManager(): any {
  return (window as any).getLive2DManager?.();
}

/** 以当前显示大小为基准,乘 ratio 调整模型缩放(捏合用,带阻尼+限幅) */
export function scaleModelBy(ratio: number): boolean {
  const model = getModel();
  if (!model?._modelMatrix || !(ratio > 0)) return false;
  const base = getBaseScale(getActiveModelName()) ?? getAppliedScale();
  const damped = 1 + (ratio - 1) * PINCH_DAMPING; // 阻尼,放慢捏合速度
  const target = Math.max(
    base * ZOOM_MIN_RATIO,
    Math.min(base * ZOOM_MAX_RATIO, getAppliedScale() * damped),
  );
  if (isFitBranchModel()) {
    const manager = getManager();
    if (!manager?.setUserScale) return false;
    const fit = 2.0 / model.getModel().getCanvasWidth();
    // 双写:先立即改矩阵(否则读数滞后一帧),再设 userScale 让后续帧保持
    model._modelMatrix.scale(target, target);
    manager.setUserScale(0, target / fit);
  } else {
    model._modelMatrix.scale(target, target);
  }
  return true;
}

let scaleWatcherStarted = false;
/** 常驻 1s 轮询:模型加载完成后记录缩放基准(默认大小),供捏合限幅(在 live2d.tsx 挂载时启动一次) */
export function startScaleRestoreWatcher(): void {
  if (scaleWatcherStarted) return;
  scaleWatcherStarted = true;
  setInterval(() => {
    try {
      const model = getModel();
      if (!model?._modelMatrix || !model?._modelSetting) return;
      const name = getActiveModelName();
      if (!name) return;
      if (baseScales[name] === undefined) {
        const s = getAppliedScale();
        if (s > 0) baseScales[name] = s;
      }
      // 加载一律用默认大小:本次会话内曾捏合过、又重新加载的模型,恢复基准
      if ((window as any).__live2dScaleModelHome !== model._modelHomeDir) {
        (window as any).__live2dScaleModelHome = model._modelHomeDir;
        const base = baseScales[name];
        const cur = getAppliedScale();
        if (base !== undefined && Math.abs(cur - base) > base * 0.01) {
          if (isFitBranchModel()) {
            const fit = 2.0 / model.getModel().getCanvasWidth();
            getManager()?.setUserScale?.(0, base / fit);
            model._modelMatrix.scale(base, base);
          } else {
            model._modelMatrix.scale(base, base);
          }
        }
      }
    } catch {
      /* 模型未就绪时静默 */
    }
  }, 1000);
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

// ---------- 换装(部件开关):枚举模型 Parts,按透明度 0/1 切换显隐 ----------

export interface PartInfo {
  index: number;
  id: string;
  visible: boolean;
}

/** 枚举当前模型的全部部件及可见状态 */
export function getParts(): PartInfo[] {
  const core = getModel()?.getModel?.();
  if (!core?.getPartCount) return [];
  const count = core.getPartCount();
  const parts: PartInfo[] = [];
  for (let i = 0; i < count; i += 1) {
    try {
      const idHandle = core.getPartId(i);
      const id = idHandle?.getString?.().s ?? `part_${i}`;
      const opacity = core.getPartOpacityByIndex?.(i) ?? 1;
      parts.push({ index: i, id, visible: opacity > 0.05 });
    } catch {
      /* 跳过异常部件 */
    }
  }
  return parts;
}

/** 切换部件显隐(1=显示,0=隐藏;父部件隐藏会连带隐藏子部件) */
export function setPartVisible(index: number, visible: boolean): boolean {
  const core = getModel()?.getModel?.();
  if (!core?.setPartOpacityByIndex) return false;
  try {
    core.setPartOpacityByIndex(index, visible ? 1 : 0);
    return true;
  } catch (error) {
    console.error('[Live2DControl] setPartVisible failed:', error);
    return false;
  }
}

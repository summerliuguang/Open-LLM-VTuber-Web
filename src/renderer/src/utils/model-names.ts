/* 模型与部件的中文显示名:
   - 模型:目录名(拼音/英文) → 中文名,菜单里显示"中文名 (目录名)"并按拼音排序
   - 部件:把常见服装/身体部件 ID 或日文名翻译成中文,显示"中文 (原名)",未收录的原样显示 */

const MODEL_NAMES: Record<string, string> = {
  // Open-LLM-VTuber 自带
  mao_pro: '真绪',
  shizuku: '雫',
  // Live2D 官方示例
  Hiyori: '日和',
  Haru: '春',
  Mao: '真绪',
  Mark: '马克',
  Natori: '名取',
  Ren: '莲',
  Rice: '米粒',
  Wanko: '小狗',
  // 碧蓝航线(拆包拼音名)
  aidang_2: '爱宕',
  aierdeliqi_4: '埃尔德里奇',
  aierdeliqi_5: '埃尔德里奇',
  aimierbeierding_2: '埃米尔贝尔丁',
  banrenma_2: '半人马',
  beierfasite_2: '贝尔法斯特',
  biaoqiang: '标枪',
  biaoqiang_3: '标枪',
  bisimai_2: '俾斯麦',
  chuixue_3: '吹雪',
  dafeng_2: '大凤',
  deyizhi_3: '德意志',
  dujiaoshou_4: '独角兽',
  dunkeerke_2: '敦刻尔克',
  genaisennao_2: '格奈森瑙',
  heitaizi_2: '黑太子',
  huangjiafangzhou_3: '皇家方舟',
  huonululu_3: '火奴鲁鲁',
  huonululu_5: '火奴鲁鲁',
  kelifulan_3: '克利夫兰',
  lafei: '拉菲',
  lafei_4: '拉菲',
  lingbo: '凌波',
  mingshi: '明石',
  ninghai_4: '宁海',
  pinghai_4: '平海',
  qibolin_2: '齐柏林',
  shengluyisi_2: '圣路易斯',
  shengluyisi_3: '圣路易斯',
  sipeibojue_5: '斯佩伯爵',
  taiyuan_2: '太原',
  tianlangxing_3: '天狼星',
  tierbici_2: '铁必制',
  xianghe_2: '翔鹤',
  xixuegui_4: '吸血鬼',
  xuefeng: '雪风',
  yichui_2: '伊吹',
  z23: 'Z23',
  z46_2: 'Z46',
  zhala_2: '扎拉',
};

/** 模型菜单显示名:中文名 (目录名);无映射时原样返回目录名 */
export function getModelDisplayName(dirName: string): string {
  const cn = MODEL_NAMES[dirName];
  return cn ? `${cn} (${dirName})` : dirName;
}

/** 按中文名拼音排序(localeCompare 的 zh 排序即拼音序) */
export function sortByChineseName<T>(items: T[], nameOf: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    nameOf(a).localeCompare(nameOf(b), 'zh-Hans-CN'),
  );
}

/** 部件名翻译表:按子串匹配,长词优先 */
const PART_WORDS: Array<[string, string]> = [
  // 效果/其他
  ['ExplosionLight', '爆炸光'], ['Aura', '光环'], ['Ink', '墨水'],
  ['インク', '墨水'], ['Core', '核心'], ['コア', '核心'],
  ['Effect', '特效'], ['エフェクト', '特效'], ['Rabbit', '兔子'],
  ['うさぎ', '兔子'], ['Heart', '爱心'], ['ハート', '爱心'],
  ['Wand', '法杖'], ['杖', '法杖'], ['Robe', '长袍'], ['Hoodie', '连帽衫'],
  ['Smoke', '烟雾'], ['煙', '烟雾'], ['蕎麦', '荞麦面'],
  ['下絵', '草稿'], ['ラフ', '草稿'], ['ディスプレイ', '屏幕'],
  ['Light', '光'],
  // 服装
  ['パジャマ', '睡衣'], ['Qipao', '旗袍'], ['Shanzi', '扇子'],
  ['ジャケット', '夹克'], ['Coat', '外套'], ['Shirt', '衬衫'],
  ['Skirt', '裙子'], ['Sleeve', '袖子'], ['制服', '制服'],
  ['パーカー', '连帽衫'], ['ローブ', '长袍'], ['Slys', '袖'],
  // 配饰
  ['ネックレス', '项链'], ['Necklace', '项链'], ['メガネ', '眼镜'],
  ['懐中時計', '怀表'], ['手袋', '手套'], ['Glove', '手套'],
  ['HeadAcce', '头饰'], ['NekoMimi', '猫耳'], ['Mask', '面罩'],
  ['Hat', '帽子'], ['帽子', '帽子'], ['Ribbon', '蝴蝶结'],
  ['リボン', '蝴蝶结'], ['王冠', '王冠'], ['アフロ', '爆炸头'],
  ['Belt', '腰带'], ['Collar', '领子'], ['Heel', '鞋跟'],
  // 部件/效果
  ['ツインテール', '双马尾'], ['下ろし髪', '披发'], ['Ahoge', '呆毛'],
  ['HorseTail', '马尾'], ['髪', '发'], ['Hair', '头发'],
  ['Maotail', '猫尾'], ['Cat', '猫'], ['Mao1', '猫'],
  ['背景', '背景'], ['Background', '背景'], ['Body', '身体'],
  ['Arm', '手臂'], ['Leg', '腿'], ['Foot', '脚'],
  ['Hand', '手'], ['Face', '脸'], ['Eye', '眼睛'],
  ['Mouth', '嘴'], ['Brow', '眉毛'], ['眉', '眉毛'],
  ['Ear', '耳朵'], ['Nose', '鼻子'], ['Neck', '脖子'],
  ['Chest', '胸'], ['Necklace', '项链'], ['Fireworks', '烟花'],
  ['Yanhua', '烟花'], ['Denglong', '灯笼'], ['Fengling', '风铃'],
  ['Smoke', '烟'], ['水珠', '水珠'], ['SunLight', '阳光'],
];

/** 部件显示名:中文 (原名);无翻译时原样显示原名 */
export function getPartDisplayName(partId: string): string {
  const lower = partId.toLowerCase();
  for (const [key, cn] of PART_WORDS) {
    const hit = /[\u3000-\u9fff]/.test(key)
      ? partId.includes(key)
      : lower.includes(key.toLowerCase());
    if (hit) return `${cn} (${partId})`;
  }
  return partId;
}

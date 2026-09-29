export const VERSION = 'fbti-v3.1';
export const DIMENSIONS = [
  { pair: 'HC', title: '上场角色', left: '组织传盘', right: '跑位接盘' },
  { pair: 'SG', title: '机会选择', left: '稳稳来', right: '敢尝试' },
  { pair: 'VA', title: '带队方式', left: '说出来', right: '做出来' },
  { pair: 'FW', title: '快乐来源', left: '享受过程', right: '认真争胜' },
];
export const LEVELS = [
  ['初来乍到', '盘还没摸热，成长空间已经拉满。', '从近距离的一传一接开始，先练会停稳和安全接盘。'],
  ['萌新上场', '大脑偶尔缓冲，但已经成功加入草坪群聊。', '练熟短距离反手传接，顺便认清进攻方向和得分区。'],
  ['入门盘友', '能接能传，偶尔给草坪发个快递。', '把正手和反手短传练稳，再加一点慢跑接盘。'],
  ['草坪熟面孔', '从“我在哪”进化到“盘给我”。', '练习传完就接应、没机会就让开，减少跑位堵车。'],
  ['靠谱队友', '普通局开始有人放心把盘交给你。', '加一点有人防守的传接练习，找到适合自己的场上分工。'],
  ['进阶选手', '有自己的拿手好戏，也知道什么盘不该硬来。', '复盘真实失误，在对抗中保持传接和防守判断的稳定。'],
  ['比赛常客', '战术能跟上，关键时刻也不只会喊加油。', '练好第二种处理方案，提升连续回合中的决策质量。'],
  ['高阶战力', '开始让对方在赛前讨论“这个人怎么防”。', '用比赛录像检查细节，让强项在更高强度下也稳定出现。'],
  ['全国强队级', '高强度对抗是日常，队友的信任值很高。', '结合正式比赛表现和教练反馈，继续打磨专项与稳定性。'],
  ['国家队级', '问卷里的天花板；真正的含金量，要去赛场兑现。', '以顶级赛事中的持续表现为准，问卷可不能替你发国家队队服。'],
];

export function validateQuestions(questions, mapping) {
  if (!Array.isArray(questions) || !questions.length || !mapping?.rules || !mapping?.axes) throw new Error('题库或映射为空');
  const ids = new Set(), optionIds = new Set();
  for (const [axis, config] of Object.entries(mapping.axes)) {
    if (!axis || !config.label || !Number.isFinite(config.weight) || config.weight <= 0) throw new Error('线索轴配置无效');
  }
  if (Object.keys(mapping.axes).length !== 5) throw new Error('需要五类场景线索');
  for (const q of questions) {
    if (!q.id || ids.has(q.id) || !q.q || !Array.isArray(q.options) || q.options.length < 2) throw new Error('题目格式不完整');
    ids.add(q.id);
    for (const o of q.options) {
      if (!o.id || optionIds.has(o.id) || !o.text) throw new Error('选项标识或文案无效');
      optionIds.add(o.id);
      const rule = mapping.rules[o.id];
      if (!rule || !rule.scores || !rule.ability || !rule.reason) throw new Error(`选项缺少结果映射：${o.id}`);
      if (rule.egg && !['IMFW', 'HUCK'].includes(rule.egg)) throw new Error('未知彩蛋');
      if (rule.huckSupport !== undefined && typeof rule.huckSupport !== 'boolean') throw new Error('冒险线索标记无效');
      if (rule.rangeCeiling !== undefined && (!Number.isInteger(rule.rangeCeiling) || rule.rangeCeiling < 0 || rule.rangeCeiling > 9)) throw new Error('等级范围上限无效');
      for (const [key, value] of Object.entries(rule.scores)) {
        if (!'HCSGVAFW'.includes(key) || key.length !== 1 || !Number.isFinite(value) || value < 0) throw new Error('人格权重无效');
      }
      for (const [key, value] of Object.entries(rule.ability)) {
        if (!(key in mapping.axes) || !Number.isFinite(value) || value < 0 || value > 7) throw new Error('场景线索分数无效');
      }
    }
  }
  if (Object.keys(mapping.rules).some(id => !optionIds.has(id))) throw new Error('存在未使用的选项映射');
  return true;
}

export function validAnswers(questions, answers, complete = false) {
  return Array.isArray(answers) && answers.length === questions.length && Array.from(answers).every((a, i) =>
    (!complete && a === null) || (Number.isInteger(a) && a >= 0 && a < questions[i].options.length));
}

// Store identities, not array offsets: moving an option in the editor must not
// silently turn an old answer into a different choice.
export function packAnswers(questions, answers) {
  return Object.fromEntries(questions.map((q, i) => [q.id, answers[i] === null ? null : q.options[answers[i]]?.id ?? null]));
}
export function unpackAnswers(questions, saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return questions.map(() => null);
  return questions.map(q => {
    const i = q.options.findIndex(o => o.id === saved[q.id]);
    return i < 0 ? null : i;
  });
}

export function assess(questions, answers, mapping) {
  if (!validAnswers(questions, answers, true)) throw new Error('请先完成所有题目');
  const scores = Object.fromEntries('HCSGVAFW'.split('').map(k => [k, 0]));
  const eggs = { IMFW: 0, HUCK: 0 };
  const clues = [], developingIds = new Set();
  const huckSupportIds = new Set();
  let rangeCeiling = 9;
  const buckets = Object.fromEntries(Object.keys(mapping.axes).map(k => [k, []]));
  questions.forEach((q, i) => {
    const o = q.options[answers[i]], rule = mapping.rules[o.id];
    if (!rule) throw new Error(`缺少选项映射：${o.id}`);
    for (const [k, v] of Object.entries(rule.scores)) scores[k] += v;
    if (rule.egg in eggs) eggs[rule.egg]++;
    if (rule.huckSupport) huckSupportIds.add(q.id);
    rangeCeiling = Math.min(rangeCeiling, rule.rangeCeiling ?? 9);
    if (rule.developing && Object.keys(rule.ability).length) developingIds.add(q.id);
    const signals = Object.entries(rule.ability);
    if (signals.length) clues.push({ question: i + 1, id: o.id, text: o.text, reason: rule.reason, developing: !!rule.developing });
    for (const [axis, value] of signals) buckets[axis].push(value);
  });
  const dimensions = DIMENSIONS.map(d => {
    const [a, b] = d.pair, total = scores[a] + scores[b];
    return { ...d, pct: total ? Math.round(scores[a] / total * 100) : 50, unknown: total === 0, tied: scores[a] === scores[b], code: scores[a] >= scores[b] ? a : b };
  });
  const baseCode = dimensions.map(d => d.code).join('');
  // A rare persona needs a pattern across distinct scenes, not one joke or
  // an ordinary beginner answer. Deep cutting alone is not a HUCK cue.
  const riskTotal = scores.S + scores.G;
  const huckEligible = eggs.HUCK >= 3 && huckSupportIds.size >= 3 && riskTotal > 0 && scores.G / riskTotal >= .65;
  const code = eggs.IMFW >= 6 && developingIds.size >= 5 ? 'IMFW' : huckEligible ? 'HUCK' : baseCode;
  const evidence = Object.entries(mapping.axes).map(([axis, config]) => {
    const values = buckets[axis];
    const mean = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
    return { axis, label: config.label, weight: config.weight, mean, level: mean === null ? null : Math.round(mean * 10) / 10, count: values.length };
  });
  const available = evidence.filter(e => e.mean !== null);
  const totalWeight = available.reduce((s, e) => s + e.weight, 0);
  const average = totalWeight ? available.reduce((s, e) => s + e.mean * e.weight, 0) / totalWeight : null;
  // Scene answers describe decisions, not throwing accuracy or actual fitness.
  // Multiple independent areas are needed before awarding an advanced estimate.
  const coherent = available.length === 5 && available.every(e => e.mean >= 5 && e.count >= 2);
  const inferred = average === null ? 3 : Math.round(average * 1.15 + (coherent ? .5 : 0));
  const developing = developingIds.size;
  // Repeated explicit dependence on instructions outweighs forced A/B choices in
  // other original scenes. One unfamiliar term or one joke has no such cap.
  const developingCeiling = developing >= 7 ? 1 : developing >= 5 ? 2 : developing >= 3 ? 3 : 7;
  const insufficient = clues.length < 8 || available.length < 4;
  const ceiling = Math.min(7, rangeCeiling, developingCeiling, insufficient ? 4 : 7);
  const level = Math.max(0, Math.min(ceiling, inferred));
  const spread = available.length ? Math.max(...available.map(e => e.mean)) - Math.min(...available.map(e => e.mean)) : 0;
  const mixed = developing >= 3 && clues.filter(c => !c.developing).length >= 5;
  const inconsistent = spread >= 3 || mixed;
  const ordered = [...available].sort((a, b) => b.mean - a.mean);
  return {
    code, baseCode, dimensions, eggs, evidence, clues, developing, level,
    low: Math.max(0, level - 2), high: Math.min(rangeCeiling, level + 2), rangeCeiling,
    levelName: LEVELS[level][0], quip: LEVELS[level][1], nextStep: LEVELS[level][2],
    consistency: insufficient ? '线索较少，暂给宽泛参考' : inconsistent ? '线索有反差，场上再见分晓' : '多处选择相互印证，仍需场上验证',
    inconsistent, insufficient, developingCapped: developingCeiling < inferred,
    strongest: ordered[0] ?? null, practice: ordered.at(-1) ?? null,
  };
}

export const VERSION = 'fbti-v2.0';
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

export function validateQuestions(questions) {
  if (!Array.isArray(questions) || !questions.length) throw new Error('题库为空');
  const ids = new Set();
  for (const q of questions) {
    if (!q.id || ids.has(q.id) || !q.q || !Array.isArray(q.options) || q.options.length < 2) throw new Error('题目格式不完整');
    ids.add(q.id);
    if (!['personality', 'ability'].includes(q.kind)) throw new Error('未知题目类型');
    if (q.kind === 'ability' && !(Number.isFinite(q.weight) && q.weight > 0 && q.axis)) throw new Error('实力权重无效');
    for (const o of q.options) {
      if (!o.text) throw new Error('选项缺少内容');
      if (q.kind === 'ability' && !(Number.isFinite(o.level) && o.level >= 0 && o.level <= 9)) throw new Error('实力分数越界');
      for (const [key, value] of Object.entries(o.scores || {})) {
        if (!'HCSGVAFW'.includes(key) || key.length !== 1 || !Number.isFinite(value) || value < 0) throw new Error('人格权重无效');
      }
    }
  }
  if (!questions.some(q => q.axis === 'experience')) throw new Error('缺少实战经历题');
  return true;
}

export function validAnswers(questions, answers, complete = false) {
  return Array.isArray(answers) && answers.length === questions.length && answers.every((a, i) =>
    (!complete && a === null) || (Number.isInteger(a) && a >= 0 && a < questions[i].options.length));
}

export function assess(questions, answers) {
  if (!validAnswers(questions, answers, true)) throw new Error('请先完成所有题目');
  const scores = Object.fromEntries('HCSGVAFW'.split('').map(k => [k, 0]));
  const eggs = { IMFW: 0, HUCK: 0, CHILL: 0 };
  const evidence = [];
  let unfamiliar = 0;
  let personalityCount = 0;
  questions.forEach((q, i) => {
    const o = q.options[answers[i]];
    if (q.kind === 'personality') {
      personalityCount++;
      for (const [k, v] of Object.entries(o.scores || {})) scores[k] += v;
      if (o.egg in eggs) eggs[o.egg]++;
      if (o.unfamiliar) unfamiliar++;
    } else evidence.push({ axis: q.axis, label: q.label, level: o.level, weight: q.weight, text: o.text });
  });
  const dimensions = DIMENSIONS.map(d => {
    const [a, b] = d.pair;
    const total = scores[a] + scores[b];
    return { ...d, pct: total ? Math.round(scores[a] / total * 100) : 50, unknown: total === 0, tied: scores[a] === scores[b], code: scores[a] >= scores[b] ? a : b };
  });
  const baseCode = dimensions.map(d => d.code).join('');
  let code = baseCode;
  if (eggs.IMFW >= 6 && eggs.IMFW / personalityCount >= .2) code = 'IMFW';
  else if (eggs.HUCK >= 2) code = 'HUCK';
  else if (eggs.CHILL >= 3) code = 'CHILL';

  const average = evidence.reduce((sum, e) => sum + e.level * e.weight, 0) / evidence.reduce((sum, e) => sum + e.weight, 0);
  const familiarityPenalty = Math.min(1.5, unfamiliar / personalityCount * 3);
  const experience = evidence.find(e => e.axis === 'experience').level;
  const ceiling = experience < 9 ? Math.min(8, experience + 1) : 9;
  const level = Math.max(0, Math.min(ceiling, Math.round(average - familiarityPenalty)));
  const spread = Math.max(...evidence.map(e => e.level)) - Math.min(...evidence.map(e => e.level));
  const inconsistent = spread >= 6 || (unfamiliar / personalityCount >= .35 && average >= 5);
  return {
    code, baseCode, dimensions, eggs, unfamiliar, evidence, level,
    low: Math.max(0, level - 2), high: Math.min(9, level + 2),
    levelName: LEVELS[level][0], quip: LEVELS[level][1], nextStep: LEVELS[level][2],
    consistency: inconsistent ? '线索有反差，建议上场验证' : '线索较一致，仍需上场验证',
    inconsistent, experienceCapped: Math.round(average - familiarityPenalty) > ceiling,
    strongest: [...evidence].sort((a, b) => b.level - a.level)[0],
    practice: [...evidence].filter(e => e.axis !== 'experience').sort((a, b) => a.level - b.level)[0],
  };
}

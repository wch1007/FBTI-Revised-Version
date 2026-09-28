import { assess, validateQuestions, packAnswers, unpackAnswers, VERSION } from './scoring.js';
import { downloadReport } from './report.js';

const app = document.querySelector('#app');
const STORAGE_KEY = VERSION;
let questions = [], results = {}, mapping = {}, answers = [], index = 0, report = null;
let storageAvailable = true, stage = 'home', toastTimer;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);
const completed = () => answers.filter(a => a !== null).length;

function toast(message) {
  el('toast').textContent = message;
  el('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el('toast').classList.remove('visible'), 3500);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, selections: packAnswers(questions, answers), questionId: questions[index].id })); }
  catch { storageAvailable = false; }
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === VERSION) {
      answers = unpackAnswers(questions, saved.selections);
      index = Math.max(0, questions.findIndex(q => q.id === saved.questionId));
    }
  } catch { storageAvailable = false; }
}
function focusHeading() {
  requestAnimationFrame(() => {
    const heading = app.querySelector('[data-focus]');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}
function fresh() {
  answers = Array(questions.length).fill(null); index = 0; report = null; save(); showQuiz();
}
function clearProgress() {
  if (!confirm('清除这个浏览器里的答题进度和报告？清除后可以重新开始。')) return;
  answers = Array(questions.length).fill(null); index = 0; report = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  showHome(); toast('本机答题记录已清除');
}
function showHome() {
  stage = 'home';
  const count = completed();
  app.innerHTML = `<section class="hero reveal">
    <div class="hero-copy">
      <span class="pill"><span class="live-dot"></span> 原版 30 题 · 场景里见真章</span>
      <h1 data-focus>盘可以掉，<br>人设不能少。<br><em>你是哪种盘友？</em></h1>
      <p>是场上的节奏大师，还是那个懵住的队友？<br>来领一份你的飞盘人格报告，顺便看看实力在哪一档。</p>
      <div class="hero-actions"><button class="primary" id="start">${count ? (count === questions.length ? '查看我的报告' : '继续上次测试') : '接住，开始测试'} <span aria-hidden="true">↗</span></button>${count ? '<button class="secondary" id="restart">重新开始</button>' : ''}</div>
      <p class="micro">${questions.length} 道场景题 · 约 4–6 分钟 · 不用注册${count ? ` · 已答 ${count}/${questions.length} 题` : ''}</p>
    </div>
    <div class="field-art" role="img" aria-label="一只写着 FBTI 的绿色飞盘，飞过草坪，旁边写着不会也能玩、先接住快乐">
      <div class="field-lines"></div><div class="field-circle"></div><div class="giant-disc"><span>FBTI</span></div>
      <span class="art-tag tag-top">“这啥意思？”也能选。</span><span class="spark">✳</span><span class="art-tag tag-bottom">先接住快乐 ↗</span><span class="orbit-caption">FIND YOUR PEOPLE. FIND YOUR PLAY.</span>
    </div>
  </section>
  <section class="intro-grid" aria-label="你会得到什么">
    <article><div class="feature-top"><b>01</b><span>PERSONALITY</span></div><h3>找到你的场上人设</h3><p>四个偏好维度，16 种常规人格。每种队友都有可爱之处。</p></article>
    <article><div class="feature-top"><b>02</b><span>HIDDEN TYPES</span></div><h3>诚实一点，解锁彩蛋</h3><p>呆住、乱跑、还没听懂？放心，我们给你留了选项。</p></article>
    <article><div class="feature-top"><b>03</b><span>LEVEL CHECK</span></div><h3>实力大概在哪一档？</h3><p>L0 小白 → L9 国家队级，附 ±2 浮动范围。快乐参考，场上见真章。</p></article>
  </section>`;
  el('start').onclick = () => count === questions.length ? showReport() : (count ? showQuiz() : fresh());
  if (count) el('restart').onclick = () => { if (confirm('重新开始会替换本机保存的答案，继续吗？')) fresh(); };
}
function showQuiz() {
  stage = 'quiz';
  const q = questions[index];
  app.innerHTML = `<div class="quiz-layout reveal">
    <aside class="quiz-aside"><span class="eyebrow">YOUR FIELD, YOUR RULES</span><h2>回到场上，<br>你会怎么选。</h2><p>按习惯作答，不必选“理想中的自己”。</p>
      <div class="steps"><div class="step active"><b>01</b> 30 个场上瞬间</div><div class="step"><b>02</b> 领取你的盘友报告</div></div>
      <div class="aside-note"><span class="eyebrow">场边便签</span><p style="margin:8px 0 0">没有标准人设。照平时打盘的反应选就好。</p></div>
    </aside>
    <div><section class="quiz-card">
      <div class="progress-label"><span>FBTI / 场景题</span><span>${String(index + 1).padStart(2, '0')} / ${questions.length}</span></div>
      <div class="progress-track" role="progressbar" aria-label="已答题目" aria-valuenow="${completed()}" aria-valuemin="0" aria-valuemax="${questions.length}"><div class="progress-fill" style="width:${completed() / questions.length * 100}%"></div></div>
      <span class="question-kind">场上的第一反应</span>
      <h2 id="question-title" data-focus>${esc(q.q)}</h2><p class="question-hint" id="question-hint">${esc(q.hint)}</p>
      <div class="options" role="radiogroup" aria-labelledby="question-title" aria-describedby="question-hint">${q.options.map((o, i) => `<button class="option" role="radio" aria-checked="${answers[index] === i}" tabindex="${answers[index] === i || (answers[index] === null && i === 0) ? 0 : -1}" data-option="${i}"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span>${esc(o.text)}</span></button>`).join('')}</div>
      <div class="quiz-nav"><button class="secondary" id="previous" ${index === 0 ? 'disabled' : ''}>← 上一题</button><button class="primary" id="next" ${answers[index] === null ? 'disabled' : ''}>${index === questions.length - 1 ? '领取我的报告 ↗' : '下一题 →'}</button></div>
    </section><div class="quiz-bottom"><span id="save-state">${storageAvailable ? '进度保存在本机 · 选好后点下一题' : '浏览器无法保存进度 · 请保持此页打开'}</span><button class="text-button" id="clear">清除进度</button></div></div>
  </div>`;
  const options = [...app.querySelectorAll('[data-option]')];
  function select(i) {
    answers[index] = i; save();
    options.forEach((button, j) => { button.setAttribute('aria-checked', String(i === j)); button.tabIndex = i === j ? 0 : -1; });
    el('next').disabled = false;
    const progress = app.querySelector('[role=progressbar]');
    progress.setAttribute('aria-valuenow', completed());
    app.querySelector('.progress-fill').style.width = `${completed() / questions.length * 100}%`;
    el('save-state').textContent = storageAvailable ? '已保存到本机 · 可以改选，再点下一题' : '浏览器无法保存进度 · 请保持此页打开';
  }
  options.forEach((button, i) => {
    button.onclick = () => select(i);
    button.onkeydown = e => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (i + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1) + options.length) % options.length;
      select(j); options[j].focus();
    };
  });
  el('previous').onclick = () => { if (index > 0) { index--; save(); showQuiz(); } };
  el('next').onclick = () => {
    if (answers[index] === null) return;
    if (index === questions.length - 1) {
      const missing = answers.indexOf(null);
      if (missing >= 0) { index = missing; showQuiz(); toast('还有一道没答，补上就能领报告'); }
      else showReport();
    } else { index++; save(); showQuiz(); }
  };
  el('clear').onclick = clearProgress;
  focusHeading();
}
function showReport() {
  try { report = assess(questions, answers, mapping); } catch { index = Math.max(0, answers.indexOf(null)); showQuiz(); return; }
  stage = 'report'; save();
  const r = report, persona = results[r.code], isEgg = r.code !== r.baseCode;
  app.innerHTML = `<section class="reveal" id="report">
    <div class="report-top"><span class="eyebrow">YOUR FBTI FIELD REPORT / 盘友鉴定单</span><button class="text-button" id="edit">← 回改答案</button></div>
    <p class="report-intro">报告已送达。人设先认领，实力慢慢练。</p>
    <div class="report-grid">
      <article class="personality-art"><img id="personality-image" src="${esc(persona.image)}" alt="红姐原版人格图：${r.code} ${esc(persona.title)}" decoding="async"><div id="image-fallback" hidden>人格图暂时没加载出来，请刷新重试。</div><div class="art-credit"><h1 data-focus>${r.code} · ${esc(persona.title)}</h1><span>${isEgg ? '隐藏彩蛋 · ' : ''}人格图沿用 RED / 红姐原作</span><a href="${esc(persona.image)}" download="FBTI-${r.code}-原版人格图.png">保存原版人格图 ↓</a></div></article>
      <div class="report-summary"><article class="ability-card"><span class="eyebrow">LEVEL CHECK / 实力趣味预判</span><div class="level-line"><div class="level-number">L${r.level}<span>±2</span></div><span class="level-name">${esc(r.levelName)}</span></div><div class="range">参考范围 L${r.low}–L${r.high} · 全刻度 L0–L9</div><p class="level-quip">${esc(r.quip)}</p>
        <div class="ladder" role="img" aria-label="预估 L${r.level}，参考范围 L${r.low} 到 L${r.high}">${Array.from({ length: 10 }, (_, i) => `<span class="ladder-bar ${i >= r.low && i <= r.high ? 'in-range' : ''} ${i === r.level ? 'current' : ''}" style="--height:${18 + i * 3.3}px"></span>`).join('')}</div><div class="ladder-labels"><span>L0 小白</span><span>L5 进阶</span><span>L9 国家队级</span></div>
        <p class="micro">${esc(r.consistency)}。${r.level < 2 || r.level > 7 ? '±2 超出刻度的部分已截到 L0–L9。' : ''}</p><p class="micro">从你的场景选择里猜一猜，准不准还得上场。懂套路不等于盘一定传得到。</p>
      </article>
    <section class="panel persona-description"><h3>${esc(persona.title)} · 你的场上画像</h3><p>${esc(persona.desc)}</p><div class="trait-tags">${persona.pros.map(t => `<span class="partner-chip">${esc(t)}</span>`).join('')}</div></section></div>
    </div>
    <div class="section-heading"><h2>你的场上使用说明</h2><span class="eyebrow">THE DETAILS</span></div>
    <div class="report-grid">
      <section class="panel"><h3>四维偏好 · 风格不分高低</h3><div class="dimensions">${r.dimensions.map(d => `<div><div class="dimension-top"><strong>${esc(d.title)}</strong><span>${d.unknown ? '有效线索不足' : d.tied ? '两边都有一点' : (d.pct > 50 ? esc(d.left) : esc(d.right)) + ' ' + Math.max(d.pct, 100 - d.pct) + '%'}</span></div><div class="dimension-track"><div class="dimension-fill ${d.unknown ? 'unknown' : ''}" style="width:${d.pct}%"></div></div><div class="dimension-labels"><span>${d.pair[0]} · ${esc(d.left)}</span><span>${d.pair[1]} · ${esc(d.right)}</span></div></div>`).join('')}</div><p class="evidence-note">${isEgg ? '彩蛋是额外的人设；四维依然按有信息的答案展示。' : '百分比表示选项权重占比，不是能力分或准确率。'}${r.dimensions.some(d => d.tied) ? ' 有维度持平或线索不足时，常规代码暂按该维左侧字母显示，请以维度说明为准。' : ''}</p></section>
      <section class="panel"><h3>你在这些细节里露了底</h3><p class="evidence-note" style="margin-top:0">${r.strongest ? `「${esc(r.strongest.label)}」的线索最明显。` : '能用来判断的线索不多。'}${r.developingCapped ? ' 多次依赖队友指令，预估更偏向初阶。' : ''}${r.inconsistent ? ' 不同场景里有反差，这份预判先打个问号。' : ''}</p>
        <div class="clue-list">${r.clues.slice().sort((a,b) => Number(b.developing) - Number(a.developing)).slice(0,3).map(c => `<blockquote><span>Q${String(c.question).padStart(2,'0')}</span><p>“${esc(c.text)}”</p><small>${esc(c.reason)}</small></blockquote>`).join('')}</div>
        <details><summary>展开所有判断线索</summary><ul>${r.clues.map(c => `<li><strong>第 ${c.question} 题：</strong>${esc(c.text)}<br>${esc(c.reason)}</li>`).join('')}</ul><p>从盘权处理、空间与接应、局势阅读、压力决策和配合执行五类线索交叉推断。情绪、胜负心、理想技能和是否愿意飞扑不计技术分；没线索也不等于零分。</p><p>这些题看不出真实传接成功率、体能和比赛履历，所以中心预估最多到 L7，参考区间最高可到 L9。±2 是固定趣味范围，不是实测误差。</p></details>
      </section>
      <section class="panel next-step"><span class="eyebrow">NEXT LITTLE WIN</span><h3 style="margin-top:10px">下一次上场，解锁一小步</h3><p>${esc(r.nextStep)}</p><p class="micro" style="margin-top:12px">可优先练习：${esc(r.practice?.label || '传接与跑位')}。不必为了升级去冒险，稳定和快乐都值得练。</p></section>
      <section class="panel"><span class="eyebrow">YOUR PEOPLE</span><h3 style="margin-top:10px">适合和你一起接盘的人</h3><div class="partner-chips">${persona.partnerSuggestions.map(p => `<span class="partner-chip">${esc(p.name)}<b>${esc(p.code)}</b></span>`).join('')}</div><p class="micro" style="margin-bottom:0">${esc(persona.logic)}</p></section>
    </div>
    <div class="report-actions"><button class="primary" id="download">保存结果图 ↓</button><button class="secondary" id="share">复制分享文案 ↗</button><button class="secondary" id="retry">再测一次 ↻</button><button class="text-button" id="clear-report">清除本机答题记录</button></div>
    <p class="report-footnote">FBTI 是娱乐性的行为偏好测试，不是心理测评。报告中的优势是风格描述；L0–L9 是本站自定义的趣味实力刻度，±2 为估计范围，不是正式评级。彩蛋只负责逗你一笑，不能定义你。</p>
  </section>`;
  el('personality-image').onerror = () => { el('personality-image').hidden = true; el('image-fallback').hidden = false; };
  el('edit').onclick = () => { index = 0; showQuiz(); };
  el('retry').onclick = () => { if (confirm('开始新一轮测试？本机保存的这份答案会被替换，建议先保存结果图。')) fresh(); };
  el('clear-report').onclick = clearProgress;
  el('download').onclick = async () => {
    const button = el('download'); button.disabled = true; button.textContent = '正在生成结果图…';
    try { await downloadReport(r, persona); toast('结果图已生成，请查看浏览器下载'); }
    catch { toast('图片保存失败，可以使用浏览器打印或截图保存'); }
    finally { if (button.isConnected) { button.disabled = false; button.textContent = '保存结果图 ↓'; } }
  };
  el('share').onclick = async () => {
    const url = location.origin + location.pathname;
    const text = `我的飞盘人格是 ${r.code}「${persona.title}」！\n趣味实力预估：L${r.level} ±2（L${r.low}–L${r.high}）。${r.quip}\n只是场景推测，真正实力场上见。来测测你是哪种盘友：\n${url}`;
    try { await navigator.clipboard.writeText(text); toast('已复制，发给你的盘友吧'); }
    catch {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `FBTI-${r.code}-分享文案.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      toast('无法访问剪贴板，已保存分享文案文件');
    }
  };
  focusHeading();
}

el('about-button').onclick = () => el('about-dialog').showModal();
el('close-about').onclick = () => el('about-dialog').close();
el('about-dialog').addEventListener('click', e => { if (e.target === el('about-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });

async function init() {
  try {
    const data = await Promise.all(['questions.json', 'results.json', 'scoring-map.json'].map(async file => {
      const response = await fetch(new URL(file, import.meta.url), { cache: 'no-cache' });
      if (!response.ok) throw new Error('加载失败');
      return response.json();
    }));
    [questions, results, mapping] = data;
    validateQuestions(questions, mapping);
    const expected = ['IMFW', 'HUCK'];
    for (const h of 'HC') for (const s of 'SG') for (const v of 'VA') for (const f of 'FW') expected.push(h + s + v + f);
    if (expected.some(code => !/^image\/fbti\/[A-Z]{4}\.png$/.test(results[code]?.image || '') || !results[code]?.title || !results[code]?.desc || !Array.isArray(results[code]?.pros) || !Array.isArray(results[code]?.partnerSuggestions))) throw new Error('报告资料不完整');
    answers = Array(questions.length).fill(null); restore(); showHome();
  } catch {
    app.innerHTML = '<section class="error"><h2>盘飞得有点远，题目没接住。</h2><p>请检查网络后再试一次。</p><button class="primary" id="reload">重新加载 ↻</button></section>';
    el('reload').onclick = () => location.reload();
  } finally { app.setAttribute('aria-busy', 'false'); }
}
init();

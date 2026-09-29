// Render a standalone share card using local browser fonts; no CDN or screenshot
// service sees the answers. Text is measured and wrapped to avoid clipped Chinese.
export function preferenceDetail(d) {
  const leftWins = d.code === d.pair[0];
  return {
    letter: d.unknown ? `${d.pair[0]} / ${d.pair[1]}` : d.code,
    label: d.unknown ? '随场发挥' : leftWins ? d.left : d.right,
    share: d.unknown ? null : leftWins ? d.pct : 100 - d.pct,
    other: d.unknown ? d.pair : leftWins ? d.pair[1] : d.pair[0],
    otherLabel: d.unknown ? `${d.left} / ${d.right}` : leftWins ? d.right : d.left,
    otherShare: d.unknown ? null : leftWins ? 100 - d.pct : d.pct,
    status: d.unknown ? '两种风格，随机应变' : d.tied ? '两边都有一点' : '你的倾向',
  };
}

export async function downloadReport(result, persona) {
  await document.fonts.ready;
  const artwork = new Image();
  artwork.src = new URL(persona.image, import.meta.url).href;
  await artwork.decode();
  const artHeight = Math.round(904 * artwork.naturalHeight / artwork.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = 1000; canvas.height = artHeight + 2500;
  const ctx = canvas.getContext('2d');
  const ink = '#193e33', muted = '#657561', paper = '#f6f5ed', lime = '#defb83';
  const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 1000, canvas.height);
  function text(str, x, y, size = 25, color = ink, bold = false) {
    ctx.font = `${bold ? 700 : 400} ${size}px ${font}`; ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function wrap(str, x, y, width, size = 25, color = ink, line = 43) {
    ctx.font = `400 ${size}px ${font}`; ctx.fillStyle = color;
    let row = '';
    for (const c of str) {
      if (ctx.measureText(row + c).width > width && row) { ctx.fillText(row, x, y); row = c; y += line; }
      else row += c;
    }
    if (row) ctx.fillText(row, x, y);
    return y + line;
  }
  function rect(x, y, w, h, color, radius = 25) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
  }
  text('FBTI  /  飞盘人格实验室', 64, 75, 30, ink, true);
  text('YOUR FIELD REPORT', 64, 116, 18, muted);
  // Keep RED's entire artwork and typography, with no crop or overlaid text.
  ctx.drawImage(artwork, 48, 154, 904, artHeight);
  let y = 154 + artHeight + 44;
  text(`${result.code} · ${persona.title} / 人格图：RED 原作`, 64, y, 24, ink, true);
  const abilityTop = y + 36;
  rect(48, abilityTop, 904, 374, '#e7efd5');
  text('实力趣味预判 · 从场景选择推断', 84, abilityTop + 53, 22, muted);
  text(`L${result.level} ±2`, 79, abilityTop + 165, 91, ink, true);
  text(result.levelName, 470, abilityTop + 154, 32, ink, true);
  text(`参考范围 L${result.low}–L${result.high}  /  全刻度 L0–L9`, 84, abilityTop + 222, 26);
  wrap(result.quip, 84, abilityTop + 276, 816, 25, ink, 41);
  y = abilityTop + 435;
  text(`你的 FBTI 人格 · ${result.code}`, 64, y, 32, ink, true); y += 42;
  text(result.code === result.baseCode ? persona.title : `${persona.title} / 场上偏好 ${result.baseCode}`, 64, y, 23, muted); y += 26;
  result.dimensions.forEach((d, i) => {
    const p = preferenceDetail(d), x = 64 + (i % 2) * 446, top = y + Math.floor(i / 2) * 236;
    rect(x, top, 426, 218, '#e7efd5', 18);
    text(d.title, x + 22, top + 34, 20, muted);
    text(p.letter, x + 22, top + 106, 54, ink, true);
    text(p.label, x + 22, top + 143, 26, ink, true);
    text(`${p.status}${p.share === null ? '' : ` ${p.share}%`}`, x + 170, top + 98, 20, muted);
    text(`${p.other} · ${p.otherLabel}${p.otherShare === null ? '' : ` ${p.otherShare}%`}`, x + 22, top + 191, 19, muted);
  });
  y += 472;
  y = wrap('人格和等级仅供娱乐；等级上下最多浮动 2 级，以参考范围为准。', 64, y + 18, 868, 21, muted, 35);
  text('原作 RED / 红姐 · 改编 wch1007', 64, y + 30, 19, muted);
  text('wch1007.github.io/FBTI-Revised-Version/', 64, y + 68, 21, ink, true);
  const output = document.createElement('canvas'); output.width = 1000; output.height = y + 106;
  output.getContext('2d').drawImage(canvas, 0, 0);
  const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('图片生成失败');
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.download = `FBTI-${result.code}-L${result.level}.png`; link.href = url; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

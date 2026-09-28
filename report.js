// Render a standalone share card using local browser fonts; no CDN or screenshot
// service sees the answers. Text is measured and wrapped to avoid clipped Chinese.
export async function downloadReport(result, persona) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1000; canvas.height = 2100;
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
  rect(48, 154, 904, 650, ink);
  text(result.code !== result.baseCode ? '隐藏彩蛋已解锁' : '你的飞盘人格', 84, 211, 23, lime);
  text(result.code, 78, 336, 108, lime, true);
  let y = wrap(persona.title, 84, 401, 825, 37, '#fffef9', 54);
  y = wrap(persona.desc, 84, y + 18, 825, 25, '#e0e8da', 44);
  // The green block's end follows content, leaving space for longer egg copy.
  const abilityTop = Math.max(700, y + 44);
  rect(48, abilityTop, 904, 374, '#e7efd5');
  text('实力趣味预判 · 按真实表现自报', 84, abilityTop + 53, 22, muted);
  text(`L${result.level} ±2`, 79, abilityTop + 165, 91, ink, true);
  text(result.levelName, 470, abilityTop + 154, 32, ink, true);
  text(`参考范围 L${result.low}–L${result.high}  /  全刻度 L0–L9`, 84, abilityTop + 222, 26);
  wrap(result.quip, 84, abilityTop + 276, 816, 25, ink, 41);
  y = abilityTop + 435;
  text('四维偏好 · 风格不分高低', 64, y, 28, ink, true); y += 49;
  for (const d of result.dimensions) {
    text(`${d.left} / ${d.right}`, 64, y, 23);
    const label = d.unknown ? '线索不足' : d.tied ? '两边都有一点' : `${d.pct > 50 ? d.left : d.right} ${Math.max(d.pct, 100 - d.pct)}%`;
    text(label, 675, y, 21, muted);
    rect(64, y + 17, 872, 9, '#dde3d3', 4); rect(64, y + 17, Math.max(4, 872 * d.pct / 100), 9, d.unknown ? '#adb7a6' : '#81965f', 4); y += 72;
  }
  y += 18; text('下一次上场，解锁一小步', 64, y, 28, ink, true);
  y = wrap(result.nextStep, 64, y + 48, 868, 24, ink, 41);
  y = wrap(`判断线索：${result.consistency}。基于 8 项能力自评及场景熟悉度。`, 64, y + 21, 868, 21, muted, 35);
  y = wrap('仅供娱乐。L0–L9 为本站自定义刻度，±2 是固定趣味估计范围，边界截至 L0–L9；不是统计置信区间、技术认证或国家队选拔依据。人格优势是风格描述。', 64, y + 17, 868, 19, muted, 33);
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

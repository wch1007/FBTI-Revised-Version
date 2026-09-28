import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assess, validateQuestions, validAnswers, packAnswers, unpackAnswers } from '../scoring.js';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const questions = read('../questions.json'), mapping = read('../scoring-map.json'), results = read('../results.json');
const original = read('./fixtures/original-questions.json');
const approved = read('./fixtures/approved-options.json');
const answers = () => questions.map(() => 0);
const score = a => assess(questions, a, mapping);
const copy = x => structuredClone(x);
const choose = (a, id) => { const i = questions.findIndex(q => q.options.some(o => o.id === id)); a[i] = questions[i].options.findIndex(o => o.id === id); return a; };

test('original 30 scenes and weights are preserved with the explicitly approved option edits', () => {
  assert.equal(questions.length, 30);
  assert.equal(validateQuestions(questions, mapping), true);
  let changedScenes = 0, extras = 0;
  questions.forEach((q, i) => {
    assert.equal(q.q, original[i].q); assert.equal(q.hint, original[i].hint); assert.equal(q.dim, original[i].dim);
    original[i].options.forEach((o, j) => {
      assert.equal(q.options[j].text, approved[q.options[j].id] ?? o.text);
      const rule = mapping.rules[q.options[j].id], expected = copy(o.scores);
      const special = expected.special; delete expected.special;
      assert.deepEqual(rule.scores, expected);
      if (special) assert.equal(rule.egg, Object.keys(special)[0]);
    });
    if (q.options.length > original[i].options.length) changedScenes++;
    extras += q.options.length - original[i].options.length;
  });
  assert.equal(changedScenes, 19); assert.equal(extras, 31);
  assert.equal(Object.keys(approved).length, 23);
  for (const [id, text] of Object.entries(approved)) assert.equal(questions.flatMap(q => q.options).find(o => o.id === id)?.text, text);
  assert.ok(questions[2].options.some(o => o.text.includes('（呆住）')));
  assert.ok(questions[2].options.some(o => o.text.includes('（乱跑）')));
  assert.ok(!JSON.stringify(questions).includes('国家队'));
});
test('all 18 result codes reuse valid original PNG files and partners', () => {
  assert.equal(Object.keys(results).length, 18);
  for (const h of 'HC') for (const s of 'SG') for (const v of 'VA') for (const f of 'FW') assert.ok(results[h+s+v+f]);
  for (const [code, r] of Object.entries(results)) {
    assert.equal(r.image, `image/fbti/${code}.png`);
    const bytes = readFileSync(new URL('../' + r.image, import.meta.url));
    assert.equal(bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
    for (const partner of r.partnerSuggestions) assert.ok(results[partner.code]);
  }
});
test('mapping is independent of option wording and order', () => {
  const a = answers(), baseline = score(a);
  const q = copy(questions);
  q[0].options[0].text = '仅修改显示文案，评分规则继续绑定原 ID';
  assert.equal(assess(q, a, mapping).level, baseline.level);
  const saved = packAnswers(questions, a);
  q[0].options.reverse(); q.reverse();
  const restored = unpackAnswers(q, saved);
  const reordered = assess(q, restored, mapping);
  assert.equal(reordered.code, baseline.code); assert.equal(reordered.level, baseline.level);
  assert.deepEqual(packAnswers(q, restored), saved);
});
test('new or removed option mappings cannot silently fall back to arbitrary scores', () => {
  const missing = copy(mapping); delete missing.rules[questions[0].options[0].id];
  assert.throws(() => validateQuestions(questions, missing), /缺少结果映射/);
  const stale = copy(mapping); stale.rules['deleted-id'] = stale.rules['p01-a'];
  assert.throws(() => validateQuestions(questions, stale), /未使用/);
  const duplicate = copy(questions); duplicate[0].options[1].id = duplicate[0].options[0].id;
  assert.throws(() => validateQuestions(duplicate, mapping));
});
test('IMFW requires repeated cues; a single confused choice does not label the player', () => {
  const a = answers(); a[2] = 2;
  assert.notEqual(score(a).code, 'IMFW');
  const novice = answers();
  for (const id of ['p03-extra1','p07-extra1','p09-extra1','p13-extra1','p23-extra1']) choose(novice, id);
  assert.notEqual(score(novice).code, 'IMFW');
  choose(novice, 'p30-extra1');
  const r = score(novice);
  assert.equal(r.code, 'IMFW'); assert.ok(r.level <= 2); assert.equal(r.low, 0);
  assert.equal(r.developing, 6); assert.ok(r.clues.some(c => c.developing));
  choose(novice, 'p23-a'); choose(novice, 'p30-a'); choose(novice, 'p08-c'); choose(novice, 'p19-c');
  assert.equal(score(novice).eggs.IMFW, 6); assert.notEqual(score(novice).code, 'IMFW');
});
test('HUCK needs three agreeing scenes; dinner and resting do not lower skill', () => {
  const a = answers(); a[8] = 2; a[28] = 2;
  assert.notEqual(score(a).code, 'HUCK');
  choose(a, 'p23-extra2'); assert.notEqual(score(a).code, 'HUCK');
  choose(a, 'p04-extra1');
  assert.equal(score(a).code, 'HUCK');
  const b = answers(); const before = score(b).level;
  b[7] = 2; b[18] = 2;
  assert.equal(score(b).level, before); assert.notEqual(score(b).code, 'IMFW');
});
test('emotion, ambition, desired skill, preferred role and willingness to dive do not count as ability', () => {
  const a = answers(), baseline = score(a).level;
  for (const i of [1,3,4,5,7,9,10,14,15,17,18,19,21,23,25,28]) {
    for (let j = 0; j < original[i].options.length; j++) {
      const b = [...a]; b[i] = j;
      assert.equal(score(b).level, baseline, `question ${i+1}, option ${j}`);
    }
  }
  const b = answers(); b[5] = 2;
  assert.equal(score(b).developing, 0);
  for (const id of ['p05-extra1','p05-extra2','p07-extra2','p10-extra2','p10-extra3','p16-extra1','p17-extra1','p17-extra2','p20-extra1','p24-extra1']) {
    assert.deepEqual(mapping.rules[id].ability, {});
    assert.equal(score(choose(answers(), id)).level, baseline);
    assert.equal(score(choose(answers(), id)).code, score(choose(answers(), id)).baseCode);
  }
});
test('explicit inability to Layout caps the whole range at L6 and backtracking removes that cap', () => {
  const a = choose(answers(), 'p06-extra1'), r = score(a);
  assert.equal(r.level, 6); assert.equal(r.low, 4); assert.equal(r.high, 6);
  assert.equal(r.developing, 0); assert.equal(r.code, r.baseCode);
  choose(a, 'p06-a'); assert.equal(score(a).high, 9);
  choose(a, 'p06-b'); assert.equal(score(a).high, 9);
  const invalid = copy(mapping); invalid.rules['p06-extra1'].rangeCeiling = 10;
  assert.throws(() => validateQuestions(questions, invalid), /范围上限/);
});
test('settling into formation and resetting to handler are not novice cues', () => {
  const a = answers();
  for (const id of ['p01-extra1','p12-extra2','p16-extra2']) choose(a, id);
  assert.equal(score(a).developing, 0); assert.ok(score(a).level >= 5);
  const pressured = choose(answers(), 'p09-extra2');
  assert.ok(score(pressured).evidence.find(e => e.axis === 'pressure').mean < score(answers()).evidence.find(e => e.axis === 'pressure').mean);
});
test('high-stall decisions affect level evidence, independent of H/C and F/W labels', () => {
  const a = answers(), b = answers(); b[8] = 2;
  assert.ok(score(b).evidence.find(e => e.axis === 'pressure').mean < score(a).evidence.find(e => e.axis === 'pressure').mean);
  const m = copy(mapping);
  for (const rule of Object.values(m.rules)) rule.scores = {C: 2, G: 2, A: 2, W: 2};
  assert.equal(assess(questions, a, m).level, score(a).level);
});
test('weak or absent evidence stays explicit, not a falsely measured zero', () => {
  const m = copy(mapping);
  for (const rule of Object.values(m.rules)) rule.ability = {};
  const r = assess(questions, answers(), m);
  assert.equal(r.insufficient, true); assert.equal(r.level, 3);
  assert.ok(r.evidence.every(e => e.mean === null && e.count === 0));
});
test('strong original choices may include L9 only at the top of the ±2 range', () => {
  const r = score(answers());
  assert.equal(r.level, 7); assert.equal(r.high, 9); assert.equal(r.low, 5);
});
test('backtracking recomputes from current answers with no stale accumulated scores', () => {
  const a = answers(), before = score(a); a[2] = 2; score(a); a[2] = 0;
  assert.deepEqual(score(a), before);
});
test('incomplete, corrupt and deleted stored answers are handled', () => {
  assert.throws(() => score(questions.map(() => null)));
  for (const a of [[], {}, null, answers().map(() => -1), answers().map(() => 99), answers().map(() => '0'), new Array(30)]) assert.equal(validAnswers(questions, a), false);
  const stored = packAnswers(questions, answers()); stored.p01 = 'deleted-option';
  assert.equal(unpackAnswers(questions, stored)[0], null);
  assert.ok(unpackAnswers(questions, []).every(a => a === null));
});
test('10,000 varied paths yield valid personalities and finite bounded ranges', () => {
  let seed = 5678;
  const rng = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  const eggs = {IMFW:0,HUCK:0};
  for (let i = 0; i < 10000; i++) {
    const a = questions.map(q => Math.floor(rng() * q.options.length)), r = score(a);
    if (r.code in eggs) eggs[r.code]++;
    assert.ok(results[r.code]); assert.ok(Number.isInteger(r.level) && r.level >= 0 && r.level <= 7);
    const cap = questions[5].options[a[5]].id === 'p06-extra1' ? 6 : 9;
    assert.equal(r.low, Math.max(0, r.level - 2)); assert.equal(r.high, Math.min(cap, r.level + 2));
    assert.ok(r.low <= r.level && r.level <= r.high);
    assert.ok(r.dimensions.every(d => d.pct >= 0 && d.pct <= 100));
  }
  assert.ok(eggs.IMFW > 0 && eggs.HUCK > 0);
  assert.ok(eggs.IMFW + eggs.HUCK < 500, JSON.stringify(eggs));
});

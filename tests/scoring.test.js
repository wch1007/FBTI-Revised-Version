import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assess, validateQuestions, validAnswers } from '../scoring.js';

const questions = JSON.parse(readFileSync(new URL('../questions.json', import.meta.url), 'utf8'));
const results = JSON.parse(readFileSync(new URL('../results.json', import.meta.url), 'utf8'));
const make = (skill = 0) => questions.map(q => q.kind === 'ability' ? skill : 0);

test('complete beginner-friendly content and 19 valid result types', () => {
  assert.equal(validateQuestions(questions), true);
  assert.equal(questions.filter(q => q.kind === 'personality').length, 30);
  assert.equal(questions.filter(q => q.kind === 'ability').length, 8);
  assert.equal(Object.keys(results).length, 19);
  for (const q of questions.filter(q => q.kind === 'personality')) assert.ok(q.options.some(o => o.egg === 'IMFW' || o.egg === 'CHILL'));
  assert.ok(questions[2].options.some(o => o.text.includes('（呆住）')));
  assert.ok(questions[2].options.some(o => o.text.includes('（乱跑）')));
  for (const h of 'HC') for (const s of 'SG') for (const v of 'VA') for (const f of 'FW') assert.ok(results[h+s+v+f]);
  for (const result of Object.values(results)) for (const partner of result.partnerSuggestions) assert.ok(results[partner.code]);
});
test('all confused answers yield IMFW and L0 with a clipped ±2 range', () => {
  const answers = questions.map(q => q.kind === 'ability' ? 0 : q.options.findIndex(o => o.egg === 'IMFW' || o.egg === 'CHILL'));
  const result = assess(questions, answers);
  assert.equal(result.code, 'IMFW'); assert.equal(result.level, 0);
  assert.equal(result.low, 0); assert.equal(result.high, 2);
  assert.ok(result.dimensions.every(d => d.unknown));
});
test('one confused answer does not force an egg or erase personality', () => {
  const answers = make(2); answers[2] = 2;
  assert.notEqual(assess(questions, answers).code, 'IMFW');
});
test('novice behaviour triggers IMFW at six and repeated long-throw jokes trigger HUCK', () => {
  const answers = make(2);
  for (const i of [0,1,2,3,4,6]) answers[i] = questions[i].options.findIndex(o => o.egg === 'IMFW');
  assert.equal(assess(questions, answers).code, 'IMFW');
  const huck = make(2);
  for (const i of [8,28]) huck[i] = questions[i].options.findIndex(o => o.egg === 'HUCK');
  assert.equal(assess(questions, huck).code, 'HUCK');
});
test('choosing safe non-diving, resting and sideline support does not lower ability', () => {
  const answers = make(3);
  for (const i of [5,16,18]) answers[i] = questions[i].options.findIndex(o => o.egg === 'CHILL');
  const result = assess(questions, answers);
  assert.equal(result.code, 'CHILL'); assert.equal(result.unfamiliar, 0);
  assert.equal(result.level, 6);
});
test('personality, risk appetite and aspirational skills do not award ability points', () => {
  const a = make(2), b = make(2);
  questions.forEach((q, i) => { if (q.kind === 'personality') b[i] = 1; });
  assert.equal(assess(questions, a).level, assess(questions, b).level);
  assert.equal(assess(questions, a).level, 4);
});
test('top evidence gives L9 and boundary range; high self-rating needs actual experience', () => {
  const answers = make(5), result = assess(questions, answers);
  assert.equal(result.level, 9); assert.equal(result.low, 7); assert.equal(result.high, 9);
  answers[questions.findIndex(q => q.axis === 'experience')] = 0;
  const novice = assess(questions, answers);
  assert.ok(novice.level <= 1); assert.equal(novice.experienceCapped, true); assert.equal(novice.inconsistent, true);
  answers[questions.findIndex(q => q.axis === 'experience')] = 4;
  assert.equal(assess(questions, answers).level, 8);
});
test('backtracking replaces an answer without accumulating obsolete scores', () => {
  const a = make(2), before = assess(questions, a);
  a[2] = 2; a[questions.findIndex(q => q.axis === 'throw')] = 5;
  assess(questions, a);
  a[2] = 0; a[questions.findIndex(q => q.axis === 'throw')] = 2;
  assert.deepEqual(assess(questions, a), before);
});
test('all-unanswered, corrupt and out-of-range saved answers are rejected', () => {
  const empty = questions.map(() => null);
  assert.equal(validAnswers(questions, empty), true);
  assert.equal(validAnswers(questions, empty, true), false);
  assert.throws(() => assess(questions, empty));
  for (const bad of [[], {}, null, make().map(() => -1), make().map(() => 99), make().map(() => '0')]) assert.equal(validAnswers(questions, bad), false);
});
test('10,000 varied answer paths stay finite, in bounds and resolve to an existing result', () => {
  let seed = 7654;
  const rng = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let n = 0; n < 10000; n++) {
    const answers = questions.map(q => Math.floor(rng() * q.options.length));
    const r = assess(questions, answers);
    assert.ok(results[r.code]); assert.ok(Number.isInteger(r.level));
    assert.ok(r.level >= 0 && r.level <= 9 && r.low <= r.level && r.high >= r.level);
    assert.ok(r.low >= 0 && r.high <= 9); assert.equal(r.low, Math.max(0, r.level - 2)); assert.equal(r.high, Math.min(9, r.level + 2));
    assert.ok(r.dimensions.every(d => d.pct >= 0 && d.pct <= 100));
  }
});

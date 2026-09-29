import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { preferenceDetail } from '../report.js';

test('letter cards use the same winner as the personality code, with both shares', () => {
  const base = { pair:'VA', left:'说出来', right:'做出来', pct:27, code:'A', unknown:false, tied:false };
  assert.deepEqual(preferenceDetail(base), {letter:'A',label:'做出来',share:73,other:'V',otherLabel:'说出来',otherShare:27,status:'你的倾向'});
  assert.equal(preferenceDetail({...base,pct:53,code:'V'}).share,53);
  const roundedTie = preferenceDetail({...base,pct:50,code:'A'});
  assert.equal(roundedTie.letter,'A'); // 50% after rounding must not flip the winner
  assert.equal(preferenceDetail({...base,pct:50,code:'V',tied:true}).status,'两边都有一点');
  assert.equal(preferenceDetail({...base,unknown:true}).share,null);
});

test('published page and imports have matching content revisions and no removed report sections', () => {
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:new URL('../',import.meta.url)});
  const read = f => readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
  const html = read('index.html');
  const revision = html.match(/app\.js\?v=([a-f0-9]{12})/)[1];
  assert.ok(html.includes(`styles.css?v=${revision}`));
  const app = read('app.js'), report = read('report.js');
  assert.ok(app.includes(`./scoring.js?v=${revision}`));
  assert.ok(app.includes(`./report.js?v=${revision}`));
  for (const source of [app,report]) assert.doesNotMatch(source,/你在这些细节里露了底|下一次上场，解锁一小步|NEXT LITTLE WIN|彩蛋是额外|百分比表示选项权重/);
});

"""Run the actual inline dashboard script with an inert DOM and report fixtures."""
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[3]

HARNESS = r"""
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(process.argv[1], 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const side = mean_ms => ({status:'success',mean_ms});
const wasm = mean_ms => ({...side(mean_ms),binary_sha256:'b'.repeat(64),kernel_calls:{sum:4}});
const comparison = (name = 'sum', extra = {}) => ({function:name,scope:'kernel',pandas:side(2),tsb:side(4),rust_wasm:wasm(1),...extra});
const legacyRow = {function:'join',tsb:{mean_ms:1},pandas:{mean_ms:2},ratio:0.5};
function report(comparisons, extra = {}) {
  const backend_summary = Object.fromEntries(['pandas','tsb','rust_wasm'].map(backend => {
    const counts = {success:0,failed:0,unsupported:0,not_selected:0};
    for (const row of comparisons) {
      const status = row[backend]?.status;
      counts[['success','unsupported','not_selected'].includes(status) ? status : 'failed']++;
    }
    return [backend,counts];
  }));
  return {schema_version:3,status:'complete',comparisons,benchmarks:[],outcomes:[],backend_summary,
    summary:{completed:comparisons.length,total:comparisons.length,failed:0},
    scope:{kind:'all',discovered_pairs:comparisons.length},provenance:{candidate_sha:'a'.repeat(40)},...extra};
}
async function render(data, failures = 0) {
  const elements = new Map();
  const created = [];
  class Element {
    constructor(tag = 'div') { this.tag=tag; this.style={}; this.hidden=true; this.value=''; this.children=[]; this.listeners={}; this._text=''; }
    set textContent(value) { this._text=String(value); this.children=[]; }
    get textContent() { return this._text + this.children.map(child=>child.textContent).join(''); }
    set innerHTML(value) { throw new Error('Untrusted HTML insertion: '+value); }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren(...children) { this.children=children; this._text=''; }
    addEventListener(name, callback) { this.listeners[name]=callback; }
  }
  const defaults = {'bench-search':'','bench-scope':'all','bench-status':'all','bench-sort':'tsb'};
  const document = {
    getElementById(id) { if (!elements.has(id)) { const element=new Element(); element.value=defaults[id]??''; elements.set(id,element); } return elements.get(id); },
    createElement(tag) { created.push(tag); return new Element(tag); },
  };
  let requests=0;
  await vm.runInNewContext(source, {document,fetch:async () => ({ok:++requests>failures,json:async () => data})});
  return {elements,created,requests,
    text:id=>elements.get(id)?.textContent??'',
    rows:()=>elements.get('bench-tbody').children.map(row=>row.children.map(cell=>cell.textContent)),
    change(name,value) { const element=elements.get('bench-'+name); element.value=value; element.listeners[name==='search'?'input':'change'](); },
  };
}
"""


class BenchmarkUITest(unittest.TestCase):
    def run_ui(self, checks):
        script = HARNESS + "\n(async () => {\n" + checks + "\n})().catch(error => { console.error(error); process.exitCode=1; });"
        result = subprocess.run(["node", "-e", script, str(ROOT / "playground" / "benchmarks.html")],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_disclosures_cover_incomplete_filtered_legacy_and_empty_results(self):
        self.run_ui(r"""
const base = {schema_version:2,benchmarks:[legacyRow],status:'incomplete',summary:{completed:1,total:3,failed:2},scope:{kind:'all',discovered_pairs:3},provenance:{candidate_sha:'a'.repeat(40)}};
const incomplete = await render(base);
assert.equal(incomplete.elements.get('measurement-status').hidden,false);
assert.match(incomplete.text('measurement-status'),/Incomplete measurement/);
assert.match(incomplete.text('measurement-status'),/1\/3 selected pairs completed; 3 pairs discovered; 2 failed/);
assert.match(incomplete.text('measurement-status'),/Measured SHA: a{40}/);
assert.match(incomplete.text('measurement-status'),/not proof of correctness, API parity/);
const filtered = await render({...base,status:'complete',summary:{completed:1,total:1,failed:0},scope:{kind:'filtered',discovered_pairs:842}});
assert.match(filtered.text('measurement-status'),/Filtered measurement — not the full/);
assert.match(filtered.text('measurement-status'),/842 pairs discovered/);
const legacy = await render({benchmarks:[legacyRow],timestamp:'2026-04-21'});
assert.match(legacy.text('measurement-status'),/Coverage\/provenance unknown/);
assert.match(legacy.text('measurement-status'),/Measured SHA: unknown/);
assert.match(legacy.text('measurement-status'),/Rust\/Wasm was not measured/);
assert.equal(legacy.rows()[0][4],'Not measured');
assert.equal(legacy.rows()[0][6],'Unavailable');
const inconsistent = await render({...base,status:'complete',summary:{completed:1,total:1,failed:0}});
assert.match(inconsistent.text('measurement-status'),/Coverage\/provenance unknown/);
const empty = await render({...base,benchmarks:[],summary:{completed:0,total:3,failed:3}});
assert.match(empty.text('measurement-status'),/0\/3 selected pairs completed/);
assert.equal(empty.elements.get('no-data').style.display,'block');
assert.equal(empty.elements.get('bench-controls'),undefined);
""")

    def test_three_backends_show_independent_ratios_and_runtime_scope(self):
        self.run_ui(r"""
const data = report([comparison()],{provenance:{candidate_sha:'a'.repeat(40),typescript_version:'1.4.2',python_libraries:{python:'3.12.14',pandas:'2.2.3',numpy:'2.1.3'}}});
const ui=await render(data);
assert.deepEqual(ui.rows()[0].slice(0,4),['sum','Direct kernel','2','4']);
assert.equal(ui.rows()[0][4],'1Verified · 1 kernel');
assert.deepEqual(ui.rows()[0].slice(5),['2×','0.5×']);
assert.match(ui.elements.get('bench-tbody').children[0].children[4].title,/b{64}/);
assert.match(ui.elements.get('bench-tbody').children[0].children[4].title,/Kernel calls: sum: 4/);
const many=await render(report([comparison('sum',{rust_wasm:{...wasm(1),kernel_calls:{sum:4,mean:4}}})]));
assert.equal(many.rows()[0][4],'1Verified · 2 kernels');
assert.match(many.elements.get('bench-tbody').children[0].children[4].title,/sum: 4, mean: 4/);
assert.match(ui.text('backend-summary'),/Rust\/Wasm \(Bun host\): 1 successful; 0 failed; 0 unsupported; 0 not selected/);
assert.match(ui.text('measurement-status'),/Python 3.12.14; pandas 2.2.3; NumPy 2.1.3/);
assert.match(ui.text('measurement-status'),/Bun 1.4.2 hosts TypeScript and Rust\/Wasm/);
assert.doesNotMatch(ui.rows().flat().join(' '),/fastest|winner|x faster/);
assert.match(html,/Neither label demonstrates that normal TypeScript API methods dispatch to Wasm/);
assert.match(html,/Module loading and warm-up are outside the timed kernel region/);
assert.match(html,/pandas\/NumPy\/stdlib/);
const matched=await render(report([comparison('sum',{output_verification:{status:'matched',reference:'pandas'}})]));
assert.equal(matched.rows()[0][1],'Direct kernelFixture matched');
assert.match(matched.elements.get('bench-tbody').children[0].children[1].title,/Measured fixture only; not general API parity/);
""")

    def test_all_failed_unsupported_and_unselected_rows_remain_visible(self):
        self.run_ui(r"""
const rows=[
  comparison('api_timeout',{scope:'api',tsb:{status:'timeout',reason:'exceeded 30s'},rust_wasm:{status:'unsupported',reason:'No registered kernel'}}),
  comparison('python_error',{pandas:{status:'error',reason:'missing package'}}),
  comparison('later',Object.fromEntries(['pandas','tsb','rust_wasm'].map(backend=>[backend,{status:'not_selected'}]))),
];
const ui=await render(report(rows,{status:'incomplete',summary:{completed:0,total:2,failed:2},scope:{kind:'filtered',discovered_pairs:3}}));
assert.equal(ui.rows().length,3);
const api=ui.rows().find(row=>row[0]==='api_timeout');
assert.equal(api[1],'Existing workload');
assert.match(api[3],/Timed outexceeded 30s/);
assert.match(api[4],/UnsupportedNo registered kernel/);
assert.deepEqual(api.slice(5),['Unavailable','Unavailable']);
const failed=ui.rows().find(row=>row[0]==='python_error');
assert.deepEqual(failed.slice(5),['Unavailable','Unavailable']);
assert.match(ui.text('backend-summary'),/1 unsupported; 1 not selected/);
ui.change('status','problems');
assert.deepEqual(ui.rows().map(row=>row[0]).sort(),['api_timeout','python_error']);
ui.change('status','selected');
assert.equal(ui.rows().length,2);
ui.change('status','all');
assert.equal(ui.rows().length,3);
const legacy=await render({schema_version:2,benchmarks:[],outcomes:[{function:'failed_legacy',tsb:{status:'error',reason:'bad output'},pandas:{status:'timeout'}}]});
assert.equal(legacy.rows().length,1);
assert.match(legacy.rows()[0][3],/Errorbad output/);
assert.equal(legacy.rows()[0][4],'Not measured');
""")

    def test_wasm_success_without_a_valid_receipt_is_unverified(self):
        self.run_ui(r"""
for (const receipt of [
  {}, {binary_sha256:'b'.repeat(63),kernel_calls:{sum:1}},
  {binary_sha256:'B'.repeat(64),kernel_calls:{sum:1}},
  {binary_sha256:'b'.repeat(64),kernel_calls:1},
  {binary_sha256:'b'.repeat(64),kernel_calls:[]},
  {binary_sha256:'b'.repeat(64),kernel_calls:{}},
  {binary_sha256:'b'.repeat(64),kernel_calls:{sum:0}},
  {binary_sha256:'b'.repeat(64),kernel_calls:{sum:-1}},
  {binary_sha256:'b'.repeat(64),kernel_calls:{sum:1.5}},
  {binary_sha256:'b'.repeat(64),kernel_calls:{sum:'1'}},
  {binary_sha256:'b'.repeat(64),kernel_calls:{sum:1,mean:0}},
]) {
  const ui=await render(report([comparison('sum',{rust_wasm:{...side(0.01),...receipt}})]));
  assert.match(ui.rows()[0][4],/^Unverified/);
  assert.equal(ui.rows()[0][6],'Unavailable');
  assert.match(ui.text('measurement-status'),/Incomplete measurement/);
  assert.match(ui.text('backend-summary'),/Unverified Wasm receipts are excluded/);
}
const explicit=await render(report([comparison('sum',{rust_wasm:{...wasm(1),status:'unverified',reason:'fallback detected'}})]));
assert.match(explicit.rows()[0][4],/Unverifiedfallback detected/);
assert.equal(explicit.rows()[0][6],'Unavailable');
""")

    def test_invalid_timings_never_become_zero_or_infinite_wins(self):
        self.run_ui(r"""
for (const mean of [0,-1,NaN,Infinity,-Infinity,'0.5',null,undefined]) {
  for (const backend of ['pandas','tsb','rust_wasm']) {
    const ui=await render(report([comparison('bad',{[backend]:{...(backend==='rust_wasm'?wasm(1):side(1)),mean_ms:mean}})]));
    const cells=ui.rows()[0];
    assert.match(cells[['pandas','tsb','rust_wasm'].indexOf(backend)+2],/Unresolvable timing/);
    assert.equal(cells[backend==='rust_wasm'?6:5],'Unavailable');
    assert.doesNotMatch(cells.join(' '),/NaN|Infinity/);
  }
}
for (const [tsb,pandas] of [[Number.MAX_VALUE,Number.MIN_VALUE],[Number.MIN_VALUE,Number.MAX_VALUE]]) {
  const ui=await render(report([comparison('extreme',{tsb:side(tsb),pandas:side(pandas)})]));
  assert.equal(ui.rows()[0][5],'Unavailable');
}
const tiny=await render({benchmarks:[{...legacyRow,tsb:{mean_ms:0.0002},ratio:Infinity}]});
assert.equal(tiny.rows()[0][5],'0.0001×'); // Derived from side timings, not a supplied ratio.
const conflicting=await render({benchmarks:[legacyRow],outcomes:[{function:'join',tsb:{status:'error',reason:'failed rerun'}}]});
assert.match(conflicting.rows()[0][3],/Errorfailed rerun/);
assert.equal(conflicting.rows()[0][5],'Unavailable');
""")

    def test_search_scope_and_worst_ratio_sort_do_not_drop_failures(self):
        self.run_ui(r"""
const ui=await render(report([
  comparison('fast',{tsb:side(1),rust_wasm:wasm(8)}),
  comparison('slow',{scope:'api',tsb:side(20),rust_wasm:{status:'unsupported'}}),
  comparison('failed',{tsb:{status:'error',reason:'eigen solver unavailable'}}),
]));
assert.deepEqual(ui.rows().map(row=>row[0]),['slow','fast','failed']);
ui.change('sort','rust_wasm');
assert.deepEqual(ui.rows().map(row=>row[0]),['fast','failed','slow']);
ui.change('scope','kernel');
assert.equal(ui.rows().length,2);
ui.change('search','EIGEN');
assert.deepEqual(ui.rows().map(row=>row[0]),['failed']);
assert.match(ui.text('visible-count'),/1 of 3 comparisons shown/);
ui.change('search','not present');
assert.equal(ui.rows().length,0);
assert.match(ui.text('visible-count'),/0 of 3 comparisons shown/);
ui.change('search',''); ui.change('scope','all'); ui.change('sort','name');
assert.deepEqual(ui.rows().map(row=>row[0]),['failed','fast','slow']);
""")

    def test_report_text_is_inert_including_names_reasons_and_receipts(self):
        self.run_ui(r"""
const payload='<img src=x onerror="throw 1">';
const ui=await render(report([comparison(payload,{tsb:{status:'error',reason:payload},rust_wasm:{...wasm(1),kernel_calls:{[payload]:1}}})],{timestamp:payload}));
assert.equal(ui.rows()[0][0],payload);
assert.match(ui.rows()[0][3],/Error<img/);
assert.ok(ui.elements.get('bench-tbody').children[0].children[4].title.includes(payload));
assert.equal(ui.rows()[0][4],'1Verified · 1 kernel');
assert.equal(ui.text('bench-timestamp'),'Last updated: '+payload);
assert.ok(!ui.created.includes('img'));
assert.doesNotMatch(source,/\.innerHTML\s*=/);
assert.doesNotMatch(html,/<th>Faster<\/th>/);
""")

    def test_fetch_fallback_malformed_reports_and_counts(self):
        self.run_ui(r"""
const fallback=await render(report([comparison()]),1);
assert.equal(fallback.requests,2);
assert.equal(fallback.rows().length,1);
const unavailable=await render({},2);
assert.equal(unavailable.elements.get('no-data').style.display,'block');
for (const data of [null,[],false,'report']) {
  const invalid=await render(data);
  assert.match(invalid.text('measurement-status'),/Invalid benchmark report/);
}
const unknown=await render(report([comparison('unknown',{tsb:{status:'mystery',mean_ms:0.01}})]));
assert.equal(unknown.rows()[0][3],'Unknown status');
assert.equal(unknown.rows()[0][5],'Unavailable');
for (const status of [null,[],true,1,{toString:null}]) {
  const malformed=await render(report([comparison('malformed',{tsb:{status,mean_ms:1}})],{timestamp:{toString:null},provenance:{python_libraries:{python:{toString:null}}}}));
  assert.equal(malformed.rows()[0][3],'Unknown status');
  assert.match(malformed.text('measurement-status'),/Python unknown/);
}
const mismatch=await render(report([comparison('wrong',{rust_wasm:{status:'incorrect',reason:'outputs differ',mean_ms:0.01}})]));
assert.match(mismatch.rows()[0][4],/Output mismatchoutputs differ/);
assert.equal(mismatch.rows()[0][6],'Unavailable');
const counts=await render(report([comparison()],{backend_summary:{rust_wasm:{success:99,failed:0,unsupported:0,not_selected:0}}}));
assert.match(counts.text('backend-summary'),/coverage counts unavailable/);
const missing=await render(report([comparison()],{comparisons:[]}));
assert.match(missing.text('measurement-status'),/Coverage\/provenance unknown/);
""")

    def test_pages_uses_the_existing_ci_pandas_versions(self):
        install = "pip install pandas==2.2.3 numpy==2.1.3"
        for name in ("pages.yml", "ci.yml"):
            self.assertIn(install, (ROOT / ".github" / "workflows" / name).read_text())


if __name__ == "__main__":
    unittest.main()

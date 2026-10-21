'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {loadV2Dom}=require('./helpers/load-v2-dom.cjs');
const model=require('../operations-dashboard-model.js');
const root=path.join(__dirname,'..');
function load(options={}) {
  const dom=new JSDOM(fs.readFileSync(path.join(root,'operations-dashboard.html'),'utf8'),{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/operations-dashboard.html'});
  const w=dom.window,d=w.document,errors=[];
  w.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}};
  w.addEventListener('error',e=>errors.push(e.error?.message||e.message));
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  if(options.now){const NativeDate=w.Date;w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[options.now]));}static now(){return new NativeDate(options.now).valueOf();}};}
  Object.defineProperty(w,'OBSERVED_DATA',{get(){throw new Error('External channel data must not be read');}});
  const scripts=['vendor/vue/vue.global.prod.js','vendor/element-plus/index.full.min.js','operations-dashboard-model.js',...(options.mock?['operations-dashboard-mock.js','operations-mock-view.js']:[]),'operations-events.js','operations-dashboard.js'];
  for(const file of scripts)w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  const change=(id,value)=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
  const range=(start,end)=>{change('ops-start',start);change('ops-end',end);d.getElementById('scope-form').requestSubmit();};
  return {dom,w,d,errors,change,range,text:id=>d.getElementById(id).textContent};
}
test('model uses exact source boundaries, complete totals and no invented daily or monthly allocation',()=>{
  assert.equal(model.sum('2026-09-08','2026-10-11'),7366);
  for(const [field,total] of [['product',7331],['xaas',35],['needsApproval',2001],['rejected',115],['activationFailed',360],['activated',6747]])assert.equal(model.sum('2026-09-08','2026-10-11',field),total);
  assert.equal(model.sum('2026-09-22','2026-09-27'),null);
  assert.equal(model.sum('2026-09-09','2026-09-21'),null);
  assert.equal(model.sum('2026-10-12','2026-10-18'),null);
  assert.equal(model.sum('2026-10-05','2026-10-11','count',{product:'aTrust'}),null);
  const rows=model.buckets('2026-09-08','2026-10-11');
  assert.deepEqual(rows.map(r=>r.count),[825,2498,1585,1317,1141]);
  assert.equal(rows[0].labelStart,'2026-09-07');assert.equal(rows[0].partial,true);
  assert.ok(model.buckets('2026-09-08','2026-10-11','day').every(r=>r.count===null));
  assert.ok(model.buckets('2026-09-08','2026-10-11','month').every(r=>r.count===null));
  assert.deepEqual(model.previous('2026-10-05','2026-10-11'),{start:'2026-09-28',end:'2026-10-04'});
});
test('overview adopts all real weeks and separates authorization categories from product lines',t=>{
  const {dom,w,d,text,errors}=load();t.after(()=>dom.window.close());
  assert.equal(w.OperationsDashboard.context().platform,7366);
  assert.equal(d.querySelector('#outcome-row .metric-value').textContent,'7,366条');
  assert.deepEqual(Array.from(d.querySelectorAll('[data-platform-point]'),el=>Number(el.dataset.platformPoint)),[825,2498,1585,1317,1141]);
  assert.equal(d.querySelectorAll('[data-platform-segment]').length,4);assert.equal(d.querySelector('#ops-trend rect'),null);
  assert.ok(d.querySelector('#ops-trend svg').getAttribute('aria-label').includes('折线图'));
  assert.equal(d.querySelector('[data-platform-point="825"]').getAttribute('fill'),'#fff');
  assert.equal(d.querySelector('[data-platform-segment="0:1"]').getAttribute('stroke-dasharray'),'5 4');
  assert.equal(d.querySelector('[data-estimated]'),null);
  assert.ok(text('ops-categories').includes('7,331'));assert.ok(text('ops-categories').includes('35'));
  assert.ok(text('ops-products').includes('产线分布明细尚未接入'));assert.ok(!text('ops-products').includes('产线待补充'));
  assert.equal(d.querySelector('#ops-observations, .observations'),null);
  assert.ok(text('overview-process').includes('95.0%'));assert.ok(text('overview-process').includes('5.0%'));
  assert.ok(!/企微|跨渠道|借测联动自动开通率|授权规则异常量/.test(text('ops-main')));
  assert.deepEqual(errors,[]);
});
test('selected range omits removed comparison and does not prorate partial weeks',t=>{
  const {dom,w,d,range,text,errors}=load();t.after(()=>dom.window.close());
  range('2026-10-05','2026-10-11');assert.equal(w.OperationsDashboard.context().platform,1141);
  assert.equal(d.querySelector('#ops-comparison, #comparison-caption'),null);
  assert.ok(!text('quality-metrics').includes('4,723'));assert.ok(!text('chain-metrics').includes('16.6'));
  assert.equal(d.querySelector('#overview-process [data-metric="auto"] .metric-value').textContent,'—');
  range('2026-09-10','2026-09-20');assert.equal(w.OperationsDashboard.context().platform,null);assert.equal(d.querySelectorAll('[data-platform-point]').length,1);assert.equal(d.querySelectorAll('[data-platform-segment]').length,0);
  range('2026-10-12','2026-10-10');assert.equal(d.getElementById('scope-error').hidden,false);assert.equal(w.OperationsDashboard.context().platform,null);
  range('2026-10-12','2026-10-18');assert.equal(d.querySelectorAll('[data-platform-point]').length,0);assert.ok(text('ops-trend').includes('暂无可计算'));
  assert.deepEqual(errors,[]);
});
test('trend metric and grain controls change observations and keep missing intervals blank',t=>{
  const {dom,d,change,text,errors}=load();t.after(()=>dom.window.close());
  change('trend-metric','activated');assert.equal(text('trend-heading'),'激活成功量趋势');
  assert.deepEqual(Array.from(d.querySelectorAll('[data-platform-point]'),el=>Number(el.dataset.platformPoint)),[729,2212,1460,1252,1094]);
  d.querySelector('[data-grain="day"]').click();assert.equal(d.querySelectorAll('[data-platform-point]').length,0);assert.ok(text('ops-trend').includes('日数据'));assert.ok(!text('ops-trend').includes('>0<'));
  d.querySelector('[data-grain="month"]').click();assert.equal(d.querySelectorAll('[data-platform-point]').length,0);
  d.querySelector('[data-grain="week"]').click();assert.equal(d.querySelectorAll('[data-platform-point]').length,5);
  assert.deepEqual(errors,[]);
});
test('line chart breaks across missing weeks and still plots a confirmed zero',t=>{
  const {dom,w,d,text,errors}=load();t.after(()=>dom.window.close());
  const original=w.OperationsModel.buckets;let missing=true;
  w.OperationsModel.buckets=(...args)=>original(...args).map((row,i)=>i===1?{...row,count:missing?null:0}:row);
  d.getElementById('refresh-ops').click();
  assert.deepEqual(Array.from(d.querySelectorAll('[data-platform-segment]'),el=>el.dataset.platformSegment),['2:3','3:4']);
  assert.equal(d.querySelectorAll('[data-platform-point]').length,4);assert.ok(text('ops-trend').includes('缺数据'));
  missing=false;d.getElementById('refresh-ops').click();
  assert.equal(d.querySelectorAll('[data-platform-segment]').length,4);assert.ok(d.querySelector('[data-platform-point="0"]'));
  assert.equal(d.querySelectorAll('[data-platform-point]').length,5);assert.deepEqual(errors,[]);
});
test('dashboard omits unsolicited dimension filters and retains date controls and real totals',t=>{
  const {dom,w,d,errors}=load();t.after(()=>dom.window.close());
  assert.equal(d.querySelector('#dimension-form,[id^="filter-"],#reset-dimensions,#dimension-scope'),null);
  assert.equal(d.querySelectorAll('[data-range]').length,4);assert.ok(d.getElementById('scope-form'));
  assert.equal(w.OperationsDashboard.context().platform,7366);assert.equal(d.querySelectorAll('[data-platform-point]').length,5);
  assert.deepEqual(errors,[]);
});
test('compact header omits duplicate navigation and removed historical archive',t=>{
  const {dom,w,d,range,text,errors}=load();t.after(()=>dom.window.close());
  assert.equal(d.querySelectorAll('.page-head button').length,0);
  assert.equal(d.querySelector('.page-head .eyebrow,.page-head p,#open-records,#snapshot-toggle,[data-source]'),null);
  assert.equal(d.querySelector('.page-head h1').firstChild.textContent.trim(),'运营看板');assert.equal(d.getElementById('source-note').hidden,true);
  assert.equal(d.querySelector('#historical-reference, #historical-reference-body'),null);
  assert.equal(d.querySelector('footer, #footer-scope'),null);
  assert.equal(w.OperationsDashboard.context().platform,7366);assert.equal(d.getElementById('ops-start').value,'2026-09-08');assert.equal(d.getElementById('ops-start').disabled,false);
  assert.ok(text('quality-metrics').includes('4,723'));assert.ok(!text('quality-metrics').includes('3,081'));
  assert.equal(d.querySelector('#snapshot-samples'),null);
  assert.equal(d.querySelector('.details-panel'),null);assert.equal(d.querySelector('[id^="detail-"]'),null);
  range('2026-10-05','2026-10-11');assert.equal(w.OperationsDashboard.context().platform,1141);
  assert.deepEqual(errors,[]);
});
test('entry telemetry is scoped and does not create unsupported pass, generation or duration ratios',t=>{
  const {dom,d,text,errors}=load();t.after(()=>dom.window.close());
  assert.ok(text('quality-metrics').includes('4,723'));assert.ok(text('ops-approvals').includes('2,001'));assert.ok(text('ops-approvals').includes('115'));
  assert.equal(d.querySelectorAll('#quality-metrics .metric').length,4);
  
  assert.equal(d.querySelector('#ops-journey, #ops-approval-nodes, #ops-submit-failures'),null);
  assert.equal(d.querySelector('#chain-metrics [data-metric="generation"] .metric-value').textContent,'—');
  assert.equal(d.querySelector('#ops-chain'),null);
  assert.equal(d.querySelector('#quality-metrics [data-metric="approvalPending"] .metric-value').textContent,'—');
  assert.ok(text('ops-duration').includes('16.6 小时'));assert.ok(text('ops-duration').includes('25.5 小时'));assert.ok(text('ops-duration').includes('不含 PRM'));
  const end=Array.from(d.querySelector('#ops-duration tbody tr').cells,c=>c.textContent);assert.deepEqual(end.slice(1),['—','—','—','—']);
  assert.deepEqual(errors,[]);
});
test('remaining plan sections show formulas and missing evidence without invented device or node rules',t=>{
  const {dom,d,text,errors}=load();t.after(()=>dom.window.close());
  assert.equal(d.querySelector('#ops-journey, #ops-approval-nodes, #ops-submit-failures'),null);
  assert.equal(d.querySelector('#data-readiness, #ops-readiness'),null);
  assert.deepEqual(errors,[]);
});
test('tabs work by keyboard and retain current real source evidence',async t=>{
  const {dom,w,d,errors}=load();t.after(()=>dom.window.close());
  const first=d.getElementById('tab-overview');first.focus();first.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',bubbles:true}));await w.Vue.nextTick();await w.Vue.nextTick();assert.equal(d.getElementById('panel-quality').hidden,false);
  assert.deepEqual(errors,[]);
});
test('event tab uses Element tables, scopes aggregates and leaves individual logs unfilled',async t=>{
  const {dom,w,d,range,text,errors}=load();t.after(()=>dom.window.close());
  d.getElementById('tab-overview').focus();d.getElementById('tab-overview').dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));
  await w.Vue.nextTick();await w.Vue.nextTick();
  assert.equal(d.getElementById('panel-events').hidden,false);
  assert.equal(d.activeElement.id,'tab-events');
  assert.ok(d.querySelector('#ops-event-summary.el-table'));assert.ok(d.querySelector('#ops-event-log.el-table'));
  const logHeaders=Array.from(d.querySelectorAll('#ops-event-log .el-table__header-wrapper th .cell'),el=>el.textContent);
  assert.deepEqual(logHeaders,['时间','事件','场景','申请单号','用户','产品线','入口','失败节点','失败原因']);
  const summaryHeaders=Array.from(d.querySelectorAll('#ops-event-summary .el-table__header-wrapper th .cell'),el=>el.textContent);
  assert.deepEqual(summaryHeaders,['事件名称','事件ID','产品授权','XaaS授权','解决方案型授权','合计','单位','说明']);
  assert.ok(!/旅程标识|执行结果/.test(text('ops-events')));
  assert.ok(text('ops-event-summary').includes('9,120'));assert.ok(text('ops-event-summary').includes('4,723'));
  assert.ok(text('ops-event-summary').includes('单位待核对'));assert.ok(text('event-summary-scope').includes('不含 PRM'));
  assert.ok(text('ops-event-log').includes('逐条事件日志待接入'));assert.equal(d.querySelectorAll('#ops-event-log .el-table__body tbody tr').length,0);
  assert.ok(!/CSSQ202610150100066|3,081|7,212|历史排查资料/.test(text('ops-main')));
  assert.equal(w.OperationsDashboard.context().platform,7366);
  range('2026-10-05','2026-10-11');await w.Vue.nextTick();await w.Vue.nextTick();
  assert.ok(text('ops-event-summary').includes('当前区间事件汇总待接入'));assert.ok(!text('ops-event-summary').includes('9,120'));
  assert.equal(w.OperationsDashboard.context().platform,1141);assert.equal(d.getElementById('panel-events').hidden,false);
  range('2026-09-08','2026-10-11');await w.Vue.nextTick();assert.ok(text('ops-event-summary').includes('9,120'));
  assert.deepEqual(errors,[]);
});
test('quick ranges use Shanghai calendar and cross year and leap day',t=>{
  for(const [now,days,start,end] of [['2026-10-14T17:00:00Z','7','2026-10-09','2026-10-15'],['2026-01-02T17:00:00Z','30','2025-12-05','2026-01-03'],['2024-02-29T17:00:00Z','7','2024-02-24','2024-03-01'],['2026-10-15T04:00:00Z','90','2026-07-18','2026-10-15']]){
    const {dom,w,d,range,errors}=load({now});t.after(()=>dom.window.close());
    assert.equal(d.getElementById('ops-source'),null);assert.equal(d.getElementById('ops-period'),null);
    d.querySelector(`[data-range="${days}"]`).click();assert.equal(d.getElementById('ops-start').value,start);assert.equal(d.getElementById('ops-end').value,end);assert.equal(w.OperationsDashboard.context().platform,null);
    range('2026-10-05','2026-10-11');assert.equal(w.OperationsDashboard.context().platform,1141);assert.equal(d.getElementById('ops-start').value,'2026-10-05');
    assert.deepEqual(errors,[]);
  }
});
test('records remain available from host navigation without a duplicate dashboard shortcut',t=>{
  const {dom,window:w,document:d,errors}=loadV2Dom();t.after(()=>dom.window.close());
  d.querySelector('#navBar [data-tab="operations"]').click();assert.equal(d.body.dataset.activeTab,'operations');
  assert.equal(d.querySelector('#content-operations iframe').getAttribute('src'),'operations-dashboard.html');
  d.querySelector('#navBar [data-tab="records"]').click();
  assert.equal(d.body.dataset.activeTab,'records');assert.equal(d.getElementById('content-operations').style.display,'none');
  d.querySelector('#navBar [data-tab="hardware"]').click();assert.equal(d.body.dataset.activeTab,'hardware');
  assert.deepEqual(errors,[]);
});

test('mock cohorts, event logs and date grains reconcile without using confirmed inputs',()=>{
  const mock=require('../operations-dashboard-mock.js'),s='2026-09-08',e='2026-10-11',c=mock.aggregate(s,e);
  assert.equal(mock.mock,true);assert.ok(c.stats.count>0);assert.notEqual(c.stats.count,model.sum(s,e));
  assert.equal(c.stats.count,c.stats.product+c.stats.xaas);
  assert.equal(c.stats.count,c.stats.rejected+c.approvalPending+c.passed);
  assert.equal(c.passed,c.generationPending+c.generationFailed+c.generated.length);
  assert.equal(c.generated.length,c.stats.activated+c.stats.activationFailed+c.activationPending);
  assert.equal(c.eventCount('提交成功'),c.stats.count);
  assert.equal(c.eventCount('点击提交'),c.stats.count+c.eventCount('提交校验失败')+c.eventCount('提交失败'));
  assert.equal(c.products.reduce((sum,r)=>sum+r[1],0),c.stats.count);
  for(const grain of ['day','week','month'])assert.equal(mock.buckets(s,e,grain).reduce((sum,r)=>sum+(r.count??0),0),c.stats.count);
  assert.equal(mock.summaryFor(s,e).reduce((sum,r)=>sum+r.count,0),c.events.length);
  assert.ok(c.events.every(r=>r.time.slice(0,10)>=s&&r.time.slice(0,10)<=e));
  assert.ok(c.events.filter(r=>r.name==='激活失败').every(r=>r.failureNode==='设备激活'&&r.reason));
  assert.ok(c.events.filter(r=>r.requestId).every(r=>r.requestId.startsWith('MOCK')));
  assert.ok(c.fill.p50<=c.fill.p95);assert.ok(c.endDuration.p50<=c.endDuration.p95);
  assert.deepEqual(mock.aggregate(s,e),c);
});

test('mock dashboard populates all tabs and dates, event pagination stays linked',async t=>{
  const {dom,w,d,range,text,errors}=load({mock:true,now:'2026-10-16T04:00:00Z'});t.after(()=>dom.window.close());
  const flush=async()=>{await w.Vue.nextTick();await w.Vue.nextTick();};await flush();
  assert.equal(d.getElementById('mock-badge').hidden,false);assert.ok(w.ConfirmedOperationsModel);
  assert.equal(d.getElementById('ops-start').value,'2026-09-17');assert.equal(d.getElementById('ops-end').value,'2026-10-16');
  assert.equal(d.querySelector('[data-range="30"]').getAttribute('aria-pressed'),'true');
  assert.ok(!text('outcome-row').includes('待补'));assert.ok(text('ops-products').includes('AF'));
  assert.equal(d.querySelectorAll('#quality-metrics .metric').length,4);
  assert.deepEqual([...d.querySelectorAll('#ops-duration tbody tr')].map(r=>r.cells[0].textContent),
    ['填单：开始填写 → 提交成功','审批（含免审，计 0）：提交成功 → 审批结束','授权生成：审批结束 → 自动授权成功','设备激活：自动授权成功 → 激活成功','全链路：开始填写 → 激活成功']);
  assert.equal(d.querySelector('#ops-journey, #ops-approval-nodes, #ops-submit-failures'),null);
  assert.ok(d.querySelectorAll('#ops-approvals .el-table__body tbody tr').length>0);
  assert.ok(d.querySelectorAll('#ops-failures .el-table__body tbody tr').length>0);
  assert.ok(!Array.from(d.querySelectorAll('.metric-value')).some(el=>el.textContent==='—'));
  d.querySelector('[data-grain="day"]').click();await flush();assert.equal(d.querySelectorAll('[data-platform-point]').length,30);
  d.querySelector('[data-grain="month"]').click();await flush();assert.equal(d.querySelectorAll('[data-platform-point]').length,2);
  d.querySelector('[data-range="7"]').click();await flush();assert.equal(d.getElementById('ops-start').value,'2026-10-10');
  const c=w.OperationsDashboard.context();assert.equal(c.platform,w.OperationsModel.sum('2026-10-10','2026-10-16'));
  d.getElementById('tab-events').click();await flush();
  const rows=()=>[...d.querySelectorAll('#ops-event-log .el-table__body tbody tr')];
  assert.equal(rows().length,20);const first=rows()[0].textContent;
  assert.ok(!/旅程标识|执行结果/.test(text('ops-events')));
  const summaryHeaders=Array.from(d.querySelectorAll('#ops-event-summary .el-table__header-wrapper th .cell'),el=>el.textContent);
  assert.deepEqual(summaryHeaders,['事件名称','事件ID','产品授权','XaaS授权','解决方案型授权','合计','单位','说明']);
  const summaryText=text('ops-event-summary');
  assert.ok(summaryText.includes('entry_source_view')&&summaryText.includes('platform_apply_created'));
  d.querySelector('#ops-events .el-pagination .btn-next').click();await flush();assert.notEqual(rows()[0].textContent,first);
  range('2026-10-12','2026-10-12');await flush();assert.ok(rows().every(row=>row.textContent.includes('2026-10-12')));
  assert.equal(d.querySelector('#ops-events .el-pager .is-active').textContent.trim(),'1');
  d.getElementById('tab-overview').click();await flush();assert.equal(w.OperationsDashboard.context().platform,w.OperationsModel.sum('2026-10-12','2026-10-12'));
  assert.equal(d.querySelector('#ops-observations, footer, #data-readiness, #ops-comparison'),null);
  assert.deepEqual(errors,[]);
});

test('only business type is exposed as a global filter until dimensions are instrumented',async t=>{
  const {dom,w,d,text,errors}=load({mock:true,now:'2026-10-16T04:00:00Z'});t.after(()=>dom.window.close());
  const flush=async()=>{await w.Vue.nextTick();await w.Vue.nextTick();};await flush();
  assert.equal(d.querySelectorAll('#dimension-bar select').length,1);
  assert.equal(d.querySelector('#dimension-bar select[data-quality-filter="line"],#dimension-bar select[data-quality-filter="authScene"],#dimension-bar select[data-quality-filter="entry"]'),null);
  const select=()=>d.querySelector('#dimension-bar select[data-quality-filter="scene"]');
  assert.deepEqual([...select().options].map(o=>o.value),['all','XaaS授权','产品授权','解决方案型授权']);
  const before=text('quality-metrics');
  select().value='XaaS授权';select().dispatchEvent(new w.Event('change',{bubbles:true}));await flush();
  assert.notEqual(text('quality-metrics'),before);
  d.querySelector('[data-quality-reset]').click();await flush();
  assert.equal(select().value,'all');assert.equal(text('quality-metrics'),before);
  assert.deepEqual(errors,[]);
});

test('business type filter scopes overview, flow and event tabs',async t=>{
  const {dom,w,d,text,errors}=load({mock:true,now:'2026-10-16T04:00:00Z'});t.after(()=>dom.window.close());
  const flush=async()=>{await w.Vue.nextTick();await w.Vue.nextTick();};await flush();
  const before={platform:w.OperationsDashboard.context().platform,outcome:text('outcome-row'),chain:text('chain-metrics')};
  const select=d.querySelector('#dimension-bar select[data-quality-filter="scene"]');
  assert.ok(select);
  select.value='XaaS授权';select.dispatchEvent(new w.Event('change',{bubbles:true}));await flush();
  const c=w.OperationsDashboard.context();
  assert.equal(c.platform,w.OperationsModel.sum(c.start,c.end,'count',{scene:'XaaS授权',authScene:'all',line:'all',entry:'all'}));
  assert.notEqual(c.platform,before.platform);
  assert.notEqual(text('outcome-row'),before.outcome);
  assert.notEqual(text('chain-metrics'),before.chain);
  d.getElementById('tab-events').click();await flush();
  const rows=[...d.querySelectorAll('#ops-event-log .el-table__body tbody tr')];
  assert.ok(rows.length>0);
  assert.ok(rows.every(row=>row.cells[2].textContent.trim()==='XaaS授权'));
  d.querySelector('[data-quality-reset]').click();await flush();
  assert.equal(w.OperationsDashboard.context().platform,before.platform);
  assert.equal(text('outcome-row'),before.outcome);
  assert.deepEqual(errors,[]);
});

test('application scenario distribution is displayed and tabs are merged',async t=>{
  const {dom,w,d,errors}=load({mock:true,now:'2026-10-16T04:00:00Z'});t.after(()=>dom.window.close());
  const flush=async()=>{await w.Vue.nextTick();await w.Vue.nextTick();};await flush();
  assert.deepEqual([...d.querySelectorAll('#ops-tabs [role="tab"]')].map(tab=>tab.textContent.trim()),['运营总览','申请与授权链路','埋点事件']);
  assert.equal(d.querySelector('#panel-chain'),null);
  assert.ok(d.getElementById('chain-metrics')&&d.getElementById('ops-duration'));
  assert.equal(d.querySelectorAll('#ops-authscenes .bar-item').length,6);
  assert.deepEqual(errors,[]);
});

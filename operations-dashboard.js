/* Local dashboard. Confirmed data and explicitly labeled mock data stay separate. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const n = value => value == null ? "—" : new Intl.NumberFormat("zh-CN").format(value);
  const pct = (a, b) => a == null || !b ? null : `${(a / b * 100).toFixed(1)}%`;
  const short = date => date.slice(5).replace("-", ".");
  const model=window.OperationsModel;
  const state = {source:"confirmed", start:"2026-09-08", end:"2026-10-11", view:"overview",grain:"week",trendMetric:"count",filters:{}};
  if(model.mock){state.source="mock";state.start=model.defaultStart;state.end=model.end;$("ops-start").value=state.start;$("ops-end").value=state.end;$("mock-badge").hidden=false;}
  let selectedRange="custom";
  const localDate=date=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
  function markRange(range){selectedRange=range;document.querySelectorAll("[data-range]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.range===range)));}
  const blocks=model.weeks;
  const trendLabels={count:"平台申请量",activated:"激活成功量",activationFailed:"激活失败量",needsApproval:"需审批量",rejected:"审批拒绝量"};
  const validation = [
    ["硬件信息文件校验失败",1162],["业务补充信息校验失败",382],["请选择客户信息",362],
    ["授权模块配置校验失败",348],["模块与数量与当前授权一致，请修改后再提交，或勾选延期",316],
    ["请选择办事处",112],["请选择区域",74],["请输入接收邮箱",68],["客户端参数错误",54],
    ["调整当前测试授权时，请至少选择一项申请内容",42],["正在查询许可证平台设备事实，请稍候",39]
  ];
  const approvalReasons = [
    ["重复",2],["有必要内部评审",1],["不支持延期测试",1],
    ["需要进一步明确背景并对齐测试方案，测试环境就绪后可申请快速开通",1],
    ["已延期申请过",1],["saas xdr 有固定成本开销，不支持长期测试",1]
  ];
  const definitions = {
    platform:{name:"平台申请量",meaning:"统计区间内的平台申请单数",formula:"同一区间无重叠的原始申请汇总之和",source:"业务已确认的区间汇总",note:"不能把设备数、授权条目数或埋点次数与申请单数混用。只提供汇总时，不推算未提供区间的真实申请量。"},
    completion:{name:"填单完成率",meaning:"开始填写的旅程中最终提交成功的比例",formula:"同一批填单旅程中已成功提交旅程数 ÷ 开始填单旅程数",source:"旅程标识、开始填单与提交成功事件",note:"一个旅程只计一次；多次点击、重试不增加成功旅程数。不能使用提交成功单数除以人数，也不能把超过 100% 的结果直接截为 100%。"},
    validation:{name:"提交校验失败率",meaning:"点击提交后被校验阻断的事件占比",formula:"提交校验失败次数 ÷ 点击提交次数",source:"同区间 submit_validation_fail 与 submit_click 事件",note:"按事件次数统计，重复提交可能重复计数；不代表有同等比例的用户或申请失败。"},
    approval:{name:"审批通过率",meaning:"审批申请中获得通过的比例",formula:"沿用方案：审批通过申请数 ÷ 进入审批申请数；同时单列已结束审批结果",source:"按申请关联的进入审批记录与明确通过/驳回终态",note:"审批完成不等于通过。若改用已结束审批申请数作分母，需要另行确认；未完成单不自动计为驳回。截图中的次数尚未按申请匹配，因此不直接计算通过率。"},
    auto:{name:"自动授权成功率（业务口径）",meaning:"按已通过申请中的激活失败占比折算的业务成功率",formula:"1－激活失败量 ÷ 审批通过量（含免审批）",source:"已确认业务周表及同周期通过量 7251",note:"当前全区间为 1－360/7251＝95.0%。这是业务约定口径，不等于自动授权生成成功事件数除以应执行数；其他筛选区间缺少已确认分母时留空。"},
    autoExpected:{name:"应自动授权量",meaning:"按规则应自动完成授权（含所需客户创建及授权开通）的申请数",formula:"同区间标记为应自动授权的申请数，按申请去重",source:"auto_auth_expected 事件及申请编号",note:"不等于自动授权成功量；失败、处理中分别观察，不与成功量相加作为分母。"},
    end:{name:"端到端授权耗时",meaning:"从申请成功提交到激活成功的等待时间",formula:"按申请关联（激活成功时间－提交成功时间），分别统计 P50、P95、均值及样本量",source:"submit_success、激活成功（auth_completed）及申请编号",note:"不从表单开始编辑计时。审批与授权环节样本可能不同，不能直接用各自中位数相加。"},
    fill:{name:"表单填写时长",meaning:"一线填写申请所花时间",formula:"同一旅程的提交成功时间－开始填写时间",source:"form_start、submit_success 及同旅程标识",note:"需明确闲置时间、跨天和重复填写处理方式；当前未提供可关联明细。"},
    approvalDuration:{name:"审批耗时",meaning:"申请进入审批到审批结束的等待时间",formula:"按申请关联（审批完成时间－进入审批时间），分别统计 P50、P95、均值及样本量",source:"审批进入、明确结果及相应时间戳",note:"09.08—10.11 入口样本平均 25.5 小时、62 样本，不含 PRM。另存的 09.16—10.15 旧快照主值 1.9 小时统计类型未标明，不当作 P50；两个区间不混算。"},
    activation:{name:"激活失败率（业务口径）",meaning:"已通过申请中的激活失败占比",formula:"激活失败量 ÷ 审批通过量（含免审批）",source:"已确认业务周表；全区间失败 360、通过 7251",note:"全区间为 5.0%；截图失败事件不能替代业务失败量，不用激活成功与失败直接相加作为分母。"},
    generation:{name:"自动授权成功率（应执行口径）",meaning:"应自动执行的同批申请中，自动完成所需客户创建及授权开通的比例",formula:"同批自动完成授权申请数 ÷ 应自动授权申请数",source:"按申请关联的应执行、所需节点结果与最终授权状态",note:"与业务折算成功率分别展示。现有入口自动执行埋点为应执行 20、成功 20、失败 11，计数不闭合且节点归属待核对；不直接计算 100%，也不能当作独立生成节点的完整统计。"},
    activated:{name:"激活成功量",meaning:"业务周表中已完成设备激活的数量",formula:"同区间“授权成功”数量之和",source:"最新业务周表；业务已确认授权成功指激活成功",note:"不等于申请量，不将审批拒绝或其他未完成状态全部归为激活失败。"},
    needsApproval:{name:"需审批量",meaning:"需要进入人工审批的申请量",formula:"同区间“需要审核”数量之和",source:"最新业务周表",note:"需审批不代表已经审批完成或通过。"},
    rejected:{name:"审批拒绝量",meaning:"审批被拒绝的申请数量",formula:"同区间“审核失败”数量之和",source:"最新业务周表；审核失败指审批拒绝",note:"审批拒绝与授权生成失败、设备激活失败分别统计。"},
    blocked:{name:"提交受阻事件数",meaning:"点击提交后被前端校验或后端接口阻断的事件次数",formula:"提交校验失败次数 ＋ 后端提交失败次数",source:"submit_validation_fail、submit_fail 事件",note:"按事件次数统计，重复提交可能重复计数；不等于失败申请数，也不等于用户失败比例。"},
    approvalPending:{name:"审批中申请量",meaning:"已进入审批、尚未给出结果的申请数",formula:"同区间审批状态为审批中的申请数",source:"审批链路日志",note:"审批中不等于驳回，需与已结束审批分开观察。"},
    activationFailed:{name:"设备激活失败量",meaning:"设备激活失败的申请数量",formula:"同区间激活失败申请数",source:"设备激活结果日志",note:"与审批拒绝、授权生成失败分开统计，不把失败事件数直接当作失败申请数。"},
    activationDuration:{name:"创单至激活平均耗时（样本）",meaning:"从平台创单到设备激活成功的样本平均等待时间",formula:"平均（激活成功时间－创单时间）",source:"09.08—10.11 平台入口埋点，不含 PRM；66 样本",note:"平均 16.6 小时。起点不同于方案“提交成功→激活成功”，不可直接替代方案端到端指标，也不能外推全部业务周表申请。"},
  };
  if(model.mock){
    Object.values(definitions).forEach(d=>{d.source="独立模拟数据";d.note="仅用于演示页面效果，不代表生产运营结果。";});
    definitions.activationDuration.name="开始填写至激活平均耗时";
    definitions.activationDuration.formula="平均（激活成功时间－开始填写时间）";
    definitions.auto.formula="1－激活失败量 ÷ 通过量（含免审批）";
  }
  function platformFor(start,end) {
    return model.sum(start,end);
  }
  function context() {
    if(model.mock)return {...model.aggregate(state.start,state.end,window.OperationsMockView?.getFilters?.()||{}),snapshot:false,filtered:false,telemetry:true,mock:true};
    const snapshot=state.source==="snapshot",filtered=Object.values(state.filters).some(Boolean),stats={};
    for(const field of ["count","product","xaas","needsApproval","rejected","activationFailed","activated"])stats[field]=snapshot?null:model.sum(state.start,state.end,field,state.filters);
    return {snapshot,filtered,platform:stats.count,stats,telemetry:!snapshot&&model.hasTelemetry(state.start,state.end,state.filters),passed:!snapshot&&!filtered&&state.start==="2026-09-08"&&state.end==="2026-10-11"?7251:null};
  }
  function metric(key,value,foot,{label,unit="",primary=false,caption=""}={}) {
    return `<article class="metric ${primary?"primary":""}" data-metric="${key}"><span class="metric-label">${esc(label??definitions[key].name)}</span><div class="metric-value">${esc(value??"—")}${unit?`<small>${esc(unit)}</small>`:""}</div><p class="metric-foot">${esc(foot)}</p>${caption?`<div class="metric-caption">${esc(caption)}</div>`:""}</article>`;
  }
  function empty(title,body){return `<div class="empty"><strong>${esc(title)}</strong><p>${esc(body)}</p></div>`;}
  function table(headers,rows,cls="") {return `<div class="table-wrap"><table class="small-table ${cls}"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v??"—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}
  function bars(rows) {const max=Math.max(...rows.map(r=>r[1]),1);return `<div class="bar-list">${rows.map(([label,value])=>`<div class="bar-item" data-bar-label="${esc(label)}" title="${esc(label)}"><span title="${esc(label)}">${esc(label)}</span><div class="track"><i style="width:${value/max*100}%"></i></div><b>${n(value)}</b></div>`).join("")}</div>`;}
  function trendRows(c) {
    if(c.snapshot)return [];
    const filters=model.mock?(window.OperationsMockView?.getFilters?.()||{}):state.filters;
    return model.buckets(state.start,state.end,state.grain,state.trendMetric,filters);
  }
  function niceTickStep(value) {
    const mag=Math.pow(10,Math.floor(Math.log10(Math.max(1,value)))),n=value/mag;
    const multiple=n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10;
    return multiple*mag;
  }
  function renderTrend(c) {
    const rows=trendRows(c),available=rows.filter(r=>r.count!=null),grainLabel={day:"日",week:"周",month:"月"}[state.grain],label=trendLabels[state.trendMetric];
    $("trend-heading").textContent=`${label}趋势`;
    $("trend-caption").textContent=`按${grainLabel}观察；周按周一至周日，月按自然月`;
    if(model.mock&&!available.length){$("ops-trend").innerHTML=empty("所选区间暂无模拟数据",`模拟数据范围：${model.start} — ${model.end}`);$("trend-note").textContent="";return;}
    if(!available.length){$("ops-trend").innerHTML=empty(c.snapshot?"快照没有趋势时间序列":`当前筛选暂无可计算的${grainLabel}数据`,c.filtered?"已有周汇总没有这些维度，不能将总体数值当作筛选结果。":state.grain==="week"?"所选日期需覆盖完整原始周汇总；缺少的区间不补零。":"现有数据为周汇总，不能拆为真实日数据；跨月周也不能按天数分摊。")+(rows.length?`<details><summary class="text-button">查看${grainLabel}区间与数据状态</summary>${table(["区间",label,"数据状态"],rows.map(r=>[`${short(r.start)}—${short(r.end)}`,null,"待补对应粒度与维度数据"]))}</details>`:"");$("trend-note").textContent="无数据使用空值，不估算、不补画为零。";return;}
    const peak=Math.max(1,...available.map(r=>r.count)),tickStep=niceTickStep(Math.max(1,peak*1.1)/4),tickCount=Math.max(1,Math.ceil(peak*1.1/tickStep)),max=tickStep*tickCount;
    const W=Math.max(660,rows.length*108+66),H=240,left=48,right=22,top=23,bottom=48,iw=W-left-right,ih=H-top-bottom,x=i=>left+(i+.5)*iw/rows.length,y=v=>top+ih*(1-v/max);
    let svg=`<div class="chart-scroll" tabindex="0" role="region" aria-label="可横向滚动的趋势图"><svg class="chart-svg" style="min-width:${W}px" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}${grainLabel}折线图"><title>${label}：${model.mock?"模拟数据":"真实汇总"}，缺数据处断开；空心点表示非完整周期</title>`;
    for(let i=0;i<=tickCount;i++){const yy=top+ih*i/tickCount;svg+=`<line x1="${left}" y1="${yy}" x2="${W-right}" y2="${yy}" stroke="#e8edf4"/><text class="svg-label" x="${left-9}" y="${yy+4}" text-anchor="end">${n(tickStep*(tickCount-i))}</text>`;}
    rows.forEach((r,i)=>{
      const prior=rows[i-1];
      if(r.count!=null&&prior?.count!=null)svg+=`<line data-platform-segment="${i-1}:${i}" x1="${x(i-1)}" y1="${y(prior.count)}" x2="${x(i)}" y2="${y(r.count)}" stroke="#0050cb" stroke-width="2.5" stroke-linecap="round"${r.partial||prior.partial?' stroke-dasharray="5 4"':""}/>`;
    });
    rows.forEach((r,i)=>{
      if(r.count!=null){const description=`${short(r.start)}—${short(r.end)}：${n(r.count)} 条${r.partial?"（非完整周期）":""}`;svg+=`<circle class="trend-point" data-platform-point="${r.count}" data-partial="${r.partial}" cx="${x(i)}" cy="${y(r.count)}" r="4.5" fill="${r.partial?"#fff":"#0050cb"}" stroke="#0050cb" stroke-width="2" tabindex="0" aria-label="${esc(description)}"><title>${esc(description)}</title></circle><text class="svg-value" x="${x(i)}" y="${y(r.count)-12}" text-anchor="middle">${n(r.count)}</text>`;}
      else svg+=`<text class="svg-label" x="${x(i)}" y="${top+ih-10}" text-anchor="middle">缺数据</text>`;
      svg+=`<text class="svg-label" x="${x(i)}" y="${H-20}" text-anchor="middle">${short(r.labelStart)}—${short(r.labelEnd)}</text>`;
    });
    $("ops-trend").innerHTML=svg+'</svg></div>'+`<details><summary class="text-button">查看${grainLabel}数据及口径</summary>${table(["实际统计区间",label,"口径"],rows.map(r=>[`${short(r.start)}—${short(r.end)}`,n(r.count),r.count==null?"数据待补充":r.partial?"真实汇总；首尾非完整自然周期":"业务真实汇总"]))}</details>`;
    $("trend-note").textContent="采用真实周汇总。空心点和虚线表示涉及非完整周期；首周 09.07—09.13 实际仅含 09.08 上线后数据，不直接与完整周比较。缺数据处断开、不补零；日/月明细未提供时留空。";
    if(model.mock){$("trend-note").textContent="模拟数据，支持按日、周、月查看；空心点与虚线表示非完整周期。";$("ops-trend").querySelectorAll("tbody tr").forEach(row=>{row.cells[2].textContent=row.cells[1].textContent==="—"?"超出模拟区间":"模拟数据";});}
  }
  function productRows() {
    const c=context();
    return c.platform==null?null:[["产品授权",c.stats.product],["XaaS 授权",c.stats.xaas]];
  }
  function renderProducts(c) {
    const rows=productRows();
    $("ops-categories").innerHTML=rows?`<div class="product-summary"><strong>${n(c.platform)}</strong>条 · 当前区间</div>${rows.map(([label,count])=>`<div class="product-row"><span>${label}</span><b>${n(count)}<small>${pct(count,c.platform)}</small></b><div class="track"><i style="width:${count/c.platform*100}%"></i></div></div>`).join("")}`:empty("类别分布暂无可用数据","当前来源或筛选范围没有同口径类别汇总。");
    $("ops-products").innerHTML=empty("产线分布明细尚未接入","平台申请本身具有产品线；现有业务周表仅提供授权类别，不能据此推算产线或大云／大安全分布。");
    $("ops-authscenes").innerHTML=empty("申请场景分布待接入","现有业务周表未提供申请场景维度。");
    if(model.mock){$("ops-products").innerHTML=bars(c.products);$("ops-authscenes").innerHTML=bars(c.authScenes);}
  }
  function renderOverview(c) {
    const t=model.telemetry;
    $("outcome-row").innerHTML=metric("platform",n(c.platform),c.snapshot?"原页面建单 97，与提交成功 3,359 不一致":c.platform==null?"当前范围或维度的真实汇总待补充":"已确认真实周表 · 不以事件次数替代申请量",{primary:true,unit:c.platform==null?"":"条"})+metric("completion",null,c.snapshot?"3,359 单 / 926 人，统计对象不一致":"待补同旅程开始与成功提交事件")+metric("end",null,"待补提交成功至激活成功的关联时间");
    $("overview-process").innerHTML=metric("validation",c.snapshot?pct(3081,7212):c.telemetry?pct(t.validationFailed,t.submitClicks):null,c.snapshot?"失败 3,081 次 / 点击提交 7,212 次":c.telemetry?"4,723 / 9,120 次 · 平台入口样本，不含 PRM":"待补同范围提交与校验失败事件")+metric("approval",null,c.snapshot?"通过 64 次、进入 75 次；待关联":"需同批进入审批申请及明确终态")+metric("auto",c.passed?pct(c.passed-c.stats.activationFailed,c.passed):null,c.passed?"1－360 / 7,251 · 通过量包含免审批":"缺少同范围已确认通过量，留空")+metric("activation",c.passed?pct(c.stats.activationFailed,c.passed):null,c.passed?"激活失败 360 / 通过 7,251":"缺少同范围业务分母，留空");
    renderTrend(c);renderProducts(c);
  }
  function renderQuality(c) {
    const t=model.telemetry;
    $("quality-metrics").innerHTML=metric("fill",null,"待补旅程关联及填写时间")+metric("blocked",c.telemetry?n(t.validationFailed):null,c.telemetry?"前端校验失败次数；后端提交失败待接入":"待补提交事件")+metric("rejected",n(c.stats.rejected),"当前业务周表的审批驳回量")+metric("approvalPending",null,"待补审批终态数据");
    $("validation-caption").textContent=c.snapshot?"生产截图可见前 11 项，非完整清单；按事件次数统计":"前端校验失败与后端提交失败，按事件次数统计";
    $("ops-validation").innerHTML=c.snapshot?bars(validation.slice(0,7))+`<details class="footnote"><summary class="text-button">查看截图中全部可见原因</summary>${table(["原因","次数"],validation)}</details><p class="footnote">可见原因合计 2,959 次；总失败 3,081 次，其余原因截图未完整展示。后端提交失败未单独提供。</p>`:empty("提交受阻明细待补充","需要前端失败字段/原因，以及后端提交接口返回码、错误原因、时间与旅程或申请标识；两者分开统计。",true);
    $("ops-approvals").innerHTML=c.snapshot?`<div class="status-line"><span class="tag green">passed：64 次</span><span class="tag neutral">其他结果：7 次</span></div>${table(["其他结果原因（是否均为驳回待确认）","次数"],approvalReasons)}<div class="callout"><strong>不沿用原页面的“通过率 94.7%”</strong><p>71 / 75 只表示截图中的完成事件与进入事件之比。64 次 passed 是否属于同批申请、应采用进入审批还是已结束审批作分母，仍需核对。</p></div>`:table(["数据范围","指标","数量"],[["当前业务周表","需审批申请",n(c.stats.needsApproval)],["当前业务周表","审批拒绝申请",n(c.stats.rejected)],["当前业务周表","已通过（含免审批）",n(c.passed)],["入口埋点样本，不含 PRM","进入审批事件",c.telemetry?t.approvalEntered:null],["入口埋点样本，不含 PRM","passed 事件",c.telemetry?t.approvalPassed:null]])+'<p class="footnote">业务通过量包含免审批，不用于计算人工审批通过率；入口埋点的其余结果与驳回原因尚未提供，不推断为拒绝。</p>';
  }
  function renderChain(c) {
    const t=model.telemetry;
    $("chain-metrics").innerHTML=metric("autoExpected",null,c.snapshot?"截图应自动授权 22 次；申请去重待确认":"需同批应自动授权申请及最终状态")+metric("activated",n(c.stats.activated),"当前业务周表的激活成功量",{unit:c.stats.activated==null?"":"条"})+metric("activationFailed",n(c.stats.activationFailed),"当前业务周表的激活失败量",{unit:c.stats.activationFailed==null?"":"条"})+metric("generation",null,c.snapshot?"应自动 22、成功事件 22、失败 13；终态待核对":c.telemetry?"入口样本应执行 20、成功 20、失败 11；不闭合":"待补同批应执行及最终生成结果");
    $("ops-duration").innerHTML=c.snapshot?table(["链路","P50","P95","均值","样本"],[["端到端授权（原截图口径）","待确认","—","14.5 小时",73],["审批","待确认","—","24.0 小时",70],["自动授权","待确认","—","3 秒",22]],"duration-table")+'<div class="callout"><strong>截图主值的统计类型未标明</strong><p>原展示：端到端 23.5 分钟、审批 1.9 小时、自动授权 2 秒。暂不当作 P50；端到端原标“创单→完成”，需核对是否等于方案中的“提交成功→完成”。</p></div><p class="footnote">授权完成事件 74、端到端有效样本 73；审批完成 71、耗时样本 70。样本排除条件待确认。</p>':table(["链路 / 起止点","P50","P95","均值","样本量"],[["端到端授权：提交成功→激活成功",null,null,null,null],["创单→设备激活（入口样本，不含 PRM）",null,null,c.telemetry?"16.6 小时":null,c.telemetry?66:null],["进入审批→审批结束（入口样本，不含 PRM）",null,null,c.telemetry?"25.5 小时":null,c.telemetry?62:null],["自动授权（入口样本，不含 PRM）",null,null,c.telemetry?"3 秒":null,c.telemetry?20:null]]);
    $("duration-note").textContent=c.snapshot?"":"起止点与样本不同，均值不能相加减。入口样本仅适用于 09.08—10.11 全区间、全部维度，不能外推到全部业务申请。";
    $("ops-failures").innerHTML=c.snapshot?table(["阶段 / 节点","原始次数","截图原因","排查方向"],[["设备激活 / lc_activate",13,"部分授权激活失败（已退出自动重试，可手动触发）","核对设备结果、重试历史及最终状态"],["授权生成","—","未提供独立节点数据","与设备激活分开补齐"]]):empty("当前区间失败节点与原因待补充","历史邮件 6.5% 口径有冲突，不作为当前激活失败率。");
    $("failure-note").textContent=c.snapshot?"截图原因用于排查，不代表失败申请数。":"业务周表未提供失败原因明细；需接入逐条日志后按节点和原因统计。";
  }
  function render() {
    const c=context(),range=`${state.start.replaceAll("-",".")} — ${state.end.replaceAll("-",".")}`;
    $("scope-hint").textContent="平台真实周表覆盖 09.08—10.11 · 非实时数据";
    $("source-note").textContent=c.platform==null?"当前区间缺少完整真实汇总，对应指标留空；图表只显示已有完整数据。":"";
    $("source-note").hidden=c.platform!=null;
    if(model.mock){$("scope-hint").textContent="";$("source-note").hidden=true;}
    $("overview-scope").textContent=range;
    const safe=c.filtered?{...c,snapshot:false,telemetry:false,platform:null,passed:null}:c;
    if(model.mock){window.OperationsMockView.render(c,{metric,bars});renderTrend(c);renderProducts(c);}
    else{renderOverview(safe);renderQuality(safe);renderChain(safe);$("dimension-bar").innerHTML="";}
    window.OperationsEvents.update(state.start,state.end,model.mock?(window.OperationsMockView?.getFilters?.()||{}):state.filters);
  }
  function switchView(view) {
    state.view=view;["overview","quality","events"].forEach(key=>{$("panel-"+key).hidden=key!==view;});
    if(view==="events")window.OperationsEvents.activate();
  }
  function toast(message){$("ops-toast").textContent=message;$("ops-toast").classList.add("visible");clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("ops-toast").classList.remove("visible"),2800);}
  document.querySelectorAll("[data-range]").forEach(button=>button.addEventListener("click",()=>{
    const range=button.dataset.range;markRange(range);
    if(range==="custom"){$("ops-start").focus();return;}
    const end=localDate(new Date()),start=model.shift(end,-Number(range)+1);
    $("ops-start").value=start;$("ops-end").value=end;$("scope-form").requestSubmit();
  }));
  ["ops-start","ops-end"].forEach(id=>$(id).addEventListener("change",()=>markRange("custom")));
  $("scope-form").addEventListener("submit",e=>{e.preventDefault();const start=$("ops-start").value,end=$("ops-end").value;const error=!start||!end?"请选择完整的开始与结束日期。":start>end?"结束日期不能早于开始日期。":"";$("scope-error").textContent=error;$("scope-error").hidden=!error;if(error)return;state.start=start;state.end=end;render();});
  $("refresh-ops").addEventListener("click",()=>{render();toast(model.mock?"已刷新模拟数据":"已重新载入本地数据，未请求生产系统");});
  $("trend-metric").addEventListener("change",()=>{state.trendMetric=$("trend-metric").value;render();});
  document.querySelectorAll("[data-grain]").forEach(button=>button.addEventListener("click",()=>{state.grain=button.dataset.grain;document.querySelectorAll("[data-grain]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));render();}));
  window.OperationsDashboard={platformFor,context,trendRows,render};
  window.OperationsEvents.mountTabs(switchView);if(model.mock)markRange("30");render();
})();

/* Presentation for the explicitly requested mock dataset; no production input. */
"use strict";
(() => {
  const {createApp,reactive,h}=window.Vue,{ElTable,ElTableColumn,ElConfigProvider}=window.ElementPlus;
  const $=id=>document.getElementById(id),models=new Map();
  const num=v=>v==null?"—":Number.isInteger(v)?v.toLocaleString("zh-CN"):v.toFixed(1);
  const rate=(a,b)=>b?`${(a/b*100).toFixed(1)}%`:"—";
  const table=(id,headers,rows)=>{
    if(models.has(id)){models.get(id).rows=rows;return;}
    const state=reactive({rows});models.set(id,state);
    createApp({render:()=>h(ElConfigProvider,{size:"small"},{default:()=>h(ElTable,{data:state.rows,stripe:true,border:true,style:{width:"100%"}}, {default:()=>headers.map((label,index)=>h(ElTableColumn,{label,minWidth:index===0?160:105},{default:({row})=>row[index]==null?"—":String(row[index])}))})})}).mount($(id));
  };
  const dimensionFilter={scene:"all",authScene:"all",line:"all",entry:"all"};
  const getFilters=()=>({...dimensionFilter});
  const groupedReasons=(events,names)=>{
    const map=new Map();
    for(const e of events)if(names.includes(e.name)&&e.reason)map.set(e.reason,(map.get(e.reason)||0)+1);
    return [...map].sort((a,b)=>b[1]-a[1]);
  };
  function dimensionBar(c){
    const scenes=window.OperationsModel.dimensions(c.start,c.end).scenes;
    if(dimensionFilter.scene!=="all"&&!scenes.includes(dimensionFilter.scene))dimensionFilter.scene="all";
    const options=items=>`<option value="all">全部业务类型</option>`+items.map(v=>`<option value="${v}"${v===dimensionFilter.scene?" selected":""}>${v}</option>`).join("");
    return `<label>业务类型<select data-quality-filter="scene">${options(scenes)}</select></label>`+
      `<button type="button" class="text-button" data-quality-reset>重置</button>`;
  }
  function render(c,args){
    const {metric,bars}=args;
    const cnt=c.eventCount;
    const ev=c.events,app=c.apps;
    const qCnt=name=>ev.filter(e=>e.name===name).length;
    const fillMean=app.length?app.reduce((s,a)=>s+a.fillMinutes,0)/app.length:null;
    $("dimension-bar").innerHTML=dimensionBar(c);
    $("outcome-row").innerHTML=metric("platform",num(c.platform),"当前区间提交成功的申请单",{primary:true,unit:"条"})+metric("completion",rate(cnt("提交成功"),cnt("开始填单")),`提交成功 ${num(cnt("提交成功"))} / 开始填单 ${num(cnt("开始填单"))}`)+metric("end",num(c.endDuration.mean),"成功提交 → 激活成功 · 平均耗时",{unit:"分钟"});
    $("overview-process").innerHTML=metric("validation",rate(cnt("提交校验失败"),cnt("点击提交")),`校验失败 ${num(cnt("提交校验失败"))} / 点击提交 ${num(cnt("点击提交"))}`)+metric("approval",rate(c.approvalPassed,c.eventCount("进入审批")),`审批通过 ${num(c.approvalPassed)} / 进入审批 ${num(c.eventCount("进入审批"))}`)+metric("auto",rate(c.passed-c.stats.activationFailed,c.passed),"1－激活失败量 / 通过量（含免审批）")+metric("activation",rate(c.stats.activationFailed,c.passed),`激活失败 ${num(c.stats.activationFailed)} / 通过 ${num(c.passed)}`);
    $("ops-products").innerHTML=bars(c.products);
    $("ops-authscenes").innerHTML=bars(c.authScenes);
    const blocked=qCnt("提交校验失败")+qCnt("提交失败");
    $("quality-metrics").innerHTML=metric("fill",num(fillMean),"开始填写 → 成功提交 · 平均时长",{unit:"分钟"})+metric("blocked",num(blocked),`校验失败 ${num(qCnt("提交校验失败"))} · 后端失败 ${num(qCnt("提交失败"))}`)+metric("rejected",num(c.stats.rejected),"审批驳回申请数")+metric("approvalPending",num(c.approvalPending),"进入审批、尚未出结果");
    $("ops-validation").innerHTML=bars([...groupedReasons(ev,["提交校验失败"]),...groupedReasons(ev,["提交失败"]).map(([reason,count])=>[`后端提交失败：${reason}`,count])]);
    table("ops-approvals",["审批结果","申请数量"],[["进入审批",num(qCnt("进入审批"))],["审批通过",num(qCnt("审批通过"))],["审批驳回",num(qCnt("审批拒绝"))],["审批中",num(c.approvalPending)]]);
    $("chain-metrics").innerHTML=metric("autoExpected",num(c.passed),"应自动授权申请量",{unit:"条"})+metric("activated",num(c.stats.activated),"设备激活成功",{unit:"条"})+metric("activationFailed",num(c.stats.activationFailed),"设备激活失败",{unit:"条"})+metric("generation",rate(c.generated.length,c.passed),`完成授权 ${num(c.generated.length)} / 应执行 ${num(c.passed)}`);
    const customerFailures=c.customers.filter(a=>a.customerFailed).length;
    const activatedApps=c.activated,duration=window.OperationsModel.duration;
    const stageRows=[
      ["填单：开始填写 → 提交成功",activatedApps.map(a=>a.fillMinutes),"分钟"],
      ["审批（含免审，计 0）：提交成功 → 审批结束",activatedApps.map(a=>a.approvalMinutes),"分钟"],
      ["授权生成：审批结束 → 自动授权成功",activatedApps.map(a=>a.generationSeconds/60),"分钟"],
      ["设备激活：自动授权成功 → 激活成功",activatedApps.map(a=>a.activationMinutes),"分钟"],
      ["全链路：开始填写 → 激活成功",activatedApps.map(a=>a.totalActivationMinutes),"分钟"]
    ];
    table("ops-duration",["链路阶段","P50","P95","均值","样本量"],stageRows.map(([label,values,unit])=>{const d=duration(values);return [label,...[d.p50,d.p95,d.mean].map(v=>`${num(v)} ${unit}`),d.n];}));
    $("duration-note").textContent="样本为所选区间内完成激活的申请；各阶段按同一批申请逐段计算，逐段相加等于全链路。审批段包含免审申请（计 0），P50 可能为 0；如需仅看需审批申请的耗时，需接入审批节点日志后单独统计。";
    const failureGroups=new Map();for(const row of c.events.filter(r=>["自动授权失败","激活失败"].includes(r.name))){const key=`${row.failureNode}|${row.reason}`;failureGroups.set(key,(failureGroups.get(key)||0)+1);}
    const failureRows=[...failureGroups].sort((a,b)=>b[1]-a[1]);
    table("ops-failures",["失败节点","失败原因","次数","排查方向"],failureRows.slice(0,5).map(([key,count])=>[...key.split("|"),count,key.startsWith("设备激活")?"核对设备连通性和设备信息":"核对服务响应及请求参数"]));
    $("failure-note").textContent=failureRows.length>5?`按次数排序，展示前 5 项（共 ${failureRows.length} 项）；失败事件数不等于失败申请数。`:"按次数排序；失败事件数不等于失败申请数。";
  }
  document.addEventListener("change",e=>{
    const key=e.target.getAttribute&&e.target.getAttribute("data-quality-filter");
    if(!key)return;
    dimensionFilter[key]=e.target.value;
    if(window.OperationsDashboard)window.OperationsDashboard.render();
  });
  document.addEventListener("click",e=>{
    if(!e.target.closest("[data-quality-reset]"))return;
    dimensionFilter.scene="all";dimensionFilter.authScene="all";dimensionFilter.line="all";dimensionFilter.entry="all";
    if(window.OperationsDashboard)window.OperationsDashboard.render();
  });
  window.OperationsMockView={render,getFilters};
})();

/* Event observations are aggregates, never synthesized into individual logs. */
"use strict";
(() => {
  const {createApp, reactive, markRaw, h, nextTick} = window.Vue;
  const {ElConfigProvider, ElTabs, ElTabPane, ElTable, ElTableColumn, ElEmpty, ElPagination} = window.ElementPlus;
  const model = window.OperationsModel;
  const fields = [
    ["开始填单", "started", "单位待核对", "统计对象尚未与提交成功关联", "form_start"],
    ["点击提交", "submitClicks", "次", "多次点击会重复记录", "submit_click"],
    ["提交校验失败", "validationFailed", "次", "校验阻断事件，不代表后端提交失败", "submit_validation_fail"],
    ["提交成功", "submitted", "单位待核对", "原始观测；去重关系待接入", "submit_success"],
    ["原页面建单", "created", "单位待核对", "与提交成功口径未统一，不作为业务申请量", "platform_apply_created"],
    ["进入审批", "approvalEntered", "次", "申请关联待核对", "approval_enter"],
    ["审批通过（passed）", "approvalPassed", "次", "仅 passed 结果，不代表全部审批完成事件", "approval_done"],
    ["应自动授权", "autoExpected", "次", "尚未按申请关联最终状态", "auto_auth_expected"],
    ["自动授权成功", "autoSucceeded", "次", "节点归属、重试及终态待核对", "auto_auth_success"],
    ["自动授权失败", "autoFailed", "次", "与成功事件可能重叠，不直接计算成功率", "auto_auth_fail"]
  ];
  function summaryFor(start, end, filters={}) {
    if(model.mock)return model.summaryFor(start,end,filters);
    if (!model.hasTelemetry(start, end)) return [];
    return fields.map(([name, field, unit, note, eventId]) => ({name, eventId, count:model.telemetry[field], byScene:{}, unit, note}));
  }
  const state = reactive({start:"", end:"", summary:[], logs:[], page:1, available:false});
  const views=[["overview","运营总览"],["quality","申请与授权链路"],["events","埋点事件"]];
  function mountTabs(onChange) {
    const selected=reactive({name:"overview"});
    const panels=new Map(views.map(([key])=>[key,document.getElementById(`panel-${key}`)]));
    // Each pane owns a stable host; existing dashboard content retains its handlers.
    createApp({render:()=>h(ElConfigProvider, {size:"small"}, {default:()=>h(ElTabs, {
      modelValue:selected.name,
      "onUpdate:modelValue":name=>{selected.name=name;onChange(name);}
    }, {default:()=>views.map(([name,label])=>h(ElTabPane, {name,label}, {
      default:()=>h("div", {ref:host=>{const panel=panels.get(name);if(host&&panel.parentNode!==host)host.append(panel);}})
    }))})})}).mount("#ops-tabs");
    document.querySelector('#ops-tabs [role="tablist"]').setAttribute("aria-label","运营分析栏目");
    document.getElementById("ops-tabs").addEventListener("keydown",event=>{
      if(!["Home","End"].includes(event.key)||event.target.getAttribute("role")!=="tab")return;
      const tabs=[...document.querySelectorAll('#ops-tabs [role="tab"]')],target=event.key==="Home"?tabs[0]:tabs.at(-1);
      event.preventDefault();target.focus();target.click();
    });
  }
  let app;
  const tables = [];
  function column(prop, label, minWidth, extra={}) {
    return h(ElTableColumn, {prop, label, minWidth, ...extra}, {
      default:({row}) => row[prop] == null ? "—" : typeof row[prop] === "number" ? row[prop].toLocaleString("zh-CN") : row[prop]
    });
  }
  function sceneColumn(key, label) {
    return h(ElTableColumn, {label, minWidth:112}, {
      default:({row}) => row.byScene?.[key] == null ? "—" : Number(row.byScene[key]).toLocaleString("zh-CN")
    });
  }
  // 事件汇总按业务类型拆分；细产线保留在事件日志中。
  const summaryScenes = model.mock ? (model.sceneTypes || []) : ["产品授权", "XaaS授权", "解决方案型授权"];
  const summaryColumns = [
    column("name", "事件名称", 150),
    column("eventId", "事件ID", 170),
    ...summaryScenes.map(scene => sceneColumn(scene, scene)),
    column("count", "合计", 90),
    column("unit", "单位", 100),
    column("note", "说明", 240)
  ];
  function eventTable(id, data, columns, description, index) {
    return h(ElTable, {id, data, stripe:true, border:true, style:{width:"100%"}, ref:el=>{tables[index]=el;}}, {
      default:() => columns,
      empty:() => h(ElEmpty, {description, imageSize:64})
    });
  }
  function mount() {
    if (app) return;
    app = createApp({render:() => h(ElConfigProvider, {size:"small"}, {default:() => [
      h("article", {class:"panel event-panel"}, [
        h("div", {class:"panel-head"}, [h("div", [h("h3", "事件汇总"), h("p", {id:"event-summary-scope"}, model.mock?`${state.start} — ${state.end} · 模拟数据`:state.available ? `${state.start} — ${state.end} · 平台入口埋点样本，不含 PRM` : "当前日期范围暂无同口径事件汇总")])]),
        eventTable("ops-event-summary", state.summary, summaryColumns, "当前区间事件汇总待接入", 0),
        h("p", {class:"footnote"}, "按事件次数统计；重复点击和重试分别记录。")
      ]),
      h("article", {class:"panel event-panel"}, [
        h("div", {class:"panel-head"}, [h("div", [h("h3", "事件日志"), h("p", "逐条查看事件、关联申请及失败信息")])]),
        eventTable("ops-event-log", state.logs.slice((state.page-1)*20,state.page*20), [column("time", "时间", 170), column("name", "事件", 140), column("scene", "场景", 135), column("requestId", "申请单号", 190), column("user", "用户", 120), column("productLine", "产品线", 110), column("entry", "入口", 140), column("failureNode", "失败节点", 140), column("reason", "失败原因", 220)], model.mock?"所选区间暂无模拟事件":"逐条事件日志待接入", 1),
        model.mock?h(ElPagination,{class:"event-pagination",currentPage:state.page,pageSize:20,total:state.logs.length,layout:"total, prev, pager, next",background:true,"onUpdate:currentPage":page=>{state.page=page;}}):null,
        h("p", {class:"footnote"}, model.mock?"按时间倒序排列；失败信息通过对应事件、失败节点与失败原因查看。":"当前仅有事件汇总，尚无完整日志；不展示旧截图样本。失败信息通过对应事件、失败节点与失败原因查看。")
      ])
    ]})});
    app.mount("#ops-events");
  }
  function update(start, end, filters={}) {
    state.start=start; state.end=end;
    state.available=model.hasTelemetry(start, end);
    state.summary=summaryFor(start, end, filters);
    state.logs=model.mock?markRaw(model.eventLogs(start,end,filters)):[];state.page=1;
  }
  function activate() {
    mount();
    nextTick(() => tables.forEach(table => table?.doLayout()));
  }
  window.OperationsEvents={update, activate, summaryFor, mountTabs};
})();

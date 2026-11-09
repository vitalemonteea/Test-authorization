/* Deterministic demonstration data. Kept separate from confirmed business data. */
"use strict";
((root) => {
  const DAY=86400000, date=s=>new Date(`${s}T00:00:00Z`), iso=d=>d.toISOString().slice(0,10);
  const shift=(s,n)=>iso(new Date(+date(s)+n*DAY));
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const start="2026-09-08", end=today<start?"2026-10-16":today;
  const lines=["AF","AC","HCI","aTrust","aDesk","CTI","Logger","XaaS"];
  const sceneTypes=["产品授权","XaaS授权","解决方案型授权"];
  const eventIds={"入口曝光":"entry_source_view","开始填单":"form_start","平台申请单创建":"platform_apply_created","点击提交":"submit_click","提交校验失败":"submit_validation_fail","提交失败":"submit_fail","提交成功":"submit_success","进入审批":"approval_enter","审批通过":"approval_done","审批拒绝":"approval_rejected","应自动授权":"auto_auth_expected","客户创建成功":"customer_create_success","客户创建失败":"customer_create_fail","自动授权成功":"auto_auth_success","自动授权失败":"auto_auth_fail","激活成功":"auth_completed","激活失败":"activation_fail"};
  const validationReasons=["info 文件格式错误","客户信息未填写完整","授权模块数量不符合要求","接收邮箱格式错误"];
  const rejectionReasons=["测试背景不完整","重复申请","申请时长需调整"];
  const generationReasons=["授权服务调用超时","设备信息校验未通过","客户信息同步失败"];
  const activationReasons=["设备暂时离线","设备信息不匹配","激活服务响应超时"];
  const submitReasons=["提交接口超时","申请保存失败"];
  let seed=1;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const pick=items=>items[Math.floor(rand()*items.length)];
  const applications=[],logs=[];
  function stamp(day,seconds){return `${day} ${new Date(+date(day)+seconds*1000).toISOString().slice(11,19)}`;}
  function event(a,name,seconds,failureNode="",reason="",beforeSubmit=false){logs.push({time:stamp(a.day,seconds),name,scene:a.scene,authScene:a.authScene,requestId:beforeSubmit?"":a.requestId,user:a.user,productLine:a.line,entry:a.entry,failureNode,reason});}
  // 场景三分类：产品授权 / XaaS授权 / 解决方案型授权
  const sceneOf=line=>line==="XaaS"?"XaaS授权":rand()<.12?"解决方案型授权":"产品授权";
  // 申请场景（业务场景）：首次申请 / 正常延期 / 超规延期 / 超限制规模 / 销售设备 / 重复申请或授权变更
  const authSceneOf=()=>{const r=rand();return r<.4?"首次申请":r<.65?"正常延期":r<.75?"超规延期":r<.83?"超限制规模":r<.95?"销售设备":"重复申请/授权变更";};
  for(let day=start;day<=end;day=shift(day,1)) {
    seed=Number(day.replaceAll("-",""));
    const weekend=[0,6].includes(date(day).getUTCDay()),holiday=day>="2026-10-01"&&day<="2026-10-07";
    const count=Math.round((weekend?45+rand()*35:145+rand()*80)*(holiday?.48:1));
    for(let i=0;i<count;i++) {
      const line=pick(lines),a={day,line,category:line==="XaaS"?"xaas":"product",scene:sceneOf(line),authScene:authSceneOf(),requestId:`MOCK${day.replaceAll("-","")}${String(i+1).padStart(4,"0")}`,user:`演示用户${String(1+Math.floor(rand()*24)).padStart(2,"0")}`,entry:pick(["平台首页","授权记录","产品测试入口"])};
      const base=8*3600+Math.floor(rand()*4*3600),fill=150+Math.floor(rand()*720);
      a.fillMinutes=fill/60;a.needsApproval=rand()<.34;
      a.approvalState=!a.needsApproval?"exempt":rand()<.065?"rejected":rand()<.07?"pending":"passed";
      const secondNeeded=a.needsApproval&&i%3===0;
      a.firstApprovalState=!a.needsApproval?"none":a.approvalState==="passed"?"passed":secondNeeded&&i%2===0?"passed":a.approvalState;
      a.secondApprovalState=secondNeeded&&a.firstApprovalState==="passed"?a.approvalState:"none";
      a.approvalMinutes=a.needsApproval?12+rand()*240:0;
      a.eligible=["exempt","passed"].includes(a.approvalState);
      a.customerNeeded=a.eligible&&rand()<.26;
      a.generationState=!a.eligible?"none":rand()<.025?"pending":rand()<.035?"failed":"success";
      a.customerFailed=a.customerNeeded&&a.generationState==="failed"&&rand()<.55;
      a.generationSeconds=2+rand()*11;
      a.activationState=a.generationState!=="success"?"none":rand()<.055?"failed":rand()<.035?"pending":"success";
      a.activationMinutes=1+rand()*24;
      a.endMinutes=a.approvalMinutes+a.generationSeconds/60;
      a.totalActivationMinutes=fill/60+a.endMinutes+a.activationMinutes;
      a.requestedDays=pick([15,30,60,90]);a.testedDays=pick([0,0,15,30,60]);a.testDays=a.testedDays+a.requestedDays;a.abnormal=rand()<.035;
      event(a,"入口曝光",Math.max(0,base-60),"","",true);
      event(a,"开始填单",base,"","",true);
      event(a,"点击提交",base+fill-15,"","",true);
      if(rand()<.19){event(a,"提交校验失败",base+fill-14,"表单校验",pick(validationReasons),true);event(a,"点击提交",base+fill-7,"","",true);}
      if(rand()<.025){event(a,"提交失败",base+fill-6,"申请提交",pick(submitReasons),true);event(a,"点击提交",base+fill-2,"","",true);}
      const submitted=base+fill;event(a,"提交成功",submitted);event(a,"平台申请单创建",submitted+1);
      let at=submitted;
      if(a.needsApproval){event(a,"进入审批",at+1);at+=a.approvalMinutes*60;if(a.approvalState==="passed")event(a,"审批通过",at);if(a.approvalState==="rejected")event(a,"审批拒绝",at,"审批",pick(rejectionReasons));}
      if(a.eligible){
        event(a,"应自动授权",at+1);
        if(a.customerNeeded)event(a,a.customerFailed?"客户创建失败":"客户创建成功",at+2,a.customerFailed?"客户创建":"",a.customerFailed?generationReasons[2]:"");
        at+=a.generationSeconds;
        if(a.generationState==="failed")event(a,"自动授权失败",at,a.customerFailed?"客户创建":"授权生成",a.customerFailed?generationReasons[2]:pick(generationReasons.slice(0,2)));
        if(a.generationState==="success"){
          event(a,"自动授权成功",at);
          at+=a.activationMinutes*60;
          if(a.activationState==="success")event(a,"激活成功",at);
          if(a.activationState==="failed")event(a,"激活失败",at,"设备激活",pick(activationReasons));
        }
      }
      applications.push(a);
    }
    const abandoned=Math.round(count*(.13+rand()*.07));
    for(let i=0;i<abandoned;i++){
      const visitorLine=pick(lines),visitor={day,scene:sceneOf(visitorLine),authScene:authSceneOf(),user:`演示访客${i+1}`,line:visitorLine,entry:"平台首页"};
      event(visitor,"入口曝光",9*3600+i*37,"","",true);
      event(visitor,"开始填单",9*3600+i*37+5,"","",true);
    }
    // 只访问入口、未开始填单的访客，用于还原“入口曝光 → 开始填单”的漏斗。
    const browsers=Math.round(count*(.35+rand()*.25));
    for(let i=0;i<browsers;i++){const browserLine=pick(lines);event({day,scene:sceneOf(browserLine),authScene:authSceneOf(),user:`演示访客${abandoned+i+1}`,line:browserLine,entry:"平台首页"},"入口曝光",10*3600+i*23,"","",true);}
  }
  logs.sort((a,b)=>b.time.localeCompare(a.time)||a.name.localeCompare(b.name));
  const inRange=(row,s,e)=>row.day>=s&&row.day<=e;
  const matches=(row,filters={})=>(!filters.scene||filters.scene==="all"||row.scene===filters.scene)&&(!filters.line||filters.line==="all"||(row.line??row.productLine)===filters.line)&&(!filters.authScene||filters.authScene==="all"||row.authScene===filters.authScene)&&(!filters.entry||filters.entry==="all"||row.entry===filters.entry);
  const rowsFor=(s,e,filters={})=>applications.filter(a=>inRange(a,s,e)&&matches(a,filters));
  const eventLogs=(s,e,filters={})=>logs.filter(a=>a.time.slice(0,10)>=s&&a.time.slice(0,10)<=e&&matches(a,filters));
  function statsFor(rows){return {count:rows.length,product:rows.filter(a=>a.category==="product").length,xaas:rows.filter(a=>a.category==="xaas").length,needsApproval:rows.filter(a=>a.needsApproval).length,rejected:rows.filter(a=>a.approvalState==="rejected").length,activated:rows.filter(a=>a.activationState==="success").length,activationFailed:rows.filter(a=>a.activationState==="failed").length};}
  function sum(s,e,field="count",filters={}){if(s>e||e<start||s>end)return null;return statsFor(rowsFor(s,e,filters))[field]??null;}
  function buckets(s,e,grain="week",field="count",filters={}){
    const rows=[];for(let cursor=s;cursor<=e;){let labelStart=cursor,labelEnd=cursor;const d=date(cursor);
      if(grain==="week"){labelStart=shift(cursor,-((d.getUTCDay()+6)%7));labelEnd=shift(labelStart,6);}
      if(grain==="month"){labelStart=`${cursor.slice(0,7)}-01`;labelEnd=iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)));}
      const bucketEnd=labelEnd>e?e:labelEnd;rows.push({start:cursor,end:bucketEnd,labelStart,labelEnd,count:sum(cursor,bucketEnd,field,filters),partial:cursor!==labelStart||bucketEnd!==labelEnd});cursor=shift(bucketEnd,1);
    }return rows;
  }
  function duration(values){if(!values.length)return {mean:null,p50:null,p95:null,n:0};const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p50:sorted[Math.floor((sorted.length-1)*.5)],p95:sorted[Math.ceil((sorted.length-1)*.95)],n:values.length};}
  function grouped(rows,key){const counts=new Map();rows.forEach(r=>counts.set(r[key],(counts.get(r[key])||0)+1));return [...counts].sort((a,b)=>b[1]-a[1]);}
  let cache;
  function aggregate(s,e,filters={}){
    const key=`${s}|${e}|${filters.scene||"all"}|${filters.authScene||"all"}|${filters.line||"all"}|${filters.entry||"all"}`;
    if(cache?.key===key)return cache;
    const apps=rowsFor(s,e,filters),events=eventLogs(s,e,filters),stats=statsFor(apps),eventCount=name=>events.filter(l=>l.name===name).length;
    const eligible=apps.filter(a=>a.eligible),generated=apps.filter(a=>a.generationState==="success"),activated=apps.filter(a=>a.activationState==="success"),approvals=apps.filter(a=>a.needsApproval&&a.approvalState!=="pending"),customers=apps.filter(a=>a.customerNeeded);
    return cache={key,start:s,end:e,apps,events,stats,eventCount,platform:sum(s,e,"count",filters),passed:eligible.length,eligible,generated,activated,approvals,customers,
      generationFailed:apps.filter(a=>a.generationState==="failed").length,generationPending:apps.filter(a=>a.generationState==="pending").length,approvalPending:apps.filter(a=>a.approvalState==="pending").length,approvalPassed:apps.filter(a=>a.approvalState==="passed").length,activationPending:apps.filter(a=>a.activationState==="pending").length,
      fill:duration(apps.map(a=>a.fillMinutes)),approval:duration(approvals.map(a=>a.approvalMinutes)),generation:duration(generated.map(a=>a.generationSeconds*(a.customerNeeded?.5:1))),activation:duration(activated.map(a=>a.activationMinutes)),endDuration:duration(activated.map(a=>a.endMinutes+a.activationMinutes)),activationDuration:duration(activated.map(a=>a.totalActivationMinutes)),customerDuration:duration(customers.filter(a=>!a.customerFailed).map(a=>a.generationSeconds/2)),
      testDuration:duration(apps.map(a=>a.testDays)),abnormal:apps.filter(a=>a.abnormal).length,products:grouped(apps,"line"),authScenes:grouped(apps,"authScene"),validation:grouped(events.filter(a=>a.name==="提交校验失败"),"reason"),submitFailures:grouped(events.filter(a=>a.name==="提交失败"),"reason"),rejectionReasons:grouped(events.filter(a=>a.name==="审批拒绝"),"reason"),failures:grouped(events.filter(a=>["自动授权失败","激活失败"].includes(a.name)),"reason")};
  }
  const eventOrder=["入口曝光","开始填单","点击提交","提交校验失败","提交失败","提交成功","平台申请单创建","进入审批","审批通过","审批拒绝","应自动授权","客户创建成功","客户创建失败","自动授权成功","自动授权失败","激活成功","激活失败"];
  function summaryFor(s,e,filters={}){
    const c=aggregate(s,e,filters),counts=new Map(),byScene=new Map();
    for(const row of c.events){
      counts.set(row.name,(counts.get(row.name)||0)+1);
      const perScene=byScene.get(row.name)||{};
      perScene[row.scene]=(perScene[row.scene]||0)+1;
      byScene.set(row.name,perScene);
    }
    return eventOrder.map(name=>({name,eventId:eventIds[name],count:counts.get(name)||0,byScene:byScene.get(name)||{},unit:"次",note:""}));
  }
  function dimensions(s,e){
    const apps=rowsFor(s,e,{}),events=eventLogs(s,e,{});
    return {
      scenes:[...new Set(events.map(row=>row.scene))].filter(Boolean).sort(),
      authScenes:[...new Set(apps.map(row=>row.authScene))].filter(Boolean).sort(),
      lines:[...new Set(apps.map(row=>row.line))].filter(Boolean).sort(),
      entries:[...new Set(apps.map(row=>row.entry))].filter(Boolean).sort()
    };
  }
  const api={mock:true,start,end,defaultStart:shift(end,-29)<start?start:shift(end,-29),weeks:[],lines,sceneTypes,eventIds,sum,buckets,shift,rowsFor,eventLogs,summaryFor,aggregate,duration,dimensions,hasTelemetry:(s,e)=>s<=end&&e>=start,previous:(s,e)=>({start:shift(s,-((date(e)-date(s))/DAY+1)),end:shift(s,-1)})};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else{root.ConfirmedOperationsModel=root.OperationsModel;root.OperationsModel=api;}
})(typeof window!=="undefined"?window:globalThis);

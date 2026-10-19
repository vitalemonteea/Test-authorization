/* Platform-only historical aggregates. Unknown intervals and dimensions stay null. */
"use strict";
((root) => {
  const DAY=86400000;
  const date=s=>new Date(`${s}T00:00:00Z`);
  const iso=d=>d.toISOString().slice(0,10);
  const shift=(s,days)=>iso(new Date(date(s).getTime()+days*DAY));
  const weeks=[
    {start:"2026-09-08",end:"2026-09-13",count:825,product:825,xaas:0,needsApproval:278,rejected:12,activationFailed:45,activated:729},
    {start:"2026-09-14",end:"2026-09-20",count:2498,product:2498,xaas:0,needsApproval:720,rejected:44,activationFailed:172,activated:2212},
    {start:"2026-09-21",end:"2026-09-27",count:1585,product:1585,xaas:0,needsApproval:412,rejected:17,activationFailed:96,activated:1460},
    {start:"2026-09-28",end:"2026-10-04",count:1317,product:1294,xaas:23,needsApproval:363,rejected:24,activationFailed:35,activated:1252},
    {start:"2026-10-05",end:"2026-10-11",count:1141,product:1129,xaas:12,needsApproval:228,rejected:18,activationFailed:12,activated:1094}
  ];
  const telemetry={start:"2026-09-08",end:"2026-10-11",scope:"平台入口埋点样本，不含 PRM",created:85,submitted:3610,started:966,submitClicks:9120,validationFailed:4723,approvalEntered:65,approvalPassed:64,autoExpected:20,autoSucceeded:20,autoFailed:11,endMeanHours:16.6,endSamples:66,approvalMeanHours:25.5,approvalSamples:62,autoMeanSeconds:3,autoSamples:20};
  function sum(start,end,field="count",filters={}) {
    if(Object.values(filters).some(v=>v&&v!=="all"))return null;
    const rows=weeks.filter(r=>r.start<=end&&r.end>=start);
    if(!rows.length||rows[0].start!==start||rows.at(-1).end!==end)return null;
    let cursor=start,total=0;
    for(const row of rows){if(row.start!==cursor||row[field]==null)return null;total+=row[field];cursor=shift(row.end,1);}
    return total;
  }
  function buckets(start,end,grain="week",field="count",filters={}) {
    const rows=[];
    for(let cursor=start;cursor<=end;){
      const d=date(cursor);let labelStart=cursor,labelEnd=cursor;
      if(grain==="week"){labelStart=shift(cursor,-((d.getUTCDay()+6)%7));labelEnd=shift(labelStart,6);}
      if(grain==="month"){labelStart=`${cursor.slice(0,7)}-01`;labelEnd=iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)));}
      const bucketEnd=labelEnd>end?end:labelEnd;
      rows.push({start:cursor,end:bucketEnd,labelStart,labelEnd,count:sum(cursor,bucketEnd,field,filters),partial:cursor!==labelStart||bucketEnd!==labelEnd});
      cursor=shift(bucketEnd,1);
    }
    return rows;
  }
  function previous(start,end){const length=(date(end)-date(start))/DAY+1;return {start:shift(start,-length),end:shift(start,-1)};}
  function hasTelemetry(start,end,filters={}){return start===telemetry.start&&end===telemetry.end&&!Object.values(filters).some(v=>v&&v!=="all");}
  const api={weeks,telemetry,sum,buckets,previous,shift};
  api.hasTelemetry=hasTelemetry;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.OperationsModel=api;
})(typeof window!=="undefined"?window:globalThis);

const fs=require('node:fs');
const vm=require('node:vm');
const os=require('node:os');
const {performance}=require('node:perf_hooks');
const context={Buffer};vm.createContext(context);
for(const name of ['chart-font','price-graphs','chart-png'])vm.runInContext(fs.readFileSync('lib/'+name+'.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,''),context);
const now='2026-11-07T12:00:00.000Z';
const history={version:1,daily:[],weekly:[],monthly:[]};
for(let day=1;day<=7;day++){const date='2026-11-'+String(day).padStart(2,'0');history.daily.push({day:date,price:50000+day*100,observed_at:date+'T12:00:00.000Z'});}
for(let i=0;i<120;i++){const date=new Date(Date.UTC(2016,11+i,1)).toISOString().slice(0,10);history.monthly.push({day:date,price:50000+i*100,observed_at:date+'T12:00:00.000Z'});}
for(let i=0;i<6;i++){const date=new Date(Date.UTC(2026,8,28+i*7)).toISOString().slice(0,10);history.weekly.push({day:date,price:50000+i*100,observed_at:date+'T12:00:00.000Z'});}
const raw=JSON.stringify(history);
if(process.argv.includes('--single')){
  if(global.gc)global.gc();
  const before=process.memoryUsage(),rssPeakBefore=process.resourceUsage().maxRSS,cpu=process.cpuUsage(),start=performance.now();
  const image=context.renderPriceChart(raw,'week',now);
  const elapsed=performance.now()-start,delta=process.cpuUsage(cpu),after=process.memoryUsage();
  console.log(JSON.stringify({mode:'single fresh process',wallMs:+elapsed.toFixed(1),cpuMs:+((delta.user+delta.system)/1000).toFixed(1),rssGrowthMiB:+((after.rss-before.rss)/1048576).toFixed(1),heapGrowthMiB:+((after.heapUsed-before.heapUsed)/1048576).toFixed(1),bufferGrowthMiB:+((after.arrayBuffers-before.arrayBuffers)/1048576).toFixed(1),processPeakRssGrowthMiB:+((process.resourceUsage().maxRSS-rssPeakBefore)/1024).toFixed(1),pngKiB:+(image.length/1024).toFixed(1)}));
  process.exit(0);
}
for(let i=0;i<5;i++)context.renderPriceChart(raw,'week',now);
if(global.gc)global.gc();
const singleBefore=process.memoryUsage();
const singleCpu=process.cpuUsage(),singleStart=performance.now();
const singlePng=context.renderPriceChart(raw,'week',now);
const singleWall=performance.now()-singleStart,singleDelta=process.cpuUsage(singleCpu),singleAfter=process.memoryUsage();
const single={wallMs:+singleWall.toFixed(1),cpuMs:+((singleDelta.user+singleDelta.system)/1000).toFixed(1),rssGrowthMiB:+((singleAfter.rss-singleBefore.rss)/1048576).toFixed(1),heapGrowthMiB:+((singleAfter.heapUsed-singleBefore.heapUsed)/1048576).toFixed(1),bufferGrowthMiB:+((singleAfter.arrayBuffers-singleBefore.arrayBuffers)/1048576).toFixed(1),pngKiB:+(singlePng.length/1024).toFixed(1)};
const results=[];
for(const period of ['week','month','year','max']){
  if(global.gc)global.gc();
  const base=process.memoryUsage();
  const rssBefore=process.resourceUsage().maxRSS;
  const walls=[],cpus=[];let peakRss=base.rss,peakHeap=base.heapUsed,peakBuffers=base.arrayBuffers,bytes=0;
  for(let i=0;i<20;i++){
    const cpu=process.cpuUsage(),start=performance.now();
    const png=context.renderPriceChart(raw,period,now);
    walls.push(performance.now()-start);const delta=process.cpuUsage(cpu);cpus.push((delta.user+delta.system)/1000);bytes=png.length;
    const memory=process.memoryUsage();peakRss=Math.max(peakRss,memory.rss);peakHeap=Math.max(peakHeap,memory.heapUsed);peakBuffers=Math.max(peakBuffers,memory.arrayBuffers);
  }
  const percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
  results.push({period,samples:20,wallMedianMs:+percentile(walls,.5).toFixed(1),wallP95Ms:+percentile(walls,.95).toFixed(1),cpuMedianMs:+percentile(cpus,.5).toFixed(1),observedRssGrowthMiB:+((peakRss-base.rss)/1048576).toFixed(1),observedHeapGrowthMiB:+((peakHeap-base.heapUsed)/1048576).toFixed(1),observedBufferGrowthMiB:+((peakBuffers-base.arrayBuffers)/1048576).toFixed(1),pngKiB:+(bytes/1024).toFixed(1)});
}
console.log(JSON.stringify({node:process.version,cpu:os.cpus()[0].model,note:'Local synthetic benchmark. Single reports memory change after one render, not peak. Series memory is peak growth during 20 sequential renders, including allocations awaiting GC; not server RAM or per-request reserved memory.',single,results},null,2));

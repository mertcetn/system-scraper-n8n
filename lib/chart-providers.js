function externalChartPayloads(raw,period,timestamp) {
  const series=graphSeries(raw,period,timestamp);
  const titles={week:'1 Hafta · Günlük Minimum Fiyat',month:'1 Ay · Haftalık Minimum Fiyat',year:'1 Yıl · Aylık Minimum Fiyat',max:'Max · Aylık Minimum Fiyat'};
  const minimum=series.minimum;
  const caption=minimum?'En düşük: '+minimum.price.toLocaleString('tr-TR')+' TL · Görüldüğü gün: '+graphLocalDay(minimum.observed_at):'Bu dönem için kayıtlı fiyat yok';
  const segments=[];let segment=[];
  series.values.forEach((price,i)=>{
    if(price===null){if(segment.length)segments.push(segment);segment=[];return;}
    segment.push({x:series.labels[i].length===7?series.labels[i]+'-01':series.labels[i],y:price});
  });
  if(segment.length)segments.push(segment);
  const points=segments.flat();
  if(!points.length)return {ready:false,reason:'no_observations'};
  const start=series.labels[0].length===7?series.labels[0]+'-01':series.labels[0];
  let end=series.labels.at(-1).length===7?series.labels.at(-1)+'-01':series.labels.at(-1);
  if(start===end)end=graphDayShift(end,1);
  const values=points.map(point=>point.y),low=Math.min(...values),high=Math.max(...values);
  const padding=Math.max((high-low)*0.12,high*0.015,1);
  const szum={version:'2026-09-26',config:{version:'2026-09-26',type:'line',theme:'noir',locale:'tr-TR',title:titles[period],caption,
    category:{field:'x',scale:{type:'utc',domain:[start,end]}},
    values:{type:'long',field:'y',series:{field:'segment'},scale:{type:'linear',domain:[Math.max(0,low-padding),high+padding]}},
    color:'#42d1bf',curve:'linear',points:{radius:4},valueAxis:{title:'TL'}},
    data:segments.flatMap((data,i)=>data.map(point=>({...point,segment:String(i)}))),size:{type:'canvas',width:900,height:500},output:{format:'png',scale:1}};
  const quickchart={version:'4',format:'png',width:900,height:500,devicePixelRatio:1,backgroundColor:'#121c2c',chart:{
    type:'line',data:{labels:series.labels,datasets:[{label:'Minimum fiyat (TL)',data:series.values,borderColor:'#42d1bf',backgroundColor:'rgba(66,209,191,0.12)',fill:true,spanGaps:false,tension:0,pointRadius:4,borderWidth:2}]},
    options:{layout:{padding:20},plugins:{legend:{display:false},title:{display:true,text:titles[period],color:'#ecf4ff',font:{size:22}},subtitle:{display:true,position:'bottom',text:caption,color:'#87e2a6',font:{size:14},padding:18}},
      scales:{x:{ticks:{color:'#899db4',maxTicksLimit:8},grid:{color:'#253345'}},y:{beginAtZero:false,ticks:{color:'#899db4'},grid:{color:'#253345'},title:{display:true,text:'TL',color:'#899db4'}}}}}};
  return {ready:true,szum,quickchart};
}
function validateProviderPng(buffer,status,headers={}) {
  if(!Number.isInteger(status)||status<200||status>=300)return {ok:false,reason:'http_status'};
  const normalized=Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value]));
  if(normalized['x-quickchart-error'])return {ok:false,reason:'provider_error'};
  if(!String(normalized['content-type']||'').toLowerCase().startsWith('image/png'))return {ok:false,reason:'content_type'};
  const signature=[137,80,78,71,13,10,26,10];
  if(!buffer||buffer.length<57||!signature.every((value,i)=>buffer[i]===value))return {ok:false,reason:'png_signature'};
  let offset=8,hasHeader=false,hasData=false,hasEnd=false;
  while(offset+12<=buffer.length){
    const length=buffer.readUInt32BE(offset);
    if(length>buffer.length-offset-12)return {ok:false,reason:'png_truncated'};
    const type=buffer.toString('ascii',offset+4,offset+8);
    let crc=0xffffffff;
    for(let i=offset+4;i<offset+8+length;i++){crc^=buffer[i];for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    if(((crc^0xffffffff)>>>0)!==buffer.readUInt32BE(offset+8+length))return {ok:false,reason:'png_crc'};
    if(!hasHeader){
      if(type!=='IHDR'||length!==13||buffer.readUInt32BE(offset+8)!==900||buffer.readUInt32BE(offset+12)!==500)return {ok:false,reason:'png_dimensions'};
      hasHeader=true;
    }
    if(type==='IDAT'&&length>0)hasData=true;
    offset+=length+12;
    if(type==='IEND'){if(length!==0)return {ok:false,reason:'png_end'};hasEnd=true;break;}
  }
  return hasHeader&&hasData&&hasEnd&&offset===buffer.length?{ok:true}:{ok:false,reason:'png_structure'};
}
if(typeof module!=='undefined')module.exports={externalChartPayloads,validateProviderPng};

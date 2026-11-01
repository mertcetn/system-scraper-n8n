function renderPriceChart(raw, period, timestamp) {
  const series = graphSeries(raw, period, timestamp);
  const width = 900, height = 500;
  const pixels = new Uint8Array(width * height);
  const glyphCache = new Map();
  function dot(x,y,color) {x=Math.round(x);y=Math.round(y);if(x>=0&&x<width&&y>=0&&y<height)pixels[y*width+x]=color;}
  function line(x0,y0,x1,y1,color) {
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
    for(;;){dot(x0,y0,color);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
  }
  function text(value,x,y,scale=2,color=3) {
    for(const char of String(value).toUpperCase()) {
      const glyph=CHART_FONT[scale][char]||CHART_FONT[scale][' '];
      const key=scale+':'+char;
      let mask=glyphCache.get(key);
      if(!mask){mask=new Uint8Array(glyph.w*glyph.h);let offset=0;for(const run of Buffer.from(glyph.p,'base64')){const count=(run&15)+1;mask.fill(run>>>4,offset,offset+count);offset+=count;}glyphCache.set(key,mask);}
      for(let row=0;row<glyph.h;row++)for(let col=0;col<glyph.w;col++){
        const alpha=mask[row*glyph.w+col];if(!alpha)continue;
        const px=Math.round(x+col),py=Math.round(y+row);if(px<0||px>=width||py<0||py>=height)continue;
        const background=pixels[py*width+px];
        dot(px,py,alpha===15?color:blend(color,background,alpha));
      }
      x+=glyph.a;
    }
  }
  function textWidth(value,scale=1){return Array.from(String(value).toUpperCase()).reduce((width,char)=>width+(CHART_FONT[scale][char]||CHART_FONT[scale][' ']).a,0);}
  function rect(x,y,w,h,color,radius=0) {
    for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){
      const dx=Math.max(x+radius-px,0,px-(x+w-radius-1));
      const dy=Math.max(y+radius-py,0,py-(y+h-radius-1));
      if(!radius||dx*dx+dy*dy<=radius*radius)dot(px,py,color);
    }
  }
  function circle(x,y,radius,color) {for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++)if(dx*dx+dy*dy<=radius*radius)dot(x+dx,y+dy,color);}
  const palette=[[12,18,30],[18,28,44],[37,51,69],[236,244,255],[66,209,191],[87,226,166],[137,157,180]];
  for(let i=0;i<16;i++){const t=i/15;palette.push([Math.round(18+13*t),Math.round(28+40*t),Math.round(44+36*t)]);}
  palette.push([28,75,80],[22,49,61]);
  const blendCache=new Map();
  function blend(foreground,background,alpha){
    const key=foreground+':'+background+':'+alpha;if(blendCache.has(key))return blendCache.get(key);
    const rgb=palette[foreground].map((value,i)=>Math.round((value*alpha+palette[background][i]*(15-alpha))/15));
    let index;
    if(palette.length<256){index=palette.length;palette.push(rgb);}else{
      let best=Infinity;for(let i=0;i<palette.length;i++){const distance=palette[i].reduce((sum,value,c)=>sum+(value-rgb[c])**2,0);if(distance<best){best=distance;index=i;}}
    }
    blendCache.set(key,index);return index;
  }
  rect(16,12,868,476,1,18);
  const titles={week:'1 HAFTA',month:'1 AY',year:'1 YIL',max:'MAX'};
  const detail={week:'GUNLUK MINIMUM',month:'HAFTALIK MINIMUM',year:'AYLIK MINIMUM',max:'AYLIK MINIMUM'};
  text('FİYAT GEÇMİŞİ',42,28,2,6);
  rect(708,28,150,32,24,9);text(titles[period],726,30,2,4);
  const valid=series.values.filter(value=>value!==null);
  const last=valid.at(-1);
  text(last===undefined?'HENÜZ VERİ YOK':last.toLocaleString('tr-TR')+' TL',42,60,3,3);
  text('SON NOKTA  /  '+detail[period],44,104,1,6);
  let low=valid.length?Math.min(...valid):0, high=valid.length?Math.max(...valid):100;
  const pad=Math.max((high-low)*0.15, high*0.015,1);low=Math.max(0,low-pad);high+=pad;
  const rough=(high-low)/4,magnitude=10**Math.floor(Math.log10(rough));
  const step=[1,2,2.5,5,10].map(value=>value*magnitude).find(value=>value>=rough);
  low=Math.max(0,Math.floor(low/step)*step);high=Math.ceil(high/step)*step;
  const left=110,right=848,top=152,bottom=338;
  const coordinates=series.values.map((value,i)=>value===null?null:{x:series.values.length===1?(left+right)/2:left+(right-left)*i/(series.values.length-1),y:bottom-(value-low)/(high-low)*(bottom-top)});
  for(let i=1;i<coordinates.length;i++){
    const a=coordinates[i-1],b=coordinates[i];if(!a||!b)continue;
    for(let x=Math.ceil(a.x);x<=b.x;x++){
      const y=a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
      for(let py=Math.ceil(y);py<=bottom;py++)dot(x,py,7+Math.round(15*(bottom-py)/(bottom-top)));
    }
  }
  for(let i=0;i<=4;i++) {const y=top+(bottom-top)*i/4;for(let x=left;x<=right;x+=9)line(x,y,Math.min(x+3,right),y,2);const label=Math.round(high-(high-low)*i/4).toLocaleString('tr-TR');text(label,left-18-textWidth(label),y-8,1,6);}
  text('TL',44,135,1,6);
  let previous=null;
  coordinates.forEach(point=>{
    if(!point){previous=null;return;}
    const {x,y}=point;
    if(previous)for(let shift=-1;shift<=1;shift++)line(previous.x,previous.y+shift,x,y+shift,4);
    circle(x,y,7,23);circle(x,y,4,4);circle(x,y,2,3);
    previous=point;
  });
  const stride=Math.max(1,Math.ceil((series.labels.length-1)/6));
  let previousLabelX=-Infinity;
  series.labels.forEach((label,i)=>{if(i%stride===0||i===series.labels.length-1){const x=series.labels.length===1?(left+right)/2:left+(right-left)*i/(series.labels.length-1);const compact=label.length===10?label.slice(8,10)+'.'+label.slice(5,7):label.slice(5,7)+'/'+label.slice(0,4);const measured=textWidth(compact);const start=x-measured/2;if(start>previousLabelX+12){text(compact,start,350,1,6);previousLabelX=start+measured;}}});
  rect(36,390,828,76,0,12);
  rect(36,406,3,44,5,1);
  if(series.minimum) {
    text('DÖNEMİN EN DÜŞÜK FİYATI',54,399,1,6);
    text(series.minimum.price.toLocaleString('tr-TR')+' TL',54,420,3,5);
    text('GÖRÜLDÜĞÜ GÜN',570,399,1,6);
    const date=graphLocalDay(series.minimum.observed_at).split('-').reverse().join('.');
    text(date,570,424,2,3);
  } else {text('BU DÖNEM İÇİN KAYITLI FİYAT YOK',54,412,2,6);}
  const scan=Buffer.alloc((width+1)*height);
  for(let y=0;y<height;y++){scan[y*(width+1)]=0;Buffer.from(pixels.subarray(y*width,(y+1)*width)).copy(scan,y*(width+1)+1);}
  const blocks=[Buffer.from([0x78,0x01])];
  for(let start=0;start<scan.length;start+=65535){const length=Math.min(65535,scan.length-start);const head=Buffer.alloc(5);head[0]=start+length===scan.length?1:0;head.writeUInt16LE(length,1);head.writeUInt16LE((~length)&65535,3);blocks.push(head,scan.subarray(start,start+length));}
  let a=1,b=0;for(const byte of scan){a=(a+byte)%65521;b=(b+a)%65521;}const checksum=Buffer.alloc(4);checksum.writeUInt32BE(((b<<16)|a)>>>0);blocks.push(checksum);
  function chunk(type,data){const tag=Buffer.from(type);let crc=0xffffffff;for(const byte of Buffer.concat([tag,data])){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const head=Buffer.alloc(4);head.writeUInt32BE(data.length);const tail=Buffer.alloc(4);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([head,tag,data,tail]);}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=3;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('PLTE',Buffer.from(palette.flat())),chunk('IDAT',Buffer.concat(blocks)),chunk('IEND',Buffer.alloc(0))]);
}
if (typeof module !== 'undefined') module.exports = {renderPriceChart};

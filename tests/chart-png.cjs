const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const lib = fs.readFileSync('lib/price-graphs.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,'');
const png = fs.readFileSync('lib/chart-png.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,'');
const font=fs.readFileSync('lib/chart-font.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,'');
const ctx={Buffer};vm.createContext(ctx);vm.runInContext(font+'\n'+lib+'\n'+png,ctx);
let raw=null;
for(let i=1;i<=7;i++)raw=ctx.addGraphObservation(raw,{current_price:20000+i*250,in_stock:true},'2026-11-0'+i+'T12:00:00.000Z');
for(const period of ['week','month','year','max']) {
  const bytes=ctx.renderPriceChart(raw,period,'2026-11-07T12:00:00.000Z');
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16),900);assert.equal(bytes.readUInt32BE(20),500);
  let offset=8,idat=[];
  while(offset<bytes.length){const length=bytes.readUInt32BE(offset),type=bytes.subarray(offset+4,offset+8).toString();if(type==='IDAT')idat.push(bytes.subarray(offset+8,offset+8+length));offset+=12+length;}
  assert.equal(zlib.inflateSync(Buffer.concat(idat)).length,901*500);
  if(process.argv.includes('--preview'))fs.writeFileSync('scratch/chart-'+period+'.png',bytes);
}
const empty=ctx.renderPriceChart(null,'week','2026-11-07T12:00:00.000Z');assert(empty.length>0);
console.log('PASS: four locally rendered PNGs, dimensions, lossless DEFLATE decoding, empty history');

const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const context={Buffer};vm.createContext(context);
for(const name of ['chart-font','price-graphs','chart-png','chart-providers'])vm.runInContext(fs.readFileSync('lib/'+name+'.js','utf8').replace(/if\s*\(typeof module\s*!==\s*'undefined'\).*$/m,''),context);
const observation=(day,price)=>({day,price,observed_at:day+'T12:00:00.000Z'});
const history={version:1,daily:[observation('2026-11-01',50000),observation('2026-11-03',49000),observation('2026-11-04',51000)],weekly:[observation('2026-11-02',49000)],monthly:[{...observation('2026-11-01',49000),observed_at:'2026-11-03T12:00:00.000Z'}]};
const raw=JSON.stringify(history),now='2026-11-07T12:00:00.000Z';
const payload=context.externalChartPayloads(raw,'week',now);
assert.equal(payload.ready,true);assert(payload.szum.config.caption.includes('2026-11-03'));assert(payload.szum.config.caption.includes('49.000'));
assert.equal(payload.quickchart.chart.data.datasets[0].spanGaps,false);
assert.equal(payload.quickchart.chart.data.datasets[0].data[1],null);
const segments=[...new Set(payload.szum.data.map(point=>point.segment))];assert.equal(segments.length,2);assert.notEqual(payload.szum.data[0].segment,payload.szum.data[1].segment);
assert.equal(context.externalChartPayloads(null,'week',now).ready,false);
for(const period of ['month','year','max'])assert.equal(context.externalChartPayloads(raw,period,now).ready,true);
const bytes=context.renderPriceChart(raw,'week',now),headers={'Content-Type':'image/png'};
assert.equal(context.validateProviderPng(bytes,200,headers).ok,true);
for(const status of [0,301,400,401,403,429,500,503])assert.equal(context.validateProviderPng(bytes,status,headers).ok,false);
assert.equal(context.validateProviderPng(bytes,200,{'content-type':'application/json'}).ok,false);
assert.equal(context.validateProviderPng(bytes,200,{...headers,'X-QuickChart-Error':'Failed'}).ok,false);
assert.equal(context.validateProviderPng(Buffer.from('<html>error</html>'),200,headers).ok,false);
assert.equal(context.validateProviderPng(bytes.subarray(0,bytes.length-3),200,headers).ok,false);
const corrupt=Buffer.from(bytes);corrupt[50]^=1;assert.equal(context.validateProviderPng(corrupt,200,headers).ok,false);
assert.equal(context.validateProviderPng(Buffer.concat([bytes,Buffer.from('extra')]),200,headers).ok,false);
const providerFile='workflows/render-external-price-chart.json';
if(fs.existsSync(providerFile)){
 const external=JSON.parse(fs.readFileSync(providerFile,'utf8'));
 for(const [name,guard]of [['Render With Szum','Validate Szum PNG'],['Render With QuickChart','Validate QuickChart PNG']]){
  const node=external.nodes.find(n=>n.name===name);assert.equal(node.onError,'continueErrorOutput');assert.notEqual(node.retryOnFail,true);assert.equal(node.parameters.options.timeout,8000);assert.equal(external.connections[name].main[1][0].node,guard);
 }
 assert.equal(external.nodes.find(n=>n.name==='Render With Szum').parameters.authentication,'genericCredentialType');
 assert.equal(external.nodes.find(n=>n.name==='Render With QuickChart').parameters.authentication,undefined);
 const main=JSON.parse(fs.readFileSync('workflows/render-price-history-chart.json','utf8'));
 assert.equal(main.connections['External PNG Ready?'].main[1][0].node,'Build Price Chart');
 assert.equal(main.connections['Render External Chart'].main[1][0].node,'Build Price Chart');
}
console.log('PASS: provider payloads, captions, gap preservation, empty-history quota guard, 2xx/content-type/error-header checks, PNG CRC/structure, failure wiring and local fallback');

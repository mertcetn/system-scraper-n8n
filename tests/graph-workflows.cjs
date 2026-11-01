const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const tracker=JSON.parse(fs.readFileSync('workflows/donanim-fiyat-takipcisi.json','utf8'));
const slash=JSON.parse(fs.readFileSync('workflows/discord-slash-komut-yoneticisi.json','utf8'));
const renderer=JSON.parse(fs.readFileSync('workflows/render-price-history-chart.json','utf8'));
const compare=tracker.nodes.find(n=>n.name==='Compare and Detect Drops').parameters.jsCode;
const info=slash.nodes.find(n=>n.name==='Format Graph Info').parameters.jsCode;
const lib=fs.readFileSync('lib/price-graphs.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,'').trim();
const png=fs.readFileSync('lib/chart-png.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,'').trim();
const font=fs.readFileSync('lib/chart-font.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,'').trim();
const infoLib=fs.readFileSync('lib/graph-info.js','utf8').replace(/if \(typeof module !== 'undefined'\).*$/m,'').trim();
assert(compare.includes(lib));assert(info.includes(lib));assert(info.includes(infoLib));
const render=renderer.nodes.find(n=>n.name==='Build Price Chart').parameters.jsCode;
assert(render.includes(lib));assert(render.includes(png));assert(render.includes(font));
assert(!renderer.nodes.some(n=>n.type==='n8n-nodes-base.httpRequest'));
function run(code,input,history=[],request={}) {return vm.runInNewContext('(function(){'+code+'\n})()', {Buffer,$input:{all:()=>input.map(json=>({json})),first:()=>({json:input[0]})},$:()=>({all:()=>history.map(json=>({json})),first:()=>({json:request})})},{timeout:2000});}
const base={product_id:'test_pc',product_name:'Original PC',current_price:100,in_stock:true,source_site:'pckolik',last_checked_at:'2026-11-01T12:00:00.000Z'};
const filter={drop_threshold_percent:5,notify_dm:false};
let result=run(compare,[{...base,current_price:90,matched_filters:[filter]}],[base])[0].json;
assert.equal(result.shouldNotify,true);assert.equal(JSON.parse(result.chart_history).daily.at(-1).price,90);
result=run(compare,[{...base,current_price:80,in_stock:false,matched_filters:[filter]}],[base])[0].json;
assert.equal(result.shouldNotify,false);assert.equal(JSON.parse(result.chart_history).monthly[0].price,100);
result=run(compare,[{...base,product_name:'Entirely Different System',current_price:50,matched_filters:[filter]}],[base])[0].json;
assert.equal(result.shouldNotify,false);assert.equal(result.previous_price,50);
const duplicate=run(compare,[{...base,current_price:90},{...base,current_price:95}],[base]);
assert.equal(JSON.parse(duplicate[1].json.chart_history).monthly[0].price,90);
const realRow={...base,id:123,chart_history:result.chart_history,product_url:'https://example.com/pc'};
const response=run(info,[realRow])[0].json;
assert.equal(response.type,4);assert.equal(response.data.flags,undefined);assert.equal(response.data.embeds.length,1);
assert.equal(response.data.components[0].components.length,4);
assert.equal(response.data.components[0].components[0].disabled,true);
for(const embed of response.data.embeds){assert(embed.footer.text.includes('50 TL'));assert(embed.footer.text.includes('Görüldüğü gün:'));assert(embed.image.url.includes('period='));}
for(const period of ['week','month','year','max']) {
  const updated=run(info,[realRow],[],{graphUpdate:true,period})[0].json;
  assert.equal(updated.type,7);assert.equal(updated.data.flags,undefined);assert.equal(updated.data.embeds.length,1);
  assert(updated.data.embeds[0].image.url.includes('period='+period));
  const selected=updated.data.components[0].components.filter(button=>button.disabled);
  assert.equal(selected.length,1);assert(selected[0].custom_id.endsWith(':'+period));
}
assert(run(info,[{}])[0].json.data.content.includes('bulunamıyor'));
assert(run(info,[{...realRow,chart_history:'broken'}])[0].json.data.content.includes('okunamadı'));
const lookup=slash.nodes.find(n=>n.name==='Get Graph Product');assert.equal(lookup.onError,'continueErrorOutput');
assert.equal(slash.connections['Get Graph Product'].main[1][0].node,'Format Graph Info');
assert.equal(renderer.connections['Get Chart Product'].main[1][0].node,'Respond Chart Error');
console.log('PASS: deployed helper parity, local fallback renderer, authentic minima, notification guards, one public graph, four period buttons, in-place updates and dates, missing/corrupt history, wired errors');

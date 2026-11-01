const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const workflow = JSON.parse(fs.readFileSync('workflows/discord-slash-komut-yoneticisi.json', 'utf8'));
const parser = workflow.nodes.find(n => n.name === 'Parse Interaction').parameters.jsCode;
const formatter = workflow.nodes.find(n => n.name === 'Format Cheapest Response').parameters.jsCode;
function parse(body) { return vm.runInNewContext('(function(){' + parser + '\n})()', {Buffer, $json: {body}}, {timeout: 1000})[0].json; }
function format(req, products) { return vm.runInNewContext('(function(){' + formatter + '\n})()', {Buffer, $: () => ({first: () => ({json: req})}), $input: {all: () => products.map(json => ({json}))}}, {timeout: 1000})[0].json; }
function command(sort) {return parse({type: 2, data: {name: 'ara', options: [{name: 'model', value: '5060'}, {name: 'site', value: 'pckolik'}, ...(sort ? [{name: 'siralama', value: sort}] : [])]}});}
const rows = Array.from({length: 15}, (_, i) => ({product_name: 'PC 5060 Series ' + (i + 1), current_price: 1000 + i * 100, in_stock: true, source_site: 'pckolik', product_url: 'https://example.com/' + (i + 1)}));
rows.forEach((row,i) => {row.id=i+1;});
rows.push({...rows[0], product_name: 'PC 5060 Ti', current_price: 1}, {...rows[0], in_stock: false, current_price: 2}, {...rows[0], source_site: 'itopya', current_price: 3});
const asc = command();
assert.equal(asc.sort, 'en_ucuz');
const cheap = format(asc, rows);
const infoButtons=cheap.data.components.flatMap(row=>row.components).filter(button=>button.custom_id.startsWith('price_info:'));
assert.equal(infoButtons.length,10);
assert.equal(parse({type:3,data:{custom_id:infoButtons[0].custom_id}}).action,'get_price_graph');
assert.equal(parse({type:3,data:{custom_id:'price_info:123'}}).row_id,'123');
assert.equal(parse({type:3,data:{custom_id:'price_info:123'}}).period,'week');
assert.equal(parse({type:3,data:{custom_id:'price_info:123'}}).graphUpdate,false);
for(const period of ['week','month','year','max']) {
  const req=parse({type:3,data:{custom_id:'price_graph:123:'+period}});
  assert.equal(req.action,'get_price_graph');assert.equal(req.row_id,'123');assert.equal(req.period,period);assert.equal(req.graphUpdate,true);
}
for(const id of ['price_graph:123:invalid','price_graph:bad:week','price_graph:0:week','price_graph:123:week:extra'])assert.equal(parse({type:3,data:{custom_id:id}}).action,'unknown');
assert.equal(parse({type:3,data:{custom_id:'price_info:invalid'}}).action,'unknown');
assert(cheap.data.components.every(row=>row.components.length<=5));
assert(cheap.data.embeds[0].description.indexOf('Series 1]') < cheap.data.embeds[0].description.indexOf('Series 2]'));
assert(!cheap.data.embeds[0].description.includes('5060 Ti'));
assert(cheap.data.embeds[0].footer.text.includes('15 sistem'));
const desc = command('en_pahali');
const expensive = format(desc, rows);
assert(expensive.data.embeds[0].description.indexOf('Series 15]') < expensive.data.embeds[0].description.indexOf('Series 14]'));
assert(expensive.data.embeds[0].title.includes('En Pahalı'));
const next = expensive.data.components[0].components[2].custom_id;
assert(next.length <= 100);
const page2 = parse({type: 3, data: {custom_id: next}});
assert.equal(page2.sort, 'en_pahali'); assert.equal(page2.model, '5060'); assert.equal(page2.site, 'pckolik'); assert.equal(page2.page, 2);
const second = format(page2, rows);
assert.equal(second.type, 7); assert(second.data.embeds[0].description.includes('Series 5]'));
const previous = parse({type: 3, data: {custom_id: second.data.components[0].components[0].custom_id}});
assert.equal(previous.page, 1); assert.equal(previous.sort, 'en_pahali');
assert.equal(parse({type: 3, data: {custom_id: 'enc_p:2:pckolik:5060'}}).sort, 'en_ucuz');
assert.equal(command('invalid').sort, 'en_ucuz');
assert.equal(format(asc, []).data.components.length, 0);
assert.equal(parse({type: 3, data: {custom_id: 'dbg_p:2'}}).isDebugVerbose, true);
assert(format({isDebugVerbose: true, sort: 'en_pahali'}, rows).data.embeds[0].title.includes('Debug'));
console.log('PASS: default/ascending/descending, model and retailer filters, stock exclusion, next/previous pagination, legacy buttons, invalid sorting, empty results, debug path');


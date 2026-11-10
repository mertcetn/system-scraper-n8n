const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const workflow = JSON.parse(fs.readFileSync('workflows/discord-slash-komut-yoneticisi.json', 'utf8'));
const parser = workflow.nodes.find(n => n.name === 'Parse Interaction').parameters.jsCode;
const formatter = workflow.nodes.find(n => n.name === 'Format Cheapest Response').parameters.jsCode;
function parse(body) { return vm.runInNewContext('(function(){' + parser + '\n})()', {Buffer, $json: {body}}, {timeout: 1000})[0].json; }
const now = Date.parse('2026-11-10T12:00:00Z');
class Clock extends Date {constructor(...args) {super(...(args.length ? args : [now]));} static now() {return now;}}
function format(req, products) { return vm.runInNewContext('(function(){' + formatter + '\n})()', {Buffer, Date: Clock, $: () => ({first: () => ({json: req})}), $input: {all: () => products.map(json => ({json}))}}, {timeout: 1000})[0].json; }
function command(sort) {return parse({type: 2, data: {name: 'ara', options: [{name: 'model', value: '5060'}, {name: 'site', value: 'pckolik'}, ...(sort ? [{name: 'siralama', value: sort}] : [])]}});}
const rows = Array.from({length: 15}, (_, i) => ({product_name: 'PC 5060 Series ' + (i + 1), current_price: 1000 + i * 100, in_stock: true, source_site: 'pckolik', product_url: 'https://example.com/' + (i + 1)}));
rows.forEach((row,i) => {row.id=i+1;row.last_checked_at=new Date(now).toISOString();});
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
assert.equal(asc.include_old,false);
const allRequest=parse({type:2,data:{name:'ara',options:[{name:'eskiler',value:true},{name:'siralama',value:'en_pahali'}]}});
assert.equal(allRequest.include_old,true);
assert.equal(parse({type:2,data:{name:'ara',options:[{name:'eskiler',value:'true'}]}}).include_old,false);
const staleRows=[
 {...rows[0],product_name:'Fresh 5060',last_checked_at:new Date(now-1000).toISOString()},
 {...rows[0],product_name:'Boundary 5060',last_checked_at:new Date(now-72*3600000).toISOString()},
 {...rows[0],product_name:'Expired 5060',last_checked_at:new Date(now-72*3600000-1).toISOString()},
 {...rows[0],product_name:'Old 5060',last_checked_at:new Date(now-4*86400000).toISOString()},
 {...rows[0],product_name:'Missing 5060',last_checked_at:undefined},
 {...rows[0],product_name:'Invalid 5060',last_checked_at:'broken'},
 {...rows[0],product_name:'Unavailable 5060',last_checked_at:new Date(now-4*86400000).toISOString(),in_stock:false}
];
const recent=format(asc,staleRows).data.embeds[0];
assert(recent.description.includes('Fresh 5060'));assert(recent.description.includes('Boundary 5060'));
for(const name of ['Expired','Old','Missing','Invalid','Unavailable'])assert(!recent.description.includes(name+' 5060'));
const withOld=format(allRequest,staleRows).data.embeds[0];
for(const name of ['Expired','Old','Missing','Invalid'])assert(withOld.description.includes(name+' 5060'));
assert(!withOld.description.includes('Unavailable 5060'));
assert(withOld.footer.text.includes('Eski kayıtlar dahil'));
assert.equal(format(asc,staleRows.slice(2)).data.components.length,0);
const oldPage=format({...allRequest,model:'5060',site:'pckolik'},rows);
const oldNext=parse({type:3,data:{custom_id:oldPage.data.components[0].components[2].custom_id}});
assert.equal(oldNext.include_old,true);assert.equal(oldNext.sort,'en_pahali');assert.equal(oldNext.model,'5060');assert.equal(oldNext.site,'pckolik');
const oldPrevious=parse({type:3,data:{custom_id:format(oldNext,rows).data.components[0].components[0].custom_id}});
assert.equal(oldPrevious.include_old,true);assert.equal(oldPrevious.page,1);
assert.equal(page2.include_old,false);
assert.equal(parse({type:3,data:{custom_id:'ara_p:2:pckolik:en_pahali:5060'}}).include_old,false);
assert.equal(parse({type:3,data:{custom_id:'enc_p:2:pckolik:5060'}}).include_old,false);
assert(format({isDebugVerbose:true},[staleRows[3]]).data.embeds[0].description.includes('Old 5060'));
const definition=JSON.parse(fs.readFileSync('discord/ara.command.json','utf8'));
assert.equal(definition.options.find(option=>option.name==='eskiler').type,5);
console.log('PASS: search filters, sorting, stock, 72-hour boundary, missing/invalid timestamps, include-old opt-in, pagination and legacy controls, debug unchanged');


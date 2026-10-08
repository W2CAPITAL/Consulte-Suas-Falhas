import assert from 'node:assert/strict';
import { gzipSync, gunzipSync } from 'node:zlib';
import worker from '../src/worker.js';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>';
const doc = {doc_id:'matheus',title:'Dossiê de teste',kind:'lawyer',scope:'MATHEUS',pages_imported:1,expected_pages:1};
let user = {username:'Profissional',role:'viewer',companies:'["GM"]',lawyers:'["MATHEUS"]'};
const DB = {prepare(sql){return {bind(...params){this.params=params;return this},async run(){return {}},async first(){
  if(sql.includes('FROM sessions'))return user;
  if(sql.includes('FROM app_settings'))return {value:'1'};
  if(sql.includes('FROM dossier_docs'))return this.params[0]==='matheus'?doc:null;
  if(sql.includes('page_svg_gzip'))return Number(this.params[1])===1?{page_svg_gzip:gzipSync(svg).toString('base64')}:null;
  throw Error('Unexpected fixture query: '+sql);
},async all(){
  if(sql.includes('FROM dossier_pages'))return {results:[{page_num:1,page_text:'<script>private text</script>',has_visual:1}]};
  throw Error('Unexpected fixture query: '+sql);
}}}};
const request = (path, authenticated=true) => worker.fetch(new Request('https://audit.test'+path,{headers:authenticated?{Cookie:'__Host-csf='+'a'.repeat(43)}:{}}),{DB});
for(const path of ['/html/matheus','/html/matheus/page/1.svg','/api/dossier/matheus']){
  assert.equal((await request(path,false)).status,401);
}
const visual = await request('/html/matheus/page/1.svg');
assert.equal(visual.status,200);
assert.equal(visual.headers.get('Content-Type'),'image/svg+xml; charset=utf-8');
assert.equal(visual.headers.get('Content-Encoding'),'gzip');
assert.equal(visual.headers.get('Cache-Control'),'private, no-store');
assert.equal(gunzipSync(Buffer.from(await visual.arrayBuffer())).toString(),svg);
assert.equal((await request('/html/matheus/page/2.svg')).status,404);
const html = await (await request('/html/matheus')).text();
assert.match(html,/src="\/html\/matheus\/page\/1\.svg"/);
assert.match(html,/&lt;script&gt;private text&lt;\/script&gt;/);
assert.doesNotMatch(html,/<script>private text/);
assert.equal((await (await request('/api/dossier/matheus')).json()).pages[0].has_visual,1);
user = {...user,lawyers:'["ANDRESSA"]'};
for(const path of ['/html/matheus','/html/matheus/page/1.svg','/api/dossier/matheus']){
  assert.equal((await request(path)).status,403,'Other professionals must not read the page or its vector image');
}
console.log('PASS: vector page fidelity, escaped text, private cache and matching authorization for HTML, images and JSON.');

import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT=8798,base='http://127.0.0.1:'+PORT;
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1','--port',String(PORT)],{
 stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false',CI:'true'}
});
let logs='';
child.stdout.on('data',x=>{logs+=x.toString().slice(-3000)});
child.stderr.on('data',x=>{logs+=x.toString().slice(-3000)});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(path){
 const response=await fetch(base+path,{redirect:'manual'});
 return {status:response.status,headers:response.headers,body:await response.text()};
}
try{
 let live=false;
 for(let i=0;i<80;i++){
  if(child.exitCode!==null)break;
  try{const r=await get('/api/health');if(r.status===200){live=true;break}}catch{}
  await sleep(500);
 }
 assert.ok(live,'Cloudflare Worker did not start: '+logs.slice(-2000));
 const page=await get('/');
 assert.equal(page.status,200);
 assert.match(page.body,/Consulte Suas Falhas/);
 assert.match(page.body,/id="navMenu"/);
 assert.match(page.body,/showLibrary/);
 assert.match(page.body,/readDocument/);
 assert.match(page.body,/docViewer/);
 assert.match(page.body,/portal-app/);
 assert.doesNotMatch(page.body,/Os PDFs de auditoria são documentos privados e serão servidos/);
 assert.doesNotMatch(page.body,/Vídeos publicados depois de revisão/);
 const auth=await get('/api/auth/status');
 assert.equal(auth.status,200);
 assert.equal(JSON.parse(auth.body).authenticated,false);
 const summary=await get('/api/summary');
 assert.equal(summary.status,401);
 for(const p of ['/api/processes','/api/ranking','/api/numopede','/api/dossiers','/api/dossier/matheus','/html/matheus','/html/resumo','/api/media/list','/api/report/print']){
   const r=await get(p);assert.equal(r.status,401,p+' must reject unauthenticated requests');
 }
 console.log('PASS: actual Wrangler worker boots, game UI renders, no placeholders, login works, restricted APIs deny anonymous visitors.');
}catch(e){console.error(String(e),logs.slice(-3500));process.exitCode=1}
finally{child.kill('SIGTERM')}

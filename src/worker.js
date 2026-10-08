import { PAGE } from './page.js';
import { handleMedia } from './media.js';
import { ensureReady, loginIsRequired, getSession, authRequest } from './auth.js';

const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const arr=s=>{try{const v=JSON.parse(s||'[]');return Array.isArray(v)?v:[]}catch{return []}};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const COMPANIES=['GM','JVA','HUGS','VINCULO A CONFIRMAR'];
const LAWYERS=['MATHEUS','ANDRESSA','ERALDO','MAIKON','GILBERTO','ISAI','FABIO'];
const allowAny=(list)=>list.includes('*');
const isAdmin=u=>u?.role==='admin';
function permissions(user){return {admin:isAdmin(user),companies:arr(user?.companies).map(norm).filter(x=>x==='*'||COMPANIES.includes(x)),lawyers:arr(user?.lawyers).map(norm).filter(x=>x==='*'||LAWYERS.includes(x))}}
function scopeSql(perms,table){
 const wh=[],args=[];
 if(perms.admin)return {wh,args};
 if(!perms.companies.length||!perms.lawyers.length)return {wh:['1=0'],args};
 if(!allowAny(perms.companies)){wh.push(table+'.escritorio IN ('+perms.companies.map(()=>'?').join(',')+')');args.push(...perms.companies)}
 if(!allowAny(perms.lawyers)){wh.push('EXISTS (SELECT 1 FROM json_each('+table+'.advogados) aj WHERE UPPER(aj.value) IN ('+perms.lawyers.map(()=>'?').join(',')+'))');args.push(...perms.lawyers)}
 return {wh,args};
}
function selectedSearch(perms,u,alias){
 const {wh,args}=scopeSql(perms,alias);
 const company=norm(u.searchParams.get('company')||'TODOS'),lawyer=norm(u.searchParams.get('lawyer')||'TODOS');
 if(company!=='TODOS'){if(!COMPANIES.includes(company))return {error:'Empresa inválida'};wh.push(alias+'.escritorio=?');args.push(company)}
 if(lawyer!=='TODOS'){if(!LAWYERS.includes(lawyer))return {error:'Advogado inválido'};wh.push('EXISTS (SELECT 1 FROM json_each('+alias+'.advogados) sl WHERE UPPER(sl.value)=?)');args.push(lawyer)}
 return {wh,args,company,lawyer};
}
function msgSql(perms,u){
 const {wh,args}=scopeSql(perms,'p');
 const selected=selectedSearch(perms,u,'p');
 if(selected.error)return selected;
 if(!perms.admin){
   return {wh:['EXISTS(SELECT 1 FROM message_case_links l JOIN processes p ON p.cnj=l.cnj WHERE l.message_id=m.message_id AND '+(selected.wh.length?selected.wh.join(' AND '):'1=1')+')'],args:selected.args};
 }
 const other=[],otherArgs=[];
 if(selected.company!=='TODOS'){other.push('m.office=?');otherArgs.push(selected.company)}
 if(selected.lawyer!=='TODOS'){other.push('EXISTS(SELECT 1 FROM message_case_links l JOIN processes p ON p.cnj=l.cnj WHERE l.message_id=m.message_id AND EXISTS(SELECT 1 FROM json_each(p.advogados) j WHERE UPPER(j.value)=?))');otherArgs.push(selected.lawyer)}
 return {wh:other,args:otherArgs};
}
const where=arr=>' '+(arr.length?'WHERE '+arr.join(' AND '):'');
const positivePage=s=>Math.min(9999,Math.max(1,parseInt(s,10)||1));
async function setupReviewTables(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS audit_reviews(record_id INTEGER NOT NULL,username TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL,updated_at INTEGER NOT NULL DEFAULT (unixepoch()),PRIMARY KEY(record_id,username))').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS audit_review_history(id INTEGER PRIMARY KEY AUTOINCREMENT,record_id INTEGER NOT NULL,username TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL,updated_at INTEGER NOT NULL DEFAULT (unixepoch()))').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS numopede_checks(cnj TEXT PRIMARY KEY,status TEXT NOT NULL DEFAULT \'CANDIDATO\',criterio TEXT NOT NULL DEFAULT \'\',source_url TEXT NOT NULL DEFAULT \'\',checked_at INTEGER)').run();
}
let initialized;
async function ensureExtras(env){if(!initialized)initialized=setupReviewTables(env).catch(e=>{initialized=null;throw e});return initialized}
async function countSummary(env,perms){
 const scope=scopeSql(perms,'p'),clause=where(scope.wh);
 const n=await env.DB.prepare('SELECT COUNT(*) registros,COUNT(DISTINCT NULLIF(cnj,\'\')) cnjs,COALESCE(SUM(qtd_erros),0) atribuicoes,SUM(CASE WHEN qtd_erros>0 THEN 1 ELSE 0 END) comErro FROM processes p'+clause).bind(...scope.args).first();
 const countMessage=perms.admin
 ? await env.DB.prepare('SELECT COUNT(*) n FROM messages').first()
 : await env.DB.prepare('SELECT COUNT(DISTINCT m.message_id) n FROM messages m JOIN message_case_links l ON l.message_id=m.message_id JOIN processes p ON p.cnj=l.cnj'+clause).bind(...scope.args).first();
 const candidates=await env.DB.prepare('SELECT COUNT(DISTINCT n.cnj) n FROM numopede_checks n JOIN processes p ON p.cnj=n.cnj'+clause).bind(...scope.args).first();
 return {processos:n.registros,cnjs:n.cnjs,comErro:n.comErro,atribuicoes:n.atribuicoes,mensagens:countMessage.n,numopedeCandidatos:candidates.n,totalMensagensPrevistas:20973,integrado:n.registros>0,ressalva:'Apontamento atribuído não é culpa comprovada. Candidato NUMOPEDE não é ofício nem punição.'};
}
export default {async fetch(request,env){
 try{
 const u=new URL(request.url),route=u.pathname;
 if(route==='/'||route==='/index.html')return new Response(PAGE,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"}});
 if(route==='/api/health')return send({online:true,d1:!!env.DB});
 if(!route.startsWith('/api/'))return new Response('Not Found',{status:404});
 if(!env.DB)return send({error:'D1 não conectado'},503);
 await ensureReady(env);
 if(route.startsWith('/api/auth/'))return authRequest(request,env);
 const owner=await getSession(request,env);
 const required=await loginIsRequired(env);
 if(!owner&&(required||route!=='/api/summary'))return send({error:'Autentique-se para consultar dados pessoais'},401);
 const perms=owner?permissions(owner):{admin:true,companies:['*'],lawyers:['*']};
 await ensureExtras(env);
 if(route.startsWith('/api/media/'))return handleMedia(request,env,owner);
 if(route==='/api/summary'&&request.method==='GET')return send(await countSummary(env,perms));
 if(!owner)return send({error:'Acesso não autorizado'},401);
 if(route==='/api/dossiers'&&request.method==='GET'){
  const docs=await env.DB.prepare('SELECT doc_id,title,kind,scope,expected_pages,pages_imported FROM dossier_docs WHERE pages_imported=expected_pages AND pages_imported>0 ORDER BY CASE kind WHEN \'summary\' THEN 0 WHEN \'office\' THEN 1 WHEN \'lawyer\' THEN 2 ELSE 3 END,title').all();
  const approved=docs.results.filter(d=>perms.admin||(d.kind==='lawyer'&&(perms.lawyers.includes('*')||perms.lawyers.includes(d.scope))));
  return send({items:approved,total:approved.length,description:'Versões HTML pesquisáveis de PDFs originais. Somente dados autorizados; os PDFs não foram publicados no repositório.'});
 }
 if(route.startsWith('/api/dossier/')&&request.method==='GET'){
  const id=route.slice('/api/dossier/'.length).toLowerCase();
  if(!/^[a-z0-9_-]{2,35}$/.test(id))return send({error:'Documento inválido'},400);
  const doc=await env.DB.prepare('SELECT doc_id,title,kind,scope,expected_pages,pages_imported FROM dossier_docs WHERE doc_id=? AND pages_imported=expected_pages AND pages_imported>0').bind(id).first();
  if(!doc)return send({error:'Dossiê indisponível'},404);
  if(!perms.admin&&!(doc.kind==='lawyer'&&(perms.lawyers.includes('*')||perms.lawyers.includes(doc.scope))))return send({error:'Sem acesso a este dossiê'},403);
  const start=Math.max(1,Math.min(doc.pages_imported,parseInt(u.searchParams.get('start')||'1',10)||1));
  const limit=Math.max(1,Math.min(12,parseInt(u.searchParams.get('limit')||'6',10)||6));
  const rows=await env.DB.prepare('SELECT page_num,page_text FROM dossier_pages WHERE doc_id=? AND page_num>=? AND page_num<? ORDER BY page_num').bind(id,start,start+limit).all();
  return send({doc,pages:rows.results,start,next:start+rows.results.length<=doc.pages_imported?start+rows.results.length:null,complete:start+rows.results.length>doc.pages_imported});
 }
 if(route==='/api/overview'&&request.method==='GET'){
   const s=scopeSql(perms,'p'),base=where(s.wh);
   const rows=await env.DB.prepare('SELECT p.escritorio, COUNT(*) total FROM processes p'+base+' GROUP BY p.escritorio').bind(...s.args).all();
   const rank=await env.DB.prepare('SELECT p.advogados,p.qtd_erros FROM processes p'+base).bind(...s.args).all();
   const stats=new Map();
   for(const v of rank.results){for(const x of [...new Set(arr(v.advogados).map(norm))]){if(!x)continue;const z=stats.get(x)||{nome:x,processos:0,atribuicoes:0};z.processos++;z.atribuicoes+=Number(v.qtd_erros)||0;stats.set(x,z)}}
   return send({companies:rows.results,lawyers:[...stats.values()].sort((a,b)=>b.atribuicoes-a.atribuicoes),disclaimer:'Contagem interna de atribuições; não representa culpa ou condenação.'});
 }
 if(route==='/api/report/print'&&request.method==='GET'){
  const scope=selectedSearch(perms,u,'p');if(scope.error)return send({error:scope.error},400);
  const records=await env.DB.prepare('SELECT p.processo,p.cnj,p.cliente,p.escritorio,p.advogados,p.qtd_erros,p.payload,n.status numopede_status FROM processes p LEFT JOIN numopede_checks n ON n.cnj=p.cnj'+where(scope.wh)+' ORDER BY p.qtd_erros DESC,p.record_id LIMIT 2000').bind(...scope.args).all();
  const escape=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const office=escape(scope.company),lawyer=escape(scope.lawyer);
  const count=records.results.length,flagged=records.results.filter(x=>x.qtd_erros>0).length,candidate=records.results.filter(x=>x.numopede_status).length;
  let html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dossiê de auditoria · '+office+' / '+lawyer+'</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:11px/1.48 "Segoe UI",Arial,sans-serif;color:#162a3b;margin:0}header{padding:25px;background:#0c2840;color:white;border-bottom:6px solid #c99b4d}header h1{font-size:28px;margin:0;font-family:Georgia,serif}header p{margin:8px 0 0}.wrap{padding:16px}.kpi{display:inline-block;padding:14px;border:1px solid #bdc8d2;border-radius:7px;margin:6px 6px 12px 0;font-size:16px}h2{color:#0c2840;border-bottom:2px solid #c99b4d;padding-bottom:6px;margin-top:26px}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{padding:7px 5px;text-align:left;vertical-align:top;border-bottom:1px solid #d9e1e8;word-break:break-word}th{background:#dce6ee}.case{page-break-inside:avoid;border:1px solid #dbe5eb;border-left:3px solid #b78c4a;padding:11px;margin:9px 0}.case h3{margin:0 0 8px;font-size:13px}.case p{margin:4px 0;white-space:pre-wrap}.note{border-left:3px solid #bb934e;padding:9px;background:#f9f4e9}.printbar{position:sticky;top:0;background:#18374d;padding:9px;color:white}.printbar button{padding:10px 17px;cursor:pointer}@media print{.printbar{display:none}header{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style><div class="printbar">Documento privado: use Ctrl+P para salvar como PDF. <button onclick="print()">Imprimir / Salvar em PDF</button></div><header><div>W1 SOLUÇÕES CAPITAIS · AUDITORIA DOCUMENTAL</div><h1>Dossiê de processos e falhas</h1><p>Carteira: '+office+' &nbsp; | &nbsp; Advogado: '+lawyer+' &nbsp; | &nbsp; Emitido: '+escape(new Date().toISOString().slice(0,10))+'</p></header><main class="wrap"><div class="kpi"><b>'+count+'</b> registros</div><div class="kpi"><b>'+flagged+'</b> com apontamento</div><div class="kpi"><b>'+candidate+'</b> candidatos NUMOPEDE</div><p class="note"><b>Critério:</b> apontamento interno não é culpa comprovada. Candidato NUMOPEDE não comprova ofício expedido, recebimento ou punição. O vínculo de escritório segue os dados da carteira e pode estar em confirmação.</p><h2>Índice dos processos</h2><table><thead><tr><th style="width:23%">CNJ / Processo</th><th style="width:29%">Cliente</th><th style="width:21%">Advogado</th><th style="width:12%">Escritório</th><th style="width:15%">Apontamentos</th></tr></thead><tbody>';
  for(const x of records.results)html+='<tr><td>'+escape(x.processo)+'</td><td>'+escape(x.cliente)+'</td><td>'+escape(arr(x.advogados).join(', '))+'</td><td>'+escape(x.escritorio)+'</td><td>'+escape(x.qtd_erros)+'</td></tr>';
  html+='</tbody></table><h2>Apontamentos individualizados</h2>';
  const cases=records.results.filter(x=>x.qtd_erros>0||x.numopede_status);
  for(const x of cases){
   let p={};try{p=JSON.parse(x.payload)}catch{}
   const errors=Array.isArray(p.erros_detalhados)?p.erros_detalhados:[];
   html+='<article class="case"><h3>'+escape(x.processo)+' · '+escape(x.cliente)+'</h3><p><b>Responsáveis listados:</b> '+escape(arr(x.advogados).join(', '))+'</p><p><b>Apontamentos:</b> '+escape(x.qtd_erros)+'</p>';
   if(x.numopede_status)html+='<p><b>NUMOPEDE:</b> '+escape(x.numopede_status)+' — conferir decisão e fonte oficial.</p>';
   if(errors.length)for(const e of errors)html+='<p><b>'+escape(e.tipo)+':</b> '+escape(e.evidencia)+'<br><b>Providência:</b> '+escape(e.providencia)+'</p>';
   else html+='<p>'+escape(p.Erros||p['Erros registrados']||'Consultar documentos vinculados e andamento do processo.')+'</p>';
   html+='</article>';
  }
  html+='<p class="note">Dados extraídos da carteira D1 no momento da emissão. O documento não substitui consulta aos autos, contraditório, análise do advogado ou confirmação oficial.</p></main></html>';
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
 }
 const params=selectedSearch(perms,u,'p'),q=String(u.searchParams.get('q')||'').trim().slice(0,150),page=positivePage(u.searchParams.get('page'));
 if(params.error)return send({error:params.error},400);
 if(route==='/api/processes'&&request.method==='GET'){
  const wh=[...params.wh],args=[...params.args];if(q){wh.push('(p.cliente LIKE ? OR p.processo LIKE ? OR p.payload LIKE ?)');args.push(...Array(3).fill('%'+q+'%'))}
  const clause=where(wh),cnt=await env.DB.prepare('SELECT COUNT(*) n FROM processes p'+clause).bind(...args).first();
  const rows=await env.DB.prepare('SELECT p.record_id,p.processo,p.cnj,p.cliente,p.escritorio,p.advogados,p.qtd_erros,n.status numopede FROM processes p LEFT JOIN numopede_checks n ON n.cnj=p.cnj'+clause+' ORDER BY p.qtd_erros DESC,p.record_id LIMIT 25 OFFSET ?').bind(...args,(page-1)*25).all();
  return send({total:cnt.n,page,items:rows.results.map(r=>({...r,advogados:arr(r.advogados).join(', ')}))});
 }
 if(route==='/api/messages'&&request.method==='GET'){
  const b=msgSql(perms,u);if(b.error)return send({error:b.error},400);
  const wh=[...b.wh],args=[...b.args];
  if(q){wh.push('(m.body LIKE ? OR m.speaker LIKE ? OR m.source LIKE ? OR m.cnjs LIKE ?)');args.push(...Array(4).fill('%'+q+'%'))}
  const clause=where(wh),cnt=await env.DB.prepare('SELECT COUNT(*) n FROM messages m'+clause).bind(...args).first();
  const rows=await env.DB.prepare('SELECT m.message_id,m.source,m.office,m.date_text,m.time_text,m.speaker,substr(m.body,1,850) body FROM messages m'+clause+' ORDER BY m.message_id DESC LIMIT 25 OFFSET ?').bind(...args,(page-1)*25).all();
  return send({total:cnt.n,page,items:rows.results});
 }
 if(route==='/api/ranking'&&request.method==='GET'){
  const r=await env.DB.prepare('SELECT p.advogados,p.qtd_erros FROM processes p'+where(params.wh)).bind(...params.args).all(),map=new Map();
  for(const p of r.results){for(const x of [...new Set(arr(p.advogados).map(norm))]){if(!x)continue;map.set(x,(map.get(x)||0)+(Number(p.qtd_erros)||0))}}
  return send({items:[...map].map(([nome,atribuicoes])=>({nome,atribuicoes})).sort((a,b)=>b.atribuicoes-a.atribuicoes),note:'Atribuições da base, inclusive compartilhadas. Este ranking NÃO determina culpa.'});
 }
 if(route==='/api/numopede'&&request.method==='GET'){
  const wh=[...params.wh],args=[...params.args];wh.push('n.cnj IS NOT NULL');
  if(q){wh.push('(p.cnj LIKE ? OR p.processo LIKE ? OR p.cliente LIKE ? OR n.criterio LIKE ?)');args.push(...Array(4).fill('%'+q+'%'))}
  const base=' FROM processes p JOIN numopede_checks n ON n.cnj=p.cnj'+where(wh);
  const cnt=await env.DB.prepare('SELECT COUNT(*) n'+base).bind(...args).first();
  const rows=await env.DB.prepare('SELECT p.record_id,p.processo,p.cliente,p.advogados,p.escritorio,p.qtd_erros,n.status,n.criterio,n.source_url,n.checked_at'+base+' ORDER BY p.qtd_erros DESC LIMIT 25 OFFSET ?').bind(...args,(page-1)*25).all();
  return send({total:cnt.n,page,items:rows.results.map(x=>({...x,advogados:arr(x.advogados).join(', ')})),note:'CANDIDATO não comprova encaminhamento oficial ao NUMOPEDE.'});
 }
 if(route==='/api/review'&&(request.method==='GET'||request.method==='POST')){
  if(request.method==='POST'&&request.headers.get('Origin')!==u.origin)return send({error:'Origem inválida'},403);
  let b={};if(request.method==='POST'){if(Number(request.headers.get('Content-Length')||0)>5000)return send({error:'Texto grande demais'},413);b=await request.json().catch(()=>({}));}
  const id=Number(request.method==='GET'?u.searchParams.get('record_id'):b.record_id);
  if(!Number.isSafeInteger(id)||id<1)return send({error:'Registro inválido'},400);
  const eligible=await env.DB.prepare('SELECT p.record_id FROM processes p'+where(['p.record_id=?',...scopeSql(perms,'p').wh])).bind(id,...scopeSql(perms,'p').args).first();
  if(!eligible)return send({error:'Processo indisponível para esta conta'},404);
  if(request.method==='GET'){
   const wh=isAdmin(owner)?'record_id=?':'record_id=? AND username=?',args=isAdmin(owner)?[id]:[id,owner.username];
   const rows=await env.DB.prepare('SELECT username,status,note,updated_at FROM audit_reviews WHERE '+wh+' ORDER BY updated_at DESC').bind(...args).all();
   return send({items:rows.results,mayEdit:true});
  }
  const status=String(b.status||''),note=String(b.note||'').trim();
  if(!['EM_ANALISE','RECONHECIDO','CONTESTADO','CORRIGIDO'].includes(status)||note.length>1800)return send({error:'Situação ou observação inválida'},400);
  await env.DB.prepare('INSERT INTO audit_reviews(record_id,username,status,note) VALUES(?,?,?,?) ON CONFLICT(record_id,username) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=unixepoch()').bind(id,owner.username,status,note).run();
  await env.DB.prepare('INSERT INTO audit_review_history(record_id,username,status,note) VALUES(?,?,?,?)').bind(id,owner.username,status,note).run();
  return send({ok:true,observacao:'Registro pessoal preservado; não altera os dados e provas originais.'});
 }
 if(route.startsWith('/api/process/')&&request.method==='GET'){
  const id=Number(route.substring('/api/process/'.length));if(!Number.isSafeInteger(id))return send({error:'Identificador inválido'},400);
  const s=scopeSql(perms,'p');
  const row=await env.DB.prepare('SELECT p.*,n.status numopede_status,n.criterio numopede_criterio,n.source_url numopede_fonte FROM processes p LEFT JOIN numopede_checks n ON n.cnj=p.cnj'+where(['p.record_id=?',...s.wh])).bind(id,...s.args).first();
  return row?send({...row,payload:JSON.parse(row.payload)}):send({error:'Registro não encontrado ou não autorizado'},404);
 }
 if(route.startsWith('/api/message/')&&request.method==='GET'){
  const id=Number(route.substring('/api/message/'.length));if(!Number.isSafeInteger(id))return send({error:'Identificador inválido'},400);
  const b=msgSql(perms,new URL(request.url));if(b.error)return send({error:b.error},400);
  const row=await env.DB.prepare('SELECT m.* FROM messages m'+where(['m.message_id=?',...b.wh])).bind(id,...b.args).first();
  return row?send(row):send({error:'Mensagem não encontrada ou não autorizada'},404);
 }
 return send({error:'Rota não encontrada'},404);
 }catch(e){return send({error:'Erro interno do servidor'},500)}
}};

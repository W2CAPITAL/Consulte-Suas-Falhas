import { PAGE } from './page.js';
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const parse=s=>{try{return JSON.parse(s||'[]')}catch{return []}};
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
function dec(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))}async function access(req,env){const t=req.headers.get('Cf-Access-Jwt-Assertion');if(!t||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return null;try{const p=t.split('.'),h=JSON.parse(new TextDecoder().decode(dec(p[0]))),b=JSON.parse(new TextDecoder().decode(dec(p[1]))),iss='https://'+env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,'').replace(/\/$/,'');if(h.alg!=='RS256'||b.iss!==iss||b.exp*1000<=Date.now()||!([].concat(b.aud).includes(env.ACCESS_AUD)))return null;const res=await fetch(iss+'/cdn-cgi/access/certs');if(!res.ok)return null;const k=(await res.json()).keys.find(x=>x.kid===h.kid);if(!k)return null;const key=await crypto.subtle.importKey('jwk',k,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,dec(p[2]),new TextEncoder().encode(p[0]+'.'+p[1]))?b:null}catch{return null}}
export default {async fetch(request,env){try{
 const u=new URL(request.url),route=u.pathname;
 if(route==='/'||route==='/index.html')return new Response(PAGE,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"}});
 if(route==='/api/health')return send({online:true,d1:!!env.DB});
 if(!route.startsWith('/api/'))return new Response('Not Found',{status:404});
 if(!env.DB)return send({error:'D1 não conectado'},503);
 if(request.method!=='GET')return send({error:'Somente consulta'},405);
 if(route==='/api/summary'){const [p,m,e]=await Promise.all([env.DB.prepare('SELECT COUNT(*) c FROM processes').first(),env.DB.prepare('SELECT COUNT(*) c FROM messages').first(),env.DB.prepare('SELECT COUNT(*) c FROM processes WHERE qtd_erros>0').first()]);return send({processos:p.c,mensagens:m.c,comErro:e.c,integrado:!!(p.c&&m.c)})}
 const claims=await access(request,env);
 if(!claims)return send({error:'Para consultar dados privados, habilite Cloudflare Access. Não há login ou senha próprios do aplicativo.'},403);
 let permissions;try{permissions=JSON.parse(env.USER_SCOPES_JSON||'{}')}catch{return send({error:'Permissões inválidas'},503)}
 const role=permissions[String(claims.email||'').toLowerCase()];
 if(!role)return send({error:'Sem permissão para esta carteira'},403);
 const office=u.searchParams.get('company')||'TODOS',lawyer=u.searchParams.get('lawyer')||'TODOS',q=(u.searchParams.get('q')||'').slice(0,150),page=Math.min(9999,Math.max(1,Number(u.searchParams.get('page'))||1));
 const allowed=o=>role.role==='admin'||(role.companies||[]).includes(o),allowedLawyer=l=>role.role==='admin'||(role.lawyers||[]).includes('*')||(role.lawyers||[]).some(x=>normalize(x)===normalize(l));
 if(route==='/api/processes'){
  const cond=[],p=[];if(role.role!=='admin'){const ls=role.companies||[];if(!ls.length)return send({total:0,items:[],page});cond.push('escritorio IN ('+ls.map(()=>'?').join(',')+')');p.push(...ls)}
  if(office!=='TODOS'){if(!allowed(office))return send({error:'Sem acesso ao escritório'},403);cond.push('escritorio=?');p.push(office)}
  if(lawyer!=='TODOS'){if(!allowedLawyer(lawyer))return send({error:'Sem acesso ao advogado'},403);cond.push('UPPER(advogados) LIKE ?');p.push('%'+normalize(lawyer)+'%')}
  if(q){cond.push('(cliente LIKE ? OR processo LIKE ? OR payload LIKE ?)');p.push(...Array(3).fill('%'+q+'%'))}
  const where=cond.length?' WHERE '+cond.join(' AND '):'',n=await env.DB.prepare('SELECT COUNT(*) n FROM processes'+where).bind(...p).first(),rows=await env.DB.prepare('SELECT record_id,processo,cliente,escritorio,advogados,qtd_erros FROM processes'+where+' ORDER BY qtd_erros DESC,record_id LIMIT 25 OFFSET ?').bind(...p,(page-1)*25).all();
  return send({total:n.n,page,items:rows.results.map(x=>({...x,advogados:parse(x.advogados).join(', ')}))});
 }
 if(route==='/api/messages'){
  const cond=[],p=[];if(role.role!=='admin'){const ls=role.companies||[];if(!ls.length)return send({total:0,items:[],page});cond.push('m.office IN ('+ls.map(()=>'?').join(',')+')');p.push(...ls)}
  if(office!=='TODOS'){if(!allowed(office))return send({error:'Sem acesso ao escritório'},403);cond.push('m.office=?');p.push(office)}
  if(lawyer!=='TODOS'){if(!allowedLawyer(lawyer))return send({error:'Sem acesso ao advogado'},403);cond.push('EXISTS(SELECT 1 FROM message_case_links l JOIN processes x ON x.cnj=l.cnj WHERE l.message_id=m.message_id AND UPPER(x.advogados) LIKE ?)');p.push('%'+normalize(lawyer)+'%')}
  if(q){cond.push('(m.body LIKE ? OR m.speaker LIKE ? OR m.source LIKE ? OR m.cnjs LIKE ?)');p.push(...Array(4).fill('%'+q+'%'))}
  const where=cond.length?' WHERE '+cond.join(' AND '):'',n=await env.DB.prepare('SELECT COUNT(*) n FROM messages m'+where).bind(...p).first(),rows=await env.DB.prepare('SELECT m.message_id,m.source,m.office,m.date_text,m.time_text,m.speaker,substr(m.body,1,450) body FROM messages m'+where+' ORDER BY m.message_id DESC LIMIT 25 OFFSET ?').bind(...p,(page-1)*25).all();
  return send({total:n.n,page,items:rows.results});
 }
 if(route.startsWith('/api/process/')){const r=await env.DB.prepare('SELECT * FROM processes WHERE record_id=?').bind(Number(route.split('/').pop())).first();if(!r)return send({error:'Não encontrado'},404);if(!allowed(r.escritorio)||(!parse(r.advogados).some(allowedLawyer)&&role.role!=='admin'))return send({error:'Acesso negado'},403);return send({...r,payload:JSON.parse(r.payload)})}
 if(route.startsWith('/api/message/')){const r=await env.DB.prepare('SELECT * FROM messages WHERE message_id=?').bind(Number(route.split('/').pop())).first();if(!r)return send({error:'Não encontrada'},404);if(!allowed(r.office))return send({error:'Acesso negado'},403);return send(r)}
 return send({error:'Rota não encontrada'},404);
 }catch{return send({error:'Falha interna da consulta'},500)}}};
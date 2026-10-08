import { verifyPasswordProof } from './login-proof.js';

const DUMMY_SALT='MDEyMzQ1Njc4OWFiY2RlZg';
const DEFAULT_ITER=310000;
const enc=new TextEncoder();
const random=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-String(s).length%4)%4)),c=>c.charCodeAt(0));
const b64=buffer=>btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hash=async s=>b64(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const ctEquals=(a,b)=>{if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0};
const res=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const sessCookie=(s,maxage)=>'__Host-csf='+s+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+maxage;
const validOrigin=req=>req.headers.get('Origin')===new URL(req.url).origin;
let initialized;
export async function ensureReady(env){
 if(!initialized) initialized=(async()=>{
   for(const sql of [
    'CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY COLLATE NOCASE,salt TEXT NOT NULL,hash TEXT NOT NULL,iterations INTEGER NOT NULL,role TEXT NOT NULL,companies TEXT NOT NULL,lawyers TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,username TEXT NOT NULL,expires INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,failures INTEGER NOT NULL DEFAULT 0,locked_until INTEGER NOT NULL DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS auth_challenges(challenge_id TEXT PRIMARY KEY,username TEXT NOT NULL,nonce TEXT NOT NULL,expires INTEGER NOT NULL)'
   ])await env.DB.prepare(sql).run();
   await env.DB.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('login_required','1')").run();
 })().catch(e=>{initialized=null;throw e});
 return initialized;
}
export async function loginIsRequired(env){const r=await env.DB.prepare("SELECT value FROM app_settings WHERE key='login_required'").first();return r?.value!=='0'}
export async function getSession(req,env){
 const match=(req.headers.get('Cookie')||'').match(/(?:^|;\s*)__Host-csf=([A-Za-z0-9_-]{32,})/);if(!match)return null;
 return env.DB.prepare('SELECT u.username,u.role,u.companies,u.lawyers FROM sessions s JOIN users u ON u.username=s.username WHERE s.token_hash=? AND s.expires>unixepoch()').bind(await hash(match[1])).first()
}
async function inputJson(req){if(Number(req.headers.get('Content-Length')||0)>8192)throw Error('Payload acima do limite');return req.json()}
export async function authRequest(req,env){
 const path=new URL(req.url).pathname;
 if(req.method!=='GET'&&!validOrigin(req))return res({error:'Origem não autorizada'},403);
 if(path==='/api/auth/status'&&req.method==='GET'){const [required,u]=await Promise.all([loginIsRequired(env),getSession(req,env)]);return res({loginRequired:required,authenticated:!!u,canConfigure:u?.role==='admin',user:u?.username||null,role:u?.role||null,companies:u?JSON.parse(u.companies||'[]'):[],lawyers:u?JSON.parse(u.lawyers||'[]'):[]})}

 if(path==='/api/auth/challenge'&&req.method==='GET'){
  const username=String(new URL(req.url).searchParams.get('username')||'').trim();
  if(!/^[a-zA-Z0-9_.-]{3,70}$/.test(username))return res({error:'Usuário inválido'},400);
  const record=await env.DB.prepare('SELECT salt,iterations FROM users WHERE username=? COLLATE NOCASE').bind(username).first();
  const id=random(),nonce=random();
  await env.DB.prepare('INSERT INTO auth_challenges(challenge_id,username,nonce,expires) VALUES(?,?,?,?)')
    .bind(id,username.toLowerCase(),nonce,Math.floor(Date.now()/1000)+120).run();
  return res({challengeId:id,nonce,salt:record?.salt||DUMMY_SALT,iterations:Number(record?.iterations||DEFAULT_ITER)});
 }
 if(path==='/api/auth/login'&&req.method==='POST'){
  const body=await inputJson(req).catch(()=>null);
  if(typeof body?.username!=='string'||typeof body?.challengeId!=='string'||typeof body?.proof!=='string'||body.username.length>70||body.proof.length>150)return res({error:'Dados inválidos'},400);
  const username=body.username.trim(),ip=req.headers.get('CF-Connecting-IP')||'unknown',key=await hash(username.toLowerCase()+':'+ip);
  const failed=await env.DB.prepare('SELECT failures,locked_until FROM login_attempts WHERE key=?').bind(key).first();
  if((failed?.locked_until||0)>Date.now()/1000)return res({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
  const challenge=await env.DB.prepare('DELETE FROM auth_challenges WHERE challenge_id=? AND username=? AND expires>unixepoch() RETURNING nonce')
    .bind(body.challengeId,username.toLowerCase()).first();
  const account=await env.DB.prepare('SELECT username,hash FROM users WHERE username=? COLLATE NOCASE').bind(username).first();
  const valid=!!(challenge&&account&&await verifyPasswordProof(account.hash,challenge.nonce,body.challengeId,account.username,body.proof));
  if(!valid){
    const failures=(failed?.failures||0)+1;
    await env.DB.prepare('INSERT INTO login_attempts(key,failures,locked_until) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until')
      .bind(key,failures,failures>=5?Math.floor(Date.now()/1000)+900:0).run();
    return res({error:'Usuário ou senha incorretos'},401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();
  const token=random();
  await env.DB.prepare('INSERT INTO sessions(token_hash,username,expires) VALUES(?,?,?)')
    .bind(await hash(token),account.username,Math.floor(Date.now()/1000)+28800).run();
  return res({ok:true},200,{'Set-Cookie':sessCookie(token,28800)});
 }
 if(path==='/api/auth/logout'&&req.method==='POST'){
  const found=(req.headers.get('Cookie')||'').match(/__Host-csf=([A-Za-z0-9_-]+)/);
  if(found)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(found[1])).run();
  return res({ok:true},200,{'Set-Cookie':sessCookie('',0)});
 }
 if(path==='/api/auth/settings'&&req.method==='POST'){
  const user=await getSession(req,env);if(!user||user.role!=='admin')return res({error:'Apenas o responsável pela auditoria pode alterar a proteção'},403);
  const body=await inputJson(req).catch(()=>null);if(typeof body?.loginRequired!=='boolean')return res({error:'Opção inválida'},400);
  if(body.loginRequired===false&&body.confirm!=='EXIBIR APENAS DADOS ANONIMIZADOS')return res({error:'Confirmação obrigatória. Dados pessoais continuarão protegidos.'},400);
  await env.DB.prepare("UPDATE app_settings SET value=? WHERE key='login_required'").bind(body.loginRequired?'1':'0').run();
  return res({ok:true,loginRequired:body.loginRequired});
 }

 if(path==='/api/auth/password'&&req.method==='POST'){
  const user=await getSession(req,env);
  if(!user||user.role!=='admin')return res({error:'Faça login para alterar a senha'},403);
  const body=await inputJson(req).catch(()=>null);
  if(typeof body?.challengeId!=='string'||typeof body?.proof!=='string'||typeof body?.newSalt!=='string'||typeof body?.newHash!=='string'||body.newIterations!==310000)return res({error:'Parâmetros inválidos'},400);
  const challenge=await env.DB.prepare('DELETE FROM auth_challenges WHERE challenge_id=? AND username=? AND expires>unixepoch() RETURNING nonce')
    .bind(body.challengeId,user.username.toLowerCase()).first();
  if(!challenge)return res({error:'Confirmação expirada'},403);
  const record=await env.DB.prepare('SELECT hash FROM users WHERE username=?').bind(user.username).first();
  if(!record||!await verifyPasswordProof(record.hash,challenge.nonce,body.challengeId,user.username,body.proof))return res({error:'Senha atual incorreta'},403);
  try{if(decode(body.newSalt).length!==16||decode(body.newHash).length!==32)throw Error('Invalid key length')}catch{return res({error:'Novo hash inválido'},400)}
  await env.DB.prepare('UPDATE users SET salt=?,hash=?,iterations=? WHERE username=?')
    .bind(body.newSalt,body.newHash,body.newIterations,user.username).run();
  await env.DB.prepare('DELETE FROM sessions WHERE username=?').bind(user.username).run();
  return res({ok:true},200,{'Set-Cookie':sessCookie('',0)});
 }

 // Gerenciamento de acesso por escritório/advogado. Nunca retorna hashes.
 if(path==='/api/auth/users'&&req.method==='GET'){
  const me=await getSession(req,env);if(me?.role!=='admin')return res({error:'Somente administrador'},403);
  const q=await env.DB.prepare('SELECT username,role,companies,lawyers FROM users ORDER BY username').all();
  return res({users:q.results.map(x=>({...x,companies:JSON.parse(x.companies||'[]'),lawyers:JSON.parse(x.lawyers||'[]')}))});
 }
 if(['/api/auth/users','/api/auth/users/scope','/api/auth/users/delete'].includes(path)&&req.method==='POST'){
  const me=await getSession(req,env);if(me?.role!=='admin')return res({error:'Somente administrador'},403);
  const b=await inputJson(req).catch(()=>null);
  if(!b||typeof b.username!=='string'||!/^[a-zA-Z0-9_.-]{3,70}$/.test(b.username))return res({error:'Usuário inválido'},400);
  const companies=Array.isArray(b.companies)?[...new Set(b.companies)]:[];
  const lawyers=Array.isArray(b.lawyers)?[...new Set(b.lawyers)]:[];
  const validCompanies=['*','GM','JVA','HUGS','VINCULO A CONFIRMAR'];
  const validLawyers=['*','MATHEUS','ANDRESSA','ERALDO','MAIKON','GILBERTO','ISAI','FABIO'];
  if(path!=='/api/auth/users/delete'&&(!['admin','viewer'].includes(b.role)||companies.some(x=>!validCompanies.includes(x))||lawyers.some(x=>!validLawyers.includes(x))))return res({error:'Escopo ou função inválida'},400);
  if(path==='/api/auth/users'){
   if(![310000].includes(b.iterations))return res({error:'Iterações inválidas'},400);
   try{if(decode(b.salt).length!==16||decode(b.hash).length!==32)throw 1;}catch{return res({error:'Senha derivada inválida'},400)}
   if(b.role!=='admin'&&(!companies.length||!lawyers.length))return res({error:'Selecione empresa e advogado'},400);
   await env.DB.prepare('INSERT INTO users(username,salt,hash,iterations,role,companies,lawyers) VALUES(?,?,?,?,?,?,?)')
     .bind(b.username,b.salt,b.hash,b.iterations,b.role,JSON.stringify(companies),JSON.stringify(lawyers)).run();
   return res({ok:true},201);
  }
  if(b.username.toLowerCase()===me.username.toLowerCase())return res({error:'Não modifique a própria conta por esta rota'},400);
  if(path==='/api/auth/users/delete'){
   await env.DB.prepare('DELETE FROM sessions WHERE username=? COLLATE NOCASE').bind(b.username).run();
   await env.DB.prepare('DELETE FROM users WHERE username=? COLLATE NOCASE').bind(b.username).run();
   return res({ok:true});
  }
  if(b.role!=='admin'&&(!companies.length||!lawyers.length))return res({error:'Selecione empresa e advogado'},400);
  const found=await env.DB.prepare('UPDATE users SET role=?,companies=?,lawyers=? WHERE username=? COLLATE NOCASE')
   .bind(b.role,JSON.stringify(companies),JSON.stringify(lawyers),b.username).run();
  await env.DB.prepare('DELETE FROM sessions WHERE username=? COLLATE NOCASE').bind(b.username).run();
  return res({ok:true,changed:found.meta?.changes||0});
 }
 return res({error:'Rota inexistente'},404);
}

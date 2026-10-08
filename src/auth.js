
const SALT='iAMo8OvB3Nk1RyDZPQSW_w';
const HASH='mzZmd2Qjlz3_OyffGXpgAlFCBY5ZvbiciWGtJxCPj8k';
const ITER=310000;
const enc=new TextEncoder();
const random=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-String(s).length%4)%4)),c=>c.charCodeAt(0));
const b64=buffer=>btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hash=async s=>b64(await crypto.subtle.digest('SHA-256',enc.encode(s)));
async function pbkdf(pass,salt,iterations){const k=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveBits']);return b64(await crypto.subtle.deriveBits({name:'PBKDF2',salt:decode(salt),hash:'SHA-256',iterations},k,256))}
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
    'CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)'
   ])await env.DB.prepare(sql).run();
   await env.DB.prepare("INSERT OR IGNORE INTO users(username,salt,hash,iterations,role,companies,lawyers) VALUES(?,?,?,?,?,?,?)").bind('Auditoria',SALT,HASH,ITER,'admin','["*"]','["*"]').run();
   await env.DB.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('login_required','1')").run();
 })().catch(e=>{initialized=null;throw e});
 return initialized;
}
export async function loginIsRequired(env){const r=await env.DB.prepare("SELECT value FROM app_settings WHERE key='login_required'").first();return r?.value!=='0'}
export async function getSession(req,env){
 const match=(req.headers.get('Cookie')||'').match(/(?:^|;\s*)__Host-csf=([A-Za-z0-9_-]{32,})/);if(!match)return null;
 return env.DB.prepare('SELECT u.username,u.role FROM sessions s JOIN users u ON u.username=s.username WHERE s.token_hash=? AND s.expires>unixepoch()').bind(await hash(match[1])).first()
}
async function inputJson(req){if(Number(req.headers.get('Content-Length')||0)>8192)throw Error('Payload acima do limite');return req.json()}
export async function authRequest(req,env){
 const path=new URL(req.url).pathname;
 if(req.method!=='GET'&&!validOrigin(req))return res({error:'Origem não autorizada'},403);
 if(path==='/api/auth/status'&&req.method==='GET'){const [required,u]=await Promise.all([loginIsRequired(env),getSession(req,env)]);return res({loginRequired:required,authenticated:!!u,canConfigure:u?.role==='admin',user:u?.username||null})}
 if(path==='/api/auth/login'&&req.method==='POST'){
  const body=await inputJson(req).catch(()=>null);
  if(typeof body?.username!=='string'||typeof body?.password!=='string'||body.password.length>256)return res({error:'Dados inválidos'},400);
  const username=body.username.trim(),ip=req.headers.get('CF-Connecting-IP')||'unknown',key=await hash(username.toLowerCase()+':'+ip);
  const attempts=await env.DB.prepare('SELECT failures,locked_until FROM login_attempts WHERE key=?').bind(key).first();
  if((attempts?.locked_until||0)>Date.now()/1000)return res({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
  const record=await env.DB.prepare('SELECT username,salt,hash,iterations FROM users WHERE username=? COLLATE NOCASE').bind(username).first();
  const computed=await pbkdf(body.password,record?.salt||SALT,record?.iterations||ITER);
  if(!record||!ctEquals(computed,record.hash)){
   const failures=(attempts?.failures||0)+1;
   await env.DB.prepare('INSERT INTO login_attempts(key,failures,locked_until) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until').bind(key,failures,failures>=5?Math.floor(Date.now()/1000)+900:0).run();
   return res({error:'Usuário ou senha incorretos'},401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();
  const token=random();
  await env.DB.prepare('INSERT INTO sessions(token_hash,username,expires) VALUES(?,?,?)').bind(await hash(token),record.username,Math.floor(Date.now()/1000)+28800).run();
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
  const user=await getSession(req,env);if(!user||user.role!=='admin')return res({error:'Faça login para alterar a senha'},403);
  const body=await inputJson(req).catch(()=>null);
  if(typeof body?.current!=='string'||typeof body?.next!=='string'||body.next.length<12||body.next.length>256)return res({error:'Senha nova deve conter entre 12 e 256 caracteres'},400);
  const row=await env.DB.prepare('SELECT salt,hash,iterations FROM users WHERE username=?').bind(user.username).first();
  if(!ctEquals(await pbkdf(body.current,row.salt,row.iterations),row.hash))return res({error:'Senha atual incorreta'},403);
  const salt=random(),newhash=await pbkdf(body.next,salt,ITER);
  await env.DB.prepare('UPDATE users SET salt=?,hash=?,iterations=? WHERE username=?').bind(salt,newhash,ITER,user.username).run();
  await env.DB.prepare('DELETE FROM sessions WHERE username=?').bind(user.username).run();
  return res({ok:true},200,{'Set-Cookie':sessCookie('',0)});
 }
 return res({error:'Rota inexistente'},404);
}

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const CHUNK=49152;
const MAX_FILE=60*1024*1024;
let ready;
const initialize=env=>{if(!ready)ready=(async()=>{
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS audit_media(id TEXT PRIMARY KEY, title TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, mime TEXT NOT NULL, byte_size INTEGER NOT NULL, chunk_count INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'UPLOADING', created_by TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()))").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS audit_media_chunks(media_id TEXT NOT NULL, part INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(media_id,part))").run();
})().catch(e=>{ready=null;throw e});return ready};
const invalidOrigin=req=>req.headers.get('Origin')!==new URL(req.url).origin;
const safeName=s=>String(s||'arquivo').replace(/[\r\n"<>\\]/g,'_').slice(0,150);
async function data(req){if(Number(req.headers.get('Content-Length')||0)>95000)throw Error('Pacote grande demais');return req.json()}
const allowedId=id=>/^[a-f0-9-]{36}$/.test(id);
export async function handleMedia(req,env,user){
 if(!user||user.role!=='admin')return json({error:'Dossiês e vídeos originais: acesso somente à auditoria administrativa. Os demais usuários podem gerar relatórios filtrados.'},403);
 await initialize(env);
 const u=new URL(req.url),p=u.pathname;
 if(req.method!=='GET'&&invalidOrigin(req))return json({error:'Origem não autorizada'},403);
 if(p==='/api/media/list'&&req.method==='GET'){
   const d=await env.DB.prepare("SELECT id,title,name,kind,mime,byte_size,created_at FROM audit_media WHERE status='READY' ORDER BY created_at DESC").all();
   const ongoing=await env.DB.prepare("SELECT id,name,chunk_count FROM audit_media WHERE status='UPLOADING' AND created_by=? ORDER BY created_at DESC LIMIT 8").bind(user.username).all();
   return json({items:d.results,pending:ongoing.results,limitBytes:MAX_FILE,chunkBytes:CHUNK});
 }
 if(p==='/api/media/init'&&req.method==='POST'){
   let b;try{b=await data(req)}catch{return json({error:'Metadados inválidos'},400)}
   const kind=b.kind==='video'?'video':b.kind==='pdf'?'pdf':null;
   const mime=kind==='pdf'?'application/pdf':'video/mp4';
   const size=Number(b.byte_size);
   const name=safeName(b.name);
   if(!kind||!Number.isSafeInteger(size)||size<8||size>MAX_FILE||String(b.title||'').length>140||String(b.title||'').trim().length<3)return json({error:'Arquivo inválido ou limite de 60 MiB excedido'},400);
   const id=crypto.randomUUID(),parts=Math.ceil(size/CHUNK);
   await env.DB.prepare('INSERT INTO audit_media(id,title,name,kind,mime,byte_size,chunk_count,created_by) VALUES(?,?,?,?,?,?,?,?)').bind(id,String(b.title).trim(),name,kind,mime,size,parts,user.username).run();
   return json({ok:true,id,chunkBytes:CHUNK,chunks:parts});
 }
 if(p==='/api/media/chunk'&&req.method==='POST'){
   let b;try{b=await data(req)}catch{return json({error:'Pacote inválido'},400)}
   const id=String(b.id||''),part=Number(b.part),body=String(b.data||'');
   if(!allowedId(id)||!Number.isSafeInteger(part)||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body))return json({error:'Formato do segmento inválido'},400);
   const file=await env.DB.prepare("SELECT byte_size,chunk_count FROM audit_media WHERE id=? AND status='UPLOADING' AND created_by=?").bind(id,user.username).first();
   if(!file||part<0||part>=file.chunk_count)return json({error:'Upload não encontrado'},404);
   const bytes=atob(body).length,expected=Math.min(CHUNK,file.byte_size-part*CHUNK);
   if(bytes!==expected)return json({error:'Tamanho do segmento incorreto'},400);
   await env.DB.prepare('INSERT OR REPLACE INTO audit_media_chunks(media_id,part,body) VALUES(?,?,?)').bind(id,part,body).run();
   return json({ok:true,part});
 }
 if(p==='/api/media/finish'&&req.method==='POST'){
   let b;try{b=await data(req)}catch{return json({error:'Solicitação inválida'},400)}
   const id=String(b.id||'');
   if(!allowedId(id))return json({error:'Identificador inválido'},400);
   const f=await env.DB.prepare("SELECT * FROM audit_media WHERE id=? AND created_by=? AND status='UPLOADING'").bind(id,user.username).first();
   if(!f)return json({error:'Arquivo não encontrado'},404);
   const counts=await env.DB.prepare('SELECT COUNT(*) n FROM audit_media_chunks WHERE media_id=?').bind(id).first();
   if(counts.n!==f.chunk_count)return json({error:'Upload incompleto: '+counts.n+' de '+f.chunk_count+' segmentos'},409);
   await env.DB.prepare("UPDATE audit_media SET status='READY' WHERE id=?").bind(id).run();
   return json({ok:true,id,verifiedChunks:counts.n});
 }
 if(p.startsWith('/api/media/file/')){
   const id=p.substring('/api/media/file/'.length);
   if(!allowedId(id))return json({error:'ID inválido'},400);
   const f=await env.DB.prepare("SELECT * FROM audit_media WHERE id=? AND status='READY'").bind(id).first();
   if(!f)return json({error:'Arquivo não encontrado'},404);
   if(req.method==='DELETE'){
      await env.DB.prepare('DELETE FROM audit_media_chunks WHERE media_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM audit_media WHERE id=?').bind(id).run();
      return json({ok:true});
   }
   if(req.method!=='GET')return json({error:'Método inválido'},405);
   const range=req.headers.get('Range');
   let start=0,end=f.byte_size-1,partial=false;
   if(range){
    const m=range.match(/^bytes=(\d+)-(\d*)$/);
    if(!m)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+f.byte_size}});
    start=Number(m[1]);end=m[2]?Number(m[2]):start+262143;
    if(start>=f.byte_size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+f.byte_size}});
    end=Math.min(end,f.byte_size-1,start+1048575);partial=true;
   }else if(f.kind==='video'){end=Math.min(end,262143);partial=true}
   const from=Math.floor(start/CHUNK),to=Math.floor(end/CHUNK);
   const parts=await env.DB.prepare('SELECT part,body FROM audit_media_chunks WHERE media_id=? AND part BETWEEN ? AND ? ORDER BY part').bind(id,from,to).all();
   if(parts.results.length!==to-from+1)return json({error:'Arquivo incompleto no banco'},503);
   const result=new Uint8Array(end-start+1);
   for(const item of parts.results){
    const raw=atob(item.body),base=item.part*CHUNK,begin=Math.max(0,start-base),finish=Math.min(raw.length,end-base+1);
    const out=base+begin-start;
    for(let i=begin;i<finish;i++)result[out+i-begin]=raw.charCodeAt(i);
   }
   const h={'Content-Type':f.mime,'Content-Length':String(result.length),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':(f.kind==='pdf'?'inline':'inline')+'; filename="'+safeName(f.name)+'"','Referrer-Policy':'no-referrer'};
   if(partial)h['Content-Range']='bytes '+start+'-'+end+'/'+f.byte_size;
   return new Response(result,{status:partial?206:200,headers:h});
 }
 return json({error:'Rota de mídia inexistente'},404);
}

const encoder=new TextEncoder();
const toBytes=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-String(s).length%4)%4)),c=>c.charCodeAt(0));
export async function verifyPasswordProof(verifier,nonce,id,username,proof){
  try{
    const key=await crypto.subtle.importKey('raw',toBytes(verifier),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const message=['csf-login-v1',nonce,id,String(username).toLowerCase()].join(':');
    return await crypto.subtle.verify('HMAC',key,toBytes(proof),encoder.encode(message));
  }catch{return false}
}

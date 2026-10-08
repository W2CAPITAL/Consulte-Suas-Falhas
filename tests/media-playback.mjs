import assert from 'node:assert/strict';
import { handleMedia } from '../src/media.js';
import worker from '../src/worker.js';

const id='12345678-1234-1234-1234-123456789abc';
const original=Buffer.alloc(49152*3+9);for(let i=0;i<original.length;i++)original[i]=i%251;
const file={id,name:'video.mp4',kind:'video',mime:'video/mp4',byte_size:original.length,chunk_count:4};
const DB={prepare(sql){return {bind(...params){this.params=params;return this},async run(){return {}},async first(){return file},async all(){
 if(sql.includes('FROM audit_media_chunks')){
  const [,from,to]=this.params;return {results:Array.from({length:Math.min(to,3)-from+1},(_,i)=>({part:from+i,body:original.subarray((from+i)*49152,(from+i+1)*49152).toString('base64')}))};
 }return {results:[]};
}}}};
const request=(range,method='GET',user={role:'admin'})=>handleMedia(new Request('https://audit.test/api/media/file/'+id,{method,headers:range?{Range:range}:{}}),{DB},user);
const full=await request();assert.equal(full.status,200);assert.deepEqual(Buffer.from(await full.arrayBuffer()),original);
const head=await request(null,'HEAD');assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),String(original.length));assert.equal((await head.arrayBuffer()).byteLength,0);
for(const [range,start,end] of [['bytes=49149-49160',49149,49160],['bytes=-9',original.length-9,original.length-1],['bytes=98304-',98304,original.length-1]]){
 const response=await request(range);assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes '+start+'-'+end+'/'+original.length);assert.deepEqual(Buffer.from(await response.arrayBuffer()),original.subarray(start,end+1));
}
assert.equal((await request('bytes=999999999-')).status,416);
assert.equal((await request('bytes=-0')).status,416);
assert.equal((await request('bytes=0-10,20-30')).status,416);
assert.equal((await request(null,'GET',{role:'viewer'})).status,403);
const page=await worker.fetch(new Request('https://audit.test/'),{});
assert.match(page.headers.get('Content-Security-Policy'),/media-src 'self'/);
console.log('PASS: MP4 byte integrity, seeking across chunks, suffix ranges, HEAD, private access and media CSP.');

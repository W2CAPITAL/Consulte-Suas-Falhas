import { PAGE } from './page.js';
export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/' || path === '/index.html') return new Response(PAGE, {
      headers: {
        'Content-Type':'text/html; charset=utf-8',
        'Cache-Control':'no-store',
        'Referrer-Policy':'no-referrer',
        'X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; media-src blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
      }
    });
    if (path === '/health') return new Response(JSON.stringify({
      online:true, login:false, password:false, administrator:false, dataMode:'browser-only'
    }), {headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    return new Response('Não encontrado', {status:404});
  }
};
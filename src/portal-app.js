export const PORTAL_APP = String.raw`
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString('pt-BR');
const navItems=[['inicio','⌂','Início'],['resumo','▥','Resumo Executivo'],['escritorios','♜','Escritórios'],['advogados','♟','Advogados'],['processos','▤','Todos os Processos'],['mensagens','✉','Todas as Mensagens'],['erros','⚠','Erros Individualizados'],['dossies','▣','Dossiês em HTML'],['numopede','⚖','NUMOPEDE / OAB'],['relatorios','▦','Relatórios'],['videos','▶','Vídeos e Imagens'],['configuracoes','⚙','Configurações']];
const S={view:'inicio',company:'TODOS',lawyer:'TODOS',query:'',page:1,doc:null,docToken:0,auth:{authenticated:false},data:{},selectedId:null,refresh:0};
const companies=['GM','HUGS','JVA','JVA / HUGS'];
const lawyers=['MATHEUS','ANDRESSA','ERALDO','MAIKON','GILBERTO','ISAI','FABIO'];
let loadingCount=0,renderController;
function reportError(err){if(err.name==='AbortError')return;toast(err.message)}
function busy(state){loadingCount=Math.max(0,loadingCount+(state?1:-1));$('globalBusy').hidden=!loadingCount}
async function api(url){busy(true);try{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:renderController?.signal});const v=await r.json().catch(()=>({error:'Resposta inválida do servidor'}));if(!r.ok)throw Error(v.error||'Falha HTTP '+r.status);return v}finally{busy(false)}}
async function post(url,body){busy(true);try{const r=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const v=await r.json().catch(()=>({error:'Resposta inválida'}));if(!r.ok)throw Error(v.error||'Falha HTTP '+r.status);return v}finally{busy(false)}}
function toast(txt){$('toast').textContent=txt;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4100)}
function root(html){$('content').innerHTML=html}
function loading(title){root('<div class="card"><div class="card-head">'+esc(title)+'</div><div class="placeholder">Carregando a auditoria…</div></div>')}
function hero(title,subtitle='',extra=''){return '<div class="hero"><div><div class="overline">W1 SOLUÇÕES CAPITAIS · AUDITORIA JURÍDICA</div><h1 class="hero-title">'+esc(title)+'</h1><p class="hero-sub">'+esc(subtitle)+'</p></div><div class="toolbar">'+extra+'</div></div>'}
function panel(title,content,opts=''){return '<section class="card '+opts+'"><div class="card-head"><span>'+esc(title)+'</span></div><div class="card-body">'+content+'</div></section>'}
function kpi(value,label,icon='▣',color=''){return '<div class="stat"><div class="stat-icon">'+esc(icon)+'</div><div><div class="stat-value '+color+'">'+esc(value)+'</div><div class="stat-label">'+esc(label)+'</div></div></div>'}
function badge(val){const text=String(val||'').trim(),lower=text.toLowerCase();let klass='navy';if(/crit|improced|atras|pendente|alto|erro|risco/i.test(lower))klass='red';else if(/candidato|médio|medio|em an|revis/i.test(lower))klass='amber';else if(/corrig|proced|conclu|ok|baixo/i.test(lower))klass='green';return '<span class="chip '+klass+'">'+esc(text||'Não informado')+'</span>'}
function bar(name,value,total,color){const v=Number(value)||0,max=Math.max(1,total);return '<div class="chart-rows"><span class="chart-name" title="'+esc(name)+'">'+esc(name)+'</span><div class="bar-rail"><span class="bar-fill '+(color||'')+'" style="width:'+Math.min(100,Math.round(v/max*100))+'%"></span></div><span class="chart-val">'+num(v)+'</span></div>'}
function fmtCase(v){return esc(v||'Não informado')}
function findCurrentDoc(docs,override){
 const source=override||S.doc;
 const found=docs.find(d=>d.doc_id===source);if(found)return found;
 if(S.view==='advogados'||S.view==='escritorios'){
  const type=S.view==='advogados'?'lawyer':'office',scope=type==='lawyer'?S.lawyer:S.company;
  return docs.find(d=>d.kind===type&&d.scope===scope)||docs[0];
 }
 return docs.find(d=>d.doc_id==='resumo')||docs.find(d=>d.kind==='lawyer'&&d.scope===S.lawyer)||docs[0];
}
function filters(){return new URLSearchParams({company:S.company,lawyer:S.lawyer,q:S.query,page:String(S.page)})}
function changeView(id,options={}){S.view=id;S.page=1;S.query=options.query||'';S.selectedId=options.selectedId||null;S.refresh++;S.docToken++;window.location.hash='/'+id;drawNav();render().catch(err=>{if(err.name==='AbortError')return;root(panel('Falha ao carregar', '<div class="note">'+esc(err.message)+'</div>'));toast(err.message)})}
function drawNav(){
 $('navMenu').innerHTML=navItems.map(([id,ic,title],i)=>(i===1||i===4||i===7?'<div class="menu-label">'+(i===1?'VISÃO GERAL':i===4?'INVESTIGAÇÃO':'DOCUMENTAÇÃO')+'</div>':'')+'<button type="button" class="nav '+(S.view===id?'active':'')+'" data-route="'+id+'" title="'+esc(title)+'"><span class="nav-icon">'+esc(ic)+'</span><span class="nav-text">'+esc(title)+'</span></button>').join('');
 $('pageTitle').textContent=(navItems.find(x=>x[0]===S.view)||navItems[0])[2];
}
async function boot(){
 try{S.auth=await api('/api/auth/status');}catch(e){$('authGate').hidden=false;$('authStatus').textContent=e.message;return}
 if(!S.auth.authenticated){$('authGate').hidden=false;$('workspace').hidden=true;return}
 $('authGate').hidden=true;$('workspace').hidden=false;
 $('sessionUser').textContent=S.auth.user||'Usuário';
 drawNav();
 const route=(location.hash||'').match(/^#\/([a-z]+)/);
 if(route&&navItems.some(x=>x[0]===route[1]))S.view=route[1];
 drawNav();await render();
}
async function render(){
 renderController?.abort();renderController=new AbortController();
 const view=S.view;loading('Carregando '+(navItems.find(x=>x[0]===view)?.[2]||view));
 if(view==='inicio'||view==='resumo')return showDashboard();
 if(view==='escritorios')return showOffices();
 if(view==='advogados')return showLawyers();
 if(view==='processos'||view==='erros')return showProcesses(view==='erros');
 if(view==='mensagens')return showMessages();
 if(view==='dossies')return showLibrary();
 if(view==='numopede')return showNumopede();
 if(view==='relatorios')return showReports();
 if(view==='videos')return showVideos();
 if(view==='configuracoes')return showSettings();
}
async function dataCore(){const [summary,overview]=await Promise.all([api('/api/summary'),api('/api/overview')]);S.data.summary=summary;S.data.overview=overview;return {summary,overview}}
function chartOffices(overview){
 const rows=(overview.companies||[]).slice().sort((a,b)=>b.total-a.total);
 const max=Math.max(1,...rows.map(x=>x.total));
 return rows.map((x,i)=>bar(x.escritorio,x.total,max,i===0?'gold':i===1?'':'red')).join('')||'<p class="placeholder">Sem vínculos por escritório.</p>';
}
function chartPeople(overview){
 const rows=(overview.lawyers||[]).filter(x=>lawyers.includes(x.nome)).slice().sort((a,b)=>b.atribuicoes-a.atribuicoes);
 const max=Math.max(1,...rows.map(x=>x.atribuicoes));
 return rows.map((x,i)=>bar((i+1)+'º  '+x.nome,x.atribuicoes,max,i===0?'gold':'')).join('')||'<p class="placeholder">Sem atribuições no recorte.</p>';
}
function chartFindings(summary){
 const total=Number(summary.processos)||0,flagged=Math.max(0,Math.min(total,Number(summary.comErro)||0));
 const degrees=total?flagged/total*360:0;
 return '<div class="donut-wrap"><div class="donut" role="img" aria-label="'+num(flagged)+' de '+num(total)+' processos com apontamentos" style="background:conic-gradient(#c34850 0deg '+degrees+'deg,#0f4b77 '+degrees+'deg 360deg)"><div class="donut-label">'+(total?Math.round(flagged/total*100):0)+'%<small>com apontamentos</small></div></div><div class="legend"><div><span>Com apontamentos</span><strong>'+num(flagged)+'</strong></div><div><span>Sem apontamentos</span><strong>'+num(total-flagged)+'</strong></div><div><span>Total no recorte</span><strong>'+num(total)+'</strong></div></div></div>';
}
function processFilters(){
 const available=(items,key)=>items.filter(x=>S.auth.role==='admin'||(S.auth[key]||[]).includes('*')||(S.auth[key]||[]).includes(x));
 const options=(items,value)=>'<option value="TODOS">Todos</option>'+items.map(x=>'<option '+(value===x?'selected':'')+' value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 return '<div class="filter-fields"><label>Escritório<select class="select" data-filter="company">'+options(available(companies,'companies'),S.company)+'</select></label><label>Advogado<select class="select" data-filter="lawyer">'+options(available(lawyers,'lawyers'),S.lawyer)+'</select></label></div>';
}
function archiveCard(){return '<details class="source-note"><summary>Origem dos indicadores</summary>Os números desta tela são da base D1 atual. Os PDFs históricos registram 1.791 processos auditados, 1.041 erros individualizados e 6.924 cobranças. Os universos não devem ser somados ou confundidos.</details>'}
async function showDashboard(){
 const {summary,overview}=await dataCore();
 const k='<div class="stats">'+kpi(num(summary.processos),'PROCESSOS NA CARTEIRA','▣')+kpi(num(summary.comErro),'PROCESSOS COM APONTAMENTOS','⚠','red')+kpi(num(summary.mensagens),'MENSAGENS DISPONÍVEIS','✉')+kpi(num(summary.numopedeCandidatos),'CANDIDATOS NUMOPEDE','⚖','gold')+kpi(num(summary.cnjs),'CNJS IDENTIFICADOS','◉')+'</div>';
 const suspect=summary.mensagens<summary.totalMensagensPrevistas?'<div class="note">Mensagens sincronizadas: '+num(summary.mensagens)+' de '+num(summary.totalMensagensPrevistas)+'. A ausência de uma conversa nesta versão não significa ausência de prova.</div>':'';
 const html=hero('Visão Geral da Auditoria','Processos, evidências e encaminhamentos · GM | HUGS | JVA','<button class="action gold" data-route="dossies">▣ Dossiês HTML completos</button>')+k+archiveCard()+suspect+'<div class="dashboard-cols">'+panel('Processos vinculados por escritório',chartOffices(overview))+panel('Advogados com mais apontamentos',chartPeople(overview))+panel('Processos com apontamentos',chartFindings(summary))+'</div>'+panel('Resumo executivo completo','<div id="sourcePreview"></div>');
 root(html);
 await chooseDocument('resumo','sourcePreview',true).catch(reportError);
}
async function showPreview(id,slot,full,append){
 let parent=$(slot);
 if(!parent&&S.view==='inicio'){const box=document.createElement('section');box.className='card';box.innerHTML='<div class="card-head">Resumo executivo original · HTML</div><div id="sourcePreview"></div>';$('content').appendChild(box);parent=$('sourcePreview')}
 if(parent)await readDocument(id,slot,full);
}
async function showOffices(){
 const {overview}=await dataCore();
 const available=companies.filter(o=>S.auth.role==='admin'||(S.auth.companies||[]).includes('*')||(S.auth.companies||[]).includes(o));
 if(!available.includes(S.company))S.company=available.find(x=>x!=='JVA / HUGS')||available[0]||'TODOS';
 const list=available.map(o=>{
   const count=(overview.companies||[]).find(x=>x.escritorio===o)?.total||0;
   return '<button class="office-card '+(S.company===o?'selected':'')+'" data-company="'+esc(o)+'"><div class="office-illustration">'+esc(o==='JVA / HUGS'?'JVA · HUGS':o)+'</div><div class="office-body"><strong>'+esc(o)+'</strong><small>'+num(count)+' processos da carteira</small><span class="chip navy">'+(o==='JVA / HUGS'?'Carteira histórica':'Documento por escritório')+'</span></div></button>';
 }).join('');
 root(hero('Escritórios','Selecione um escritório; o documento correspondente aparece automaticamente.')+'<div class="grid-3">'+list+'</div>'+panel('Carteira de '+S.company,'<div id="officeCases" class="placeholder">Carregando processos…</div>')+panel('Dossiê original — '+S.company+' · HTML','<div id="officeDoc"></div>'));
 const d=await api('/api/processes?'+new URLSearchParams({company:S.company,lawyer:'TODOS',page:'1'}));
 $('officeCases').innerHTML=miniCases(d);
 if(S.company==='JVA / HUGS'){
   $('officeDoc').innerHTML='<div class="note">Carteira histórica de origem JVA / HUGS. Os dossiês dos dois escritórios preservam os vínculos documentados e o histórico de transferência.</div><div class="toolbar"><button class="action" data-open-doc="jva">Abrir dossiê JVA</button><button class="action secondary" data-open-doc="hugs">Abrir dossiê HUGS</button></div>';
 }else await chooseDocument(S.company.toLowerCase(),'officeDoc',true);
}
function miniCases(d){
 if(!d?.items?.length)return '<p>Sem registros confirmados nesta classificação. A ausência não equivale a carteira vazia.</p>';
 return '<div class="table-scroll"><table class="table"><thead><tr><th>Processo</th><th>Cliente</th><th>Advogados</th><th>Apontamentos</th></tr></thead><tbody>'+d.items.slice(0,10).map(x=>'<tr data-process="'+x.record_id+'"><td class="row-title">'+esc(x.processo)+'</td><td>'+esc(x.cliente)+'</td><td>'+esc(x.advogados)+'</td><td>'+badge(x.qtd_erros+' apontamentos')+'</td></tr>').join('')+'</tbody></table></div><small class="doc-coverage">'+num(d.total)+' registros encontrados na classificação.</small>';
}
async function showLawyers(){
 const {overview}=await dataCore();
 const allowed=lawyers.filter(l=>S.auth.role==='admin'||(S.auth.lawyers||[]).includes('*')||(S.auth.lawyers||[]).includes(l));
 if(!allowed.includes(S.lawyer))S.lawyer=allowed[0]||'TODOS';
 const rank=new Map((overview.lawyers||[]).map(x=>[x.nome,x]));
 const people=allowed.map((l,i)=>'<button class="person '+(S.lawyer===l?'selected':'')+'" data-lawyer="'+esc(l)+'"><span class="avatar">'+l[0]+'</span><span style="min-width:0;flex:1"><strong>'+esc(l)+'</strong><small>'+num(rank.get(l)?.processos||0)+' processos listados</small></span><span class="chip '+(i===0?'amber':'navy')+'">'+num(rank.get(l)?.atribuicoes||0)+' atrib.</span></button>').join('');
 root(hero('Advogados — visão individual','Processos, apontamentos e dossiê completo de cada profissional.')+'<div class="two-cols">'+panel('Escolha do advogado','<div class="person-grid">'+people+'</div>')+panel('Resumo de '+S.lawyer,'<div id="lawyerStats" class="placeholder">Calculando registros…</div>')+'</div>'+panel('Processos vinculados · '+S.lawyer,'<div id="lawyerCases"></div>')+panel('Dossiê completo — '+S.lawyer,'<div id="lawyerDoc"></div>'));
 const p=rank.get(S.lawyer)||{};
 $('lawyerStats').innerHTML='<div class="stats" style="grid-template-columns:repeat(2,1fr)">'+kpi(num(p.processos),'PROCESSOS VINCULADOS','▣')+kpi(num(p.atribuicoes),'APONTAMENTOS EM REGISTROS','⚠','red')+'</div><div class="note">Uma atribuição processual não confirma autoria direta ou culpa disciplinar.</div>';
 const d=await api('/api/processes?'+new URLSearchParams({company:'TODOS',lawyer:S.lawyer,page:'1'}));
 $('lawyerCases').innerHTML=miniCases(d);
 await chooseDocument(S.lawyer.toLowerCase(),'lawyerDoc',true);
}
function tableProcesses(d){
 const rows=d.items.map(p=>'<tr data-process="'+p.record_id+'"><td class="row-title">'+esc(p.processo)+'</td><td>'+esc(p.cliente)+'</td><td>'+esc(p.escritorio)+'</td><td>'+esc(p.advogados)+'</td><td>'+badge(p.qtd_erros?('Com '+p.qtd_erros+' erros'):'Sem erro cadastrado')+'</td><td>'+p.qtd_erros+'</td></tr>').join('');
 return '<div class="table-scroll"><table class="table"><thead><tr><th>Processo (CNJ)</th><th>Cliente</th><th>Escritório</th><th>Advogados</th><th>Situação</th><th>Erros</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function pager(d){return '<div class="pagination"><button class="action secondary" data-paging="-1" '+(S.page<=1?'disabled':'')+'>← Anterior</button><span>Página '+S.page+' / '+Math.max(1,Math.ceil(d.total/25))+' · '+num(d.total)+' registros</span><button class="action secondary" data-paging="1" '+(S.page>=Math.ceil(d.total/25)?'disabled':'')+'>Próxima →</button></div>'}
async function showProcesses(errorsOnly){
 const title=errorsOnly?'Erros Individualizados':'Todos os Processos';
 const data=await api('/api/processes?'+filters()+(errorsOnly?'&errorsOnly=1':''));
 root(hero(title,'Consulte a carteira, filtre por escritório ou advogado e veja os apontamentos.')+'<div class="card"><div class="card-head"><span>Carteira jurídica · '+num(data.total)+' registros</span></div><div class="card-body">'+processFilters()+'<div class="toolbar"><input id="localSearch" class="input search" placeholder="Buscar por CNJ, cliente, advogado ou trecho" value="'+esc(S.query)+'"><button class="action" data-act="search">Buscar</button><button class="action secondary" data-act="clear">Limpar</button></div>'+tableProcesses(data)+pager(data)+'</div></div>'+panel('Ficha detalhada do processo','<div id="processDetail"></div>'));
 if(S.selectedId||data.items.length)await detailProcess(S.selectedId||data.items[0].record_id);
 else $('processDetail').textContent='Nenhum processo encontrado.';
}
async function detailProcess(id,slot='processDetail'){
 S.selectedId=Number(id);const target=$(slot);if(!target)return;const token=Symbol();target.requestToken=token;const data=await api('/api/process/'+encodeURIComponent(id));if(!target.isConnected||target.requestToken!==token)return;
 const p=data.payload||{},errs=Array.isArray(p.erros_detalhados)?p.erros_detalhados:[];
 const list=errs.length?errs.map((e,i)=>'<div class="issue"><b>#'+(i+1)+' · '+esc(e.tipo)+'</b><p>'+esc(e.evidencia)+'</p><p><b>Providência:</b> '+esc(e.providencia)+'</p></div>').join(''):'<div class="note">A classificação de erros está na base do processo; abra o dossiê original para o contexto detalhado.</div>';
 const cnj=String(data.cnj||'').replace(/\D/g,'');
 $(slot).innerHTML='<div class="hero"><div><h2 class="hero-title">'+esc(data.processo)+'</h2><div class="hero-sub">'+esc(data.cliente)+' · '+esc(data.escritorio)+' · '+esc(Array.isArray(data.advogados)?data.advogados.join(', '):data.advogados)+'</div></div><span>'+badge(data.qtd_erros+' apontamentos')+'</span></div><div class="two-cols"><div><h3 class="section-heading">Erros e evidências</h3>'+list+'</div><div><h3 class="section-heading">Resumo do processo</h3><div class="case-summary"><p><b>Último andamento:</b> '+esc(p['Último andamento']||'Não informado')+'</p><p><b>Providência esperada:</b> '+esc(p['O que deveria ter sido feito']||'Sem providência registrada neste campo')+'</p><p><b>NUMOPEDE:</b> '+esc(data.numopede_status||'Sem registro NUMOPEDE associado nesta base')+'</p>'+(cnj.length===20?'<a target="_blank" rel="noopener noreferrer" href="https://comunica.pje.jus.br/consulta?numeroProcesso='+encodeURIComponent(cnj)+'">Abrir Comunica PJe / DJEN ↗</a>':'')+'</div><h3 class="section-heading">Minha análise</h3><div id="reviewPanel"></div><label class="field" for="reviewStatus">Situação</label><select class="select" id="reviewStatus"><option value="EM_ANALISE">Em análise</option><option value="RECONHECIDO">Reconhecido</option><option value="CONTESTADO">Contestado</option><option value="CORRIGIDO">Corrigido</option></select><label class="field" for="reviewNote">Manifestação</label><textarea class="input" id="reviewNote" maxlength="1800"></textarea><button class="action" data-act="saveReview" data-id="'+id+'">Salvar análise com histórico</button></div></div>';
 if(cnj==='50006280520258130481'&&S.auth.canConfigure){const holder=document.createElement('section');holder.className='card';holder.innerHTML='<div class="card-head">Dossiê forense original de Danilo · HTML</div><div id="daniloOriginal"></div>';$(slot).appendChild(holder);chooseDocument('danilo','daniloOriginal',true).catch(reportError);}
 try{const r=await api('/api/review?record_id='+id);if(!target.isConnected||target.requestToken!==token)return;$('reviewPanel').innerHTML=r.items.length?r.items.map(x=>'<div class="note"><b>'+esc(x.username)+'</b> · '+badge(x.status)+'<p>'+esc(x.note||'Sem comentário')+'</p></div>').join(''):'<div class="note">Nenhuma revisão registrada ainda.</div>'}catch(e){if(e.name!=='AbortError'&&target.isConnected&&target.requestToken===token&&$('reviewPanel'))$('reviewPanel').textContent=e.message}
}
async function showMessages(){
 const d=await api('/api/messages?'+filters());
 root(hero('Todas as Mensagens','Registros disponíveis no banco; textos originais para conferência.')+'<div class="toolbar"><input id="localSearch" class="input search" placeholder="Nome, CNJ, remetente ou palavra" value="'+esc(S.query)+'"><button class="action" data-act="search">Buscar</button><button class="action secondary" data-act="clear">Limpar</button></div><div class="two-cols">'+panel('Conversas · '+num(d.total)+' mensagens','<div class="chat-list">'+d.items.map(x=>'<div class="chat-row" data-message="'+x.message_id+'"><b>'+esc(x.speaker||'Remetente não identificado')+'</b><small>'+esc(x.date_text)+' · '+esc(x.source)+'</small><div>'+esc(x.body.slice(0,135))+'</div></div>').join('')+'</div>'+pager(d))+panel('Mensagem completa','<div id="messageDetail"></div>')+'</div>');
 if(d.items.length)await detailMessage(d.items[0].message_id);
}
async function detailMessage(id){const target=$('messageDetail');if(!target)return;const token=Symbol();target.requestToken=token;const x=await api('/api/message/'+encodeURIComponent(id));if(!target.isConnected||target.requestToken!==token)return;target.innerHTML='<h3>'+esc(x.speaker||'Remetente')+'</h3><small>'+esc(x.date_text)+' '+esc(x.time_text)+' · Origem: '+esc(x.source)+'</small><div class="chat-bubble" style="margin:16px 0">'+esc(x.body)+'</div><div class="note">Registro extraído da base vinculada; verifique a conversa original antes de utilizá-lo como prova.</div>'}
async function showNumopede(){
 const d=await api('/api/numopede?'+filters());
 const table='<div class="table-scroll"><table class="table"><thead><tr><th>CNJ</th><th>Cliente</th><th>Advogado</th><th>Status</th></tr></thead><tbody>'+d.items.map(x=>'<tr data-process="'+x.record_id+'"><td>'+esc(x.processo)+'</td><td>'+esc(x.cliente)+'</td><td>'+esc(x.advogados)+'</td><td>'+badge(x.status)+'</td></tr>').join('')+'</tbody></table></div>';
 root(hero('NUMOPEDE / OAB / TED','Lista de investigação e rastreabilidade sem presumir culpa.')+'<div class="stats">'+kpi(num(d.total),'CANDIDATOS NESTE RECORTE','⚑','gold')+kpi('Pendente','CONFIRMAÇÃO INDIVIDUAL','⚖')+'</div><div class="note">CANDIDATO não comprova ofício, encaminhamento efetivo, sanção ou decisão disciplinar. Validação oficial das fontes ainda é necessária.</div>'+panel('Scanner por CNJ','<div class="toolbar"><input id="localSearch" class="input search" placeholder="CNJ, cliente, referência" value="'+esc(S.query)+'"><button class="action" data-act="search">Buscar</button></div>'+table+pager(d))+panel('Registro sob análise','<div id="processDetail"></div>'));
 if(d.items.length)await detailProcess(d.items[0].record_id);
}
async function dossierList(){return api('/api/dossiers')}
async function chooseDocument(id,host,full=true){
 const list=await dossierList();const doc=list.items.find(x=>x.doc_id===id);
 const el=$(host);if(!el)return;
 if(!doc){el.innerHTML='<div class="note">Não há dossiê completo autorizado para este recorte. Os demais documentos permanecem protegidos.</div>';return}
 await readDocument(doc.doc_id,host,full);
}
async function showLibrary(){
 const d=await dossierList();
 const target=findCurrentDoc(d.items);
 if(!target){root(panel('Biblioteca','Nenhum documento autorizado nesta conta.'));return}
 S.doc=target.doc_id;
 const left=d.items.map(x=>'<button class="doc-choice '+(x.doc_id===target.doc_id?'active':'')+'" data-doc="'+esc(x.doc_id)+'"><b>'+esc(x.title)+'</b><small>'+x.pages_imported+' páginas · '+(x.kind==='lawyer'?'Advogado':x.kind==='office'?'Escritório':x.kind==='case'?'Processo':'Geral')+' · HTML armazenado</small></button>').join('');
 root(hero('Dossiês — Biblioteca HTML','Todos os documentos já estão armazenados. Abra a aba e consulte imediatamente.')+'<div class="note">12 PDFs originais convertidos em páginas HTML, com gráficos, tabelas e texto integral. Sem geração, upload ou confirmação manual.</div><div class="document-layout"><section class="card"><div class="card-head">Documentos autorizados</div><div class="doc-index" id="docList">'+left+'</div></section><section class="card"><div id="docViewer"></div></section></div>');
 await readDocument(target.doc_id,'docViewer',true);
}
async function readDocument(id,host,full=true){
 const target=$(host);if(!target)return;
 const token=Symbol();target.readToken=token;
 target.innerHTML='<div class="doc-meta"><b>Carregando dossiê HTML original…</b><small class="doc-count"></small><a class="action secondary" href="/html/'+encodeURIComponent(id)+'" target="_blank" rel="noopener noreferrer">Abrir HTML completo ↗</a></div><div class="doc-sheet"><div class="placeholder">Carregando páginas do dossiê…</div></div>';
 let next=1,total=0,title=id;
 while(next&&target.isConnected&&token===target.readToken){
  const data=await api('/api/dossier/'+encodeURIComponent(id)+'?start='+next+'&limit='+(full?'8':'2'));
  if(token!==target.readToken||!target.isConnected)return;
  title=data.doc.title;
  const shell=$(host);
  const sheet=shell.querySelector('.doc-sheet');
  if(total===0)sheet.innerHTML='';
  const nodes=document.createDocumentFragment();
  for(const page of data.pages){
   const section=document.createElement('section');section.className='pdf-page';
   const header=document.createElement('div');header.className='page-number';header.textContent='PÁGINA '+page.page_num+' / '+data.doc.pages_imported;
   const txt=document.createElement('pre');txt.className='pdf-text';txt.textContent=page.page_text;
   section.append(header);
   if(page.has_visual){
    section.classList.add('has-visual');
    const img=document.createElement('img');img.className='page-visual';img.src='/html/'+encodeURIComponent(id)+'/page/'+Number(page.page_num)+'.svg';img.loading='lazy';img.decoding='async';img.alt='Página '+page.page_num+' do dossiê, com a diagramação original';
    img.addEventListener('error',()=>{img.hidden=true;transcript.open=true},{once:true});
    const transcript=document.createElement('details');transcript.className='page-transcript';const label=document.createElement('summary');label.textContent='Texto da página';transcript.append(label,txt);section.append(img,transcript);
   }else section.append(txt);nodes.appendChild(section);total++;
  }
  sheet.appendChild(nodes);
  const titleEl=shell.querySelector('.doc-meta b'),count=shell.querySelector('.doc-count');
  if(titleEl)titleEl.textContent=title;
  if(count)count.textContent=num(total)+' de '+num(data.doc.pages_imported)+' páginas carregadas';
  next=(full?data.next:null);
  if(next)await new Promise(resolve=>setTimeout(resolve,0));
 }
}
async function showReports(){
 const {summary,overview}=await dataCore();
 root(hero('Relatórios e Analytics','Comparações e resumo documental, sem gráficos com valores inventados.')+'<div class="stats">'+kpi(num(summary.processos),'PROCESSOS NA CARTEIRA','▣')+kpi(num(summary.comErro),'COM FALHAS','⚠','red')+kpi(num(summary.numopedeCandidatos),'CANDIDATOS NUMOPEDE','⚖')+'</div><div class="two-cols">'+panel('Distribuição por escritório',chartOffices(overview))+panel('Ranking de apontamentos',chartPeople(overview))+'</div>'+panel('Resumo executivo original convertido em HTML','<div id="reportsDoc"></div>'));
 await chooseDocument('resumo','reportsDoc',true);
}
async function showVideos(){
 const documents=await dossierList();let items=[];
 if(S.auth.canConfigure){const media=await api('/api/media/list');items=media.items}
 const videos=items.filter(x=>x.kind==='video');
 const videoCards=videos.map(x=>'<section class="card video-card"><div class="card-head">'+esc(x.title)+'</div><div class="card-body"><video controls playsinline preload="metadata" '+(x.poster_id?'poster="/api/media/file/'+encodeURIComponent(x.poster_id)+'"':'')+' src="/api/media/file/'+encodeURIComponent(x.id)+'"></video><div class="media-caption"><span>'+num(Math.round(x.byte_size/1048576))+' MB'+(x.duration_seconds?' · '+Math.floor(x.duration_seconds/60)+'min '+Math.floor(x.duration_seconds%60)+'s':'')+'</span><a class="action secondary" href="/api/media/file/'+encodeURIComponent(x.id)+'" target="_blank" rel="noopener noreferrer">Abrir vídeo ↗</a></div></div></section>').join('');
 const covers=documents.items.map(x=>'<button class="media-cover card" data-open-doc="'+esc(x.doc_id)+'"><img loading="lazy" src="/html/'+encodeURIComponent(x.doc_id)+'/page/1.svg" alt="Capa original: '+esc(x.title)+'"><strong>'+esc(x.title)+'</strong><small>'+num(x.pages_imported)+' páginas · Documento original</small></button>').join('');
 root(hero('Vídeos e Imagens','Vídeos originais com áudio e capas dos dossiês da auditoria.')+(videoCards?'<div class="media-videos">'+videoCards+'</div>':'<p class="doc-coverage">Nenhum vídeo autorizado nesta conta.</p>')+panel('Imagens dos dossiês originais','<div class="media-covers">'+covers+'</div>'));
}
async function showSettings(){
 const status=S.auth;
 root(hero('Configurações e Controle de Acesso','Acesso por escritório e advogado; documentos confidenciais isolados no servidor.')+panel('Sessão e segurança','<p><b>Usuário:</b> '+esc(status.user)+' · <b>Perfil:</b> '+esc(status.role)+'</p><p><b>Escritórios autorizados:</b> '+esc((status.companies||[]).join(', ')||'Não informados')+'</p><p><b>Advogados autorizados:</b> '+esc((status.lawyers||[]).join(', ')||'Não informados')+'</p><div class="toolbar"><button class="action secondary" data-act="logout">Sair desta sessão</button></div>')+(status.canConfigure?panel('Gerenciar usuários','<div id="usersList">Carregando contas…</div><h3 class="section-heading">Criar usuário individual</h3><label class="field">Nome de usuário</label><input class="input" id="newUsername" autocomplete="off"><label class="field">Senha inicial (mín. 12 caracteres)</label><input class="input" id="newPassword" type="password"><label class="field">Função</label><select id="newRole" class="select"><option value="viewer">Profissional</option><option value="admin">Administrador</option></select><label class="field">Escritórios (Ctrl para múltiplos)</label><select id="newCompanies" class="select" multiple size="5"><option value="GM">GM</option><option value="HUGS">HUGS</option><option value="JVA">JVA</option><option value="JVA / HUGS">Carteira histórica JVA / HUGS</option><option value="*">Todos</option></select><label class="field">Advogados (Ctrl para múltiplos)</label><select id="newLawyers" class="select" multiple size="8">'+lawyers.map(l=>'<option value="'+l+'">'+l+'</option>').join('')+'<option value="*">Todos</option></select><div class="toolbar"><button class="action" data-act="createUser">Criar conta autorizada</button></div><div class="note">A senha e o vínculo do advogado não são publicados no GitHub.</div>'):''));
 if(status.canConfigure){try{const d=await api('/api/auth/users');$('usersList').innerHTML=d.users.map(x=>'<div class="chat-row"><b>'+esc(x.username)+'</b> · '+esc(x.role)+'<small>Escritórios: '+esc(x.companies.join(', '))+' | Advogados: '+esc(x.lawyers.join(', '))+'</small></div>').join('')}catch(e){$('usersList').textContent=e.message}}
}
const enc=new TextEncoder();
function fromB64(s){return Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-String(s).length%4)%4)),x=>x.charCodeAt(0))}
function b64(buf){return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function derive(pass,salt,iters){
 const key=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveBits']);
 return crypto.subtle.deriveBits({name:'PBKDF2',salt:fromB64(salt),iterations:iters,hash:'SHA-256'},key,256)
}
async function loginProof(username,password){
 const q=await api('/api/auth/challenge?username='+encodeURIComponent(username));
 const raw=await derive(password,q.salt,q.iterations),key=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const msg=['csf-login-v1',q.nonce,q.challengeId,username.toLowerCase()].join(':');
 return {challengeId:q.challengeId,proof:b64(await crypto.subtle.sign('HMAC',key,enc.encode(msg)))};
}
async function login(){
 const username=$('username').value.trim(),password=$('password').value;
 $('authStatus').textContent='Validando acesso…';
 try{const proof=await loginProof(username,password);await post('/api/auth/login',{username,challengeId:proof.challengeId,proof:proof.proof});$('password').value='';$('authStatus').textContent='';await boot()}catch(e){$('authStatus').textContent=e.message}
}
async function createUser(){
 const username=$('newUsername').value.trim(),password=$('newPassword').value,role=$('newRole').value;
 const companies=[...$('newCompanies').selectedOptions].map(x=>x.value),lawyersSel=[...$('newLawyers').selectedOptions].map(x=>x.value);
 if(!/^[A-Za-z0-9_.-]{3,70}$/.test(username)||password.length<12)throw Error('Usuário inválido ou senha com menos de 12 caracteres');
 const salt=b64(crypto.getRandomValues(new Uint8Array(16))),hash=b64(await derive(password,salt,310000));
 await post('/api/auth/users',{username,salt,hash,iterations:310000,role,companies,lawyers:lawyersSel});
 toast('Usuário criado com permissões próprias');await showSettings();
}
async function saveReview(id){
 const status=$('reviewStatus')?.value,note=$('reviewNote')?.value||'';
 await post('/api/review',{record_id:Number(id),status,note});
 toast('Sua análise foi preservada no histórico.');await detailProcess(Number(id));
}
async function logout(){await post('/api/auth/logout',{});location.hash='';location.reload()}
async function onAction(el){
 const act=el.dataset.act;
 if(act==='search'){S.query=$('localSearch')?.value?.trim()||'';S.page=1;S.selectedId=null;return render()}
 if(act==='clear'){S.query='';S.page=1;S.selectedId=null;return render()}
 if(act==='saveReview')return saveReview(el.dataset.id);
 if(act==='logout')return logout();
 if(act==='createUser')return createUser();
}
document.addEventListener('click',e=>{
 const cover=e.target.closest('[data-open-doc]');if(cover){S.doc=cover.dataset.openDoc;return changeView('dossies')}
 const nav=e.target.closest('[data-route]');if(nav){e.preventDefault();return changeView(nav.dataset.route)}
 const company=e.target.closest('[data-company]');if(company){S.company=company.dataset.company;S.doc=null;return render().catch(reportError)}
 const lawyer=e.target.closest('[data-lawyer]');if(lawyer){S.lawyer=lawyer.dataset.lawyer;S.doc=null;return render().catch(reportError)}
 const doc=e.target.closest('[data-doc]');if(doc){
  S.doc=doc.dataset.doc;document.querySelectorAll('.doc-choice').forEach(x=>x.classList.toggle('active',x.dataset.doc===S.doc));
  return readDocument(S.doc,'docViewer',true).catch(reportError)
 }
 const process=e.target.closest('[data-process]');if(process){if($('processDetail'))return detailProcess(process.dataset.process).catch(reportError);return changeView('processos',{selectedId:Number(process.dataset.process)})}
 const msg=e.target.closest('[data-message]');if(msg)return detailMessage(msg.dataset.message).catch(reportError);
 const page=e.target.closest('[data-paging]');if(page){S.page=Math.max(1,S.page+Number(page.dataset.paging));S.selectedId=null;return render().catch(reportError)}
 const a=e.target.closest('[data-act]');if(a)return onAction(a).catch(reportError);
});
document.addEventListener('change',e=>{const key=e.target.dataset.filter;if(key){S[key]=e.target.value;S.page=1;S.selectedId=null;render().catch(reportError)}});
$('content').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='localSearch'){onAction({dataset:{act:'search'}}).catch(reportError)}});
$('loginButton').addEventListener('click',login);
$('password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){S.company='TODOS';S.lawyer='TODOS';changeView('processos',{query:e.target.value.trim()})}});
$('topLogout').addEventListener('click',()=>logout().catch(reportError));
window.addEventListener('hashchange',()=>{const v=(location.hash||'').match(/^#\/([a-z]+)/);if(v&&v[1]!==S.view&&navItems.some(x=>x[0]===v[1]))changeView(v[1])});
boot().catch(reportError);
})();
`;
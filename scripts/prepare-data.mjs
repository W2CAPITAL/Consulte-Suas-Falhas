import fs from 'node:fs';
const source=process.argv[2];if(!source||!fs.existsSync(source))throw new Error('Informe caminho para _numoped_master1811.json (arquivo privado)');
const rows=JSON.parse(fs.readFileSync(source,'utf8'));if(!Array.isArray(rows))throw new Error('Esperada uma lista de registros');
const clean=x=>String(x??'').trim();
const docs=rows.map((r,i)=>({processo:clean(r.Processo),cnj:clean(r.CNJ_DIGITOS)||clean(r.Processo).replace(/\D/g,''),cliente:clean(r.Cliente),escritorio:clean(r['Escritório']),advogados:clean(r.Advogados).split(/\s*[,/]\s*/).filter(Boolean),qtd_erros:Math.max(0,Number(r['Qtd erros'])||0),erros:clean(r.Erros),providencias:clean(r['O que deveria ter sido feito']),ultimo_andamento:clean(r['Último andamento']),anotacao:clean(r.Anotação),encerrado:clean(r.Encerrado),origem_linha:r.LINHA_FONTE||i+2}));
fs.mkdirSync('private',{recursive:true});fs.writeFileSync('private/audit.json',JSON.stringify(docs));console.log(docs.length+' registros privados preparados; NÃO COMITAR private/audit.json');

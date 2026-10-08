// Read the six distinct indicators printed on the first page of each source PDF.
// Never treat errors as a count of affected processes or add lawyer attributions.
export function parseDocumentMetrics(text){
 const row=String(text||'').match(/^\s*([\d.]+)[ \t]+([\d.]+)[ \t]+([\d.]+)[ \t]+([\d.]+)[ \t]+([\d.]+)[ \t]+([\d.]+)[ \t]*$/m);
 if(!row)return null;
 const values=row.slice(1).map(x=>Number(x.replace(/\./g,'')));
 if(values.some(x=>!Number.isSafeInteger(x)||x<0))return null;
 const [processos,erros,candidatos,ordens,cobrancas,errosGerais]=values;
 const rankings=[...String(text).matchAll(/^\s*(Matheus|Andressa|Eraldo|Maikon|Gilberto|Isai|Fabio)[ \t]+([\d.]+)[ \t]*$/gim)].map(x=>({nome:x[1].toUpperCase(),atribuicoes:Number(x[2].replace(/\./g,''))}));
 return {processos,erros,candidatos,ordens,cobrancas,errosGerais,rankings};
}
export async function readDocumentarySummary(DB){
 const rows=await DB.prepare("SELECT d.doc_id,d.title,d.kind,d.scope,p.page_text FROM dossier_docs d JOIN dossier_pages p ON p.doc_id=d.doc_id AND p.page_num=1 WHERE d.pages_imported=d.expected_pages AND d.pages_imported>0 AND d.kind IN ('summary','office','lawyer')").all();
 const docs=rows.results.map(row=>{const metrics=parseDocumentMetrics(row.page_text);return metrics?{docId:row.doc_id,title:row.title,kind:row.kind,scope:row.scope,...metrics}:null}).filter(Boolean);
 const summary=docs.find(d=>d.docId==='resumo');
 if(!summary)throw Error('Indicadores do resumo documental indisponíveis');
 return {...summary,escritorios:docs.filter(d=>d.kind==='office'),advogados:docs.filter(d=>d.kind==='lawyer')};
}

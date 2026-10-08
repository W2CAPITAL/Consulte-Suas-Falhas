-- Administrative policy fixed on 2026-10-08. CNJ year 2025/2026 is an approximate recent-wallet rule.
-- Import office_document_links from the private office process lists first.
WITH links AS (
 SELECT cnj,COUNT(*) n,MAX(office) only_office,
 MAX(office='GM') gm,MAX(office='JVA') jva,MAX(office='HUGS') hugs
 FROM office_document_links GROUP BY cnj
), assignments AS (
 SELECT p.record_id,p.escritorio previous_office,
 CASE
 WHEN l.n=1 THEN l.only_office
 WHEN l.n>1 AND substr(p.cnj,10,4)<='2024' AND l.jva=1 THEN 'JVA'
 WHEN l.n>1 AND substr(p.cnj,10,4)<='2024' AND l.hugs=1 THEN 'HUGS'
 WHEN l.n>1 AND l.gm=1 THEN 'GM'
 WHEN l.n>1 THEN 'JVA / HUGS'
 WHEN length(p.cnj)=20 AND substr(p.cnj,10,4) IN ('2025','2026') THEN 'GM'
 ELSE 'JVA / HUGS' END assigned_office,
 CASE WHEN l.n=1 THEN 'CORRESPONDENCIA_EXCLUSIVA_NO_DOSSIE'
 WHEN l.n>1 THEN 'TRANSFERENCIA_DOCUMENTADA_E_REGRA_ADMINISTRATIVA_POR_ANO'
 WHEN length(p.cnj)=20 AND substr(p.cnj,10,4) IN ('2025','2026') THEN 'REGRA_ADMINISTRATIVA_CARTEIRA_RECENTE_2025_2026'
 ELSE 'REGRA_ADMINISTRATIVA_CARTEIRA_DE_ORIGEM_JVA_HUGS' END criterion
 FROM processes p LEFT JOIN links l ON l.cnj=p.cnj WHERE p.escritorio='VINCULO A CONFIRMAR'
)
INSERT INTO office_assignment_audit(record_id,previous_office,assigned_office,criterion,policy_date)
SELECT record_id,previous_office,assigned_office,criterion,'2026-10-08' FROM assignments;
UPDATE processes SET escritorio=(SELECT assigned_office FROM office_assignment_audit a WHERE a.record_id=processes.record_id),
 payload=json_set(payload,'$."Escritório"',(SELECT assigned_office FROM office_assignment_audit a WHERE a.record_id=processes.record_id)),updated_at=unixepoch()
WHERE record_id IN (SELECT record_id FROM office_assignment_audit);

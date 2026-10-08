"""Extract office-specific process lists from private PDFs, never from contextual mentions.

Usage: python3 scripts/prepare-office-links.py PDF_DIRECTORY OUTPUT_DIRECTORY
Requires PyMuPDF. Output contains private CNJs and stays outside the repository.
Apply migration 0003, import these D1 batches, then scripts/apply-office-policy.sql.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
import fitz

root, output = map(Path, sys.argv[1:3])
output.mkdir(parents=True, exist_ok=True)
manifest = []
batch_number = 0
for office in ('GM', 'JVA', 'HUGS'):
    matches = list(root.glob(f'{office}_Dossie_Juridico_Visual*.pdf'))
    if len(matches) != 1:
        raise ValueError(f'{office}: provide exactly one source PDF')
    source = matches[0]
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    active = False
    found = set()
    for page in fitz.open(source):
        text = page.get_text(sort=True)
        if 'Lista de processos e todas as falhas' in text:
            active = True
        if active:
            ends = [text.index(marker) for marker in ('Erro distinto', 'Conclusões e medidas') if marker in text]
            section = text[:min(ends)] if ends else text
            found.update(re.sub(r'\D', '', cnj) for cnj in re.findall(r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}', section))
            if ends:
                break
    if not found:
        raise ValueError(f'{office}: process-list section not found; no links generated')
    ordered = sorted(found)
    for start in range(0, len(ordered), 25):
        subset = ordered[start:start + 25]
        sql = 'INSERT OR REPLACE INTO office_document_links(cnj,office,source_sha256) VALUES ' + ','.join('(?,?,?)' for _ in subset)
        params = [value for cnj in subset for value in (cnj, office, digest)]
        (output / f'batch-{batch_number:03}.json').write_text(json.dumps({'sql': sql, 'params': params}))
        batch_number += 1
    manifest.append({'office': office, 'processes': len(found), 'source_sha256': digest})
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2))
print(json.dumps({'sources': manifest, 'batches': batch_number}))

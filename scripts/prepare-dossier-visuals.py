"""Convert private source PDFs to compressed vector pages, outside the checkout.

Usage: python3 scripts/prepare-dossier-visuals.py PDF_DIRECTORY DANILO_PDF OUTPUT_DIRECTORY
Requires PyMuPDF. The output contains confidential documents and must not be committed.
"""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import fitz

root, danilo, output = map(Path, sys.argv[1:4])
output.mkdir(parents=True, exist_ok=True)
sources = {p.name.split('_')[0].lower(): p for p in root.rglob('*_Dossie_Juridico_Visual*.pdf')}
sources['resumo'] = next(root.rglob('00_Resumo_Executivo_Geral*.pdf'))
sources['danilo'] = danilo
expected = {key:len(fitz.open(sources[key])) for key in ('resumo','gm','hugs','jva','matheus','andressa','eraldo','maikon','gilberto','isai','fabio','danilo')}
pages = []
manifest = []
for doc_id, count in expected.items():
    source = sources[doc_id]
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    document = fitz.open(source)
    if len(document) != count:
        raise ValueError(f'{doc_id}: expected {count} pages, found {len(document)}')
    for index, page in enumerate(document):
        # Outline glyphs so the client does not need the original PDF fonts.
        svg = page.get_svg_image(text_as_path=True)
        tree = ET.fromstring(svg)
        if any(element.tag.rsplit('}', 1)[-1] in ('script', 'foreignObject') for element in tree.iter()):
            raise ValueError('Unexpected active SVG content')
        for element in tree.iter():
            for key, value in element.attrib.items():
                if key.lower().startswith('on') or (key.endswith('href') and not value.startswith(('#', 'data:image/'))):
                    raise ValueError('Unexpected external or active SVG attribute')
        compressed = base64.b64encode(gzip.compress(svg.encode(), mtime=0)).decode()
        if len(compressed) > 1_000_000:
            raise ValueError('Visual page exceeds import batch limit')
        pages.append({'doc_id': doc_id, 'page_num': index + 1, 'text':page.get_text(sort=True), 'svg': compressed, 'sha256': digest})
    manifest.append({'doc_id': doc_id, 'pages': count, 'source_sha256': digest})
for index in range(0, len(pages), 6):
    chunk = pages[index:index + 6]
    placeholders = ','.join('(?,?,?,?,?)' for _ in chunk)
    params = [value for page in chunk for value in (page['doc_id'], str(page['page_num']), page['text'], page['svg'], page['sha256'])]
    sql = ('INSERT INTO dossier_import_pages(doc_id,page_num,page_text,page_svg_gzip,source_sha256) VALUES ' + placeholders +
           ' ON CONFLICT(doc_id,page_num) DO UPDATE SET page_text=excluded.page_text,page_svg_gzip=excluded.page_svg_gzip,source_sha256=excluded.source_sha256')
    (output / f'batch-{index // 6:03}.json').write_text(json.dumps({'sql': sql, 'params': params}))
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2))
print(json.dumps({'documents': len(manifest), 'pages': len(pages), 'batches': (len(pages) + 5) // 6,
                  'compressed_bytes': sum(len(page['svg']) for page in pages)}))

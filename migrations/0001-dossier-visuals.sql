CREATE TABLE IF NOT EXISTS dossier_visual_pages (
  doc_id TEXT NOT NULL,
  page_num INTEGER NOT NULL,
  page_svg_gzip TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  PRIMARY KEY (doc_id, page_num),
  FOREIGN KEY (doc_id, page_num) REFERENCES dossier_pages(doc_id, page_num)
);

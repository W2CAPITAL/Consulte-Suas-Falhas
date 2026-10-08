CREATE TABLE IF NOT EXISTS dossier_import_pages (
  doc_id TEXT NOT NULL,
  page_num INTEGER NOT NULL,
  page_text TEXT NOT NULL,
  page_svg_gzip TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  PRIMARY KEY (doc_id, page_num)
);
ALTER TABLE audit_media ADD COLUMN sha256 TEXT;
ALTER TABLE audit_media ADD COLUMN poster_id TEXT;
ALTER TABLE audit_media ADD COLUMN duration_seconds REAL;

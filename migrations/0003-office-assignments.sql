-- Evidence is imported privately from the office-specific process tables in the PDFs.
-- Preserve the prior assignment and the applied policy for each changed record.
CREATE TABLE IF NOT EXISTS office_document_links (
  cnj TEXT NOT NULL,
  office TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  PRIMARY KEY (cnj, office)
);
CREATE TABLE IF NOT EXISTS office_assignment_audit (
  record_id INTEGER PRIMARY KEY,
  previous_office TEXT NOT NULL,
  assigned_office TEXT NOT NULL,
  criterion TEXT NOT NULL,
  policy_date TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

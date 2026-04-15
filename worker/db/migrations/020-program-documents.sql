-- Required documents per funding program (static + AI-generated)
CREATE TABLE IF NOT EXISTS program_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT,
  required INTEGER DEFAULT 1,
  source TEXT DEFAULT 'manual',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_program_documents_program ON program_documents(program_id);

-- Seed universal documents that apply to most programs (program_id = '*')
INSERT INTO program_documents (program_id, document_name, description, source) VALUES
  ('*', 'Gewerbeanmeldung', 'Aktuelle Gewerbeanmeldung oder Handelsregisterauszug', 'manual'),
  ('*', 'KMU-Erklaerung', 'Erklaerung zum KMU-Status gemaess EU-Definition', 'manual'),
  ('*', 'De-minimis-Erklaerung', 'Erklaerung ueber erhaltene De-minimis-Beihilfen', 'manual'),
  ('*', 'Jahresabschluss', 'Letzter verfuegbarer Jahresabschluss', 'manual'),
  ('*', 'Personalausweis', 'Kopie des Personalausweises des Geschaeftsfuehrers', 'manual');

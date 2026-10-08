"""Exercise the deployed SQL policy against synthetic records in real SQLite."""
import json
from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parents[1]
db = sqlite3.connect(':memory:')
db.executescript('CREATE TABLE processes(record_id INTEGER PRIMARY KEY,cnj TEXT,escritorio TEXT,payload TEXT,updated_at INTEGER);')
db.executescript((root / 'migrations/0003-office-assignments.sql').read_text())
cases = [
    # year, existing office, document links, expected final classification
    ('2024', 'GM', [], 'GM'),
    ('2026', 'VINCULO A CONFIRMAR', ['JVA'], 'JVA'),
    ('2024', 'VINCULO A CONFIRMAR', ['JVA', 'GM'], 'JVA'),
    ('2025', 'VINCULO A CONFIRMAR', ['JVA', 'GM'], 'GM'),
    ('2024', 'VINCULO A CONFIRMAR', ['HUGS', 'GM'], 'HUGS'),
    ('2026', 'VINCULO A CONFIRMAR', [], 'GM'),
    ('2023', 'VINCULO A CONFIRMAR', [], 'JVA / HUGS'),
    ('', 'VINCULO A CONFIRMAR', [], 'JVA / HUGS'),
]
for i, (year, office, links, expected) in enumerate(cases, 1):
    cnj = f'{i:09d}{year}8000000' if year else ''
    db.execute('INSERT INTO processes VALUES(?,?,?,?,0)', (i, cnj, office, json.dumps({'Escritório': office})))
    for link in links:
        db.execute('INSERT INTO office_document_links VALUES(?,?,?)', (cnj, link, 'synthetic-hash'))
policy = (root / 'scripts/apply-office-policy.sql').read_text()
db.executescript(policy)
for i, case in enumerate(cases, 1):
    office, payload = db.execute('SELECT escritorio,payload FROM processes WHERE record_id=?', (i,)).fetchone()
    assert office == case[3], (i, office, case[3])
    assert json.loads(payload)['Escritório'] == office
assert db.execute('SELECT COUNT(*) FROM office_assignment_audit').fetchone()[0] == 7
assert db.execute('SELECT COUNT(*) FROM office_assignment_audit WHERE previous_office=?', ('VINCULO A CONFIRMAR',)).fetchone()[0] == 7
before = db.execute('SELECT * FROM processes ORDER BY record_id').fetchall()
db.executescript(policy)
assert before == db.execute('SELECT * FROM processes ORDER BY record_id').fetchall()
print('PASS: documented links, transfer cases, recent/historical policy, preserved assignments, JSON consistency and repeat execution.')

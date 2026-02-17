// Database Backup Service - Scheduled Worker

export async function performBackup(databases: { name: string; db: D1Database }[], bucket: R2Bucket): Promise<{ success: boolean; details: string[] }> {
  const details: string[] = []
  const date = new Date().toISOString().split('T')[0]
  const ts = new Date().toISOString()

  for (const { name, db } of databases) {
    try {
      const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all()
      let dump = `-- Backup of ${name} at ${ts}\n\n`

      for (const t of tables.results as any[]) {
        const rows = await db.prepare(`SELECT * FROM "${t.name}"`).all()
        dump += `-- ${t.name}: ${rows.results.length} rows\n`
        for (const row of rows.results as any[]) {
          const cols = Object.keys(row)
          const vals = cols.map(c => row[c] === null ? 'NULL' : typeof row[c] === 'number' ? row[c].toString() : `'${String(row[c]).replace(/'/g, "''")}'`)
          dump += `INSERT OR REPLACE INTO "${t.name}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${vals.join(',')});\n`
        }
        dump += '\n'
      }

      await bucket.put(`backups/${date}/${name}.sql`, dump, { httpMetadata: { contentType: 'text/plain' }, customMetadata: { database: name, timestamp: ts } })
      details.push(`OK: ${name}`)
    } catch (e) {
      details.push(`FAIL: ${name} - ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }
  return { success: details.every(d => d.startsWith('OK')), details }
}

export async function cleanupOldBackups(bucket: R2Bucket): Promise<number> {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
  let deleted = 0, cursor: string | undefined
  do {
    const listed = await bucket.list({ prefix: 'backups/', cursor })
    for (const obj of listed.objects) {
      const m = obj.key.match(/backups\/(\d{4}-\d{2}-\d{2})\//)
      if (m && new Date(m[1]) < cutoff) { await bucket.delete(obj.key); deleted++ }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
  return deleted
}

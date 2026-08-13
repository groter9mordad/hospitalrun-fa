/* eslint-disable no-underscore-dangle */
import { clinicalDb, configureDatabaseSync, stopDatabaseSync } from '../config/pouchdb'
import { loadSyncConfiguration } from '../config/syncConfiguration'

const LAST_BACKUP_KEY = 'runcdx:last-local-backup'
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const BACKUP_CHECK_INTERVAL_MS = 60 * 60 * 1000
const INITIAL_BACKUP_DELAY_MS = 30 * 1000

interface BackupResult {
  fileName: string
  path: string
  createdAt: string
}

interface RunCdxBackup {
  format: 'runcdx-json-backup'
  version: 1
  createdAt: string
  database: 'local_hospitalrun'
  documentCount?: number
  documents: Array<Record<string, any>>
}

const isBackupDue = () => {
  const lastBackup = Number(window.localStorage.getItem(LAST_BACKUP_KEY) || 0)
  return !lastBackup || Date.now() - lastBackup >= BACKUP_INTERVAL_MS
}

export const createLocalBackup = async (): Promise<BackupResult | undefined> => {
  if (!window.runcdxDesktop) {
    return undefined
  }

  const database = await clinicalDb.allDocs({ include_docs: true, attachments: true })
  const backup = {
    format: 'runcdx-json-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    database: 'local_hospitalrun',
    documentCount: database.rows.length,
    documents: database.rows.map((row) => row.doc).filter(Boolean),
  }

  const result = await window.runcdxDesktop.backup.save(JSON.stringify(backup))
  window.localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  return result
}

const parseBackup = (contents: string): RunCdxBackup => {
  const backup = JSON.parse(contents) as RunCdxBackup
  if (
    backup.format !== 'runcdx-json-backup' ||
    backup.version !== 1 ||
    backup.database !== 'local_hospitalrun' ||
    !Array.isArray(backup.documents)
  ) {
    throw new Error('INVALID_RUNCDX_BACKUP')
  }
  const hasInvalidDocument = backup.documents.some(
    (document) => !document || typeof document._id !== 'string' || !document._id,
  )
  if (hasInvalidDocument) {
    throw new Error('INVALID_RUNCDX_BACKUP_DOCUMENT')
  }
  return backup
}

export const restoreLocalBackup = async () => {
  if (!window.runcdxDesktop) {
    throw new Error('DESKTOP_BACKUP_NOT_AVAILABLE')
  }
  const selected = await window.runcdxDesktop.backup.select()
  if (!selected) {
    return undefined
  }
  const backup = parseBackup(selected.contents)
  const syncConfiguration = await loadSyncConfiguration()

  // Never replace clinical data without first preserving the current state.
  await createLocalBackup()
  stopDatabaseSync()

  try {
    const current = await clinicalDb.allDocs({ include_docs: true })
    const currentDocuments = current.rows
      .map((row) => row.doc as Record<string, any> | undefined)
      .filter((document): document is Record<string, any> => Boolean(document))
    const currentById = new Map(currentDocuments.map((document) => [document._id, document]))
    const backupIds = new Set(backup.documents.map((document) => document._id))

    const restoredDocuments = backup.documents.map((backupDocument) => {
      const contents = { ...backupDocument }
      delete contents._rev
      delete contents._conflicts
      const currentDocument = currentById.get(backupDocument._id)
      return currentDocument?._rev ? { ...contents, _rev: currentDocument._rev } : contents
    })
    const deletedDocuments = currentDocuments
      .filter((document) => !backupIds.has(document._id))
      .map((document) => ({ _id: document._id, _rev: document._rev, _deleted: true }))

    const results = await clinicalDb.bulkDocs([...restoredDocuments, ...deletedDocuments] as any)
    const failed = results.filter((result: any) => result.error)
    if (failed.length) {
      throw new Error('RUNCDX_BACKUP_RESTORE_FAILED')
    }
    return { path: selected.path, restoredDocuments: backup.documents.length }
  } finally {
    // Restore temporarily suspends replication so that the dataset is replaced
    // atomically from the user's perspective. Always resume the configured LAN
    // sync afterwards, even if the restore itself reports an error.
    configureDatabaseSync(syncConfiguration).catch(() => undefined)
  }
}

const createBackupIfDue = () => {
  if (isBackupDue()) {
    createLocalBackup().catch(() => {
      // A failed backup remains due and will be attempted on the next check.
    })
  }
}

export const startLocalBackupScheduler = () => {
  if (!window.runcdxDesktop) {
    return () => undefined
  }

  const initialBackup = window.setTimeout(createBackupIfDue, INITIAL_BACKUP_DELAY_MS)
  const backupCheck = window.setInterval(createBackupIfDue, BACKUP_CHECK_INTERVAL_MS)

  return () => {
    window.clearTimeout(initialBackup)
    window.clearInterval(backupCheck)
  }
}

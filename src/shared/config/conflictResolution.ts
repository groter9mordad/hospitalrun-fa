/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */

type Document = Record<string, any> & {
  _id: string
  _rev: string
  _conflicts?: string[]
}

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const itemIdentity = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  const identity = value.id || value._id || value.code
  return typeof identity === 'string' && identity ? identity : undefined
}

function mergeValues(older: unknown, newer: unknown): unknown {
  if (newer === undefined) {
    return older
  }
  if (Array.isArray(older) && Array.isArray(newer)) {
    return mergeArrays(older, newer)
  }
  if (isRecord(older) && isRecord(newer)) {
    return Object.keys({ ...older, ...newer }).reduce<Record<string, unknown>>(
      (merged, key) => ({
        ...merged,
        [key]: mergeValues(older[key], newer[key]),
      }),
      {},
    )
  }
  return newer
}

function mergeArrays(older: unknown[], newer: unknown[]): unknown[] {
  const merged = older.map((item) => item)
  newer.forEach((newItem) => {
    const identity = itemIdentity(newItem)
    if (!identity) {
      if (!merged.some((item) => JSON.stringify(item) === JSON.stringify(newItem))) {
        merged.push(newItem)
      }
      return
    }

    const existingIndex = merged.findIndex((item) => itemIdentity(item) === identity)
    if (existingIndex === -1) {
      merged.push(newItem)
    } else {
      merged[existingIndex] = mergeValues(merged[existingIndex], newItem)
    }
  })
  return merged
}

const documentTimestamp = (document: Document) => {
  const data = isRecord(document.data) ? document.data : document
  const timestamp = Date.parse(String(data.updatedAt || data.createdAt || ''))
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const withoutRevisionMetadata = (document: Document) => {
  const { _rev, _conflicts, ...contents } = document
  return contents
}

export const mergeConflictingDocuments = (documents: Document[]): Document => {
  const ordered = [...documents].sort(
    (left, right) => documentTimestamp(left) - documentTimestamp(right),
  )
  const winningDocument = documents[0]
  const mergedContents = ordered.reduce<Record<string, any>>(
    (merged, document) =>
      mergeValues(merged, withoutRevisionMetadata(document)) as Record<string, any>,
    {},
  )

  return {
    ...mergedContents,
    _id: winningDocument._id,
    _rev: winningDocument._rev,
  }
}

let conflictResolutionRunning = false

export const resolveDatabaseConflicts = async (database: PouchDB.Database) => {
  if (conflictResolutionRunning) {
    return 0
  }
  conflictResolutionRunning = true
  try {
    const allDocuments = await database.allDocs({ include_docs: true, conflicts: true })
    const conflicted = allDocuments.rows
      .map((row) => row.doc as Document | undefined)
      .filter((document): document is Document => Boolean(document?._conflicts?.length))

    const resolutions = await Promise.all(
      conflicted.map(async (winningDocument) => {
        try {
          const conflictingRevisions = winningDocument._conflicts || []
          const losingDocuments = await Promise.all(
            conflictingRevisions.map(
              (revision) =>
                database.get(winningDocument._id, { rev: revision }) as Promise<Document>,
            ),
          )
          const versions = [winningDocument, ...losingDocuments]
          const mergedDocument = mergeConflictingDocuments(versions)

          await database.put({
            _id: `runcdx-conflict-audit:${winningDocument._id}:${Date.now()}`,
            type: 'runcdx_conflict_audit',
            recordId: winningDocument._id,
            resolvedAt: new Date().toISOString(),
            versions: versions.map((version) => ({
              revision: version._rev,
              contents: withoutRevisionMetadata(version),
            })),
          } as any)
          await database.put(mergedDocument as any)
          await database.bulkDocs(
            losingDocuments.map((document) => ({
              _id: document._id,
              _rev: document._rev,
              _deleted: true,
            })) as any,
          )
          return true
        } catch (error) {
          // Another client may resolve the same conflict first. Any remaining
          // branch is detected again after the next successful replication.
          return false
        }
      }),
    )
    return resolutions.filter(Boolean).length
  } finally {
    conflictResolutionRunning = false
  }
}

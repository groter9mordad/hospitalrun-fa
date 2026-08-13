/* eslint-disable no-underscore-dangle */

type Document = Record<string, any> & {
  _id: string
  _rev: string
  _conflicts?: string[]
}

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const documentTimestamp = (document: Document) => {
  const data = isRecord(document.data) ? document.data : document
  const timestamp = Date.parse(String(data.updatedAt || data.createdAt || ''))
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const withoutRevisionMetadata = (document: Document) => {
  const { _rev, _conflicts, ...contents } = document
  return contents
}

/**
 * Resolve a conflict by selecting one complete revision, never by combining
 * clinical fields from separate edits. A field-by-field merge can manufacture
 * a medical record that no clinician actually entered. The current CouchDB
 * winner is preferred when timestamps are equal or unavailable; otherwise the
 * most recently timestamped whole revision is copied onto the winning branch.
 * Every original revision is written to the conflict audit before cleanup.
 *
 * The historic export name is retained to avoid breaking callers.
 */
export const mergeConflictingDocuments = (documents: Document[]): Document => {
  if (!documents.length) {
    throw new Error('At least one document revision is required.')
  }

  const couchDbWinner = documents[0]
  const selected = documents.reduce((current, candidate) =>
    documentTimestamp(candidate) > documentTimestamp(current) ? candidate : current,
  )

  return {
    ...withoutRevisionMetadata(selected),
    _id: couchDbWinner._id,
    _rev: couchDbWinner._rev,
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
          const resolvedDocument = mergeConflictingDocuments(versions)

          // Persist every original branch before changing or deleting revisions.
          // This makes automatic conflict handling recoverable and auditable.
          await database.put({
            _id: `runcdx-conflict-audit:${winningDocument._id}:${Date.now()}`,
            type: 'runcdx_conflict_audit',
            recordId: winningDocument._id,
            resolvedAt: new Date().toISOString(),
            resolutionMode: 'latest-whole-document',
            selectedRevision:
              versions.find(
                (version) =>
                  JSON.stringify(withoutRevisionMetadata(version)) ===
                  JSON.stringify(withoutRevisionMetadata(resolvedDocument)),
              )?._rev || winningDocument._rev,
            versions: versions.map((version) => ({
              revision: version._rev,
              contents: withoutRevisionMetadata(version),
            })),
          } as any)
          await database.put(resolvedDocument as any)
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

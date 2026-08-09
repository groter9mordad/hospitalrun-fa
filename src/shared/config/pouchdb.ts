/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable camelcase */
import PouchDB from 'pouchdb'
import PouchAuth from 'pouchdb-authentication'
import PouchdbFind from 'pouchdb-find'
import RelationalPouch from 'relational-pouch'

import { resolveDatabaseConflicts } from './conflictResolution'
import { getRemoteDatabaseUrl, SyncConfiguration } from './syncConfiguration'

const memoryAdapter = require('pouchdb-adapter-memory')
const search = require('pouchdb-quick-search')

PouchDB.plugin(search)
PouchDB.plugin(memoryAdapter)
PouchDB.plugin(RelationalPouch)
PouchDB.plugin(PouchdbFind)
PouchDB.plugin(PouchAuth)

let localDb: PouchDB.Database
let syncHandler: PouchDB.Replication.Sync<Record<string, unknown>> | undefined
let remoteDatabase: PouchDB.Database | undefined

export type DatabaseSyncState = 'standalone' | 'connecting' | 'connected' | 'offline'

let databaseSyncState: DatabaseSyncState = 'standalone'
const syncStateListeners: Array<(state: DatabaseSyncState) => void> = []

const updateSyncState = (state: DatabaseSyncState) => {
  databaseSyncState = state
  syncStateListeners.forEach((listener) => listener(state))
}

if (process.env.NODE_ENV === 'test') {
  localDb = new PouchDB('local_hospitalrun', { skip_setup: true, adapter: 'memory' })
} else {
  localDb = new PouchDB('local_hospitalrun', { skip_setup: true })
}

const createRemoteDatabase = (configuration: SyncConfiguration) =>
  new PouchDB(getRemoteDatabaseUrl(configuration), {
    skip_setup: true,
    auth:
      configuration.username || configuration.password
        ? {
            username: configuration.username,
            password: configuration.password,
          }
        : undefined,
  })

const startLiveSync = (database: PouchDB.Database) => {
  syncHandler = localDb.sync(database, { live: true, retry: true })
  syncHandler.on('active', () => updateSyncState('connecting'))
  syncHandler.on('paused', (error) => {
    updateSyncState(error ? 'offline' : 'connected')
    if (!error) {
      resolveDatabaseConflicts(localDb).catch(() => undefined)
    }
  })
  syncHandler.on('denied', () => updateSyncState('offline'))
  syncHandler.on('error', () => updateSyncState('offline'))
}

export const stopDatabaseSync = () => {
  if (syncHandler) {
    syncHandler.cancel()
    syncHandler = undefined
  }
  if (remoteDatabase) {
    remoteDatabase.close().catch(() => undefined)
    remoteDatabase = undefined
  }
  updateSyncState('standalone')
}

export const configureDatabaseSync = async (
  configuration: SyncConfiguration,
): Promise<DatabaseSyncState> => {
  stopDatabaseSync()
  if (configuration.mode !== 'network') {
    return 'standalone'
  }

  const database = createRemoteDatabase(configuration)
  remoteDatabase = database
  updateSyncState('connecting')

  const initialSync = localDb.sync(database)
  let initialSyncTimedOut = false
  let timeoutId: number | undefined
  try {
    // The first finite exchange ensures user accounts and existing clinical
    // records are available locally before the permanent retrying sync starts.
    await Promise.race([
      initialSync,
      new Promise((resolve) => {
        timeoutId = window.setTimeout(() => {
          initialSyncTimedOut = true
          resolve(undefined)
        }, 10000)
      }),
    ])
    if (initialSyncTimedOut) {
      initialSync.cancel()
      throw new Error('INITIAL_SYNC_TIMEOUT')
    }
    await resolveDatabaseConflicts(localDb)
    updateSyncState('connected')
  } catch (error) {
    // A failed LAN connection never blocks local work. The live replication
    // below keeps retrying and exchanges queued changes when the router returns.
    updateSyncState('offline')
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }

  startLiveSync(database)
  return databaseSyncState
}

export const testDatabaseConnection = async (configuration: SyncConfiguration) => {
  const database = createRemoteDatabase(configuration)
  try {
    await database.info()
  } finally {
    await database.close()
  }
}

export const schema = [
  {
    singular: 'patient',
    plural: 'patients',
    relations: {
      appointments: {
        hasMany: { type: 'appointment', options: { queryInverse: 'patient', async: true } },
      },
      labs: { hasMany: { type: 'lab', options: { queryInverse: 'patient', async: true } } },
      medications: {
        hasMany: { type: 'medication', options: { queryInverse: 'patient', async: true } },
      },
      imagings: { hasMany: { type: 'imaging', options: { queryInverse: 'patient', async: true } } },
    },
  },
  {
    singular: 'appointment',
    plural: 'appointments',
    relations: { patient: { belongsTo: 'patient' } },
  },
  {
    singular: 'incident',
    plural: 'incidents',
  },
  {
    singular: 'lab',
    plural: 'labs',
    relations: { patient: { belongsTo: 'patient' } },
  },
  {
    singular: 'imaging',
    plural: 'imagings',
    relations: { patient: { belongsTo: 'patient' } },
  },
  {
    singular: 'medication',
    plural: 'medications',
    relations: { patient: { belongsTo: 'patient' } },
  },
]
export const relationalDb = localDb.setSchema(schema)
export const clinicalDb = localDb

export const getDatabaseSyncState = () => databaseSyncState

export const subscribeToDatabaseSync = (listener: (state: DatabaseSyncState) => void) => {
  syncStateListeners.push(listener)
  return () => {
    const listenerIndex = syncStateListeners.indexOf(listener)
    if (listenerIndex >= 0) {
      syncStateListeners.splice(listenerIndex, 1)
    }
  }
}

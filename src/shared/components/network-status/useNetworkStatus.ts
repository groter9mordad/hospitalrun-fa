import { useState, useEffect } from 'react'

import {
  DatabaseSyncState,
  getDatabaseSyncState,
  subscribeToDatabaseSync,
} from '../../config/pouchdb'
import { NetworkStatus } from './types'

export const useNetworkStatus = (): NetworkStatus => {
  const initialSyncState = getDatabaseSyncState()
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: initialSyncState === 'connected' || initialSyncState === 'standalone',
    wasOffline: initialSyncState === 'offline',
    isStandalone: initialSyncState === 'standalone',
    isSyncing: initialSyncState === 'connecting',
  })

  useEffect(() => {
    const handleSyncState = (syncState: DatabaseSyncState) => {
      setNetworkStatus((previousState) => ({
        isOnline: syncState === 'connected' || syncState === 'standalone',
        wasOffline: previousState.wasOffline || syncState === 'offline',
        isStandalone: syncState === 'standalone',
        isSyncing: syncState === 'connecting',
      }))
    }

    return subscribeToDatabaseSync(handleSyncState)
  }, [])

  return networkStatus
}

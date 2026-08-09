export type SyncMode = 'standalone' | 'network'

export interface SyncConfiguration {
  mode: SyncMode
  serverUrl: string
  databaseName: string
  username: string
  password: string
}

const BROWSER_STORAGE_KEY = 'runcdx:sync-configuration'

export const defaultSyncConfiguration: SyncConfiguration = {
  mode: 'standalone',
  serverUrl: 'http://127.0.0.1:5984',
  databaseName: 'hospitalrun',
  username: '',
  password: '',
}

const normalizeConfiguration = (configuration?: Partial<SyncConfiguration>): SyncConfiguration => ({
  mode: configuration?.mode === 'network' ? 'network' : 'standalone',
  serverUrl: (configuration?.serverUrl || defaultSyncConfiguration.serverUrl)
    .trim()
    .replace(/\/$/, ''),
  databaseName: (configuration?.databaseName || defaultSyncConfiguration.databaseName)
    .trim()
    .replace(/^\/+|\/+$/g, ''),
  username: (configuration?.username || '').trim(),
  password: configuration?.password || '',
})

export const loadSyncConfiguration = async (): Promise<SyncConfiguration> => {
  if (window.runcdxDesktop?.sync) {
    const configuration = await window.runcdxDesktop.sync.getConfiguration()
    return normalizeConfiguration(configuration)
  }

  try {
    const stored = window.localStorage.getItem(BROWSER_STORAGE_KEY)
    return normalizeConfiguration(stored ? JSON.parse(stored) : undefined)
  } catch (error) {
    return defaultSyncConfiguration
  }
}

export const saveSyncConfiguration = async (configuration: SyncConfiguration) => {
  const normalized = normalizeConfiguration(configuration)
  if (window.runcdxDesktop?.sync) {
    await window.runcdxDesktop.sync.saveConfiguration(normalized)
  } else {
    window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(normalized))
  }
  return normalized
}

export const getRemoteDatabaseUrl = (configuration: SyncConfiguration) =>
  `${configuration.serverUrl}/${encodeURIComponent(configuration.databaseName)}`

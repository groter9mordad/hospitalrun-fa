import {
  defaultSyncConfiguration,
  getRemoteDatabaseUrl,
  loadSyncConfiguration,
  saveSyncConfiguration,
  SyncConfiguration,
} from '../../../shared/config/syncConfiguration'

describe('RunCDX sync configuration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete window.runcdxDesktop
  })

  it('starts in safe standalone mode', async () => {
    expect(await loadSyncConfiguration()).toEqual(defaultSyncConfiguration)
  })

  it('persists and normalizes a clinic network configuration', async () => {
    const configuration: SyncConfiguration = {
      mode: 'network',
      serverUrl: 'http://RUNCDX-SERVER:5984/',
      databaseName: '/hospitalrun/',
      username: ' clinic-sync ',
      password: 'secret password',
    }

    const saved = await saveSyncConfiguration(configuration)

    expect(saved).toEqual({
      ...configuration,
      serverUrl: 'http://RUNCDX-SERVER:5984',
      databaseName: 'hospitalrun',
      username: 'clinic-sync',
    })
    expect(await loadSyncConfiguration()).toEqual(saved)
    expect(getRemoteDatabaseUrl(saved)).toBe('http://RUNCDX-SERVER:5984/hospitalrun')
  })
})

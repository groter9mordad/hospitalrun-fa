import { fireEvent, render, waitFor } from '@testing-library/react'
import React from 'react'

import NetworkSettings from '../../settings/NetworkSettings'
import { configureDatabaseSync } from '../../shared/config/pouchdb'

jest.mock('../../shared/config/pouchdb', () => ({
  configureDatabaseSync: jest.fn().mockResolvedValue('connected'),
  getDatabaseSyncState: jest.fn().mockReturnValue('standalone'),
  testDatabaseConnection: jest.fn(),
}))

describe('NetworkSettings', () => {
  beforeEach(() => {
    window.localStorage.clear()
    ;(window as any).runcdxDesktop = {
      backup: {
        getLocation: jest.fn(),
        save: jest.fn(),
        select: jest.fn(),
        openLocation: jest.fn(),
      },
      sync: {
        getConfiguration: jest.fn().mockResolvedValue({
          mode: 'standalone',
          serverUrl: 'http://127.0.0.1:5984',
          databaseName: 'hospitalrun',
          username: '',
          password: '',
        }),
        saveConfiguration: jest.fn().mockResolvedValue(undefined),
      },
      server: {
        install: jest.fn().mockResolvedValue({
          mode: 'network',
          serverUrl: 'http://127.0.0.1:5984',
          databaseName: 'hospitalrun',
          username: 'runcdx-sync',
          password: 'generated-secret',
        }),
        importConnection: jest.fn().mockResolvedValue({
          mode: 'network',
          serverUrl: 'http://RUNCDX-SERVER:5984',
          databaseName: 'hospitalrun',
          username: 'runcdx-sync',
          password: 'shared-secret',
        }),
        exportConnection: jest.fn().mockResolvedValue('D:\\runcdx-clinic-connection.json'),
      },
    }
  })

  afterEach(() => {
    delete window.runcdxDesktop
  })

  it('automatically installs and activates the main clinic computer', async () => {
    const screen = render(<NetworkSettings />)
    const installButton = await screen.findByText('آماده‌سازی خودکار کامپیوتر اصلی')

    fireEvent.click(installButton)

    await waitFor(() => expect(screen.getByText(/سیستم اصلی مطب آماده شد/)).toBeInTheDocument())
    expect(window.runcdxDesktop?.server.install).toHaveBeenCalledTimes(1)
    expect(window.runcdxDesktop?.sync.saveConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'network',
        username: 'runcdx-sync',
        password: 'generated-secret',
      }),
    )
    expect(configureDatabaseSync).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'network', serverUrl: 'http://127.0.0.1:5984' }),
    )
  })

  it('connects a second computer by importing the clinic file', async () => {
    const connected = jest.fn()
    const screen = render(<NetworkSettings compact onConnected={connected} />)
    const importButton = await screen.findByText('خواندن فایل اتصال مطب')

    fireEvent.click(importButton)

    await waitFor(() => expect(connected).toHaveBeenCalledTimes(1))
    expect(window.runcdxDesktop?.server.importConnection).toHaveBeenCalledTimes(1)
    expect(window.runcdxDesktop?.sync.saveConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: 'http://RUNCDX-SERVER:5984',
        username: 'runcdx-sync',
        password: 'shared-secret',
      }),
    )
  })
})

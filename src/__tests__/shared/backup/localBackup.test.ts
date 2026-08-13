/* eslint-disable no-underscore-dangle */
import { createLocalBackup, restoreLocalBackup } from '../../../shared/backup/localBackup'
import { clinicalDb } from '../../../shared/config/pouchdb'

const installDesktopBridge = (overrides: Record<string, jest.Mock> = {}) => {
  const backup = {
    getLocation: jest.fn().mockResolvedValue('C:\\Users\\Test\\Documents\\RunCDX Backups'),
    save: jest.fn().mockResolvedValue({
      fileName: 'runcdx-backup-1.json',
      path: 'C:\\Users\\Test\\Documents\\RunCDX Backups\\runcdx-backup-1.json',
      createdAt: '2026-08-09T12:00:00.000Z',
    }),
    select: jest.fn(),
    openLocation: jest.fn().mockResolvedValue(''),
    ...overrides,
  }
  const sync = {
    getConfiguration: jest.fn().mockResolvedValue({
      mode: 'standalone',
      databaseName: 'hospitalrun',
    }),
    saveConfiguration: jest.fn(),
  }
  ;(window as any).runcdxDesktop = {
    backup,
    sync,
  }
  return { backup, sync }
}

describe('local plaintext backup and restore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete window.runcdxDesktop
  })

  it('writes a readable JSON backup containing all local documents', async () => {
    const { backup: bridge } = installDesktopBridge()
    jest.spyOn(clinicalDb, 'allDocs').mockResolvedValue({
      rows: [
        {
          id: 'patient_2_1',
          key: 'patient_2_1',
          value: {},
          doc: { _id: 'patient_2_1', name: 'علی' },
        },
        { id: 'visit_2_1', key: 'visit_2_1', value: {}, doc: { _id: 'visit_2_1', note: 'معاینه' } },
      ],
    } as any)

    await createLocalBackup()

    expect(bridge.save).toHaveBeenCalledTimes(1)
    const saved = JSON.parse(bridge.save.mock.calls[0][0])
    expect(saved).toMatchObject({
      format: 'runcdx-json-backup',
      version: 1,
      database: 'local_hospitalrun',
      documentCount: 2,
    })
    expect(saved.documents).toEqual([
      { _id: 'patient_2_1', name: 'علی' },
      { _id: 'visit_2_1', note: 'معاینه' },
    ])
    expect(bridge.save.mock.calls[0][0]).toContain('علی')
  })

  it('makes a safety backup, exactly restores documents, and resumes configured sync', async () => {
    const selectedBackup = JSON.stringify({
      format: 'runcdx-json-backup',
      version: 1,
      createdAt: '2026-08-08T12:00:00.000Z',
      database: 'local_hospitalrun',
      documents: [
        { _id: 'patient_2_1', _rev: '1-old-backup', name: 'نسخه بکاپ' },
        { _id: 'patient_2_2', name: 'بیمار بازیابی‌شده' },
      ],
    })
    const { backup: bridge, sync } = installDesktopBridge({
      select: jest.fn().mockResolvedValue({ path: 'D:\\backup.json', contents: selectedBackup }),
    })
    jest
      .spyOn(clinicalDb, 'allDocs')
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'patient_2_1',
            key: 'patient_2_1',
            value: {},
            doc: { _id: 'patient_2_1', _rev: '3-current', name: 'نسخه فعلی' },
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'patient_2_1',
            key: 'patient_2_1',
            value: {},
            doc: { _id: 'patient_2_1', _rev: '3-current', name: 'نسخه فعلی' },
          },
          {
            id: 'patient_2_extra',
            key: 'patient_2_extra',
            value: {},
            doc: { _id: 'patient_2_extra', _rev: '2-extra', name: 'سند اضافی' },
          },
        ],
      } as any)
    const bulkDocs = jest.spyOn(clinicalDb, 'bulkDocs').mockResolvedValue([] as any)

    await expect(restoreLocalBackup()).resolves.toEqual({
      path: 'D:\\backup.json',
      restoredDocuments: 2,
    })

    expect(bridge.save).toHaveBeenCalledTimes(1)
    expect(sync.getConfiguration).toHaveBeenCalledTimes(1)
    expect(bulkDocs).toHaveBeenCalledWith([
      { _id: 'patient_2_1', _rev: '3-current', name: 'نسخه بکاپ' },
      { _id: 'patient_2_2', name: 'بیمار بازیابی‌شده' },
      { _id: 'patient_2_extra', _rev: '2-extra', _deleted: true },
    ])
  })

  it('rejects an unrelated JSON file before changing clinical data', async () => {
    const { backup: bridge } = installDesktopBridge({
      select: jest.fn().mockResolvedValue({
        path: 'D:\\not-a-backup.json',
        contents: JSON.stringify({ documents: [] }),
      }),
    })
    const allDocs = jest.spyOn(clinicalDb, 'allDocs')
    const bulkDocs = jest.spyOn(clinicalDb, 'bulkDocs')

    await expect(restoreLocalBackup()).rejects.toThrow('INVALID_RUNCDX_BACKUP')
    expect(bridge.save).not.toHaveBeenCalled()
    expect(allDocs).not.toHaveBeenCalled()
    expect(bulkDocs).not.toHaveBeenCalled()
  })
})

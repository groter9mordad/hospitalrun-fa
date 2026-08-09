/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-underscore-dangle */
import PouchDB from 'pouchdb'

import {
  mergeConflictingDocuments,
  resolveDatabaseConflicts,
} from '../../../shared/config/conflictResolution'

PouchDB.plugin(require('pouchdb-adapter-memory'))

describe('offline database conflict resolution', () => {
  it('merges independent patient fields and nested clinical lists', () => {
    const merged = mergeConflictingDocuments([
      {
        _id: 'patient_2_123',
        _rev: '2-winner',
        data: {
          givenName: 'علی',
          familyName: 'احمدی',
          updatedAt: '2026-08-09T10:02:00.000Z',
          diagnoses: [],
        },
      },
      {
        _id: 'patient_2_123',
        _rev: '2-loser',
        data: {
          givenName: 'علی',
          familyName: 'قدیمی',
          updatedAt: '2026-08-09T10:01:00.000Z',
          diagnoses: [{ id: 'diagnosis-1', name: 'فشار خون' }],
        },
      },
    ] as any)

    expect(merged._rev).toBe('2-winner')
    expect(merged.data.familyName).toBe('احمدی')
    expect(merged.data.diagnoses).toEqual([{ id: 'diagnosis-1', name: 'فشار خون' }])
  })

  it('keeps offline changes and creates an audit record when clients reconnect', async () => {
    const server = new PouchDB('conflict-server', { adapter: 'memory' })
    const reception = new PouchDB('conflict-reception', { adapter: 'memory' })
    const doctor = new PouchDB('conflict-doctor', { adapter: 'memory' })

    try {
      await server.put({
        _id: 'patient_2_123',
        data: {
          givenName: 'علی',
          familyName: 'قدیمی',
          diagnoses: [],
          updatedAt: '2026-08-09T10:00:00.000Z',
        },
      })
      await Promise.all([reception.replicate.from(server), doctor.replicate.from(server)])

      const receptionPatient = await reception.get('patient_2_123')
      const doctorPatient = await doctor.get('patient_2_123')
      await reception.put({
        ...receptionPatient,
        data: {
          ...(receptionPatient as any).data,
          familyName: 'احمدی',
          updatedAt: '2026-08-09T10:02:00.000Z',
        },
      })
      await doctor.put({
        ...doctorPatient,
        data: {
          ...(doctorPatient as any).data,
          diagnoses: [{ id: 'diagnosis-1', name: 'فشار خون' }],
          updatedAt: '2026-08-09T10:01:00.000Z',
        },
      })

      await reception.replicate.to(server)
      await doctor.replicate.to(server)
      await reception.replicate.from(server)

      expect(await resolveDatabaseConflicts(reception)).toBe(1)
      const resolved = (await reception.get('patient_2_123')) as any
      expect(resolved.data.familyName).toBe('احمدی')
      expect(resolved.data.diagnoses).toEqual([{ id: 'diagnosis-1', name: 'فشار خون' }])

      const auditRecords = await reception.allDocs({
        startkey: 'runcdx-conflict-audit:',
        endkey: 'runcdx-conflict-audit:\uffff',
        include_docs: true,
      })
      expect(auditRecords.rows).toHaveLength(1)
    } finally {
      await Promise.all([server.destroy(), reception.destroy(), doctor.destroy()])
    }
  })

  it('allows every workstation to keep working while the router is unavailable', async () => {
    const server = new PouchDB('outage-server', { adapter: 'memory' })
    const reception = new PouchDB('outage-reception', { adapter: 'memory' })
    const doctor = new PouchDB('outage-doctor', { adapter: 'memory' })

    try {
      await server.put({
        _id: 'patient_2_456',
        data: { givenName: 'زهرا', diagnoses: [] },
      })
      await Promise.all([reception.replicate.from(server), doctor.replicate.from(server)])

      // No replication happens here: this is the period in which the router
      // has no power. Each installed app still reads and writes its local DB.
      const doctorPatient = await doctor.get('patient_2_456')
      await doctor.put({
        ...doctorPatient,
        data: {
          ...(doctorPatient as any).data,
          diagnoses: [{ id: 'diagnosis-offline', name: 'میگرن' }],
        },
      })
      await reception.put({
        _id: 'appointment_2_offline',
        data: { patient: 'patient_2_456', reason: 'پیگیری' },
      })

      expect((await doctor.get('patient_2_456')) as any).toMatchObject({
        data: { diagnoses: [{ id: 'diagnosis-offline', name: 'میگرن' }] },
      })
      expect(await reception.get('appointment_2_offline')).toBeDefined()

      // Power/network returns. Queued local revisions flow to the central
      // database and then become available on the other workstation.
      await Promise.all([reception.replicate.to(server), doctor.replicate.to(server)])
      await Promise.all([reception.replicate.from(server), doctor.replicate.from(server)])

      expect(await doctor.get('appointment_2_offline')).toBeDefined()
      expect((await reception.get('patient_2_456')) as any).toMatchObject({
        data: { diagnoses: [{ id: 'diagnosis-offline', name: 'میگرن' }] },
      })
    } finally {
      await Promise.all([server.destroy(), reception.destroy(), doctor.destroy()])
    }
  })
})

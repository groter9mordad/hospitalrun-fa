import { clinicalDb } from '../../shared/config/pouchdb'
import { UserRole } from '../../shared/model/UserRole'
import {
  authenticateLocalUser,
  createLocalUser,
  hasLocalUsers,
  listLocalUsers,
} from '../../user/local-auth'
import { getAdministratorSetupErrorMessage } from '../../user/SetupAdministrator'

import { webcrypto } from 'crypto'

const originalCrypto = window.crypto

const clearLocalUsers = async () => {
  const users = await clinicalDb.allDocs({
    startkey: 'runcdx-user:',
    endkey: 'runcdx-user:\uffff',
  })
  if (users.rows.length) {
    await clinicalDb.bulkDocs(
      users.rows.map((row) => ({
        _id: row.id,
        _rev: row.value.rev,
        _deleted: true,
      })) as any,
    )
  }
}

describe('local authentication', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: webcrypto,
    })
  })

  beforeEach(async () => {
    await clearLocalUsers()
  })

  afterAll(() => {
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: originalCrypto,
    })
  })

  it('creates and authenticates the first administrator on a fresh database', async () => {
    expect(await hasLocalUsers()).toBe(false)

    const administrator = await createLocalUser({
      username: ' DrGhorbani ',
      password: 'strong-password',
      givenName: 'علی',
      familyName: 'قربانی',
      role: UserRole.Administrator,
    })

    expect(administrator.role).toBe(UserRole.Administrator)
    expect(await hasLocalUsers()).toBe(true)
    expect(await listLocalUsers()).toEqual([
      expect.objectContaining({
        username: 'drghorbani',
        role: UserRole.Administrator,
        active: true,
      }),
    ])

    const authenticated = await authenticateLocalUser('DRGHORBANI', 'strong-password')
    expect(authenticated.user.fullName).toBe('علی قربانی')
    expect(authenticated.role).toBe(UserRole.Administrator)
  })

  it('reports a duplicate username separately from validation failures', async () => {
    const request = {
      username: 'drghorbani',
      password: 'strong-password',
      givenName: 'علی',
      familyName: 'قربانی',
      role: UserRole.Administrator,
    }

    await createLocalUser(request)
    await expect(createLocalUser(request)).rejects.toThrow('USERNAME_EXISTS')
  })

  it('reports a short username explicitly', async () => {
    await expect(
      createLocalUser({
        username: 'ab',
        password: 'strong-password',
        givenName: 'علی',
        familyName: 'قربانی',
        role: UserRole.Administrator,
      }),
    ).rejects.toThrow('INVALID_USERNAME')
  })

  it('does not disguise internal failures as duplicate usernames', () => {
    expect(getAdministratorSetupErrorMessage(new Error('USERNAME_EXISTS'))).toContain(
      'قبلاً ثبت شده',
    )
    expect(getAdministratorSetupErrorMessage(new Error('CRYPTO_UNAVAILABLE'))).toContain(
      'خطای داخلی RunCDX',
    )
    expect(getAdministratorSetupErrorMessage(new Error('SOME_DATABASE_FAILURE'))).not.toContain(
      'نام کاربری',
    )
  })
})

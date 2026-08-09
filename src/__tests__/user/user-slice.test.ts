import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'

import Permissions from '../../shared/model/Permissions'
import { UserRole } from '../../shared/model/UserRole'
import { RootState } from '../../shared/store'
import { authenticateLocalUser, getLocalUser } from '../../user/local-auth'
import user, {
  fetchPermissions,
  getCurrentSession,
  login,
  loginSuccess,
  loginError,
  logout,
  logoutSuccess,
} from '../../user/user-slice'

const mockStore = configureMockStore<RootState, any>([thunk])

jest.mock('../../user/local-auth')

const authenticatedUser = {
  user: { familyName: 'user', givenName: 'test', id: 'userId' },
  role: UserRole.Doctor,
  permissions: [Permissions.ReadPatients],
}

describe('user slice', () => {
  describe('reducers', () => {
    it('should handle the FETCH_PERMISSIONS action', () => {
      const expectedPermissions = [Permissions.ReadPatients, Permissions.WritePatients]
      const userStore = user(undefined, {
        type: fetchPermissions.type,
        payload: expectedPermissions,
      })

      expect(userStore.permissions).toEqual(expectedPermissions)
    })

    it('should handle the LOGIN_SUCCESS action', () => {
      const expectedUser = {
        familyName: 'firstName',
        givenName: 'lastName',
        id: 'id',
      }
      const expectedPermissions = [Permissions.WritePatients]
      const userStore = user(undefined, {
        type: loginSuccess.type,
        payload: { user: expectedUser, permissions: expectedPermissions },
      })

      expect(userStore.user).toEqual(expectedUser)
    })

    it('should handle the login error', () => {
      const expectedError = 'error'
      const userStore = user(undefined, {
        type: loginError.type,
        payload: expectedError,
      })

      expect(userStore.loginError).toEqual(expectedError)
    })

    it('should handle the logout success', () => {
      const userStore = user(
        { user: { givenName: 'given', familyName: 'family', id: 'id' }, permissions: [] },
        {
          type: logoutSuccess.type,
        },
      )

      expect(userStore.user).toEqual(undefined)
      expect(userStore.permissions).toEqual([])
    })
  })

  describe('login', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('should login with the username and password', async () => {
      ;(authenticateLocalUser as jest.Mock).mockResolvedValue(authenticatedUser)
      const store = mockStore()
      const expectedUsername = 'test'
      const expectedPassword = 'password'

      await store.dispatch(login(expectedUsername, expectedPassword))

      expect(authenticateLocalUser).toHaveBeenCalledTimes(1)
      expect(authenticateLocalUser).toHaveBeenLastCalledWith(expectedUsername, expectedPassword)
      expect(store.getActions()[0]).toEqual({
        type: loginSuccess.type,
        payload: expect.objectContaining({
          user: { familyName: 'user', givenName: 'test', id: 'userId' },
        }),
      })
    })

    it('should dispatch login error if login was not successful', async () => {
      ;(authenticateLocalUser as jest.Mock).mockRejectedValue(new Error('INVALID_CREDENTIALS'))
      const store = mockStore()

      await store.dispatch(login('user', 'password'))

      expect(authenticateLocalUser).toHaveBeenCalledWith('user', 'password')
      expect(store.getActions()[0]).toEqual({
        type: loginError.type,
        payload: { message: 'user.login.error.message.incorrect' },
      })
    })
  })

  describe('logout', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('should logout the user', async () => {
      const store = mockStore()

      await store.dispatch(logout())

      expect(store.getActions()[0]).toEqual({ type: logoutSuccess.type })
    })
  })

  describe('getCurrentSession', () => {
    it('should get the detail of the current user and update the store', async () => {
      ;(getLocalUser as jest.Mock).mockResolvedValue(authenticatedUser)
      const store = mockStore()
      const expectedUsername = 'test'

      await store.dispatch(getCurrentSession(expectedUsername))

      expect(getLocalUser).toHaveBeenCalledWith(expectedUsername)
      expect(store.getActions()[0]).toEqual({
        type: loginSuccess.type,
        payload: expect.objectContaining({
          user: { familyName: 'user', givenName: 'test', id: 'userId' },
        }),
      })
    })
  })
})

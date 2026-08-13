/* eslint-disable no-underscore-dangle */
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import Permissions from '../shared/model/Permissions'
import User from '../shared/model/User'
import { UserRole } from '../shared/model/UserRole'
import { AppThunk } from '../shared/store'
import { authenticateLocalUser, getLocalUser } from './local-auth'

export interface LoginError {
  message?: string
  username?: string
  password?: string
}

export interface UserState {
  permissions: Permissions[]
  user?: User
  role?: UserRole
  loginError?: LoginError
}

const initialState: UserState = {
  user: undefined,
  permissions: [],
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    fetchPermissions(state, { payload }: PayloadAction<Permissions[]>) {
      state.permissions = payload
    },
    loginSuccess(
      state,
      {
        payload,
      }: PayloadAction<{
        user: User
        role?: UserRole
        permissions: Permissions[]
      }>,
    ) {
      state.user = payload.user
      state.role = payload.role
      state.permissions = payload.permissions
      state.loginError = undefined
    },
    loginError(state, { payload }: PayloadAction<LoginError>) {
      state.loginError = payload
    },
    logoutSuccess(state) {
      state.user = undefined
      state.role = undefined
      state.permissions = []
    },
  },
})

export const { fetchPermissions, loginError, loginSuccess, logoutSuccess } = userSlice.actions

export const getCurrentSession = (username: string): AppThunk => async (dispatch) => {
  const localUser = await getLocalUser(username)
  dispatch(loginSuccess(localUser))
}

export const login = (username: string, password: string): AppThunk => async (dispatch) => {
  try {
    if (!username || !password) {
      throw new Error('REQUIRED')
    }
    const localUser = await authenticateLocalUser(username, password)
    dispatch(loginSuccess(localUser))
  } catch (error) {
    if (!username || !password) {
      dispatch(
        loginError({
          message: 'user.login.error.message.required',
          username: 'user.login.error.username.required',
          password: 'user.login.error.password.required',
        }),
      )
    } else {
      dispatch(
        loginError({
          message: 'user.login.error.message.incorrect',
        }),
      )
    }
  }
}

export const logout = (): AppThunk => async (dispatch) => {
  dispatch(logoutSuccess())
}

export default userSlice.reducer

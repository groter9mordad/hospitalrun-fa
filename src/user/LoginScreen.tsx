/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { FormEvent, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { RootState } from '../shared/store'
import AuthLayout from './AuthLayout'
import { login } from './user-slice'

const LoginScreen = () => {
  const dispatch = useDispatch()
  const loginError = useSelector((state: RootState) => state.user.loginError)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    dispatch(login(username, password))
  }

  return (
    <AuthLayout
      title="ورود به سامانه"
      subtitle="برای ادامه نام کاربری و رمز عبور خود را وارد کنید. ورود در زمان قطع شبکه نیز کار می‌کند."
    >
      <form onSubmit={submit}>
        {loginError && (
          <div className="alert alert-danger" role="alert">
            نام کاربری یا رمز عبور صحیح نیست.
          </div>
        )}
        <div className="form-group">
          <label htmlFor="username">نام کاربری</label>
          <input
            autoComplete="username"
            className="form-control"
            id="username"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">رمز عبور</label>
          <input
            autoComplete="current-password"
            className="form-control"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit">
          ورود
        </button>
      </form>
    </AuthLayout>
  )
}

export default LoginScreen

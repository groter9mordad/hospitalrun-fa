/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { FormEvent, useState } from 'react'
import { useDispatch } from 'react-redux'

import NetworkSettings from '../settings/NetworkSettings'
import { UserRole } from '../shared/model/UserRole'
import AuthLayout from './AuthLayout'
import { createLocalUser, hasLocalUsers } from './local-auth'
import { loginSuccess } from './user-slice'

export const getAdministratorSetupErrorMessage = (setupError: unknown) => {
  const errorCode = setupError instanceof Error ? setupError.message : ''
  switch (errorCode) {
    case 'INVALID_USERNAME':
      return 'نام کاربری باید حداقل ۳ نویسه داشته باشد.'
    case 'INVALID_PASSWORD':
      return 'رمز عبور باید حداقل ۸ نویسه داشته باشد.'
    case 'USERNAME_EXISTS':
      return 'این نام کاربری قبلاً ثبت شده است. یک نام کاربری دیگر انتخاب کنید.'
    case 'CRYPTO_UNAVAILABLE':
      return 'امکان امن‌سازی رمز عبور در این اجرا فعال نیست. این یک خطای داخلی RunCDX است.'
    default:
      return 'ساخت مدیر به دلیل یک خطای داخلی انجام نشد. جزئیات خطا در گزارش برنامه ثبت شد.'
  }
}

const SetupAdministrator = ({ onComplete }: { onComplete: () => void }) => {
  const dispatch = useDispatch()
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [connectExistingClinic, setConnectExistingClinic] = useState(false)
  const [connectionError, setConnectionError] = useState('')

  if (connectExistingClinic) {
    const connected = async () => {
      if (await hasLocalUsers()) {
        onComplete()
      } else {
        setConnectionError(
          'اتصال برقرار شد اما هنوز حساب کاربری مطب دریافت نشده است. تنظیمات کامپیوتر اصلی را بررسی کنید.',
        )
      }
    }

    return (
      <AuthLayout
        title="اتصال به مطب موجود"
        subtitle="این گزینه برای کامپیوتر دوم پزشک، منشی، آزمایشگاه یا داروخانه است. اتصال اینترنت لازم نیست؛ هر دو سیستم فقط باید به یک مودم وصل باشند."
      >
        {connectionError && <div className="alert alert-danger">{connectionError}</div>}
        <NetworkSettings compact onConnected={connected} />
        <button
          className="btn btn-link btn-block mt-3"
          onClick={() => setConnectExistingClinic(false)}
          type="button"
        >
          بازگشت به ساخت کامپیوتر اصلی
        </button>
      </AuthLayout>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!givenName.trim() || !familyName.trim()) {
      setError('نام و نام خانوادگی مدیر را وارد کنید.')
      return
    }
    if (username.trim().length < 3) {
      setError('نام کاربری باید حداقل ۳ نویسه داشته باشد.')
      return
    }
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ نویسه داشته باشد.')
      return
    }
    if (password !== passwordConfirmation) {
      setError('تکرار رمز عبور یکسان نیست.')
      return
    }

    setSaving(true)
    try {
      const administrator = await createLocalUser({
        username,
        password,
        givenName,
        familyName,
        role: UserRole.Administrator,
      })
      dispatch(loginSuccess(administrator))
      onComplete()
    } catch (setupError) {
      // Keep unexpected runtime/database failures distinguishable from normal
      // form validation. The previous implementation converted every failure
      // into a false "username is not unique" message, hiding production bugs.
      // eslint-disable-next-line no-console
      console.error('RunCDX failed to create the initial administrator.', setupError)
      setError(getAdministratorSetupErrorMessage(setupError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthLayout
      title="راه‌اندازی اولیه"
      subtitle="اولین حساب، مدیر سیستم است و می‌تواند کاربران پزشک، پذیرش، آزمایشگاه و داروخانه را بسازد."
    >
      <form onSubmit={submit}>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="form-row">
          <div className="form-group col-md-6">
            <label htmlFor="givenName">نام</label>
            <input
              className="form-control"
              id="givenName"
              onChange={(event) => setGivenName(event.target.value)}
              value={givenName}
            />
          </div>
          <div className="form-group col-md-6">
            <label htmlFor="familyName">نام خانوادگی</label>
            <input
              className="form-control"
              id="familyName"
              onChange={(event) => setFamilyName(event.target.value)}
              value={familyName}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="setupUsername">نام کاربری مدیر</label>
          <input
            autoComplete="username"
            className="form-control"
            id="setupUsername"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </div>
        <div className="form-group">
          <label htmlFor="setupPassword">رمز عبور</label>
          <input
            autoComplete="new-password"
            className="form-control"
            id="setupPassword"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>
        <div className="form-group">
          <label htmlFor="setupPasswordConfirmation">تکرار رمز عبور</label>
          <input
            autoComplete="new-password"
            className="form-control"
            id="setupPasswordConfirmation"
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            type="password"
            value={passwordConfirmation}
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={saving} type="submit">
          {saving ? 'در حال ساخت…' : 'ساخت مدیر و شروع کار'}
        </button>
        <button
          className="btn btn-outline-secondary btn-block mt-2"
          onClick={() => setConnectExistingClinic(true)}
          type="button"
        >
          اتصال این سیستم به مطب موجود
        </button>
      </form>
    </AuthLayout>
  )
}

export default SetupAdministrator

/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { FormEvent, useEffect, useState } from 'react'

import { UserRole, userRoleLabels } from '../shared/model/UserRole'
import { createLocalUser, listLocalUsers, LocalUserSummary } from '../user/local-auth'

const selectableRoles = [
  UserRole.Doctor,
  UserRole.Reception,
  UserRole.Laboratory,
  UserRole.Pharmacy,
  UserRole.Administrator,
]

const UserManagement = () => {
  const [users, setUsers] = useState<LocalUserSummary[]>([])
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(UserRole.Reception)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refreshUsers = () => listLocalUsers().then(setUsers)

  useEffect(() => {
    refreshUsers()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!givenName.trim() || !familyName.trim() || username.trim().length < 3) {
      setError('نام، نام خانوادگی و نام کاربری معتبر را وارد کنید.')
      return
    }
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ نویسه داشته باشد.')
      return
    }

    try {
      await createLocalUser({ givenName, familyName, username, password, role })
      setGivenName('')
      setFamilyName('')
      setUsername('')
      setPassword('')
      setRole(UserRole.Reception)
      setMessage('کاربر ساخته شد و در اولین اتصال با سایر سیستم‌های مطب همگام می‌شود.')
      await refreshUsers()
    } catch (createError) {
      setError('ساخت کاربر انجام نشد؛ ممکن است این نام کاربری قبلاً ثبت شده باشد.')
    }
  }

  return (
    <section className="mt-4" dir="rtl">
      <h2 className="h4">کاربران و سطح دسترسی</h2>
      <p className="text-muted">
        هر شخص با حساب خودش وارد می‌شود و فقط بخش‌های مجاز برای نقش او نمایش داده می‌شود.
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>نام و نام خانوادگی</th>
              <th>نام کاربری</th>
              <th>نقش</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.username}>
                <td>{`${user.givenName} ${user.familyName}`}</td>
                <td dir="ltr">{user.username}</td>
                <td>{userRoleLabels[user.role]}</td>
                <td>{user.active ? 'فعال' : 'غیرفعال'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="h5">ساخت کاربر جدید</h3>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group col-md-6">
            <label htmlFor="newUserGivenName">نام</label>
            <input
              className="form-control"
              id="newUserGivenName"
              onChange={(event) => setGivenName(event.target.value)}
              value={givenName}
            />
          </div>
          <div className="form-group col-md-6">
            <label htmlFor="newUserFamilyName">نام خانوادگی</label>
            <input
              className="form-control"
              id="newUserFamilyName"
              onChange={(event) => setFamilyName(event.target.value)}
              value={familyName}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group col-md-4">
            <label htmlFor="newUsername">نام کاربری</label>
            <input
              autoComplete="off"
              className="form-control"
              id="newUsername"
              onChange={(event) => setUsername(event.target.value)}
              value={username}
            />
          </div>
          <div className="form-group col-md-4">
            <label htmlFor="newUserPassword">رمز عبور</label>
            <input
              autoComplete="new-password"
              className="form-control"
              id="newUserPassword"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>
          <div className="form-group col-md-4">
            <label htmlFor="newUserRole">نقش</label>
            <select
              className="form-control"
              id="newUserRole"
              onChange={(event) => setRole(event.target.value as UserRole)}
              value={role}
            >
              {selectableRoles.map((selectableRole) => (
                <option key={selectableRole} value={selectableRole}>
                  {userRoleLabels[selectableRole]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit">
          ساخت کاربر
        </button>
      </form>
    </section>
  )
}

export default UserManagement

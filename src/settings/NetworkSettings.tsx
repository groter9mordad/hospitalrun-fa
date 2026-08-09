/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { FormEvent, useEffect, useState } from 'react'

import {
  configureDatabaseSync,
  getDatabaseSyncState,
  testDatabaseConnection,
} from '../shared/config/pouchdb'
import {
  defaultSyncConfiguration,
  loadSyncConfiguration,
  saveSyncConfiguration,
  SyncConfiguration,
} from '../shared/config/syncConfiguration'

interface Props {
  compact?: boolean
  onConnected?: () => void
}

const NetworkSettings = ({ compact = false, onConnected }: Props) => {
  const [configuration, setConfiguration] = useState<SyncConfiguration>(defaultSyncConfiguration)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSyncConfiguration()
      .then((stored) => setConfiguration(compact ? { ...stored, mode: 'network' } : stored))
      .finally(() => setLoading(false))
  }, [compact])

  const update = (change: Partial<SyncConfiguration>) =>
    setConfiguration((current) => ({ ...current, ...change }))

  const testConnection = async () => {
    setMessage('')
    setError('')
    try {
      await testDatabaseConnection({ ...configuration, mode: 'network' })
      setMessage('ارتباط با کامپیوتر اصلی مطب برقرار است.')
    } catch (connectionError) {
      setError(
        'کامپیوتر اصلی پیدا نشد. آدرس، نام کاربری، رمز عبور و اتصال هر دو سیستم به مودم را بررسی کنید.',
      )
    }
  }

  const activateNetworkConfiguration = async (
    installed: SyncConfiguration,
    connectedMessage: string,
  ) => {
    const saved = await saveSyncConfiguration(installed)
    setConfiguration(saved)
    const state = await configureDatabaseSync(saved)
    setMessage(
      state === 'connected'
        ? connectedMessage
        : 'تنظیمات ذخیره شد؛ برنامه محلی کار می‌کند و اتصال شبکه خودکار دوباره بررسی می‌شود.',
    )
    if (state === 'connected' && onConnected) {
      onConnected()
    }
  }

  const installServer = async () => {
    if (!window.runcdxDesktop?.server) {
      return
    }
    setMessage('')
    setError('')
    setLoading(true)
    try {
      const installed = await window.runcdxDesktop.server.install()
      await activateNetworkConfiguration(
        installed,
        'این کامپیوتر به‌عنوان سیستم اصلی مطب آماده شد و همگام‌سازی فعال است.',
      )
    } catch (installError) {
      setError(
        'آماده‌سازی سیستم اصلی کامل نشد. اینترنت اولیه، تأیید پنجرهٔ UAC و گزارش PowerShell را بررسی کنید.',
      )
    } finally {
      setLoading(false)
    }
  }

  const importConnection = async () => {
    if (!window.runcdxDesktop?.server) {
      return
    }
    setMessage('')
    setError('')
    setLoading(true)
    try {
      const imported = await window.runcdxDesktop.server.importConnection()
      if (!imported) {
        setMessage('انتخاب فایل اتصال لغو شد.')
        return
      }
      await activateNetworkConfiguration(
        imported,
        'فایل اتصال خوانده شد و این کامپیوتر به شبکهٔ مطب متصل است.',
      )
    } catch (importError) {
      setError('فایل اتصال معتبر نیست یا کامپیوتر اصلی مطب در شبکه پیدا نشد.')
    } finally {
      setLoading(false)
    }
  }

  const exportConnection = async () => {
    if (!window.runcdxDesktop?.server) {
      return
    }
    setMessage('')
    setError('')
    try {
      const exportedPath = await window.runcdxDesktop.server.exportConnection()
      setMessage(
        exportedPath
          ? 'فایل اتصال ذخیره شد. آن را در کامپیوترهای دیگر مطب وارد کنید و پس از استفاده حذف کنید.'
          : 'ذخیرهٔ فایل اتصال لغو شد.',
      )
    } catch (exportError) {
      setError('ابتدا این کامپیوتر را به‌عنوان سیستم اصلی آماده کنید.')
    }
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)
    try {
      const saved = await saveSyncConfiguration({
        ...configuration,
        mode: compact ? 'network' : configuration.mode,
      })
      const state = await configureDatabaseSync(saved)
      if (saved.mode === 'standalone') {
        setMessage('حالت تک‌سیستم فعال شد. همهٔ اطلاعات فقط روی همین ویندوز می‌ماند.')
      } else if (state === 'connected') {
        setMessage('تنظیمات ذخیره شد و همگام‌سازی شبکهٔ مطب فعال است.')
        if (onConnected) {
          onConnected()
        }
      } else {
        setMessage(
          'تنظیمات ذخیره شد. شبکه فعلاً در دسترس نیست؛ کار محلی ادامه دارد و اتصال خودکار دوباره امتحان می‌شود.',
        )
      }
    } catch (saveError) {
      setError('ذخیرهٔ تنظیمات انجام نشد. آدرس و مشخصات اتصال را بررسی کنید.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && compact) {
    return <p>در حال خواندن تنظیمات…</p>
  }

  return (
    <section className={compact ? '' : 'mt-4'} dir="rtl">
      {!compact && <h2 className="h4">شبکهٔ داخلی مطب</h2>}
      <p className="text-muted">
        اطلاعات همیشه ابتدا روی همین سیستم ذخیره می‌شود. خاموشی مودم یا کامپیوتر اصلی مانع ادامهٔ
        کار نیست و تغییرات پس از وصل‌شدن شبکه خودکار همگام می‌شوند.
      </p>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!compact && window.runcdxDesktop?.server && (
        <div className="alert alert-info">
          <strong>این اولین/کامپیوتر اصلی مطب است؟</strong>
          <p className="mb-2">
            این دکمه CouchDB و شبکهٔ داخلی را خودکار آماده می‌کند. فقط بار اول برای دریافت CouchDB
            اینترنت و تأیید مدیر ویندوز لازم است.
          </p>
          <button
            className="btn btn-info ml-2"
            disabled={loading}
            onClick={installServer}
            type="button"
          >
            آماده‌سازی خودکار کامپیوتر اصلی
          </button>
          <button
            className="btn btn-outline-info"
            disabled={loading}
            onClick={exportConnection}
            type="button"
          >
            ذخیرهٔ فایل اتصال برای سیستم‌های دیگر
          </button>
        </div>
      )}
      {compact && window.runcdxDesktop?.server && (
        <button
          className="btn btn-outline-primary btn-block mb-3"
          disabled={loading}
          onClick={importConnection}
          type="button"
        >
          خواندن فایل اتصال مطب
        </button>
      )}
      <form onSubmit={save}>
        {!compact && (
          <div className="form-group">
            <div className="custom-control custom-radio custom-control-inline">
              <input
                checked={configuration.mode === 'standalone'}
                className="custom-control-input"
                id="syncModeStandalone"
                name="syncMode"
                onChange={() => update({ mode: 'standalone' })}
                type="radio"
              />
              <label className="custom-control-label" htmlFor="syncModeStandalone">
                فقط همین سیستم
              </label>
            </div>
            <div className="custom-control custom-radio custom-control-inline">
              <input
                checked={configuration.mode === 'network'}
                className="custom-control-input"
                id="syncModeNetwork"
                name="syncMode"
                onChange={() => update({ mode: 'network' })}
                type="radio"
              />
              <label className="custom-control-label" htmlFor="syncModeNetwork">
                اتصال به شبکهٔ مطب
              </label>
            </div>
          </div>
        )}

        {(compact || configuration.mode === 'network') && (
          <>
            <div className="form-group">
              <label htmlFor="syncServerUrl">آدرس کامپیوتر اصلی</label>
              <input
                className="form-control"
                dir="ltr"
                id="syncServerUrl"
                onChange={(event) => update({ serverUrl: event.target.value })}
                placeholder="http://RUNCDX-SERVER:5984"
                required
                value={configuration.serverUrl}
              />
              <small className="form-text text-muted">
                نمونه: http://192.168.1.10:5984 یا http://RUNCDX-SERVER:5984
              </small>
            </div>
            <div className="form-row">
              <div className="form-group col-md-4">
                <label htmlFor="syncDatabaseName">نام پایگاه داده</label>
                <input
                  className="form-control"
                  dir="ltr"
                  id="syncDatabaseName"
                  onChange={(event) => update({ databaseName: event.target.value })}
                  required
                  value={configuration.databaseName}
                />
              </div>
              <div className="form-group col-md-4">
                <label htmlFor="syncUsername">نام کاربری شبکه</label>
                <input
                  autoComplete="username"
                  className="form-control"
                  dir="ltr"
                  id="syncUsername"
                  onChange={(event) => update({ username: event.target.value })}
                  required
                  value={configuration.username}
                />
              </div>
              <div className="form-group col-md-4">
                <label htmlFor="syncPassword">رمز عبور شبکه</label>
                <input
                  autoComplete="current-password"
                  className="form-control"
                  dir="ltr"
                  id="syncPassword"
                  onChange={(event) => update({ password: event.target.value })}
                  required
                  type="password"
                  value={configuration.password}
                />
              </div>
            </div>
            <button
              className="btn btn-outline-secondary ml-2"
              disabled={loading}
              onClick={testConnection}
              type="button"
            >
              آزمایش اتصال
            </button>
          </>
        )}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات'}
        </button>
        {!compact && configuration.mode === 'network' && (
          <small className="d-block mt-2 text-muted">
            وضعیت فعلی: {getDatabaseSyncState() === 'connected' ? 'متصل' : 'محلی/در انتظار اتصال'}
          </small>
        )}
      </form>
    </section>
  )
}

export default NetworkSettings

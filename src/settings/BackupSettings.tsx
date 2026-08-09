import React, { useEffect, useState } from 'react'

import { createLocalBackup, restoreLocalBackup } from '../shared/backup/localBackup'

const BackupSettings = () => {
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (window.runcdxDesktop) {
      window.runcdxDesktop.backup
        .getLocation()
        .then(setLocation)
        .catch(() => undefined)
    }
  }, [])

  const createBackup = async () => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await createLocalBackup()
      setMessage(
        result ? `بکاپ با موفقیت ساخته شد: ${result.fileName}` : 'بکاپ دسکتاپ در دسترس نیست.',
      )
    } catch (backupError) {
      setError('ساخت بکاپ انجام نشد. فضای دیسک و دسترسی پوشهٔ اسناد را بررسی کنید.')
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    if (
      !window.confirm(
        'بازیابی، اطلاعات فعلی را با محتوای فایل بکاپ جایگزین می‌کند. پیش از ادامه یک بکاپ ایمنی خودکار ساخته می‌شود. ادامه می‌دهید؟',
      )
    ) {
      return
    }
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await restoreLocalBackup()
      if (!result) {
        setMessage('انتخاب فایل لغو شد.')
        return
      }
      setMessage(
        `بازیابی ${result.restoredDocuments} سند انجام شد. برنامه دوباره راه‌اندازی می‌شود.`,
      )
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (restoreError) {
      setError('فایل انتخاب‌شده بکاپ معتبر RunCDX نیست یا بازیابی کامل نشد.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-4" dir="rtl">
      <h2 className="h4">بکاپ و بازیابی</h2>
      <p className="text-muted">
        روزی یک بکاپ ساده و بدون رمزگذاری ساخته می‌شود و ۳۰ نسخهٔ اخیر نگه داشته می‌شود. اطلاعات
        بکاپ قابل خواندن است؛ پوشهٔ بکاپ را فقط در اختیار افراد مجاز قرار دهید.
      </p>
      {location && (
        <p>
          مسیر بکاپ: <code dir="ltr">{location}</code>
        </p>
      )}
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <button className="btn btn-primary ml-2" disabled={busy} onClick={createBackup} type="button">
        ساخت بکاپ همین حالا
      </button>
      <button
        className="btn btn-outline-secondary ml-2"
        disabled={busy}
        onClick={restore}
        type="button"
      >
        بازیابی از فایل
      </button>
      <button
        className="btn btn-link"
        disabled={busy || !window.runcdxDesktop}
        onClick={() => window.runcdxDesktop?.backup.openLocation()}
        type="button"
      >
        بازکردن پوشهٔ بکاپ
      </button>
    </section>
  )
}

export default BackupSettings

import { Icon } from '@hospitalrun/components'
import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'

import { useUpdateTitle } from '../page-header/title/TitleContext'
import useTranslator from '../shared/hooks/useTranslator'
import Permissions from '../shared/model/Permissions'
import { UserRole } from '../shared/model/UserRole'
import { RootState } from '../shared/store'

interface DashboardItem {
  label: string
  path: string
  icon: string
  permissions?: Permissions[]
  administratorOnly?: boolean
}

const Dashboard: React.FC = () => {
  const { t } = useTranslator()
  const updateTitle = useUpdateTitle()
  const history = useHistory()
  const { permissions, role, user } = useSelector((state: RootState) => state.user)

  useEffect(() => {
    updateTitle(t('dashboard.label'))
  }, [t, updateTitle])

  const items: DashboardItem[] = [
    {
      label: t('patients.label'),
      path: '/patients',
      icon: 'patients',
      permissions: [Permissions.ReadPatients, Permissions.WritePatients],
    },
    {
      label: t('scheduling.label'),
      path: '/appointments',
      icon: 'appointment',
      permissions: [Permissions.ReadAppointments, Permissions.WriteAppointments],
    },
    {
      label: t('medications.label'),
      path: '/medications',
      icon: 'medication',
      permissions: [
        Permissions.ViewMedications,
        Permissions.ViewMedication,
        Permissions.RequestMedication,
      ],
    },
    {
      label: t('labs.label'),
      path: '/labs',
      icon: 'lab',
      permissions: [Permissions.ViewLabs, Permissions.ViewLab, Permissions.RequestLab],
    },
    {
      label: t('imagings.label'),
      path: '/imaging',
      icon: 'image',
      permissions: [Permissions.ViewImagings, Permissions.RequestImaging],
    },
    {
      label: t('incidents.label'),
      path: '/incidents',
      icon: 'incident',
      permissions: [
        Permissions.ViewIncidents,
        Permissions.ReportIncident,
        Permissions.ViewIncidentWidgets,
      ],
    },
    {
      label: t('settings.label'),
      path: '/settings',
      icon: 'settings',
      administratorOnly: true,
    },
  ]

  const visibleItems = items.filter((item) => {
    if (item.administratorOnly) {
      return role === UserRole.Administrator
    }
    return item.permissions?.some((permission) => permissions.includes(permission))
  })

  return (
    <section className="runcdx-dashboard" data-testid="runcdx-dashboard">
      <div className="runcdx-dashboard-welcome">
        <h2>{user?.givenName ? `${user.givenName}، خوش آمدید` : 'به RunCDX خوش آمدید'}</h2>
        <p>سامانه آماده است. برای شروع، یکی از بخش‌های زیر را انتخاب کنید.</p>
      </div>
      <div className="runcdx-dashboard-grid">
        {visibleItems.map((item) => (
          <button
            className="runcdx-dashboard-card"
            key={item.path}
            onClick={() => history.push(item.path)}
            type="button"
          >
            <span className="runcdx-dashboard-card-icon">
              <Icon icon={item.icon} />
            </span>
            <span className="runcdx-dashboard-card-title">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default Dashboard

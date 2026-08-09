import { Row, Column } from '@hospitalrun/components'
import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'

import { useUpdateTitle } from '../page-header/title/TitleContext'
import LanguageSelector from '../shared/components/input/LanguageSelector'
import useTranslator from '../shared/hooks/useTranslator'
import { UserRole } from '../shared/model/UserRole'
import { RootState } from '../shared/store'
import BackupSettings from './BackupSettings'
import NetworkSettings from './NetworkSettings'
import UserManagement from './UserManagement'

const Settings = () => {
  const { t } = useTranslator()
  const updateTitle = useUpdateTitle()
  const role = useSelector((state: RootState) => state.user.role)
  useEffect(() => {
    updateTitle(t('settings.label'))
  })
  return (
    <>
      <Row>
        <Column xs={12} sm={9}>
          <LanguageSelector />
        </Column>
        <Column xs={0} sm={3} />
      </Row>
      {role === UserRole.Administrator && (
        <>
          <NetworkSettings />
          <BackupSettings />
          <UserManagement />
        </>
      )}
    </>
  )
}

export default Settings

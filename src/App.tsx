/* eslint-disable no-console */

import { Spinner } from '@hospitalrun/components'
import React, { Suspense, useEffect, useState } from 'react'
import { ReactQueryDevtools } from 'react-query-devtools'
import { useSelector } from 'react-redux'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import HospitalRun from './HospitalRun'
import { TitleProvider } from './page-header/title/TitleContext'
import { startLocalBackupScheduler } from './shared/backup/localBackup'
import { configureDatabaseSync } from './shared/config/pouchdb'
import { loadSyncConfiguration } from './shared/config/syncConfiguration'
import { RootState } from './shared/store'
import { hasLocalUsers } from './user/local-auth'
import LoginScreen from './user/LoginScreen'
import SetupAdministrator from './user/SetupAdministrator'

const App: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user)
  const [hasUsers, setHasUsers] = useState<boolean | undefined>(undefined)

  useEffect(() => startLocalBackupScheduler(), [])

  useEffect(() => {
    let mounted = true
    const initialize = async () => {
      try {
        const syncConfiguration = await loadSyncConfiguration()
        await configureDatabaseSync(syncConfiguration)
        const localUsersExist = await hasLocalUsers()
        if (mounted) {
          setHasUsers(localUsersExist)
        }
      } catch (error) {
        if (mounted) {
          setHasUsers(false)
        }
      }
    }
    initialize()
    return () => {
      mounted = false
    }
  }, [])

  if (hasUsers === undefined) {
    return null
  }

  if (!hasUsers) {
    return <SetupAdministrator onComplete={() => setHasUsers(true)} />
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<Spinner color="blue" loading size={[10, 25]} type="ScaleLoader" />}>
          <Switch>
            <TitleProvider>
              <Route path="/" component={HospitalRun} />
            </TitleProvider>
          </Switch>
        </Suspense>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}

export default App

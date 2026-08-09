/* eslint-disable */
/// <reference types="react-scripts" />

interface Window {
  runcdxDesktop?: {
    backup: {
      getLocation: () => Promise<string>
      save: (
        contents: string,
      ) => Promise<{ fileName: string; path: string; createdAt: string }>
      select: () => Promise<{ contents: string; path: string } | undefined>
      openLocation: () => Promise<string>
    }
    sync: {
      getConfiguration: () => Promise<{
        mode: 'standalone' | 'network'
        serverUrl: string
        databaseName: string
        username: string
        password: string
      }>
      saveConfiguration: (configuration: {
        mode: 'standalone' | 'network'
        serverUrl: string
        databaseName: string
        username: string
        password: string
      }) => Promise<void>
    }
    server: {
      install: () => Promise<{
        mode: 'network'
        serverUrl: string
        databaseName: string
        username: string
        password: string
      }>
      importConnection: () => Promise<
        | {
            mode: 'network'
            serverUrl: string
            databaseName: string
            username: string
            password: string
          }
        | undefined
      >
      exportConnection: () => Promise<string | undefined>
    }
  }
}

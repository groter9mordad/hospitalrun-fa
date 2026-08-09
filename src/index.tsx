import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/700.css'
import './index.css'
import App from './App'
import * as serviceWorker from './serviceWorker'
import './shared/config/i18n'
import store from './shared/store'

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root'),
)

// Electron packages all application assets locally. A service worker would
// only add a second, stale-prone cache layer and is unnecessary for offline use.
serviceWorker.unregister()

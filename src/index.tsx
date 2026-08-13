import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/700.css'
import './index.css'
import './runcdx-layout.css'
import './runcdx-navigation.css'
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

serviceWorker.unregister()

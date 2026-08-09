import { render, screen } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import createMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'

import App from '../App'
import { RootState } from '../shared/store'
import { hasLocalUsers } from '../user/local-auth'

jest.mock('../user/local-auth')

const mockStore = createMockStore<RootState, any>([thunk])

it('shows the administrator setup on the first launch', async () => {
  // Supress the console.log in the test ouput
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  jest.spyOn(console, 'log').mockImplementation(() => {})

  const store = mockStore({
    components: {
      sidebarCollapsed: false,
    },
    breadcrumbs: {
      breadcrumbs: [],
    },
    user: {
      permissions: [],
    },
  } as any)

  const mockedHasLocalUsers = hasLocalUsers as jest.MockedFunction<typeof hasLocalUsers>
  mockedHasLocalUsers.mockResolvedValue(false)

  render(
    <Provider store={store}>
      <App />
    </Provider>,
  )

  expect(await screen.findByRole('heading', { name: 'راه‌اندازی اولیه' })).toBeInTheDocument()
  expect(screen.getByLabelText('نام کاربری مدیر')).toHaveValue('admin')

  // eslint-disable-next-line no-console
  ;(console.log as jest.Mock).mockRestore()
})

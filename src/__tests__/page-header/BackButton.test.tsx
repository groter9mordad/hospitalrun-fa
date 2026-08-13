import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import React from 'react'
import { Router } from 'react-router'

import BackButton from '../../page-header/BackButton'

describe('BackButton', () => {
  it('is hidden on the dashboard', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] })
    render(
      <Router history={history}>
        <BackButton />
      </Router>,
    )

    expect(screen.queryByRole('button', { name: 'بازگشت' })).not.toBeInTheDocument()
  })

  it('returns to the previous page from an internal route', () => {
    const history = createMemoryHistory({ initialEntries: ['/', '/patients'] })
    render(
      <Router history={history}>
        <BackButton />
      </Router>,
    )

    userEvent.click(screen.getByRole('button', { name: 'بازگشت' }))
    expect(history.location.pathname).toBe('/')
  })
})

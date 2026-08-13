import React from 'react'
import { useHistory, useLocation } from 'react-router-dom'

const BackButton = () => {
  const history = useHistory()
  const location = useLocation()

  if (location.pathname === '/') {
    return null
  }

  const goBack = () => {
    if (window.history.length > 1) {
      history.goBack()
      return
    }
    history.push('/')
  }

  return (
    <button
      aria-label="بازگشت"
      className="btn btn-outline-secondary btn-sm runcdx-back-button"
      onClick={goBack}
      type="button"
    >
      <span aria-hidden="true">→</span>
      <span>بازگشت</span>
    </button>
  )
}

export default BackButton

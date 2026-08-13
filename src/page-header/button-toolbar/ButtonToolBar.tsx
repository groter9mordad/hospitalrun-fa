import React from 'react'

import BackButton from '../BackButton'
import { useButtons } from './ButtonBarProvider'

const ButtonToolBar = () => {
  const buttons = useButtons()

  return (
    <div className="button-toolbar d-flex align-items-center">
      <BackButton />
      {buttons.map((button) => button)}
    </div>
  )
}

export default ButtonToolBar

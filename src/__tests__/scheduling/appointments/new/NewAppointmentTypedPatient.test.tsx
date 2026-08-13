import { Toaster } from '@hospitalrun/components'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import React from 'react'
import { ReactQueryConfigProvider } from 'react-query'
import { Provider } from 'react-redux'
import { Router } from 'react-router'
import createMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'

import { TitleProvider } from '../../../../page-header/title/TitleContext'
import NewAppointment from '../../../../scheduling/appointments/new/NewAppointment'
import AppointmentRepository from '../../../../shared/db/AppointmentRepository'
import PatientRepository from '../../../../shared/db/PatientRepository'
import Appointment from '../../../../shared/model/Appointment'
import Patient from '../../../../shared/model/Patient'
import { RootState } from '../../../../shared/store'

const mockStore = createMockStore<RootState, any>([thunk])

it('creates an appointment when typed patient search has exactly one match', async () => {
  const patient = {
    id: 'patient-1',
    code: 'P-1',
    fullName: 'علی قربانی',
    addresses: [],
    careGoals: [],
    carePlans: [],
    emails: [],
    phoneNumbers: [],
    visits: [],
  } as Patient

  jest.spyOn(PatientRepository, 'search').mockResolvedValue([patient])
  jest.spyOn(AppointmentRepository, 'save').mockResolvedValue({ id: 'appointment-1' } as Appointment)

  const history = createMemoryHistory({ initialEntries: ['/appointments/new'] })
  render(
    <ReactQueryConfigProvider config={{ queries: { retry: false } }}>
      <Provider store={mockStore({} as any)}>
        <Router history={history}>
          <TitleProvider>
            <NewAppointment />
          </TitleProvider>
        </Router>
        <Toaster draggable hideProgressBar />
      </Provider>
    </ReactQueryConfigProvider>,
  )

  userEvent.type(screen.getByPlaceholderText(/scheduling\.appointment\.patient/i), 'قربانی')
  userEvent.click(
    screen.getByRole('button', { name: /scheduling\.appointments\.createAppointment/i }),
  )

  await waitFor(() => {
    expect(AppointmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ patient: patient.id }),
    )
  })
})

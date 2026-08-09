import subDays from 'date-fns/subDays'

import useReportIncident from '../../../incidents/hooks/useReportIncident'
import * as incidentValidator from '../../../incidents/util/validate-incident'
import { IncidentError } from '../../../incidents/util/validate-incident'
import IncidentRepository from '../../../shared/db/IncidentRepository'
import Incident from '../../../shared/model/Incident'
import generateCode from '../../../shared/util/generateCode'
import { expectOneConsoleError } from '../../test-utils/console.utils'
import executeMutation from '../../test-utils/use-mutation.util'

jest.mock('../../../shared/util/generateCode')

describe('useReportIncident', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('should save the incident with correct data', async () => {
    const expectedCode = 'I-123456'
    const expectedDate = new Date(Date.now())
    const expectedStatus = 'reported'
    const expectedReportedBy = 'some user'
    Date.now = jest.fn().mockReturnValue(expectedDate)

    const givenIncidentRequest = {
      category: 'some category',
      categoryItem: 'some category item',
      date: subDays(new Date(), 3).toISOString(),
      department: 'some department',
      description: 'some description',
    } as Incident

    const expectedIncident = {
      ...givenIncidentRequest,
      code: expectedCode,
      reportedOn: expectedDate.toISOString(),
      status: expectedStatus,
      reportedBy: expectedReportedBy,
    } as Incident
    const mockedGenerateCode = generateCode as jest.MockedFunction<typeof generateCode>
    mockedGenerateCode.mockReturnValue(expectedCode)
    jest.spyOn(IncidentRepository, 'save').mockResolvedValue(expectedIncident)

    const actualData = await executeMutation(() => useReportIncident(), givenIncidentRequest)
    expect(IncidentRepository.save).toHaveBeenCalledTimes(1)
    expect(IncidentRepository.save).toBeCalledWith(expectedIncident)
    expect(actualData).toEqual(expectedIncident)
  })

  it('should throw an error if validation fails', async () => {
    const expectedIncidentError = {
      description: 'some description error',
    } as IncidentError
    expectOneConsoleError(expectedIncidentError)

    jest.spyOn(incidentValidator, 'default').mockReturnValue(expectedIncidentError)
    jest.spyOn(IncidentRepository, 'save').mockResolvedValue({} as Incident)

    try {
      await executeMutation(() => useReportIncident(), {} as Incident)
    } catch (e) {
      expect(e).toEqual(expectedIncidentError)
      expect(IncidentRepository.save).not.toHaveBeenCalled()
    }
  })
})

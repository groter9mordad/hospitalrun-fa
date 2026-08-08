import { LineGraph, Spinner } from '@hospitalrun/components'
import getMonth from 'date-fns-jalali/getMonth'
import React, { useEffect, useState } from 'react'

import { useUpdateTitle } from '../../page-header/title/TitleContext'
import useTranslator from '../../shared/hooks/useTranslator'
import useIncidents from '../hooks/useIncidents'
import IncidentFilter from '../IncidentFilter'
import IncidentSearchRequest from '../model/IncidentSearchRequest'

const VisualizeIncidents = () => {
  const { t } = useTranslator()
  const updateTitle = useUpdateTitle()
  useEffect(() => {
    updateTitle(t('incidents.visualize.view'))
  })
  const searchFilter = IncidentFilter.reported
  const searchRequest: IncidentSearchRequest = { status: searchFilter }
  const { data, isLoading } = useIncidents(searchRequest)
  const [incident, setIncident] = useState(0)
  const [showGraph, setShowGraph] = useState(false)
  const [monthlyIncidents, setMonthlyIncidents] = useState(Array(12).fill(0))

  const getIncidentMonth = (reportedOn: string) => getMonth(new Date(reportedOn))

  const persianMonths = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ]

  useEffect(() => {
    if (data === undefined || isLoading) {
      // incidents data not loaded yet, do nothing
    } else {
      const totalIncidents: number = data.length
      if (totalIncidents > incident) {
        const incidentMonth = getIncidentMonth(data[incident].reportedOn)
        setMonthlyIncidents((prevIncidents) =>
          prevIncidents.map((value, index) => (index === incidentMonth ? value + 1 : value)),
        )
        setIncident(incident + 1)
      } else if (totalIncidents === incident) {
        // incidents data finished processing
        setShowGraph(true)
      }
    }
  }, [data, monthlyIncidents, isLoading, incident])

  return !showGraph ? (
    <Spinner type="DotLoader" loading />
  ) : (
    <>
      <LineGraph
        datasets={[
          {
            backgroundColor: 'blue',
            borderColor: 'black',
            data: [
              {
                x: persianMonths[0],
                y: monthlyIncidents[0],
              },
              {
                x: persianMonths[1],
                y: monthlyIncidents[1],
              },
              {
                x: persianMonths[2],
                y: monthlyIncidents[2],
              },
              {
                x: persianMonths[3],
                y: monthlyIncidents[3],
              },
              {
                x: persianMonths[4],
                y: monthlyIncidents[4],
              },
              {
                x: persianMonths[5],
                y: monthlyIncidents[5],
              },
              {
                x: persianMonths[6],
                y: monthlyIncidents[6],
              },
              {
                x: persianMonths[7],
                y: monthlyIncidents[7],
              },
              {
                x: persianMonths[8],
                y: monthlyIncidents[8],
              },
              {
                x: persianMonths[9],
                y: monthlyIncidents[9],
              },
              {
                x: persianMonths[10],
                y: monthlyIncidents[10],
              },
              {
                x: persianMonths[11],
                y: monthlyIncidents[11],
              },
            ],
            label: 'حوادث',
          },
        ]}
        title="حوادث گزارش‌شده در گذر زمان"
        xAxes={[
          {
            label: 'ماه‌های شمسی',
            type: 'category',
          },
        ]}
        yAxes={[
          {
            label: 'تعداد',
            type: 'linear',
          },
        ]}
      />
    </>
  )
}

export default VisualizeIncidents

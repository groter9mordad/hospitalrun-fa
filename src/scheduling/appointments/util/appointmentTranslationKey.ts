const appointmentTypeKeys: Record<string, string> = {
  'follow up': 'followUp',
  'walk in': 'walkIn',
}

export const appointmentTypeTranslationKey = (type: string) =>
  `scheduling.appointment.types.${appointmentTypeKeys[type] || type}`

const statusKeys: Record<string, string> = {
  'on hold': 'onHold',
  'entered in error': 'enteredInError',
}

const intentKeys: Record<string, string> = {
  'original order': 'originalOrder',
  'reflex order': 'reflexOrder',
  'filler order': 'fillerOrder',
  'instance order': 'instanceOrder',
}

export const medicationStatusTranslationKey = (status: string) =>
  `medications.status.${statusKeys[status] || status}`

export const medicationIntentTranslationKey = (intent: string) =>
  `medications.intent.${intentKeys[intent] || intent}`

export const medicationPriorityTranslationKey = (priority: string) =>
  `medications.priority.${priority}`

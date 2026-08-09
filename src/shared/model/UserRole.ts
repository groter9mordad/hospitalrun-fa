import Permissions from './Permissions'

export enum UserRole {
  Administrator = 'administrator',
  Doctor = 'doctor',
  Reception = 'reception',
  Laboratory = 'laboratory',
  Pharmacy = 'pharmacy',
}

const allPermissions = Object.keys(Permissions).map(
  (key) => Permissions[key as keyof typeof Permissions],
)

export const permissionsForRole = (role: UserRole): Permissions[] => {
  switch (role) {
    case UserRole.Administrator:
      return allPermissions
    case UserRole.Doctor:
      return [
        Permissions.ReadPatients,
        Permissions.WritePatients,
        Permissions.ReadAppointments,
        Permissions.AddAllergy,
        Permissions.AddDiagnosis,
        Permissions.AddCarePlan,
        Permissions.ReadCarePlan,
        Permissions.AddCareGoal,
        Permissions.ReadCareGoal,
        Permissions.AddVisit,
        Permissions.ReadVisits,
        Permissions.ViewLabs,
        Permissions.ViewLab,
        Permissions.RequestLab,
        Permissions.ViewMedications,
        Permissions.ViewMedication,
        Permissions.RequestMedication,
        Permissions.ViewImagings,
        Permissions.RequestImaging,
      ]
    case UserRole.Reception:
      return [
        Permissions.ReadPatients,
        Permissions.WritePatients,
        Permissions.ReadAppointments,
        Permissions.WriteAppointments,
        Permissions.DeleteAppointment,
      ]
    case UserRole.Laboratory:
      return [
        Permissions.ReadPatients,
        Permissions.ViewLabs,
        Permissions.ViewLab,
        Permissions.RequestLab,
        Permissions.CompleteLab,
        Permissions.CancelLab,
      ]
    case UserRole.Pharmacy:
      return [
        Permissions.ReadPatients,
        Permissions.ViewMedications,
        Permissions.ViewMedication,
        Permissions.RequestMedication,
        Permissions.CompleteMedication,
        Permissions.CancelMedication,
      ]
    default:
      return []
  }
}

export const userRoleLabels: { [key in UserRole]: string } = {
  [UserRole.Administrator]: 'مدیر سیستم',
  [UserRole.Doctor]: 'پزشک',
  [UserRole.Reception]: 'پذیرش',
  [UserRole.Laboratory]: 'آزمایشگاه',
  [UserRole.Pharmacy]: 'داروخانه',
}

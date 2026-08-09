import Permissions from '../../../shared/model/Permissions'
import { permissionsForRole, UserRole } from '../../../shared/model/UserRole'

describe('RunCDX user roles', () => {
  it('gives the administrator every permission', () => {
    expect(permissionsForRole(UserRole.Administrator)).toHaveLength(Object.keys(Permissions).length)
  })

  it('allows reception to manage patients and appointments but not treatments', () => {
    const permissions = permissionsForRole(UserRole.Reception)
    expect(permissions).toContain(Permissions.WritePatients)
    expect(permissions).toContain(Permissions.WriteAppointments)
    expect(permissions).not.toContain(Permissions.AddDiagnosis)
    expect(permissions).not.toContain(Permissions.RequestMedication)
  })

  it('allows doctors to manage clinical care but not reception scheduling', () => {
    const permissions = permissionsForRole(UserRole.Doctor)
    expect(permissions).toContain(Permissions.AddDiagnosis)
    expect(permissions).toContain(Permissions.RequestMedication)
    expect(permissions).not.toContain(Permissions.WriteAppointments)
  })

  it('keeps laboratory and pharmacy access separated', () => {
    expect(permissionsForRole(UserRole.Laboratory)).toContain(Permissions.CompleteLab)
    expect(permissionsForRole(UserRole.Laboratory)).not.toContain(Permissions.CompleteMedication)
    expect(permissionsForRole(UserRole.Pharmacy)).toContain(Permissions.CompleteMedication)
    expect(permissionsForRole(UserRole.Pharmacy)).not.toContain(Permissions.CompleteLab)
  })
})

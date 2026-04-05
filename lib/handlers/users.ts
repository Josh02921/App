import db from '../db'
import { hashPassword } from '../crypto'
import { requireSession, logAudit } from '../session'

async function requireAdmin(params: any) {
  const user = await requireSession(params)
  const rank = { 'Ingen': 0, 'Læser': 1, 'Redaktør': 2 }
  const logins = user.permissions.logins || 'Ingen'
  if ((rank[logins as keyof typeof rank] ?? 0) < 2) {
    throw new Error('Kun administrator kan udføre denne handling')
  }
  return user
}

function userToObj(u: any) {
  return {
    username: u.username,
    lastLogin: u.lastLogin?.toISOString?.() || '',
    status: u.status,
    failedAttempts: u.failedAttempts,
    lockedUntil: u.lockedUntil?.toISOString?.() || '',
    createdDate: u.createdDate?.toISOString?.() || '',
    lastCheck: u.lastCheck?.toISOString?.() || '',
    permissions: {
      kontakter: u.permKontakter,
      medlemmer: u.permMedlemmer,
      teams: u.permTeams,
      rengoring: u.permRengoring,
      produktion: u.permProduktion,
      grupper: u.permGrupper,
      events: u.permEvents,
      logins: u.permLogins,
    }
  }
}

export async function getAllUsersWithPermissionsApi(params: any) {
  try {
    await requireAdmin(params)
    const users = await db.user.findMany({ orderBy: { username: 'asc' } })
    return { success: true, users: users.map(userToObj), canEdit: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function createNewUserApi(params: any) {
  try {
    const admin = await requireAdmin(params)
    const d = params.userData || {}

    if (!d.username || !d.password) {
      return { success: false, message: 'Brugernavn og password er påkrævet' }
    }

    const existing = await db.user.findFirst({
      where: { username: { equals: d.username, mode: 'insensitive' } }
    })
    if (existing) return { success: false, message: 'Brugernavn eksisterer allerede' }

    const p = d.permissions || {}
    await db.user.create({
      data: {
        username: d.username,
        password: await hashPassword(d.password),
        status: 'Aktiv',
        permKontakter: p.kontakter || 'Ingen',
        permMedlemmer: p.medlemmer || 'Ingen',
        permTeams: p.teams || 'Ingen',
        permRengoring: p.rengoring || 'Ingen',
        permProduktion: p.produktion || 'Ingen',
        permGrupper: p.grupper || 'Ingen',
        permEvents: p.events || 'Ingen',
        permLogins: p.logins || 'Ingen',
      }
    })

    await logAudit(admin.username, 'USER_CREATED', `Oprettede ny bruger: ${d.username}`, 'SUCCESS')
    return { success: true, message: `Bruger ${d.username} oprettet succesfuldt` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function updateUserStatusApi(params: any) {
  try {
    const admin = await requireAdmin(params)
    const { username, newStatus } = params
    if (!username || !newStatus) return { success: false, message: 'Brugernavn og status er påkrævet' }

    const user = await db.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
    if (!user) return { success: false, message: 'Bruger ikke fundet' }

    await db.user.update({
      where: { id: user.id },
      data: {
        status: newStatus,
        ...(newStatus === 'Aktiv' ? { failedAttempts: 0, lockedUntil: null } : {})
      }
    })

    await logAudit(admin.username, 'USER_STATUS_CHANGED', `Ændrede ${username} status til ${newStatus}`, 'SUCCESS')
    return { success: true, message: `${username} status ændret til ${newStatus}` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function bulkUpdatePermissionsApi(params: any) {
  try {
    const admin = await requireAdmin(params)
    const { username, permissions: p } = params
    if (!username || !p) return { success: false, message: 'Brugernavn og tilladelser er påkrævet' }

    const user = await db.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
    if (!user) return { success: false, message: 'Bruger ikke fundet' }

    await db.user.update({
      where: { id: user.id },
      data: {
        permKontakter: p.kontakter || 'Ingen',
        permMedlemmer: p.medlemmer || 'Ingen',
        permTeams: p.teams || 'Ingen',
        permRengoring: p.rengoring || 'Ingen',
        permProduktion: p.produktion || 'Ingen',
        permGrupper: p.grupper || 'Ingen',
        permEvents: p.events || 'Ingen',
        permLogins: p.logins || 'Ingen',
      }
    })

    await logAudit(admin.username, 'PERMISSIONS_BULK_UPDATE', `Opdaterede alle tilladelser for ${username}`, 'SUCCESS')
    return { success: true, message: `Tilladelser opdateret for ${username}` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function resetUserPasswordApi(params: any) {
  try {
    const admin = await requireAdmin(params)
    const { username, newPassword } = params
    if (!username || !newPassword) return { success: false, message: 'Brugernavn og nyt password er påkrævet' }

    const user = await db.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
    if (!user) return { success: false, message: 'Bruger ikke fundet' }

    await db.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword), failedAttempts: 0, lockedUntil: null }
    })

    await logAudit(admin.username, 'PASSWORD_RESET', `Reset password for ${username}`, 'SUCCESS')
    return { success: true, message: `Password nulstillet for ${username}` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function deleteUserApi(params: any) {
  try {
    const admin = await requireAdmin(params)
    const { username } = params
    if (!username) return { success: false, message: 'Brugernavn er påkrævet' }
    if (username.toLowerCase() === 'admin') return { success: false, message: 'Kan ikke slette admin brugeren' }

    const user = await db.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
    if (!user) return { success: false, message: 'Bruger ikke fundet' }

    await db.session.deleteMany({ where: { userId: user.id } })
    await db.user.delete({ where: { id: user.id } })

    await logAudit(admin.username, 'USER_DELETED', `Slettet bruger: ${username}`, 'SUCCESS')
    return { success: true, message: `Bruger ${username} slettet succesfuldt` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

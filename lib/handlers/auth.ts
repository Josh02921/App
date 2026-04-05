import db from '../db'
import { hashPassword, verifyPassword } from '../crypto'
import { createSession, deleteSession, validateSession, logAudit } from '../session'

const MAX_LOGIN_ATTEMPTS = 7

export async function processLogin(params: { username?: string; password?: string }) {
  const username = (params.username || '').trim()
  const password = params.password || ''

  if (!username) return { success: false, message: 'Brugernavn er påkrævet' }
  if (!password) return { success: false, message: 'Adgangskode er påkrævet' }

  try {
    let user = await db.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } }
    })

    // Auto-create admin if it doesn't exist
    if (!user && username.toLowerCase() === (process.env.ADMIN_USERNAME || 'Admin').toLowerCase()) {
      const adminPass = process.env.ADMIN_PASSWORD || 'Horsens2025'
      user = await db.user.create({
        data: {
          username: process.env.ADMIN_USERNAME || 'Admin',
          password: await hashPassword(adminPass),
          status: 'Aktiv',
          permKontakter: 'Redaktør',
          permMedlemmer: 'Redaktør',
          permTeams: 'Redaktør',
          permRengoring: 'Redaktør',
          permProduktion: 'Redaktør',
          permGrupper: 'Redaktør',
          permEvents: 'Redaktør',
          permLogins: 'Redaktør',
        }
      })
    }

    if (!user) {
      await logAudit(username, 'LOGIN_FAILED', 'Ukendt brugernavn', 'FAILED')
      return { success: false, message: 'Ugyldigt brugernavn eller password' }
    }

    if (user.status !== 'Aktiv') {
      await logAudit(username, 'LOGIN_FAILED', 'Bruger inaktiv', 'FAILED')
      return { success: false, message: 'Din konto er deaktiveret. Kontakt administrator.' }
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const unlockTime = user.lockedUntil.toLocaleString('da-DK')
      await logAudit(username, 'LOGIN_FAILED', `Bruger låst indtil ${unlockTime}`, 'FAILED')
      return { success: false, message: `Kontoen er låst indtil ${unlockTime} på grund af for mange fejlede login forsøg.` }
    }

    const passwordValid = await verifyPassword(password, user.password)

    if (!passwordValid) {
      const newAttempts = user.failedAttempts + 1

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        await db.user.update({
          where: { id: user.id },
          data: { status: 'Inaktiv', failedAttempts: newAttempts, lockedUntil: new Date() }
        })
        await logAudit(username, 'ACCOUNT_LOCKED', `Konto låst efter ${newAttempts} fejlede forsøg`, 'WARNING')
        return {
          success: false,
          message: 'For mange fejlede login forsøg. Din konto er nu deaktiveret og skal aktiveres manuelt af en administrator.'
        }
      }

      await db.user.update({ where: { id: user.id }, data: { failedAttempts: newAttempts } })
      await logAudit(username, 'LOGIN_FAILED', `Forkert password - forsøg ${newAttempts}/${MAX_LOGIN_ATTEMPTS}`, 'FAILED')
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts
      return { success: false, message: `Forkert password. Du har ${remaining} forsøg tilbage før kontoen låses.` }
    }

    // Re-hash legacy passwords on successful login
    if (!user.password.startsWith('$2')) {
      await db.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) }
      })
    }

    const permissions = {
      kontakter: user.permKontakter,
      medlemmer: user.permMedlemmer,
      teams: user.permTeams,
      rengoring: user.permRengoring,
      produktion: user.permProduktion,
      grupper: user.permGrupper,
      events: user.permEvents,
      logins: user.permLogins,
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedAttempts: 0, lockedUntil: null, lastCheck: new Date() }
    })

    const token = await createSession(user.id, user.username, permissions)
    const hasEditor = Object.values(permissions).some(p => p === 'Redaktør')
    const userRole = user.username.toLowerCase() === 'admin' || hasEditor ? 'Admin' : 'User'

    await logAudit(user.username, 'LOGIN_SUCCESS', 'Succesfuld login', 'SUCCESS')

    return {
      success: true,
      message: 'Login succesfuldt',
      username: user.username,
      sessionToken: token,
      userRole,
      userPermissions: permissions
    }
  } catch (error) {
    console.error('processLogin error:', error)
    return { success: false, message: 'System fejl - prøv igen' }
  }
}

export async function validateSessionTokenApi(params: { sessionToken?: string }) {
  return validateSession(params?.sessionToken || '')
}

export async function logoutUser(params: { sessionToken?: string }) {
  try {
    const token = params?.sessionToken
    if (token) {
      const session = await validateSession(token)
      if (session.success && session.user) {
        await logAudit(session.user.username, 'LOGOUT', 'Bruger logget ud via frontend', 'INFO')
      }
      await deleteSession(token)
    }
    return { success: true }
  } catch (error) {
    return { success: false, message: 'Fejl ved logout' }
  }
}

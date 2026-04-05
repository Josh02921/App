import db from './db'
import { generateToken } from './crypto'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

export interface SessionUser {
  id: number
  username: string
  role: string
  permissions: {
    kontakter: string
    medlemmer: string
    teams: string
    rengoring: string
    produktion: string
    grupper: string
    events: string
    logins: string
  }
}

export interface SessionPayload {
  success: boolean
  user?: SessionUser
  message?: string
  expires?: number
}

export async function createSession(userId: number, username: string, permissions: Record<string, string>): Promise<string> {
  const token = generateToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)

  // Clean up old sessions for this user
  await db.session.deleteMany({ where: { userId, expiresAt: { lt: now } } })

  await db.session.create({
    data: {
      token,
      userId,
      username,
      permissions: JSON.stringify(permissions),
      loginTime: now,
      lastActivity: now,
      expiresAt,
    }
  })

  return token
}

export async function validateSession(token: string): Promise<SessionPayload> {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { success: false, message: 'No session token provided' }
  }

  try {
    const session = await db.session.findUnique({ where: { token }, include: { user: true } })

    if (!session) {
      return { success: false, message: 'Session not found or invalid' }
    }

    const now = new Date()

    if (session.expiresAt < now) {
      await db.session.delete({ where: { token } }).catch(() => {})
      return { success: false, message: 'Session expired' }
    }

    if (session.user.status !== 'Aktiv') {
      await db.session.delete({ where: { token } }).catch(() => {})
      return { success: false, message: 'User not active' }
    }

    // Refresh TTL
    const maxExpiry = new Date(session.loginTime.getTime() + SESSION_TTL_MS)
    const newExpiry = new Date(Math.min(now.getTime() + SESSION_TTL_MS, maxExpiry.getTime()))

    await db.session.update({
      where: { token },
      data: { lastActivity: now, expiresAt: newExpiry }
    })

    const permissions = JSON.parse(session.permissions)
    const hasEditorAccess = Object.values(permissions).some(p => p === 'Redaktør')
    const role = session.username.toLowerCase() === 'admin' || hasEditorAccess ? 'Admin' : 'User'

    return {
      success: true,
      user: {
        id: session.userId,
        username: session.username,
        role,
        permissions
      },
      expires: newExpiry.getTime()
    }
  } catch (error) {
    console.error('Error validating session:', error)
    return { success: false, message: 'Session validation error' }
  }
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return
  await db.session.delete({ where: { token } }).catch(() => {})
}

export async function requireSession(params: Record<string, string>): Promise<SessionUser> {
  const token = params?.sessionToken
  if (!token) throw new Error('Session token required. Please log in.')

  const result = await validateSession(token)
  if (!result.success || !result.user) {
    throw new Error(result.message || 'Session invalid or expired. Please log in again.')
  }

  return result.user
}

export async function requirePermission(
  params: Record<string, string>,
  page: string,
  minLevel: 'Læser' | 'Redaktør' = 'Læser'
): Promise<SessionUser> {
  const user = await requireSession(params)
  const permRanks: Record<string, number> = { 'Ingen': 0, 'Læser': 1, 'Redaktør': 2 }
  const userLevel = user.permissions[page as keyof typeof user.permissions] || 'Ingen'
  const userRank = permRanks[userLevel] ?? 0
  const requiredRank = permRanks[minLevel] ?? 1

  if (userRank < requiredRank) {
    await logAudit(user.username, 'PERMISSION_DENIED', `Access denied to ${page}`, 'WARNING')
    throw new Error(`Ingen adgang til ${page}`)
  }

  return user
}

export async function logAudit(username: string, action: string, details = '', status = 'INFO') {
  try {
    await db.auditLog.create({ data: { username, action, details, status } })
    // Clean old logs (> 90 days)
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    await db.auditLog.deleteMany({ where: { timestamp: { lt: cutoff } } })
  } catch (_) {
    // Don't fail on audit errors
  }
}

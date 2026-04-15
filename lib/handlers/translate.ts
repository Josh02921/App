// ============================================================
// translate.ts - Translation Admin Handler
// Manages translator access codes, languages, and sessions.
// Separate from the main admin login - translators use a code.
// ============================================================

import db from '../db'
import { requireSession, logAudit } from '../session'
import { generateToken } from '../crypto'
import { verifyEmailConnection } from '../email'

const TRANSLATE_SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

// ============================================================
// Settings helpers
// ============================================================

async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const row = await db.translateSetting.findUnique({ where: { key } })
  return row?.value ?? defaultValue
}

async function setSetting(key: string, value: string) {
  await db.translateSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  })
}

// ============================================================
// Admin functions (require main admin session)
// ============================================================

export async function getTranslateSettings(params: any) {
  try {
    await requireSession(params)
    const settings = await db.translateSetting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value

    // Active sessions
    const now = new Date()
    await db.translateSession.deleteMany({ where: { expiresAt: { lt: now } } })
    const activeSessions = await db.translateSession.findMany({
      where: { isActive: true, expiresAt: { gte: now } },
      orderBy: { loginTime: 'desc' }
    })

    return {
      success: true,
      settings: map,
      accessCode: map['access_code'] || '',
      languages: JSON.parse(map['languages'] || '["Engelsk","Arabisk","Dari","Ukrainsk","Russisk","Spansk","Tysk"]'),
      activeSessions: activeSessions.map(s => ({
        id: s.id,
        translatorName: s.translatorName,
        language: s.language,
        loginTime: s.loginTime.toISOString(),
        lastActivity: s.lastActivity.toISOString(),
      }))
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function updateTranslateSettings(params: any) {
  try {
    const user = await requireSession(params)

    if (params.accessCode !== undefined) {
      const code = String(params.accessCode).trim()
      if (code.length < 4) return { success: false, message: 'Koden skal være mindst 4 tegn' }
      await setSetting('access_code', code)
    }

    if (params.languages !== undefined) {
      const langs = Array.isArray(params.languages) ? params.languages : [params.languages]
      await setSetting('languages', JSON.stringify(langs))
    }

    if (params.churchName !== undefined) {
      await setSetting('church_name', params.churchName)
    }

    if (params.serviceNote !== undefined) {
      await setSetting('service_note', params.serviceNote)
    }

    await logAudit(user.username, 'TRANSLATE_SETTINGS_UPDATED', 'Translate indstillinger opdateret', 'SUCCESS')
    return { success: true, message: 'Indstillinger gemt' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function kickTranslateSession(params: any) {
  try {
    const user = await requireSession(params)
    const { sessionId } = params
    if (!sessionId) return { success: false, message: 'Session ID mangler' }

    await db.translateSession.update({
      where: { id: sessionId },
      data: { isActive: false, expiresAt: new Date() }
    })

    await logAudit(user.username, 'TRANSLATE_SESSION_KICKED', `Session ${sessionId} afsluttet`, 'INFO')
    return { success: true, message: 'Oversætter session afsluttet' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function testEmailConnection(params: any) {
  try {
    await requireSession(params)
    const result = await verifyEmailConnection()
    return result
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// ============================================================
// Translator functions (use access code, not admin session)
// ============================================================

export async function translateLogin(params: any) {
  try {
    const { code, translatorName, language } = params

    if (!code) return { success: false, message: 'Adgangskode er påkrævet' }

    const storedCode = await getSetting('access_code', '')
    if (!storedCode) {
      return { success: false, message: 'Oversætteradgang er ikke konfigureret endnu. Kontakt administratoren.' }
    }

    if (code.trim() !== storedCode.trim()) {
      return { success: false, message: 'Forkert adgangskode. Prøv igen.' }
    }

    const name = (translatorName || 'Oversætter').trim().substring(0, 50)
    const lang = (language || '').trim().substring(0, 50)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + TRANSLATE_SESSION_TTL_MS)
    const token = generateToken()

    // Clean up old sessions for same name+language
    await db.translateSession.deleteMany({ where: { expiresAt: { lt: now } } })

    await db.translateSession.create({
      data: {
        token,
        translatorName: name,
        language: lang,
        loginTime: now,
        lastActivity: now,
        expiresAt,
        isActive: true,
      }
    })

    // Get today's service info
    const today = new Date().toISOString().split('T')[0]
    const upcomingPlan = await db.productionPlan.findFirst({
      where: { dato: { gte: today } },
      orderBy: { dato: 'asc' }
    })

    const serviceNote = await getSetting('service_note', '')
    const churchName = await getSetting('church_name', process.env.CHURCH_NAME || 'Horsens Pinsekirke')

    return {
      success: true,
      message: `Velkommen, ${name}!`,
      translateToken: token,
      translatorName: name,
      language: lang,
      churchName,
      serviceNote,
      upcomingService: upcomingPlan ? {
        dato: upcomingPlan.dato,
        forkynder: upcomingPlan.forkynder,
        mc: upcomingPlan.mc,
        notes: upcomingPlan.notes,
      } : null
    }
  } catch (error: any) {
    console.error('translateLogin error:', error)
    return { success: false, message: 'System fejl - prøv igen' }
  }
}

export async function validateTranslateToken(params: any) {
  try {
    const { translateToken } = params
    if (!translateToken) return { success: false, message: 'Token mangler' }

    const now = new Date()
    const session = await db.translateSession.findUnique({ where: { token: translateToken } })

    if (!session || !session.isActive || session.expiresAt < now) {
      if (session) await db.translateSession.delete({ where: { token: translateToken } }).catch(() => {})
      return { success: false, message: 'Session udløbet - log ind igen' }
    }

    // Refresh TTL
    await db.translateSession.update({
      where: { token: translateToken },
      data: { lastActivity: now, expiresAt: new Date(now.getTime() + TRANSLATE_SESSION_TTL_MS) }
    })

    const serviceNote = await getSetting('service_note', '')
    const churchName = await getSetting('church_name', process.env.CHURCH_NAME || 'Horsens Pinsekirke')

    // Get upcoming service
    const today = new Date().toISOString().split('T')[0]
    const upcomingPlan = await db.productionPlan.findFirst({
      where: { dato: { gte: today } },
      orderBy: { dato: 'asc' }
    })

    return {
      success: true,
      translatorName: session.translatorName,
      language: session.language,
      churchName,
      serviceNote,
      upcomingService: upcomingPlan ? {
        dato: upcomingPlan.dato,
        forkynder: upcomingPlan.forkynder,
        mc: upcomingPlan.mc,
        notes: upcomingPlan.notes,
      } : null
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function logoutTranslateSession(params: any) {
  try {
    const { translateToken } = params
    if (translateToken) {
      await db.translateSession.updateMany({
        where: { token: translateToken },
        data: { isActive: false, expiresAt: new Date() }
      })
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getAvailableLanguages(params: any) {
  try {
    const languages = JSON.parse(
      await getSetting('languages', '["Engelsk","Arabisk","Dari","Ukrainsk","Russisk","Spansk","Tysk"]')
    )
    return { success: true, languages }
  } catch (error: any) {
    return { success: false, languages: ['Engelsk'], message: error.message }
  }
}

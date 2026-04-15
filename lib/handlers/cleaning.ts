import db from '../db'
import { requireSession } from '../session'
import { sendEmail, isEmailConfigured } from '../email'

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function scheduleToObj(s: any) {
  return {
    id: s.id,
    week: s.week,
    cafe1: s.cafe1,
    cafe2: s.cafe2,
    salen: s.salen,
    toiletter: s.toiletter,
  }
}

export async function getCleaningSchedule(params: any) {
  try {
    await requireSession(params)
    const schedules = await db.cleaningSchedule.findMany({ orderBy: { week: 'asc' } })
    return { success: true, schedule: schedules.map(scheduleToObj), cleaningSchedule: schedules.map(scheduleToObj) }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af rengøringsplan' }
  }
}

export async function updateCleaningAssignment(params: any) {
  try {
    await requireSession(params)
    const d = params.assignment || params
    const { week, cafe1, cafe2, salen, toiletter } = d
    if (!week) return { success: false, message: 'Uge er påkrævet' }

    await db.cleaningSchedule.upsert({
      where: { week },
      create: { week, cafe1: cafe1 || '', cafe2: cafe2 || '', salen: salen || '', toiletter: toiletter || '' },
      update: { cafe1: cafe1 || '', cafe2: cafe2 || '', salen: salen || '', toiletter: toiletter || '' }
    })
    return { success: true, message: 'Rengøringsopgave opdateret' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved opdatering af rengøringsopgave' }
  }
}

export async function generateRandomCleaningSchedule(params: any) {
  try {
    await requireSession(params)
    // Only use members who have rengoring = 'JA' if any exist, else use all
    const cleaningMembers = await db.member.findMany({
      where: { rengoring: 'JA' },
      orderBy: { id: 'asc' }
    })
    const allMembers = await db.member.findMany({ orderBy: { id: 'asc' } })

    const source = cleaningMembers.length >= 4 ? cleaningMembers : allMembers
    if (source.length === 0) {
      return { success: false, message: 'Ingen medlemmer fundet til rengøringsplan' }
    }

    const names = source.map(m => `${m.fornavn} ${m.efternavn}`.trim())
    const weeks = params.weeks || 12
    const startWeek = params.startWeek || getWeekNumber(new Date())
    const year = new Date().getFullYear()

    const created: any[] = []
    for (let w = 0; w < weeks; w++) {
      const weekNum = ((startWeek + w - 1) % 52) + 1
      const weekStr = `${year}-${String(weekNum).padStart(2, '0')}`

      const shuffle = [...names].sort(() => Math.random() - 0.5)
      const assignment = {
        week: weekStr,
        cafe1: shuffle[0] || '',
        cafe2: shuffle[1] || '',
        salen: shuffle[2] || '',
        toiletter: shuffle[3] || '',
      }

      await db.cleaningSchedule.upsert({
        where: { week: weekStr },
        create: assignment,
        update: assignment,
      })
      created.push(assignment)
    }

    return { success: true, message: `${created.length} uger genereret`, schedule: created }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved generering af rengøringsplan' }
  }
}

export async function sendCleaningReminders(params: any) {
  try {
    await requireSession(params)

    if (!isEmailConfigured()) {
      return { success: false, sent: 0, message: 'Email er ikke konfigureret. Tilføj SMTP indstillinger i Railway miljøvariabler.' }
    }

    // Find current or next week's cleaning schedule
    const now = new Date()
    const weekNum = params.week ? parseInt(params.week) : getWeekNumber(now)
    const year = now.getFullYear()
    const weekStr = params.weekStr || `${year}-${String(weekNum).padStart(2, '0')}`

    const schedule = await db.cleaningSchedule.findUnique({ where: { week: weekStr } })
    if (!schedule) {
      return { success: false, sent: 0, message: `Ingen rengøringsplan fundet for uge ${weekStr}` }
    }

    const assignments: Array<{ area: string; name: string }> = [
      { area: 'Café (plads 1)', name: schedule.cafe1 },
      { area: 'Café (plads 2)', name: schedule.cafe2 },
      { area: 'Salen', name: schedule.salen },
      { area: 'Toiletter', name: schedule.toiletter },
    ].filter(a => a.name.trim() !== '')

    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const assignment of assignments) {
      // Find member by full name
      const nameParts = assignment.name.trim().split(' ')
      const fornavn = nameParts[0] || ''
      const efternavn = nameParts.slice(1).join(' ') || ''

      const member = await db.member.findFirst({
        where: {
          AND: [
            { fornavn: { equals: fornavn, mode: 'insensitive' } },
            { efternavn: { equals: efternavn, mode: 'insensitive' } },
          ]
        }
      })

      if (!member || !member.email) {
        errors.push(`Ingen email for: ${assignment.name}`)
        continue
      }

      try {
        await sendEmail({
          to: member.email,
          subject: `Rengøringspåmindelse - Uge ${weekNum}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #007bff;">Rengøringspåmindelse</h2>
              <p>Kære ${member.fornavn},</p>
              <p>Dette er en påmindelse om, at du er ansvarlig for rengøring denne uge (uge ${weekNum}).</p>
              <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <strong>Dit område:</strong> ${assignment.area}
              </div>
              <p>Tak for din hjælp til at holde kirken ren!</p>
              <p>Mange hilsner<br><strong>${churchName}</strong></p>
            </div>
          `
        })
        sent++
      } catch (e: any) {
        failed++
        errors.push(`Fejl for ${member.email}: ${e.message}`)
      }
    }

    return {
      success: true,
      sent,
      failed,
      message: `${sent} rengøringspåmindelser sendt${failed > 0 ? `, ${failed} fejlede` : ''}`,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    return { success: false, sent: 0, message: error.message }
  }
}

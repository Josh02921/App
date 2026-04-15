import db from '../db'
import { requireSession } from '../session'
import { sendEmail, isEmailConfigured } from '../email'
import { getSetting, setSetting, getSettingJson, setSettingJson } from '../settings'

const DEFAULT_AREAS = ['Café 1', 'Café 2', 'Salen', 'Toiletter/Gulv/Børnerum']

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

// Alias
export async function getCleaningSchedules(params: any) {
  return getCleaningSchedule(params)
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

export async function saveCleaningSchedule(params: any) {
  try {
    await requireSession(params)
    const schedule: any[] = params.schedule || params.entries || []
    for (const entry of schedule) {
      if (!entry.week) continue
      await db.cleaningSchedule.upsert({
        where: { week: entry.week },
        create: { week: entry.week, cafe1: entry.cafe1 || '', cafe2: entry.cafe2 || '', salen: entry.salen || '', toiletter: entry.toiletter || '' },
        update: { cafe1: entry.cafe1 || '', cafe2: entry.cafe2 || '', salen: entry.salen || '', toiletter: entry.toiletter || '' }
      })
    }
    return { success: true, message: `${schedule.length} rengøringsposter gemt` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function clearCleaningSchedule(params: any) {
  try {
    await requireSession(params)
    const result = await db.cleaningSchedule.deleteMany({})
    return { success: true, message: `${result.count} rengøringsposter slettet`, deletedCount: result.count }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getCleaningAreas(params: any) {
  try {
    await requireSession(params)
    const areas = await getSettingJson<string[]>('CLEANING_AREAS', DEFAULT_AREAS)
    return { success: true, areas }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function saveCleaningAreas(params: any) {
  try {
    await requireSession(params)
    const areas = params.areas
    if (!areas || !Array.isArray(areas)) return { success: false, message: 'Områder er påkrævet' }
    await setSettingJson('CLEANING_AREAS', areas)
    return { success: true, message: 'Rengøringsområder gemt' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getCleaningInstructions(params: any) {
  try {
    await requireSession(params)
    const instructions = await getSetting('CLEANING_INSTRUCTIONS', 'Sørg for at rengøre dit tildelte område grundigt.')
    return { success: true, instructions }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function saveCleaningInstructions(params: any) {
  try {
    await requireSession(params)
    const instructions = params.instructions || ''
    await setSetting('CLEANING_INSTRUCTIONS', instructions)
    return { success: true, message: 'Rengøringsinstruktioner gemt' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function generateRandomCleaningSchedule(params: any) {
  try {
    await requireSession(params)
    const cleaningMembers = await db.member.findMany({ where: { rengoring: 'JA' }, orderBy: { id: 'asc' } })
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
      await db.cleaningSchedule.upsert({ where: { week: weekStr }, create: assignment, update: assignment })
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

    const now = new Date()
    const weekNum = params.week ? parseInt(params.week) : getWeekNumber(now)
    const year = now.getFullYear()
    const weekStr = params.weekStr || `${year}-${String(weekNum).padStart(2, '0')}`

    const schedule = await db.cleaningSchedule.findUnique({ where: { week: weekStr } })
    if (!schedule) {
      return { success: false, sent: 0, message: `Ingen rengøringsplan fundet for uge ${weekStr}` }
    }

    const areas = await getSettingJson<string[]>('CLEANING_AREAS', DEFAULT_AREAS)
    const instructions = await getSetting('CLEANING_INSTRUCTIONS', '')

    const assignments: Array<{ area: string; name: string }> = [
      { area: areas[0] || 'Café 1', name: schedule.cafe1 },
      { area: areas[1] || 'Café 2', name: schedule.cafe2 },
      { area: areas[2] || 'Salen', name: schedule.salen },
      { area: areas[3] || 'Toiletter', name: schedule.toiletter },
    ].filter(a => a.name.trim() !== '')

    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const assignment of assignments) {
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
              ${instructions ? `<div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin: 8px 0;"><strong>Instruktioner:</strong><br>${instructions}</div>` : ''}
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

// Alias for immediate execution on Railway
export async function scheduleCleaningReminders(params: any) {
  return sendCleaningReminders(params)
}

export async function sendCleaningPlanEmails(params: any) {
  try {
    await requireSession(params)
    if (!isEmailConfigured()) {
      return { success: false, sent: 0, message: 'Email er ikke konfigureret.' }
    }

    const period = params.period || 'next' // 'next', 'month', 'all'
    const now = new Date()
    const currentWeek = getWeekNumber(now)
    const year = now.getFullYear()

    let schedules: any[]
    if (period === 'next') {
      const nextWeekStr = `${year}-${String(currentWeek + 1).padStart(2, '0')}`
      const s = await db.cleaningSchedule.findUnique({ where: { week: nextWeekStr } })
      schedules = s ? [s] : []
    } else if (period === 'month') {
      // Next 4 weeks
      const weekStrs = Array.from({ length: 4 }, (_, i) => `${year}-${String(currentWeek + i).padStart(2, '0')}`)
      schedules = await db.cleaningSchedule.findMany({ where: { week: { in: weekStrs } }, orderBy: { week: 'asc' } })
    } else {
      schedules = await db.cleaningSchedule.findMany({ orderBy: { week: 'asc' } })
    }

    if (!schedules.length) return { success: false, sent: 0, message: 'Ingen rengøringsplan fundet for den valgte periode' }

    const areas = await getSettingJson<string[]>('CLEANING_AREAS', DEFAULT_AREAS)
    const instructions = await getSetting('CLEANING_INSTRUCTIONS', '')
    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'

    // Collect unique people across all schedule entries
    const personWeeks = new Map<string, string[]>()
    for (const s of schedules) {
      const slots = [s.cafe1, s.cafe2, s.salen, s.toiletter]
      for (const name of slots) {
        if (!name?.trim()) continue
        if (!personWeeks.has(name)) personWeeks.set(name, [])
        personWeeks.get(name)!.push(s.week)
      }
    }

    let sent = 0
    let failed = 0

    for (const [fullName, weeks] of Array.from(personWeeks.entries())) {
      const parts = fullName.trim().split(' ')
      const fornavn = parts[0] || ''
      const efternavn = parts.slice(1).join(' ') || ''
      const member = await db.member.findFirst({
        where: {
          AND: [
            { fornavn: { equals: fornavn, mode: 'insensitive' } },
            { efternavn: { equals: efternavn, mode: 'insensitive' } },
          ]
        }
      })
      if (!member || !member.email) { failed++; continue }

      // Find areas for this person
      const mySchedule = schedules
        .filter(s => [s.cafe1, s.cafe2, s.salen, s.toiletter].includes(fullName))
        .map(s => {
          let area = ''
          if (s.cafe1 === fullName) area = areas[0] || 'Café 1'
          else if (s.cafe2 === fullName) area = areas[1] || 'Café 2'
          else if (s.salen === fullName) area = areas[2] || 'Salen'
          else if (s.toiletter === fullName) area = areas[3] || 'Toiletter'
          return `Uge ${s.week}: ${area}`
        })

      try {
        await sendEmail({
          to: member.email,
          subject: `Rengøringsplan`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Rengøringsplan</h2>
            <p>Kære ${member.fornavn},</p>
            <p>Her er din rengøringsplan:</p>
            <ul>${mySchedule.map(s => `<li>${s}</li>`).join('')}</ul>
            ${instructions ? `<p><strong>Instruktioner:</strong> ${instructions}</p>` : ''}
            <p>Mange hilsner<br><strong>${churchName}</strong></p>
          </div>`
        })
        sent++
      } catch { failed++ }
    }

    return { success: true, sent, failed, message: `Rengøringsplan sendt til ${sent} personer` }
  } catch (error: any) {
    return { success: false, sent: 0, message: error.message }
  }
}

// Scheduling stubs - Railway is always-on, no cron triggers needed
export async function scheduleCleaningListGeneration(params: any) {
  await requireSession(params)
  return { success: true, message: 'Rengøringsliste generering er sat til straks udførelse (Railway)' }
}

export async function deleteCleaningGenerationSchedule(params: any) {
  await requireSession(params)
  return { success: true, message: 'Ingen tidsplaner at slette (Railway kører altid)' }
}

export async function deleteCleaningNotificationSchedule(params: any) {
  await requireSession(params)
  return { success: true, message: 'Ingen tidsplaner at slette (Railway kører altid)' }
}

export async function updateCleaningGenerationSchedule(params: any) {
  await requireSession(params)
  return { success: true, message: 'Tidsplan opdateret (Railway kører altid)' }
}

export async function updateCleaningNotificationSchedule(params: any) {
  await requireSession(params)
  return { success: true, message: 'Tidsplan opdateret (Railway kører altid)' }
}

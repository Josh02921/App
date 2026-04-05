import db from '../db'
import { requireSession } from '../session'

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
    const members = await db.member.findMany({ orderBy: { id: 'asc' } })
    if (members.length === 0) {
      return { success: false, message: 'Ingen medlemmer fundet til rengøringsplan' }
    }

    const names = members.map(m => `${m.fornavn} ${m.efternavn}`.trim())
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
    return { success: true, sent: 0, message: 'Email funktionen kræver SMTP konfiguration' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

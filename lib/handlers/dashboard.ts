import db from '../db'
import { requireSession } from '../session'

export async function getDashboardData(params: any) {
  try {
    await requireSession(params)
    const [contacts, members, teams, events] = await Promise.all([
      db.contact.count(),
      db.member.count(),
      db.team.count(),
      db.event.count(),
    ])

    const recentEvents = await db.event.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const recentContacts = await db.contact.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, fornavn: true, efternavn: true, email: true, createdAt: true }
    })

    return {
      success: true,
      stats: { contacts, members, teams, events },
      recentEvents: recentEvents.map(e => ({
        id: e.id, titel: e.titel, dato: e.dato, status: e.status
      })),
      recentContacts: recentContacts.map(c => ({
        id: c.id,
        name: `${c.fornavn} ${c.efternavn}`.trim(),
        email: c.email,
        createdAt: c.createdAt?.toISOString?.() || ''
      })),
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af dashboard data' }
  }
}

export async function getDashboardStats(params: any) {
  return getDashboardData(params)
}

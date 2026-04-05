import db from '../db'
import { requireSession } from '../session'

function eventToObj(e: any) {
  return {
    id: e.id,
    titel: e.titel,
    beskrivelse: e.beskrivelse,
    dato: e.dato,
    tid: e.tid,
    lokation: e.lokation,
    team: e.team,
    status: e.status,
    createdAt: e.createdAt?.toISOString?.() || '',
    updatedAt: e.updatedAt?.toISOString?.() || '',
  }
}

export async function getAllEvents(params: any) {
  try {
    await requireSession(params)
    const events = await db.event.findMany({ orderBy: { dato: 'asc' } })
    return { success: true, events: events.map(eventToObj) }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af events' }
  }
}

export async function addEvent(params: any) {
  try {
    await requireSession(params)
    const d = params.eventData || params
    if (!d.titel) return { success: false, message: 'Titel er påkrævet' }
    const event = await db.event.create({
      data: {
        titel: d.titel || '',
        beskrivelse: d.beskrivelse || '',
        dato: d.dato || '',
        tid: d.tid || '',
        lokation: d.lokation || '',
        team: d.team || '',
        status: d.status || 'Aktiv',
      }
    })
    return { success: true, message: 'Event tilføjet succesfuldt', eventId: event.id }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved tilføjelse af event' }
  }
}

export async function saveEvent(params: any) {
  return addEvent(params)
}

export async function updateEvent(params: any) {
  try {
    await requireSession(params)
    const eventId = params.eventId || params.id
    const d = params.eventData || params
    if (!eventId) return { success: false, message: 'Event ID mangler' }

    const existing = await db.event.findUnique({ where: { id: Number(eventId) } })
    if (!existing) return { success: false, message: 'Event ikke fundet' }

    await db.event.update({
      where: { id: Number(eventId) },
      data: {
        titel: d.titel ?? existing.titel,
        beskrivelse: d.beskrivelse ?? existing.beskrivelse,
        dato: d.dato ?? existing.dato,
        tid: d.tid ?? existing.tid,
        lokation: d.lokation ?? existing.lokation,
        team: d.team ?? existing.team,
        status: d.status ?? existing.status,
      }
    })
    return { success: true, message: 'Event opdateret succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved opdatering af event' }
  }
}

export async function deleteEvent(params: any) {
  try {
    await requireSession(params)
    const eventId = params.eventId || params.id
    if (!eventId) return { success: false, message: 'Event ID mangler' }
    await db.event.delete({ where: { id: Number(eventId) } })
    return { success: true, message: 'Event slettet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved sletning af event' }
  }
}

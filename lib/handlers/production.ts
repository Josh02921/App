import db from '../db'
import { requireSession } from '../session'

const PRODUCTION_COLUMNS = ['mc', 'media', 'lyd', 'kamera', 'forsanger', 'piano', 'guitar', 'trommer', 'bas', 'forkynder', 'oversetterr', 'forsamling', 'kidz', 'kidz2', 'cafe1', 'cafe2', 'host1', 'host2']

function planToObj(p: any) {
  return {
    id: p.id,
    dato: p.dato,
    mc: p.mc,
    media: p.media,
    lyd: p.lyd,
    kamera: p.kamera,
    forsanger: p.forsanger,
    piano: p.piano,
    guitar: p.guitar,
    trommer: p.trommer,
    bas: p.bas,
    forkynder: p.forkynder,
    oversetterr: p.oversetterr,
    forsamling: p.forsamling,
    kidz: p.kidz,
    kidz2: p.kidz2,
    cafe1: p.cafe1,
    cafe2: p.cafe2,
    host1: p.host1,
    host2: p.host2,
    notes: p.notes,
  }
}

export async function getProductionPlan(params: any) {
  try {
    await requireSession(params)
    const plans = await db.productionPlan.findMany({ orderBy: { dato: 'asc' } })
    return { success: true, productionPlan: plans.map(planToObj), plans: plans.map(planToObj) }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af produktionsplan' }
  }
}

export async function getProductionTeams(params: any) {
  try {
    await requireSession(params)
    const members = await db.member.findMany({ orderBy: [{ efternavn: 'asc' }, { fornavn: 'asc' }] })
    const memberNames = members.map(m => `${m.fornavn} ${m.efternavn}`.trim())
    return { success: true, teams: memberNames, members: memberNames }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af produktionsteams' }
  }
}

export async function updateProductionEntry(params: any) {
  try {
    await requireSession(params)
    const d = params.entryData || params
    const dato = d.dato
    if (!dato) return { success: false, message: 'Dato er påkrævet' }

    const data: any = { dato }
    PRODUCTION_COLUMNS.forEach(col => {
      if (d[col] !== undefined) data[col] = d[col]
    })
    if (d.notes !== undefined) data.notes = d.notes

    await db.productionPlan.upsert({
      where: { dato },
      create: data,
      update: data,
    })
    return { success: true, message: 'Produktionsplan opdateret succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved opdatering af produktionsplan' }
  }
}

export async function saveProductionNotes(params: any) {
  try {
    await requireSession(params)
    const { dato, notes } = params
    if (!dato) return { success: false, message: 'Dato er påkrævet' }

    await db.productionPlan.upsert({
      where: { dato },
      create: { dato, notes: notes || '' },
      update: { notes: notes || '' }
    })
    return { success: true, message: 'Noter gemt succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved gemning af noter' }
  }
}

export async function saveFullProductionPlan(params: any) {
  try {
    await requireSession(params)
    const entries = params.entries || []
    for (const entry of entries) {
      if (!entry.dato) continue
      const data: any = { dato: entry.dato }
      PRODUCTION_COLUMNS.forEach(col => {
        data[col] = entry[col] || ''
      })
      data.notes = entry.notes || ''
      await db.productionPlan.upsert({
        where: { dato: entry.dato },
        create: data,
        update: data,
      })
    }
    return { success: true, message: `${entries.length} produktionsposter gemt` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

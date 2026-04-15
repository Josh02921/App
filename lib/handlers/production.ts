import db from '../db'
import { requireSession } from '../session'
import { sendEmail, isEmailConfigured } from '../email'
import { getSetting, setSetting, getSettingJson, setSettingJson } from '../settings'

const PRODUCTION_COLUMNS = ['mc', 'media', 'lyd', 'kamera', 'forsanger', 'piano', 'guitar', 'trommer', 'bas', 'forkynder', 'oversetterr', 'forsamling', 'kidz', 'kidz2', 'cafe1', 'cafe2', 'host1', 'host2']

const DEFAULT_PRODUCTION_TEAMS = [
  { name: 'Lyd & Teknik', positions: ['Lyd', 'Kamera', 'Media/Stream'] },
  { name: 'Musik', positions: ['Forsanger', 'Piano', 'Guitar', 'Trommer', 'Bas'] },
  { name: 'Service', positions: ['MC', 'Forsamling', 'Host 1', 'Host 2'] },
  { name: 'Børn & Cafe', positions: ['Kidz', 'Kidz 2', 'Café 1', 'Café 2'] },
]

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
    const config = await getSettingJson<typeof DEFAULT_PRODUCTION_TEAMS>('PRODUCTION_TEAMS_CONFIG', DEFAULT_PRODUCTION_TEAMS)
    const members = await db.member.findMany({ orderBy: [{ efternavn: 'asc' }, { fornavn: 'asc' }] })
    const memberNames = members.map(m => `${m.fornavn} ${m.efternavn}`.trim())
    return { success: true, teams: config, memberNames, members: memberNames }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af produktionsteams' }
  }
}

export async function saveProductionTeams(params: any) {
  try {
    await requireSession(params)
    const teams = params.teams || params.config
    if (!teams) return { success: false, message: 'Teams konfiguration er påkrævet' }
    await setSettingJson('PRODUCTION_TEAMS_CONFIG', teams)
    return { success: true, message: 'Produktionsteams gemt succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function addProductionTeam(params: any) {
  try {
    await requireSession(params)
    const { name, positions } = params
    if (!name) return { success: false, message: 'Team navn er påkrævet' }
    const config = await getSettingJson<any[]>('PRODUCTION_TEAMS_CONFIG', DEFAULT_PRODUCTION_TEAMS)
    config.push({ name, positions: positions || [] })
    await setSettingJson('PRODUCTION_TEAMS_CONFIG', config)
    return { success: true, message: `Produktionsteam "${name}" tilføjet` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function removeProductionTeam(params: any) {
  try {
    await requireSession(params)
    const { name, index } = params
    const config = await getSettingJson<any[]>('PRODUCTION_TEAMS_CONFIG', DEFAULT_PRODUCTION_TEAMS)
    let updated: any[]
    if (index !== undefined) {
      updated = config.filter((_, i) => i !== Number(index))
    } else {
      updated = config.filter(t => t.name !== name)
    }
    await setSettingJson('PRODUCTION_TEAMS_CONFIG', updated)
    return { success: true, message: 'Produktionsteam fjernet' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function addPositionToTeam(params: any) {
  try {
    await requireSession(params)
    const { teamName, teamIndex, position } = params
    if (!position) return { success: false, message: 'Position er påkrævet' }
    const config = await getSettingJson<any[]>('PRODUCTION_TEAMS_CONFIG', DEFAULT_PRODUCTION_TEAMS)
    const team = teamIndex !== undefined ? config[Number(teamIndex)] : config.find(t => t.name === teamName)
    if (!team) return { success: false, message: 'Team ikke fundet' }
    if (!team.positions) team.positions = []
    team.positions.push(position)
    await setSettingJson('PRODUCTION_TEAMS_CONFIG', config)
    return { success: true, message: `Position "${position}" tilføjet` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function removePositionFromTeam(params: any) {
  try {
    await requireSession(params)
    const { teamName, teamIndex, position } = params
    const config = await getSettingJson<any[]>('PRODUCTION_TEAMS_CONFIG', DEFAULT_PRODUCTION_TEAMS)
    const team = teamIndex !== undefined ? config[Number(teamIndex)] : config.find(t => t.name === teamName)
    if (!team) return { success: false, message: 'Team ikke fundet' }
    team.positions = (team.positions || []).filter((p: string) => p !== position)
    await setSettingJson('PRODUCTION_TEAMS_CONFIG', config)
    return { success: true, message: `Position "${position}" fjernet` }
  } catch (error: any) {
    return { success: false, message: error.message }
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

export async function deleteProductionEntry(params: any) {
  try {
    await requireSession(params)
    const dato = params.dato || params.id
    if (!dato) return { success: false, message: 'Dato er påkrævet' }
    // Try by dato first, then by id
    if (typeof dato === 'string' && dato.includes('-')) {
      await db.productionPlan.deleteMany({ where: { dato } })
    } else {
      await db.productionPlan.delete({ where: { id: Number(dato) } })
    }
    return { success: true, message: 'Produktionsenhed slettet' }
  } catch (error: any) {
    return { success: false, message: error.message }
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

export async function getProductionNotes(params: any) {
  try {
    await requireSession(params)
    const { dato } = params
    if (!dato) return { success: false, message: 'Dato er påkrævet' }
    const plan = await db.productionPlan.findUnique({ where: { dato } })
    return { success: true, notes: plan?.notes || '' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function saveFullProductionPlan(params: any) {
  try {
    await requireSession(params)
    const entries = params.entries || []
    for (const entry of entries) {
      if (!entry.dato) continue
      const data: any = { dato: entry.dato }
      PRODUCTION_COLUMNS.forEach(col => { data[col] = entry[col] || '' })
      data.notes = entry.notes || ''
      await db.productionPlan.upsert({ where: { dato: entry.dato }, create: data, update: data })
    }
    return { success: true, message: `${entries.length} produktionsposter gemt` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function createScheduledProductions(params: any) {
  try {
    await requireSession(params)
    const dates: string[] = params.dates || []
    if (!dates.length) return { success: false, message: 'Datoer er påkrævet' }
    let created = 0
    for (const dato of dates) {
      const existing = await db.productionPlan.findUnique({ where: { dato } })
      if (!existing) {
        const data: any = { dato }
        PRODUCTION_COLUMNS.forEach(col => { data[col] = '' })
        data.notes = ''
        await db.productionPlan.create({ data })
        created++
      }
    }
    return { success: true, message: `${created} nye produktionsdatoer oprettet`, created }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function sendProductionPlanEmails(params: any) {
  try {
    await requireSession(params)
    if (!isEmailConfigured()) {
      return { success: false, sent: 0, message: 'Email er ikke konfigureret.' }
    }

    const dato = params.dato
    if (!dato) return { success: false, sent: 0, message: 'Dato er påkrævet' }

    const plan = await db.productionPlan.findUnique({ where: { dato } })
    if (!plan) return { success: false, sent: 0, message: `Ingen produktionsplan fundet for ${dato}` }

    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'
    const config = await getSettingJson<any[]>('PRODUCTION_TEAMS_CONFIG', DEFAULT_PRODUCTION_TEAMS)

    // Build CSV content
    const csvLines = [`Dato,Rolle,Navn`]
    const planObj = planToObj(plan)
    const roleMap: Record<string, string> = {
      mc: 'MC', media: 'Media/Stream', lyd: 'Lyd', kamera: 'Kamera',
      forsanger: 'Forsanger', piano: 'Piano', guitar: 'Guitar',
      trommer: 'Trommer', bas: 'Bas', forkynder: 'Forkynder',
      oversetterr: 'Oversætter', forsamling: 'Forsamling',
      kidz: 'Kidz', kidz2: 'Kidz 2', cafe1: 'Café 1', cafe2: 'Café 2',
      host1: 'Host 1', host2: 'Host 2',
    }
    for (const [col, label] of Object.entries(roleMap)) {
      const name = (planObj as any)[col]
      if (name) csvLines.push(`${dato},${label},${name}`)
    }
    const csvContent = csvLines.join('\n')

    // Collect unique names from plan and find their emails
    const assignedNames = new Set<string>()
    for (const col of PRODUCTION_COLUMNS) {
      const name = (planObj as any)[col]
      if (name && name.trim()) assignedNames.add(name.trim())
    }

    let sent = 0
    let failed = 0

    for (const fullName of Array.from(assignedNames)) {
      const parts = fullName.split(' ')
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

      // Find this person's role
      let myRole = ''
      for (const [col, label] of Object.entries(roleMap)) {
        if (((planObj as any)[col] || '').toLowerCase() === fullName.toLowerCase()) {
          myRole = label
          break
        }
      }

      try {
        await sendEmail({
          to: member.email,
          subject: `Produktionsplan - ${dato}`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Produktionsplan - ${dato}</h2>
            <p>Kære ${member.fornavn},</p>
            <p>Her er din rolle for gudstjenesten den ${dato}:</p>
            ${myRole ? `<div style="background:#f0f4ff;padding:16px;border-radius:8px;margin:16px 0;"><strong>Din rolle:</strong> ${myRole}</div>` : ''}
            <p>Se den fulde produktionsplan i vedhæftede CSV fil.</p>
            <p>Mange hilsner<br><strong>${churchName}</strong></p>
          </div>`,
          attachments: [{
            filename: `produktionsplan-${dato}.csv`,
            content: Buffer.from(csvContent, 'utf-8'),
            contentType: 'text/csv',
          }]
        })
        sent++
      } catch {
        failed++
      }
    }

    return { success: true, sent, failed, message: `Produktionsplan sendt til ${sent} personer` }
  } catch (error: any) {
    return { success: false, sent: 0, message: error.message }
  }
}

// In Railway (always-on), just execute immediately
export async function scheduleProductionEmail(params: any) {
  return sendProductionPlanEmails(params)
}

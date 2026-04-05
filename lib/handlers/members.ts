import db from '../db'
import { requireSession } from '../session'

function memberToObj(m: any, index: number) {
  return {
    id: index,
    dbId: m.id,
    dato: m.dato instanceof Date ? m.dato.toISOString().split('T')[0] : String(m.dato || ''),
    efternavn: m.efternavn,
    fornavn: m.fornavn,
    adresse: m.adresse,
    adresse_1: m.adresse,
    postnr: m.postnr,
    by: m.by,
    email: m.email,
    mobil: m.mobil,
    fodselsdato: m.fodselsdato,
    dobsdato: m.dobsdato,
    forevbible: m.forevbible,
    cleaningPreference: m.rengoring,
    teams: [],
    cleaning: [],
  }
}

export async function getAllMembers(params: any) {
  try {
    await requireSession(params)
    const rows = await db.member.findMany({ orderBy: { id: 'asc' } })
    const members = rows.map((m, i) => memberToObj(m, i))
    return { success: true, members }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af medlemmer' }
  }
}

export async function addMember(params: any) {
  try {
    await requireSession(params)
    const d = params.memberData || params
    if (!d.fornavn || !d.efternavn) {
      return { success: false, message: 'Fornavn og efternavn er påkrævet' }
    }
    await db.member.create({
      data: {
        efternavn: d.efternavn || '',
        fornavn: d.fornavn || '',
        adresse: d.adresse_1 || d.adresse || '',
        postnr: d.postnr || '',
        by: d.by || '',
        email: d.email || '',
        mobil: d.mobil || '',
        fodselsdato: d.fodselsdato || '',
        dobsdato: d.dobsdato || '',
        forevbible: d.forevbible || 'JA',
        rengoring: 'NEJ',
      }
    })
    return { success: true, message: 'Medlem tilføjet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved tilføjelse af medlem' }
  }
}

export async function updateMember(params: any) {
  try {
    await requireSession(params)
    const memberId = params.memberId
    const d = params.memberData || params
    if (!d.fornavn || !d.efternavn) {
      return { success: false, message: 'Fornavn og efternavn er påkrævet' }
    }

    const all = await db.member.findMany({ orderBy: { id: 'asc' } })
    if (memberId < 0 || memberId >= all.length) {
      return { success: false, message: 'Medlem ikke fundet' }
    }
    const member = all[memberId]

    await db.member.update({
      where: { id: member.id },
      data: {
        efternavn: d.efternavn,
        fornavn: d.fornavn,
        adresse: d.adresse_1 || d.adresse || member.adresse,
        postnr: d.postnr ?? member.postnr,
        by: d.by ?? member.by,
        email: d.email ?? member.email,
        mobil: d.mobil ?? member.mobil,
        fodselsdato: d.fodselsdato ?? member.fodselsdato,
        dobsdato: d.dobsdato ?? member.dobsdato,
      }
    })
    return { success: true, message: 'Medlem opdateret succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved opdatering af medlem' }
  }
}

export async function deleteMember(params: any) {
  try {
    await requireSession(params)
    const memberId = params.memberId !== undefined ? params.memberId : params

    const all = await db.member.findMany({ orderBy: { id: 'asc' } })
    if (memberId < 0 || memberId >= all.length) {
      return { success: false, message: 'Medlem ikke fundet' }
    }
    const member = all[memberId]
    await db.member.delete({ where: { id: member.id } })
    return { success: true, message: 'Medlem slettet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved sletning af medlem' }
  }
}

export async function removeExampleMembers(params: any) {
  try {
    await requireSession(params)
    const result = await db.member.deleteMany({
      where: {
        OR: [
          { fornavn: { contains: 'eksempel', mode: 'insensitive' } },
          { efternavn: { contains: 'eksempel', mode: 'insensitive' } },
          { fornavn: { contains: 'test', mode: 'insensitive' } },
          { efternavn: { contains: 'test', mode: 'insensitive' } },
        ]
      }
    })
    return { success: true, message: `${result.count} eksempelmedlem(mer) fjernet`, removedCount: result.count }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function sendBulkMemberEmails(params: any) {
  try {
    await requireSession(params)
    return { success: true, sent: 0, failed: 0, message: 'Email funktionen kræver SMTP konfiguration' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

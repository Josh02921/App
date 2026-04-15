import db from '../db'
import { requireSession } from '../session'
import { sendEmail, isEmailConfigured } from '../email'

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

// Resolve member by dbId (preferred) or by 0-based index fallback
async function findMemberRecord(params: any, field: string = 'memberId') {
  const dbId = params.dbId
  if (dbId !== undefined && dbId !== null) {
    const member = await db.member.findUnique({ where: { id: Number(dbId) } })
    if (!member) throw new Error('Medlem ikke fundet')
    return member
  }
  const memberId = params[field] ?? params[0]
  if (memberId === undefined || memberId === null) throw new Error('Medlem ID er påkrævet')
  const all = await db.member.findMany({ orderBy: { id: 'asc' } })
  const idx = Number(memberId)
  if (idx < 0 || idx >= all.length) throw new Error('Medlem ikke fundet')
  return all[idx]
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
    const member = await findMemberRecord(params)
    const d = params.memberData || params

    if (!d.fornavn || !d.efternavn) {
      return { success: false, message: 'Fornavn og efternavn er påkrævet' }
    }

    await db.member.update({
      where: { id: member.id },
      data: {
        efternavn: d.efternavn ?? member.efternavn,
        fornavn: d.fornavn ?? member.fornavn,
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
    const member = await findMemberRecord(params)
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

export async function updateMemberCleaningPreference(params: any) {
  try {
    await requireSession(params)
    const member = await findMemberRecord(params)
    const preference = params.preference || params.rengoring || 'NEJ'
    const val = ['JA', 'NEJ'].includes(preference.toUpperCase()) ? preference.toUpperCase() : 'NEJ'
    await db.member.update({ where: { id: member.id }, data: { rengoring: val } })
    return { success: true, message: `Rengøringspræference opdateret til ${val}` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getMembersForCleaningList(params: any) {
  try {
    await requireSession(params)
    const rows = await db.member.findMany({
      where: { rengoring: 'JA' },
      orderBy: [{ efternavn: 'asc' }, { fornavn: 'asc' }]
    })
    const members = rows.map((m, i) => ({
      ...memberToObj(m, i),
      fullName: `${m.fornavn} ${m.efternavn}`.trim(),
    }))
    return { success: true, members }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function sendBulkMemberEmails(params: any) {
  try {
    await requireSession(params)
    if (!isEmailConfigured()) {
      return { success: false, sent: 0, failed: 0, message: 'Email er ikke konfigureret. Tilføj SMTP indstillinger i Railway miljøvariabler.' }
    }

    const emailData = params.emailData || params
    const subject = emailData.subject || params.subject || 'Besked fra kirken'
    const message = emailData.body || emailData.message || params.message || params.body || ''
    if (!message) return { success: false, sent: 0, failed: 0, message: 'Besked tekst er påkrævet' }

    let recipients: Array<{ email: string; fornavn: string; efternavn: string }> = []
    if (emailData.recipients && Array.isArray(emailData.recipients)) {
      recipients = emailData.recipients
    } else {
      const rows = await db.member.findMany({ where: { email: { not: '' } }, orderBy: { id: 'asc' } })
      recipients = rows.map(m => ({ email: m.email, fornavn: m.fornavn, efternavn: m.efternavn }))
    }

    const { personalizeText } = await import('../email')
    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'
    let sent = 0
    let failed = 0

    for (const m of recipients) {
      if (!m.email) continue
      try {
        const personalized = personalizeText(message, { firstName: m.fornavn, lastName: m.efternavn })
        const personalizedSubject = personalizeText(subject, { firstName: m.fornavn, lastName: m.efternavn })
        await sendEmail({
          to: m.email,
          subject: personalizedSubject,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Kære ${m.fornavn} ${m.efternavn},</p>
            ${personalized.replace(/\n/g, '<br>')}
            <br><p><strong>${churchName}</strong></p>
          </div>`
        })
        sent++
      } catch {
        failed++
      }
    }

    return {
      success: true,
      sent,
      failed,
      message: `${sent} emails sendt til medlemmer${failed > 0 ? `, ${failed} fejlede` : ''}`
    }
  } catch (error: any) {
    return { success: false, sent: 0, failed: 0, message: error.message }
  }
}

export async function scheduleBulkMemberEmails(params: any) {
  return sendBulkMemberEmails(params)
}

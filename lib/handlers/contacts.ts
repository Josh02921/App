import db from '../db'
import { requireSession } from '../session'
import { sendEmail, isEmailConfigured } from '../email'

function formatDate(d: Date | null | undefined): string {
  if (!d) return ''
  return d instanceof Date ? d.toISOString().split('T')[0] : String(d)
}

function contactToObj(c: any, index: number) {
  return {
    id: index,
    dbId: c.id,
    dato: formatDate(c.dato),
    efternavn: c.efternavn,
    fornavn: c.fornavn,
    adresse: c.adresse,
    postnr: c.postnr,
    by: c.by,
    email: c.email,
    mobil: c.mobil,
    fodselsdato: c.fodselsdato,
    dabdato: c.dabsdato,
    nyhedsmail: c.nyhedsmail,
    info_kristen: c.infoKristen,
    info_kirke: c.infoKirke,
    info_dabmedlem: c.infoDabmedlem,
    samtale_pastor: c.samtalePastor,
  }
}

// Resolve contact by dbId (preferred) or by 0-based index fallback
async function findContactRecord(params: any, field: string = 'contactId') {
  const dbId = params.dbId
  if (dbId !== undefined && dbId !== null) {
    const contact = await db.contact.findUnique({ where: { id: Number(dbId) } })
    if (!contact) throw new Error('Kontakt ikke fundet')
    return contact
  }
  const contactId = params[field] ?? params[0]
  if (contactId === undefined || contactId === null) throw new Error('Kontakt ID er påkrævet')
  const all = await db.contact.findMany({ orderBy: { id: 'asc' } })
  const idx = Number(contactId)
  if (idx < 0 || idx >= all.length) throw new Error('Kontakt ikke fundet')
  return all[idx]
}

export async function getAllContactsSimple(params: any) {
  try {
    await requireSession(params)
    const rows = await db.contact.findMany({ orderBy: { id: 'asc' } })
    const contacts = rows.map((c, i) => contactToObj(c, i))
    return { success: true, contacts, message: `${contacts.length} kontakter indlæst` }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af kontakter' }
  }
}

export async function addContact(params: any) {
  try {
    await requireSession(params)
    const d = params.contactData || params
    await db.contact.create({
      data: {
        efternavn: d.efternavn || '',
        fornavn: d.fornavn || '',
        adresse: d.adresse || '',
        postnr: d.postnr || '',
        by: d.by || '',
        email: d.email || '',
        mobil: d.mobil || '',
        fodselsdato: d.fodselsdato || '',
        nyhedsmail: Boolean(d.nyhedsmail),
        infoKristen: Boolean(d.info_kristen),
        infoKirke: Boolean(d.info_kirke),
        infoDabmedlem: Boolean(d.info_dabmedlem),
        samtalePastor: Boolean(d.samtale_pastor),
      }
    })
    return { success: true, message: 'Kontakt tilføjet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved tilføjelse af kontakt' }
  }
}

export async function updateContact(params: any) {
  try {
    await requireSession(params)
    const contact = await findContactRecord(params)
    const d = params.contactData || params[1] || params

    await db.contact.update({
      where: { id: contact.id },
      data: {
        efternavn: d.efternavn ?? contact.efternavn,
        fornavn: d.fornavn ?? contact.fornavn,
        adresse: d.adresse ?? contact.adresse,
        postnr: d.postnr ?? contact.postnr,
        by: d.by ?? contact.by,
        email: d.email ?? contact.email,
        mobil: d.mobil ?? contact.mobil,
        fodselsdato: d.fodselsdato ?? contact.fodselsdato,
        nyhedsmail: d.nyhedsmail !== undefined ? Boolean(d.nyhedsmail) : contact.nyhedsmail,
        infoKristen: d.info_kristen !== undefined ? Boolean(d.info_kristen) : contact.infoKristen,
        infoKirke: d.info_kirke !== undefined ? Boolean(d.info_kirke) : contact.infoKirke,
        infoDabmedlem: d.info_dabmedlem !== undefined ? Boolean(d.info_dabmedlem) : contact.infoDabmedlem,
        samtalePastor: d.samtale_pastor !== undefined ? Boolean(d.samtale_pastor) : contact.samtalePastor,
      }
    })
    return { success: true, message: 'Kontakt opdateret succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved opdatering af kontakt' }
  }
}

export async function deleteContact(params: any) {
  try {
    await requireSession(params)
    const contact = await findContactRecord(params)
    await db.contact.delete({ where: { id: contact.id } })
    return { success: true, message: 'Kontakt slettet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved sletning af kontakt' }
  }
}

export async function convertContactToMember(params: any) {
  try {
    await requireSession(params)
    const c = await findContactRecord(params)

    await db.member.create({
      data: {
        efternavn: c.efternavn,
        fornavn: c.fornavn,
        adresse: c.adresse,
        postnr: c.postnr,
        by: c.by,
        email: c.email,
        mobil: c.mobil,
        fodselsdato: c.fodselsdato,
        dobsdato: new Date().toISOString().split('T')[0],
        forevbible: 'JA',
        rengoring: 'NEJ',
      }
    })
    await db.contact.delete({ where: { id: c.id } })
    return { success: true, message: 'Kontakt konverteret til medlem og slettet fra kontakter' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved konvertering' }
  }
}

export async function sendFollowUp(params: any) {
  try {
    await requireSession(params)
    if (!isEmailConfigured()) {
      return { success: false, message: 'Email er ikke konfigureret. Tilføj SMTP indstillinger i Railway miljøvariabler.' }
    }
    const contact = await findContactRecord(params)
    if (!contact.email) {
      return { success: false, message: 'Kontakt har ingen email adresse' }
    }

    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || ''

    await sendEmail({
      to: contact.email,
      subject: `Hej ${contact.fornavn} - Vi er glade for at du kom forbi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Hej ${contact.fornavn}!</h2>
          <p>Tak fordi du besøgte ${churchName}.</p>
          <p>Vi håber du havde en god oplevelse, og vi vil meget gerne se dig igen.</p>
          <p>Hvis du har spørgsmål eller ønsker mere information, er du meget velkommen til at kontakte os.</p>
          <br>
          <p>Mange hilsner</p>
          <p><strong>${churchName}</strong></p>
        </div>
      `
    })

    return { success: true, message: `Follow-up email sendt til ${contact.email}` }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved sending af follow-up email' }
  }
}

export async function removeExampleContacts(params: any) {
  try {
    await requireSession(params)
    const result = await db.contact.deleteMany({
      where: {
        OR: [
          { fornavn: { contains: 'eksempel', mode: 'insensitive' } },
          { efternavn: { contains: 'eksempel', mode: 'insensitive' } },
          { fornavn: { contains: 'test', mode: 'insensitive' } },
          { efternavn: { contains: 'test', mode: 'insensitive' } },
        ]
      }
    })
    return { success: true, message: `${result.count} eksempelkontakt(er) fjernet`, removedCount: result.count }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function sendBulkContactEmails(params: any) {
  try {
    await requireSession(params)
    if (!isEmailConfigured()) {
      return { success: false, sent: 0, failed: 0, message: 'Email er ikke konfigureret. Tilføj SMTP indstillinger i Railway miljøvariabler.' }
    }

    const emailData = params.emailData || params
    const subject = emailData.subject || params.subject || 'Besked fra kirken'
    const message = emailData.body || emailData.message || params.message || params.body || ''
    const onlyNewsletter = params.onlyNewsletter !== false

    if (!message) return { success: false, sent: 0, failed: 0, message: 'Besked tekst er påkrævet' }

    // Support explicit recipients list or fetch from DB
    let recipients: Array<{ email: string; fornavn: string; efternavn: string }> = []
    if (emailData.recipients && Array.isArray(emailData.recipients)) {
      recipients = emailData.recipients
    } else {
      const where = onlyNewsletter ? { nyhedsmail: true } : {}
      const contacts = await db.contact.findMany({
        where: { ...where, email: { not: '' } },
        orderBy: { id: 'asc' }
      })
      recipients = contacts.map(c => ({ email: c.email, fornavn: c.fornavn, efternavn: c.efternavn }))
    }

    const { personalizeText } = await import('../email')
    let sent = 0
    let failed = 0
    const errors: string[] = []
    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'

    for (const r of recipients) {
      if (!r.email) continue
      try {
        const personalized = personalizeText(message, { firstName: r.fornavn, lastName: r.efternavn })
        const personalizedSubject = personalizeText(subject, { firstName: r.fornavn, lastName: r.efternavn })
        await sendEmail({
          to: r.email,
          subject: personalizedSubject,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Kære ${r.fornavn} ${r.efternavn},</p>
            ${personalized.replace(/\n/g, '<br>')}
            <br><p><strong>${churchName}</strong></p>
          </div>`
        })
        sent++
      } catch (e: any) {
        failed++
        errors.push(`${r.email}: ${e.message}`)
      }
    }

    return {
      success: true,
      sent,
      failed,
      message: `${sent} emails sendt${failed > 0 ? `, ${failed} fejlede` : ''}`,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    return { success: false, sent: 0, failed: 0, message: error.message }
  }
}

// In Railway (always-on server), just execute immediately
export async function scheduleBulkContactEmails(params: any) {
  return sendBulkContactEmails(params)
}

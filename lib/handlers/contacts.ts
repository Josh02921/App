import db from '../db'
import { requireSession } from '../session'

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
    const contactId = params.contactId ?? params[0]
    const d = params.contactData || params[1] || params

    // Find the contact by 0-based index
    const all = await db.contact.findMany({ orderBy: { id: 'asc' } })
    if (contactId < 0 || contactId >= all.length) {
      return { success: false, message: 'Kontakt ikke fundet' }
    }
    const contact = all[contactId]

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
    const contactId = params.contactId !== undefined ? params.contactId : params

    const all = await db.contact.findMany({ orderBy: { id: 'asc' } })
    if (contactId < 0 || contactId >= all.length) {
      return { success: false, message: 'Kontakt ikke fundet' }
    }
    const contact = all[contactId]
    await db.contact.delete({ where: { id: contact.id } })
    return { success: true, message: 'Kontakt slettet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved sletning af kontakt' }
  }
}

export async function convertContactToMember(params: any) {
  try {
    await requireSession(params)
    const contactId = params.contactId !== undefined ? params.contactId : params[0]

    const all = await db.contact.findMany({ orderBy: { id: 'asc' } })
    if (contactId < 0 || contactId >= all.length) {
      return { success: false, message: 'Kontakt ikke fundet' }
    }
    const c = all[contactId]

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
  // Email functionality - stub for now (requires SMTP setup)
  try {
    await requireSession(params)
    return { success: true, message: '0 follow-up emails sendt (email ikke konfigureret)' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function sendBulkContactEmails(params: any) {
  try {
    await requireSession(params)
    return { success: true, sent: 0, failed: 0, message: 'Email funktionen kræver SMTP konfiguration' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

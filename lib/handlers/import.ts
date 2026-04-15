// ============================================================
// import.ts - Excel template generators and data importers
// Templates return JSON {headers, exampleRow} for client-side Excel generation
// Importers accept params.excelData (2D array from client-side Excel parse)
// ============================================================

import db from '../db'
import { requireSession } from '../session'

export async function generateContactsTemplate(params: any) {
  try {
    await requireSession(params)
    return {
      success: true,
      headers: ['Efternavn', 'Fornavn', 'Adresse', 'Postnr', 'By', 'Email', 'Mobil', 'Fødselsdato', 'Dabsdato', 'Nyhedsmail', 'Info Kristen', 'Info Kirke', 'Info Dabmedlem', 'Samtale Pastor'],
      exampleRow: ['Hansen', 'Lars', 'Kirkegade 1', '8700', 'Horsens', 'lars@example.com', '12345678', '01-01-1990', '', 'JA', 'NEJ', 'NEJ', 'NEJ', 'NEJ'],
      filename: 'kontakter-skabelon.xlsx',
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function generateMembersTemplate(params: any) {
  try {
    await requireSession(params)
    return {
      success: true,
      headers: ['Efternavn', 'Fornavn', 'Adresse', 'Postnr', 'By', 'Email', 'Mobil', 'Fødselsdato', 'Dobsdato', 'Forevbible', 'Rengøring'],
      exampleRow: ['Hansen', 'Lars', 'Kirkegade 1', '8700', 'Horsens', 'lars@example.com', '12345678', '01-01-1990', '01-06-2020', 'JA', 'NEJ'],
      filename: 'medlemmer-skabelon.xlsx',
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function generateTeamsTemplate(params: any) {
  try {
    await requireSession(params)
    const teams = await db.team.findMany({ orderBy: { name: 'asc' } })
    const teamNames = teams.map(t => t.name)
    return {
      success: true,
      headers: ['Team Navn', 'Leder', 'Beskrivelse'],
      exampleRow: ['Musikteam', 'Lars Hansen', 'Ansvarlig for musik til gudstjenester'],
      teams: teamNames,
      filename: 'teams-skabelon.xlsx',
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function generateEventsTemplate(params: any) {
  try {
    await requireSession(params)
    return {
      success: true,
      headers: ['Titel', 'Beskrivelse', 'Dato', 'Tid', 'Lokation', 'Team', 'Status'],
      exampleRow: ['Julekoncert', 'Juleaften gudstjeneste', '2025-12-24', '17:00', 'Kirken', 'Musikteam', 'Aktiv'],
      filename: 'events-skabelon.xlsx',
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function generateProductionTemplate(params: any) {
  try {
    await requireSession(params)
    return {
      success: true,
      headers: ['Dato', 'MC', 'Media', 'Lyd', 'Kamera', 'Forsanger', 'Piano', 'Guitar', 'Trommer', 'Bas', 'Forkynder', 'Oversætter', 'Forsamling', 'Kidz', 'Kidz 2', 'Café 1', 'Café 2', 'Host 1', 'Host 2', 'Noter'],
      exampleRow: ['2025-01-05', 'Lars', 'Anna', 'Peter', 'Mia', 'Jonas', 'Sofie', 'Kim', 'Bo', 'David', 'Pastor', '', 'Marie', 'Helle', '', 'Jens', 'Camilla', 'Thomas', 'Louise', ''],
      filename: 'produktion-skabelon.xlsx',
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function generateGrupperTemplate(params: any) {
  try {
    await requireSession(params)
    return {
      success: true,
      headers: ['Gruppe Navn', 'Leder', 'Dag', 'Tidspunkt', 'Lokation'],
      exampleRow: ['Ungdomsgruppe', 'Anna Hansen', 'Fredag', '19:00', 'Ungdomslokalet'],
      filename: 'grupper-skabelon.xlsx',
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function generateRengoringTemplate(params: any) {
  try {
    await requireSession(params)
    return {
      success: true,
      headers: ['Uge (ÅÅÅÅ-UU)', 'Café 1', 'Café 2', 'Salen', 'Toiletter'],
      exampleRow: ['2025-01', 'Lars Hansen', 'Anna Nielsen', 'Peter Sørensen', 'Mia Pedersen'],
      filename: 'rengoring-skabelon.xlsx',
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// ---- Import functions ----
// excelData is a 2D array: first row = headers, subsequent rows = data

export async function importContactsFromExcel(params: any) {
  try {
    await requireSession(params)
    const data: any[][] = params.excelData || []
    if (!data.length) return { success: false, message: 'Ingen data at importere' }

    const headers = data[0].map((h: string) => String(h || '').toLowerCase().trim())
    const rows = data.slice(1).filter((r: any[]) => r.some((v: any) => v !== '' && v !== null && v !== undefined))

    const idx = (name: string) => headers.findIndex(h => h.includes(name))
    const col = {
      efternavn: idx('efternavn'),
      fornavn: idx('fornavn'),
      adresse: idx('adresse'),
      postnr: idx('postnr'),
      by: idx('by'),
      email: idx('email'),
      mobil: idx('mobil'),
      fodselsdato: idx('fødselsdato') >= 0 ? idx('fødselsdato') : idx('fodselsdato'),
      dabsdato: idx('dabsdato'),
      nyhedsmail: idx('nyhedsmail'),
      infoKristen: idx('kristen'),
      infoKirke: idx('kirke'),
      infoDabmedlem: idx('dabmedlem'),
      samtalePastor: idx('pastor'),
    }

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      const get = (c: number) => c >= 0 ? String(row[c] || '').trim() : ''
      const bool = (c: number) => ['ja', 'yes', '1', 'true'].includes(get(c).toLowerCase())
      const efternavn = get(col.efternavn)
      const fornavn = get(col.fornavn)
      if (!fornavn && !efternavn) { skipped++; continue }

      const existing = await db.contact.findFirst({
        where: { fornavn: { equals: fornavn, mode: 'insensitive' }, efternavn: { equals: efternavn, mode: 'insensitive' } }
      })
      if (existing) { skipped++; continue }

      await db.contact.create({
        data: {
          efternavn,
          fornavn,
          adresse: get(col.adresse),
          postnr: get(col.postnr),
          by: get(col.by),
          email: get(col.email),
          mobil: get(col.mobil),
          fodselsdato: get(col.fodselsdato),
          dabsdato: get(col.dabsdato),
          nyhedsmail: bool(col.nyhedsmail),
          infoKristen: bool(col.infoKristen),
          infoKirke: bool(col.infoKirke),
          infoDabmedlem: bool(col.infoDabmedlem),
          samtalePastor: bool(col.samtalePastor),
        }
      })
      imported++
    }

    return { success: true, imported, skipped, message: `${imported} kontakter importeret, ${skipped} sprunget over` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function importMembersFromExcel(params: any) {
  try {
    await requireSession(params)
    const data: any[][] = params.excelData || []
    if (!data.length) return { success: false, message: 'Ingen data at importere' }

    const headers = data[0].map((h: string) => String(h || '').toLowerCase().trim())
    const rows = data.slice(1).filter((r: any[]) => r.some((v: any) => v !== '' && v !== null && v !== undefined))

    const idx = (name: string) => headers.findIndex(h => h.includes(name))
    const col = {
      efternavn: idx('efternavn'),
      fornavn: idx('fornavn'),
      adresse: idx('adresse'),
      postnr: idx('postnr'),
      by: idx('by'),
      email: idx('email'),
      mobil: idx('mobil'),
      fodselsdato: idx('fødselsdato') >= 0 ? idx('fødselsdato') : idx('fodselsdato'),
      dobsdato: idx('dobsdato'),
      forevbible: idx('forevbible'),
      rengoring: idx('rengøring') >= 0 ? idx('rengøring') : idx('rengoring'),
    }

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      const get = (c: number) => c >= 0 ? String(row[c] || '').trim() : ''
      const efternavn = get(col.efternavn)
      const fornavn = get(col.fornavn)
      if (!fornavn && !efternavn) { skipped++; continue }

      const existing = await db.member.findFirst({
        where: { fornavn: { equals: fornavn, mode: 'insensitive' }, efternavn: { equals: efternavn, mode: 'insensitive' } }
      })
      if (existing) { skipped++; continue }

      await db.member.create({
        data: {
          efternavn,
          fornavn,
          adresse: get(col.adresse),
          postnr: get(col.postnr),
          by: get(col.by),
          email: get(col.email),
          mobil: get(col.mobil),
          fodselsdato: get(col.fodselsdato),
          dobsdato: get(col.dobsdato),
          forevbible: get(col.forevbible) || 'JA',
          rengoring: get(col.rengoring) || 'NEJ',
        }
      })
      imported++
    }

    return { success: true, imported, skipped, message: `${imported} medlemmer importeret, ${skipped} sprunget over` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function importProductionFromExcel(params: any) {
  try {
    await requireSession(params)
    const data: any[][] = params.excelData || []
    if (!data.length) return { success: false, message: 'Ingen data at importere' }

    const headers = data[0].map((h: string) => String(h || '').toLowerCase().trim())
    const rows = data.slice(1).filter((r: any[]) => r.some((v: any) => v !== '' && v !== null && v !== undefined))

    const idx = (name: string) => headers.findIndex(h => h.includes(name))
    const col = {
      dato: idx('dato'),
      mc: idx('mc'),
      media: idx('media'),
      lyd: idx('lyd'),
      kamera: idx('kamera'),
      forsanger: idx('forsanger'),
      piano: idx('piano'),
      guitar: idx('guitar'),
      trommer: idx('trommer'),
      bas: idx('bas'),
      forkynder: idx('forkynder'),
      oversetterr: idx('oversæt') >= 0 ? idx('oversæt') : idx('oversetterr'),
      forsamling: idx('forsamling'),
      kidz: idx('kidz') >= 0 ? idx('kidz') : -1,
      kidz2: idx('kidz 2') >= 0 ? idx('kidz 2') : -1,
      cafe1: idx('café 1') >= 0 ? idx('café 1') : idx('cafe1'),
      cafe2: idx('café 2') >= 0 ? idx('café 2') : idx('cafe2'),
      host1: idx('host 1') >= 0 ? idx('host 1') : idx('host1'),
      host2: idx('host 2') >= 0 ? idx('host 2') : idx('host2'),
      notes: idx('noter') >= 0 ? idx('noter') : idx('notes'),
    }

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      const get = (c: number) => c >= 0 ? String(row[c] || '').trim() : ''
      const dato = get(col.dato)
      if (!dato) { skipped++; continue }

      const d: any = {
        dato,
        mc: get(col.mc), media: get(col.media), lyd: get(col.lyd), kamera: get(col.kamera),
        forsanger: get(col.forsanger), piano: get(col.piano), guitar: get(col.guitar),
        trommer: get(col.trommer), bas: get(col.bas), forkynder: get(col.forkynder),
        oversetterr: get(col.oversetterr), forsamling: get(col.forsamling),
        kidz: get(col.kidz), kidz2: get(col.kidz2),
        cafe1: get(col.cafe1), cafe2: get(col.cafe2),
        host1: get(col.host1), host2: get(col.host2),
        notes: get(col.notes),
      }

      await db.productionPlan.upsert({ where: { dato }, create: d, update: d })
      imported++
    }

    return { success: true, imported, skipped, message: `${imported} produktionsposter importeret` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

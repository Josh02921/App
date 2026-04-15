import db from '../db'
import { requireSession } from '../session'
import { sendEmail, isEmailConfigured } from '../email'

export async function getAllTeams(params: any) {
  try {
    await requireSession(params)
    const teams = await db.team.findMany({
      include: { members: { include: { member: true } } },
      orderBy: { id: 'asc' }
    })
    const result = teams.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      leader: t.leader,
      members: t.members.map(tm => ({
        id: tm.memberId,
        dbId: tm.memberId,
        name: `${tm.member.fornavn} ${tm.member.efternavn}`.trim(),
        fornavn: tm.member.fornavn,
        efternavn: tm.member.efternavn,
        email: tm.member.email,
        mobil: tm.member.mobil,
        role: tm.role,
      }))
    }))
    return { success: true, teams: result }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af teams' }
  }
}

export async function createTeam(params: any) {
  try {
    await requireSession(params)
    const d = params.teamData || params
    const name = d.name || d.teamName || params.teamName
    if (!name) return { success: false, message: 'Team navn er påkrævet' }
    const team = await db.team.create({
      data: {
        name,
        description: d.description || '',
        leader: d.leader || '',
      }
    })
    return { success: true, message: 'Team oprettet succesfuldt', teamId: team.id }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved oprettelse af team' }
  }
}

export async function deleteTeam(params: any) {
  try {
    await requireSession(params)
    const teamId = params.teamId
    await db.teamMember.deleteMany({ where: { teamId } })
    await db.team.delete({ where: { id: teamId } })
    return { success: true, message: 'Team slettet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved sletning af team' }
  }
}

export async function addMemberToTeam(params: any) {
  try {
    await requireSession(params)
    const { teamId, memberId, role } = params

    // Support both dbId (actual DB ID) and 0-based index
    let dbMemberId = Number(memberId)
    const members = await db.member.findMany({ orderBy: { id: 'asc' } })

    // If memberId looks like a 0-based index (smaller than total count), resolve to DB id
    if (dbMemberId >= 0 && dbMemberId < members.length) {
      // Could be index or actual DB id - prefer direct DB lookup first
      const byId = members.find(m => m.id === dbMemberId)
      if (!byId) {
        // Treat as index
        dbMemberId = members[dbMemberId]?.id ?? dbMemberId
      }
    }

    await db.teamMember.upsert({
      where: { teamId_memberId: { teamId: Number(teamId), memberId: dbMemberId } },
      create: { teamId: Number(teamId), memberId: dbMemberId, role: role || '' },
      update: { role: role || '' }
    })
    return { success: true, message: 'Medlem tilføjet til team' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved tilføjelse af medlem til team' }
  }
}

export async function removeMemberFromTeam(params: any) {
  try {
    await requireSession(params)
    const { teamId, memberId } = params
    await db.teamMember.deleteMany({ where: { teamId: Number(teamId), memberId: Number(memberId) } })
    return { success: true, message: 'Medlem fjernet fra team' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved fjernelse af medlem fra team' }
  }
}

export async function updateTeamLeader(params: any) {
  try {
    await requireSession(params)
    const { teamId, leader } = params
    await db.team.update({ where: { id: Number(teamId) }, data: { leader: leader || '' } })
    return { success: true, message: 'Team leder opdateret' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved opdatering af team leder' }
  }
}

export async function renameTeam(params: any) {
  try {
    await requireSession(params)
    const teamId = params.teamId
    const newName = params.newName || params.name
    if (!teamId || !newName) return { success: false, message: 'Team ID og nyt navn er påkrævet' }
    await db.team.update({ where: { id: Number(teamId) }, data: { name: newName } })
    return { success: true, message: 'Team omdøbt succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function bulkRemoveMembersFromTeam(params: any) {
  try {
    await requireSession(params)
    const teamId = params.teamId
    const memberIds: number[] = params.memberIds || []
    if (!teamId) return { success: false, message: 'Team ID er påkrævet' }
    await db.teamMember.deleteMany({
      where: { teamId: Number(teamId), memberId: { in: memberIds.map(Number) } }
    })
    return { success: true, message: `${memberIds.length} medlemmer fjernet fra team` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Alias for updateTeamLeader
export async function assignTeamLeader(params: any) {
  return updateTeamLeader(params)
}

export async function cleanUpTeamsSheet(params: any) {
  try {
    await requireSession(params)
    // Remove duplicate team members (keep first occurrence)
    const all = await db.teamMember.findMany({ orderBy: { id: 'asc' } })
    const seen = new Set<string>()
    const toDelete: number[] = []
    for (const tm of all) {
      const key = `${tm.teamId}-${tm.memberId}`
      if (seen.has(key)) {
        toDelete.push(tm.id)
      } else {
        seen.add(key)
      }
    }
    if (toDelete.length > 0) {
      await db.teamMember.deleteMany({ where: { id: { in: toDelete } } })
    }
    return { success: true, message: `${toDelete.length} duplikater fjernet fra teams` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function sendBulkTeamEmails(params: any) {
  try {
    await requireSession(params)
    if (!isEmailConfigured()) {
      return { success: false, sent: 0, failed: 0, message: 'Email er ikke konfigureret. Tilføj SMTP indstillinger i Railway miljøvariabler.' }
    }

    const emailData = params.emailData || params
    const teamId = params.teamId || emailData.teamId
    const subject = emailData.subject || params.subject || 'Besked fra dit team'
    const message = emailData.body || emailData.message || params.message || params.body || ''
    if (!message) return { success: false, sent: 0, failed: 0, message: 'Besked tekst er påkrævet' }

    let recipients: Array<{ email: string; fornavn: string; efternavn: string; teamName: string }> = []
    if (emailData.recipients && Array.isArray(emailData.recipients)) {
      recipients = emailData.recipients.map((r: any) => ({ ...r, teamName: r.teamName || '' }))
    } else {
      const where: any = teamId ? { teamId: Number(teamId) } : {}
      const teamMembers = await db.teamMember.findMany({ where, include: { member: true, team: true } })
      const seen = new Set<string>()
      for (const tm of teamMembers) {
        if (!tm.member.email || seen.has(tm.member.email)) continue
        seen.add(tm.member.email)
        recipients.push({ email: tm.member.email, fornavn: tm.member.fornavn, efternavn: tm.member.efternavn, teamName: tm.team.name })
      }
    }

    const { personalizeText } = await import('../email')
    const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'
    let sent = 0
    let failed = 0

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
            ${r.teamName ? `<br><p style="color:#666; font-size:12px;">Team: ${r.teamName}</p>` : ''}
            <p><strong>${churchName}</strong></p>
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
      message: `${sent} emails sendt til team${failed > 0 ? `, ${failed} fejlede` : ''}`
    }
  } catch (error: any) {
    return { success: false, sent: 0, failed: 0, message: error.message }
  }
}

export async function scheduleBulkTeamEmails(params: any) {
  return sendBulkTeamEmails(params)
}

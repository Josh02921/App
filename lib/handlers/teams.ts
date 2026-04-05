import db from '../db'
import { requireSession } from '../session'

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

    // Find member by 0-based index if memberId looks like an index
    const members = await db.member.findMany({ orderBy: { id: 'asc' } })
    let dbMemberId = memberId

    if (typeof memberId === 'number' && memberId < members.length) {
      dbMemberId = members[memberId]?.id ?? memberId
    }

    await db.teamMember.upsert({
      where: { teamId_memberId: { teamId, memberId: dbMemberId } },
      create: { teamId, memberId: dbMemberId, role: role || '' },
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
    await db.teamMember.deleteMany({ where: { teamId, memberId } })
    return { success: true, message: 'Medlem fjernet fra team' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved fjernelse af medlem fra team' }
  }
}

export async function updateTeamLeader(params: any) {
  try {
    await requireSession(params)
    const { teamId, leader } = params
    await db.team.update({ where: { id: teamId }, data: { leader: leader || '' } })
    return { success: true, message: 'Team leder opdateret' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved opdatering af team leder' }
  }
}

export async function sendBulkTeamEmails(params: any) {
  try {
    await requireSession(params)
    return { success: true, sent: 0, failed: 0, message: 'Email funktionen kræver SMTP konfiguration' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

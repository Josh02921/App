import db from '../db'
import { requireSession } from '../session'

export async function getDiscipleGroups(params: any) {
  try {
    await requireSession(params)
    const groups = await db.group.findMany({
      include: { groupMembers: true },
      orderBy: { id: 'asc' }
    })
    const result = groups.map(g => ({
      id: g.id,
      name: g.name,
      leader: g.leader,
      day: g.day,
      time: g.time,
      location: g.location,
      members: g.groupMembers.map(gm => ({
        id: gm.id,
        memberId: gm.memberId,
        name: gm.name,
      })),
      memberCount: g.groupMembers.length,
    }))
    return { success: true, groups: result }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af grupper' }
  }
}

export async function createGroup(params: any) {
  try {
    await requireSession(params)
    const d = params.groupData || params
    if (!d.name) return { success: false, message: 'Gruppe navn er påkrævet' }
    const group = await db.group.create({
      data: {
        name: d.name,
        leader: d.leader || '',
        day: d.day || '',
        time: d.time || '',
        location: d.location || '',
      }
    })
    return { success: true, message: 'Gruppe oprettet succesfuldt', groupId: group.id }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved oprettelse af gruppe' }
  }
}

export async function deleteGroup(params: any) {
  try {
    await requireSession(params)
    const groupId = params.groupId
    await db.groupMember.deleteMany({ where: { groupId } })
    await db.group.delete({ where: { id: groupId } })
    return { success: true, message: 'Gruppe slettet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved sletning af gruppe' }
  }
}

export async function addMemberToGroup(params: any) {
  try {
    await requireSession(params)
    const { groupId, memberId, name } = params

    let memberName = name || ''
    if (!memberName && memberId) {
      const member = await db.member.findUnique({ where: { id: memberId } })
      if (member) memberName = `${member.fornavn} ${member.efternavn}`.trim()
    }

    await db.groupMember.create({
      data: {
        groupId: Number(groupId),
        memberId: Number(memberId),
        name: memberName,
      }
    })
    return { success: true, message: 'Medlem tilføjet til gruppe' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved tilføjelse af medlem til gruppe' }
  }
}

export async function removeGroupRelationship(params: any) {
  try {
    await requireSession(params)
    const { groupMemberId, groupId, memberId } = params
    if (groupMemberId) {
      await db.groupMember.delete({ where: { id: groupMemberId } })
    } else {
      await db.groupMember.deleteMany({ where: { groupId: Number(groupId), memberId: Number(memberId) } })
    }
    return { success: true, message: 'Relation fjernet succesfuldt' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved fjernelse af relation' }
  }
}

export async function updateGroup(params: any) {
  try {
    await requireSession(params)
    const groupId = params.groupId
    const d = params.groupData || params
    await db.group.update({
      where: { id: Number(groupId) },
      data: {
        name: d.name,
        leader: d.leader,
        day: d.day,
        time: d.time,
        location: d.location,
      }
    })
    return { success: true, message: 'Gruppe opdateret' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Alias matching GAS function name
export async function addGroupRelationship(params: any) {
  return addMemberToGroup(params)
}

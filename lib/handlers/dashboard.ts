import db from '../db'
import { requireSession } from '../session'

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export async function getDashboardData(params: any) {
  try {
    const user = await requireSession(params)
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Run all counts in parallel
    const [
      totalContacts, newContacts, followUpContacts,
      totalMembers, cleaningMembers,
      totalTeams, allTeams,
      totalGroups, allGroupMembers,
      totalEvents, upcomingEvents,
      allProductions,
      cleaningThisWeek, cleaningNextWeek,
      recentAuditLogs,
    ] = await Promise.all([
      db.contact.count(),
      db.contact.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.contact.count({ where: { samtalePastor: true } }),

      db.member.count(),
      db.member.count({ where: { rengoring: 'JA' } }),

      db.team.count(),
      db.team.findMany({
        include: { members: true },
        orderBy: { id: 'asc' },
      }),

      db.group.count(),
      db.groupMember.count(),

      db.event.count(),
      db.event.findMany({
        where: { dato: { gte: today }, status: 'Aktiv' },
        orderBy: { dato: 'asc' },
        take: 5,
      }),

      db.productionPlan.findMany({
        where: { dato: { gte: today } },
        orderBy: { dato: 'asc' },
        take: 3,
      }),

      db.cleaningSchedule.findUnique({
        where: { week: `${now.getFullYear()}-${String(getWeekNumber(now)).padStart(2, '0')}` }
      }),
      db.cleaningSchedule.findUnique({
        where: { week: `${now.getFullYear()}-${String(getWeekNumber(now) + 1).padStart(2, '0')}` }
      }),

      db.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 8,
      }),
    ])

    // Team stats
    const teamMemberCounts = allTeams.map(t => ({ name: t.name, count: t.members.length }))
    const largestTeam = teamMemberCounts.sort((a, b) => b.count - a.count)[0]
    const totalTeamMembers = teamMemberCounts.reduce((s, t) => s + t.count, 0)

    // Members in at least one team
    const membersInTeams = await db.teamMember.findMany({ select: { memberId: true }, distinct: ['memberId'] })
    const membersInTeamsCount = membersInTeams.length
    const teamParticipation = totalMembers > 0 ? Math.round((membersInTeamsCount / totalMembers) * 100) : 0

    // Next event countdown
    const nextEvent = upcomingEvents[0] || null
    let daysToNextEvent: number | null = null
    if (nextEvent?.dato) {
      const eventDate = new Date(nextEvent.dato)
      const diff = Math.ceil((eventDate.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
      daysToNextEvent = Math.max(0, diff)
    }

    // Next production
    const nextProduction = allProductions[0] || null

    // Current week cleaning
    const currentWeekNum = getWeekNumber(now)
    const currentWeekStr = `${now.getFullYear()}-${String(currentWeekNum).padStart(2, '0')}`
    const nextWeekStr = `${now.getFullYear()}-${String(currentWeekNum + 1).padStart(2, '0')}`

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      user: { username: user.username },

      stats: {
        contacts: {
          total: totalContacts,
          newLast30Days: newContacts,
          needsFollowUp: followUpContacts,
        },
        members: {
          total: totalMembers,
          inCleaningList: cleaningMembers,
          inTeams: membersInTeamsCount,
          teamParticipationPct: teamParticipation,
        },
        teams: {
          total: totalTeams,
          totalMembers: totalTeamMembers,
          largestTeam: largestTeam?.name || null,
          largestTeamSize: largestTeam?.count || 0,
        },
        groups: {
          total: totalGroups,
          totalMembers: allGroupMembers,
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents.length,
          daysToNext: daysToNextEvent,
          nextEventName: nextEvent?.titel || null,
        },
      },

      upcomingEvents: upcomingEvents.map(e => ({
        id: e.id,
        titel: e.titel,
        dato: e.dato,
        tid: e.tid,
        lokation: e.lokation,
        team: e.team,
        status: e.status,
      })),

      nextProduction: nextProduction ? {
        dato: nextProduction.dato,
        mc: nextProduction.mc,
        media: nextProduction.media,
        lyd: nextProduction.lyd,
        kamera: nextProduction.kamera,
        forsanger: nextProduction.forsanger,
        piano: nextProduction.piano,
        guitar: nextProduction.guitar,
        trommer: nextProduction.trommer,
        bas: nextProduction.bas,
        forkynder: nextProduction.forkynder,
        forsamling: nextProduction.forsamling,
        kidz: nextProduction.kidz,
        kidz2: nextProduction.kidz2,
        cafe1: nextProduction.cafe1,
        cafe2: nextProduction.cafe2,
        host1: nextProduction.host1,
        host2: nextProduction.host2,
      } : null,

      cleaning: {
        thisWeek: cleaningThisWeek ? {
          week: currentWeekStr,
          cafe1: cleaningThisWeek.cafe1,
          cafe2: cleaningThisWeek.cafe2,
          salen: cleaningThisWeek.salen,
          toiletter: cleaningThisWeek.toiletter,
        } : null,
        nextWeek: cleaningNextWeek ? {
          week: nextWeekStr,
          cafe1: cleaningNextWeek.cafe1,
          cafe2: cleaningNextWeek.cafe2,
          salen: cleaningNextWeek.salen,
          toiletter: cleaningNextWeek.toiletter,
        } : null,
      },

      recentActivity: recentAuditLogs.map(l => ({
        timestamp: l.timestamp.toISOString(),
        username: l.username,
        action: l.action,
        details: l.details,
        status: l.status,
      })),
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Fejl ved indlæsning af dashboard data' }
  }
}

export async function getDashboardStats(params: any) {
  return getDashboardData(params)
}

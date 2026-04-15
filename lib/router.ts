import { processLogin, validateSessionTokenApi, logoutUser } from './handlers/auth'
import { getAllContactsSimple, addContact, updateContact, deleteContact, convertContactToMember, sendFollowUp, sendBulkContactEmails } from './handlers/contacts'
import { getAllMembers, addMember, updateMember, deleteMember, removeExampleMembers, sendBulkMemberEmails } from './handlers/members'
import { getAllTeams, createTeam, deleteTeam, addMemberToTeam, removeMemberFromTeam, updateTeamLeader, sendBulkTeamEmails } from './handlers/teams'
import { getAllEvents, addEvent, saveEvent, updateEvent, deleteEvent } from './handlers/events'
import { getDiscipleGroups, createGroup, deleteGroup, addMemberToGroup, removeGroupRelationship, updateGroup } from './handlers/groups'
import { getProductionPlan, getProductionTeams, updateProductionEntry, saveProductionNotes, saveFullProductionPlan } from './handlers/production'
import { getCleaningSchedule, updateCleaningAssignment, generateRandomCleaningSchedule, sendCleaningReminders } from './handlers/cleaning'
import { getAllUsersWithPermissionsApi, createNewUserApi, updateUserStatusApi, bulkUpdatePermissionsApi, resetUserPasswordApi, deleteUserApi } from './handlers/users'
import { getDashboardData, getDashboardStats } from './handlers/dashboard'
import {
  getTranslateSettings, updateTranslateSettings, kickTranslateSession, testEmailConnection,
  translateLogin, validateTranslateToken, logoutTranslateSession, getAvailableLanguages
} from './handlers/translate'

type Handler = (params: any) => Promise<any>

const routes: Record<string, Handler> = {
  // Auth
  processLogin,
  validateSessionTokenApi,
  validateSessionToken: validateSessionTokenApi,
  logoutUser,

  // Contacts
  getAllContactsSimple,
  getAllContacts: getAllContactsSimple,
  addContact,
  updateContact,
  deleteContact,
  convertContactToMember,
  sendFollowUp,
  sendBulkContactEmails,

  // Members
  getAllMembers,
  addMember,
  updateMember,
  deleteMember,
  removeExampleMembers,
  sendBulkMemberEmails,

  // Teams
  getAllTeams,
  createTeam,
  deleteTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  updateTeamLeader,
  sendBulkTeamEmails,

  // Events
  getAllEvents,
  addEvent,
  saveEvent,
  updateEvent,
  deleteEvent,

  // Groups
  getDiscipleGroups,
  createGroup,
  deleteGroup,
  addMemberToGroup,
  removeGroupRelationship,
  updateGroup,

  // Production
  getProductionPlan,
  getProductionTeams,
  updateProductionEntry,
  saveProductionNotes,
  saveFullProductionPlan,

  // Cleaning
  getCleaningSchedule,
  updateCleaningAssignment,
  generateRandomCleaningSchedule,
  sendCleaningReminders,

  // Users
  getAllUsersWithPermissionsApi,
  createNewUserApi,
  updateUserStatusApi,
  bulkUpdatePermissionsApi,
  resetUserPasswordApi,
  deleteUserApi,

  // Dashboard
  getDashboardData,
  getDashboardStats,

  // Translate Admin (requires admin session)
  getTranslateSettings,
  updateTranslateSettings,
  kickTranslateSession,
  testEmailConnection,

  // Translate Accessor (uses translate code, not admin session)
  translateLogin,
  validateTranslateToken,
  logoutTranslateSession,
  getAvailableLanguages,
}

export async function dispatch(functionName: string, params: any): Promise<any> {
  const handler = routes[functionName]
  if (!handler) {
    return { success: false, message: `Unknown function: ${functionName}` }
  }
  return handler(params)
}

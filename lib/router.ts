import { processLogin, validateSessionTokenApi, logoutUser } from './handlers/auth'
import {
  getAllContactsSimple, addContact, updateContact, deleteContact,
  convertContactToMember, sendFollowUp, sendBulkContactEmails,
  removeExampleContacts, scheduleBulkContactEmails,
} from './handlers/contacts'
import {
  getAllMembers, addMember, updateMember, deleteMember,
  removeExampleMembers, sendBulkMemberEmails, scheduleBulkMemberEmails,
  updateMemberCleaningPreference, getMembersForCleaningList,
} from './handlers/members'
import {
  getAllTeams, createTeam, deleteTeam, addMemberToTeam, removeMemberFromTeam,
  updateTeamLeader, sendBulkTeamEmails, scheduleBulkTeamEmails,
  renameTeam, bulkRemoveMembersFromTeam, assignTeamLeader, cleanUpTeamsSheet,
} from './handlers/teams'
import { getAllEvents, addEvent, saveEvent, updateEvent, deleteEvent, getEventTemplates, saveEventTemplate, deleteEventTemplate } from './handlers/events'
import { getDiscipleGroups, createGroup, deleteGroup, addMemberToGroup, removeGroupRelationship, updateGroup, addGroupRelationship } from './handlers/groups'
import {
  getProductionPlan, getProductionTeams, updateProductionEntry, saveProductionNotes,
  saveFullProductionPlan, getProductionNotes, deleteProductionEntry,
  createScheduledProductions, sendProductionPlanEmails, scheduleProductionEmail,
  saveProductionTeams, addProductionTeam, removeProductionTeam,
  addPositionToTeam, removePositionFromTeam,
} from './handlers/production'
import {
  getCleaningSchedule, getCleaningSchedules, updateCleaningAssignment, saveCleaningSchedule,
  clearCleaningSchedule, generateRandomCleaningSchedule, sendCleaningReminders,
  scheduleCleaningReminders, sendCleaningPlanEmails,
  getCleaningAreas, saveCleaningAreas, getCleaningInstructions, saveCleaningInstructions,
  scheduleCleaningListGeneration, deleteCleaningGenerationSchedule,
  deleteCleaningNotificationSchedule, updateCleaningGenerationSchedule,
  updateCleaningNotificationSchedule,
} from './handlers/cleaning'
import {
  getAllUsersWithPermissionsApi, createNewUserApi, updateUserStatusApi,
  bulkUpdatePermissionsApi, resetUserPasswordApi, deleteUserApi,
  getUserAuditLog, testEmailConnection,
} from './handlers/users'
import { getDashboardData, getDashboardStats } from './handlers/dashboard'
import {
  generateContactsTemplate, generateMembersTemplate, generateTeamsTemplate,
  generateEventsTemplate, generateProductionTemplate, generateGrupperTemplate,
  generateRengoringTemplate, importContactsFromExcel, importMembersFromExcel,
  importProductionFromExcel,
} from './handlers/import'

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
  removeExampleContacts,
  scheduleBulkContactEmails,

  // Members
  getAllMembers,
  addMember,
  updateMember,
  deleteMember,
  removeExampleMembers,
  sendBulkMemberEmails,
  scheduleBulkMemberEmails,
  updateMemberCleaningPreference,
  getMembersForCleaningList,

  // Teams
  getAllTeams,
  createTeam,
  deleteTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  updateTeamLeader,
  assignTeamLeader,
  renameTeam,
  bulkRemoveMembersFromTeam,
  cleanUpTeamsSheet,
  sendBulkTeamEmails,
  scheduleBulkTeamEmails,

  // Events
  getAllEvents,
  addEvent,
  saveEvent,
  updateEvent,
  deleteEvent,
  getEventTemplates,
  saveEventTemplate,
  deleteEventTemplate,

  // Groups
  getDiscipleGroups,
  createGroup,
  deleteGroup,
  addMemberToGroup,
  addGroupRelationship,
  removeGroupRelationship,
  updateGroup,

  // Production
  getProductionPlan,
  getProductionTeams,
  updateProductionEntry,
  saveProductionNotes,
  getProductionNotes,
  saveFullProductionPlan,
  deleteProductionEntry,
  createScheduledProductions,
  sendProductionPlanEmails,
  scheduleProductionEmail,
  saveProductionTeams,
  addProductionTeam,
  removeProductionTeam,
  addPositionToTeam,
  removePositionFromTeam,

  // Cleaning
  getCleaningSchedule,
  getCleaningSchedules,
  updateCleaningAssignment,
  saveCleaningSchedule,
  clearCleaningSchedule,
  generateRandomCleaningSchedule,
  sendCleaningReminders,
  scheduleCleaningReminders,
  sendCleaningPlanEmails,
  getCleaningAreas,
  saveCleaningAreas,
  getCleaningInstructions,
  saveCleaningInstructions,
  scheduleCleaningListGeneration,
  deleteCleaningGenerationSchedule,
  deleteCleaningNotificationSchedule,
  updateCleaningGenerationSchedule,
  updateCleaningNotificationSchedule,

  // Users / Admin
  getAllUsersWithPermissionsApi,
  createNewUserApi,
  updateUserStatusApi,
  bulkUpdatePermissionsApi,
  resetUserPasswordApi,
  deleteUserApi,
  getUserAuditLog,
  testEmailConnection,

  // Dashboard
  getDashboardData,
  getDashboardStats,

  // Import / Templates
  generateContactsTemplate,
  generateMembersTemplate,
  generateTeamsTemplate,
  generateEventsTemplate,
  generateProductionTemplate,
  generateGrupperTemplate,
  generateRengoringTemplate,
  importContactsFromExcel,
  importMembersFromExcel,
  importProductionFromExcel,
}

export async function dispatch(functionName: string, params: any): Promise<any> {
  const handler = routes[functionName]
  if (!handler) {
    return { success: false, message: `Unknown function: ${functionName}` }
  }
  return handler(params)
}

export const View = {
  LOGIN: 'LOGIN',
  DASHBOARD: 'DASHBOARD',
  ANALYSIS: 'ANALYSIS',
  REPORT: 'REPORT',
  FAQ: 'FAQ',
  HISTORY: 'HISTORY',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  RESOURCES: 'RESOURCES',
  PRICE: 'PRICE',
  PROFILE: 'PROFILE',
  REGISTER: 'REGISTER',
  RECOVER_PASSWORD: 'RECOVER_PASSWORD',
  INSTRUCTIONS_SENT: 'INSTRUCTIONS_SENT',
}

/**
 * @typedef {Object} User
 * @property {string} name
 * @property {string} initials
 * @property {'USER' | 'ADMIN'} role
 */

/**
 * @typedef {Object} AnalysisRecord
 * @property {string} id
 * @property {string} filename
 * @property {string} date
 * @property {string} time
 * @property {'MANIPULADO' | 'ORIGINAL' | 'BAJO RIESGO'} status
 * @property {number} probability
 * @property {string} [thumbnail]
 * @property {string} [size]
 */
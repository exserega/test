/**
 * Cloud Functions entry point
 */

// Export all functions
exports.syncUserClaims = require('./auth-claims').syncUserClaims;
exports.refreshUserClaims = require('./auth-claims').refreshUserClaims;
exports.acceptInvite = require('./auth-claims').acceptInvite;
/**
 * Cloud Functions for Custom Claims Management
 * Deploy with: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Sync user role from Firestore to Custom Claims
 * Triggers when user document is created or updated
 */
exports.syncUserClaims = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.data();
        
        // If document was deleted
        if (!afterData) {
            // Remove all custom claims
            try {
                await admin.auth().setCustomUserClaims(userId, null);
                console.log(`Removed claims for user ${userId}`);
            } catch (error) {
                console.error('Error removing claims:', error);
            }
            return;
        }
        
        // Build custom claims object
        const customClaims = {
            role: afterData.role || 'user',
            status: afterData.status || 'pending',
            permissions: afterData.permissions || []
        };
        
        // Special flags
        if (afterData.isFounder) {
            customClaims.isFounder = true;
        }
        
        try {
            // Set custom claims
            await admin.auth().setCustomUserClaims(userId, customClaims);
            console.log(`Updated claims for user ${userId}:`, customClaims);
            
            // Update refresh time to force token refresh on client
            await admin.firestore()
                .collection('users')
                .doc(userId)
                .update({
                    claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
        } catch (error) {
            console.error('Error setting custom claims:', error);
        }
    });

/**
 * HTTP endpoint to manually sync claims (admin only)
 */
exports.refreshUserClaims = functions.https.onCall(async (data, context) => {
    // Check if caller is admin
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can refresh claims'
        );
    }
    
    const { userId } = data;
    if (!userId) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'userId is required'
        );
    }
    
    try {
        // Get user data from Firestore
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(userId)
            .get();
            
        if (!userDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'User not found'
            );
        }
        
        const userData = userDoc.data();
        
        // Set custom claims
        const customClaims = {
            role: userData.role || 'user',
            status: userData.status || 'pending',
            permissions: userData.permissions || []
        };
        
        await admin.auth().setCustomUserClaims(userId, customClaims);
        
        return {
            success: true,
            claims: customClaims
        };
        
    } catch (error) {
        console.error('Error refreshing claims:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to refresh claims'
        );
    }
});

/**
 * Handle invite acceptance
 */
exports.acceptInvite = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated'
        );
    }
    
    const { inviteId } = data;
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;
    
    try {
        // Get invite
        const inviteDoc = await admin.firestore()
            .collection('invites')
            .doc(inviteId)
            .get();
            
        if (!inviteDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Invite not found'
            );
        }
        
        const invite = inviteDoc.data();
        
        // Validate invite
        if (invite.status !== 'pending') {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Invite already used'
            );
        }
        
        if (invite.email !== userEmail) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Invite is for different email'
            );
        }
        
        if (new Date(invite.expiresAt.toDate()) < new Date()) {
            throw new functions.https.HttpsError(
                'deadline-exceeded',
                'Invite has expired'
            );
        }
        
        // Create user with role
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .set({
                email: userEmail,
                role: invite.role,
                status: 'active',
                invitedBy: invite.invitedBy,
                joinedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
        // Mark invite as used
        await admin.firestore()
            .collection('invites')
            .doc(inviteId)
            .update({
                status: 'accepted',
                acceptedBy: userId,
                acceptedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
        return {
            success: true,
            role: invite.role
        };
        
    } catch (error) {
        console.error('Error accepting invite:', error);
        throw error;
    }
});
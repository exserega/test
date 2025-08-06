// Modern admin setup using Firebase Custom Claims

// Firebase из глобального объекта (v8)
const auth = window.firebase?.auth?.() || null;
const db = window.firebase?.firestore?.() || null;

/**
 * Modern Admin Setup Flow
 * 1. First user who signs up becomes admin
 * 2. Admins can invite other admins/moderators
 * 3. Roles stored in Firestore + Custom Claims
 */

// Check if this is the first user (no admins exist)
export async function checkFirstUserSetup() {
    try {
        const adminsQuery = await db.collection('users')
            .where('role', '==', 'admin')
            .limit(1)
            .get();
        
        return adminsQuery.empty;
    } catch (error) {
        console.error('Error checking first user:', error);
        return false;
    }
}

// Setup first admin automatically
export async function setupFirstAdmin(user) {
    if (!user) return false;
    
    try {
        const isFirstUser = await checkFirstUserSetup();
        
        if (isFirstUser) {
            // Create admin profile
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                name: user.displayName || 'Admin',
                role: 'admin',
                status: 'active',
                isFounder: true,
                permissions: ['*'], // All permissions
                createdAt: new Date(),
                createdBy: 'system'
            }, { merge: true });
            
            console.log('✅ First admin created successfully');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error setting up first admin:', error);
        return false;
    }
}

// Modern invite system
export async function inviteAdmin(email, role = 'moderator') {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    
    // Check if current user is admin
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.data()?.role !== 'admin') {
        throw new Error('Only admins can invite');
    }
    
    // Create invite
    const invite = await db.collection('invites').add({
        email,
        role,
        invitedBy: currentUser.uid,
        invitedAt: new Date(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // TODO: Send email with invite link
    console.log('Invite created:', invite.id);
    
    return invite.id;
}
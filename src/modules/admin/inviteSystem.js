// Admin Invite System
// Система приглашений администраторов

const db = firebase.firestore();
const auth = firebase.auth();

/**
 * Создать инвайт-код для нового администратора
 */
export async function createAdminInvite(options = {}) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Необходима авторизация');
    
    // Проверяем права текущего пользователя
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    
    if (userData.role !== 'admin') {
        throw new Error('Только администраторы могут создавать приглашения');
    }
    
    // Генерируем уникальный код
    const inviteCode = generateInviteCode();
    
    // Создаем запись в базе
    const inviteData = {
        code: inviteCode,
        type: 'admin',
        createdBy: currentUser.uid,
        createdByEmail: userData.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + (options.validDays || 7) * 24 * 60 * 60 * 1000),
        used: false,
        maxUses: options.maxUses || 1,
        currentUses: 0,
        branchId: options.branchId || userData.branchId,
        metadata: {
            role: options.role || 'admin',
            autoApprove: true,
            ...options.metadata
        }
    };
    
    await db.collection('invites').doc(inviteCode).set(inviteData);
    
    console.log('📨 Admin invite created:', inviteCode);
    
    return {
        code: inviteCode,
        link: `${window.location.origin}/public/login.html?invite=${inviteCode}`,
        expiresAt: inviteData.expiresAt
    };
}

/**
 * Генерировать уникальный код приглашения
 */
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Формат: XXXX-XXXX-XXXX
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
}

/**
 * Проверить и использовать инвайт-код
 */
export async function validateAndUseInvite(inviteCode) {
    try {
        const inviteDoc = await db.collection('invites').doc(inviteCode).get();
        
        if (!inviteDoc.exists) {
            throw new Error('Недействительный код приглашения');
        }
        
        const inviteData = inviteDoc.data();
        
        // Проверки
        if (inviteData.used && inviteData.currentUses >= inviteData.maxUses) {
            throw new Error('Код приглашения уже использован');
        }
        
        if (new Date() > inviteData.expiresAt.toDate()) {
            throw new Error('Срок действия кода истек');
        }
        
        return {
            valid: true,
            data: inviteData
        };
        
    } catch (error) {
        console.error('Error validating invite:', error);
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Применить инвайт-код к пользователю
 */
export async function applyInviteToUser(userId, inviteCode) {
    try {
        const inviteDoc = await db.collection('invites').doc(inviteCode).get();
        if (!inviteDoc.exists) throw new Error('Инвайт не найден');
        
        const inviteData = inviteDoc.data();
        const batch = db.batch();
        
        // Обновляем пользователя
        batch.update(db.collection('users').doc(userId), {
            role: inviteData.metadata.role || 'user',
            status: inviteData.metadata.autoApprove ? 'active' : 'pending',
            branchId: inviteData.branchId,
            invitedBy: inviteData.createdBy,
            inviteCode: inviteCode,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Обновляем инвайт
        batch.update(db.collection('invites').doc(inviteCode), {
            currentUses: firebase.firestore.FieldValue.increment(1),
            used: inviteData.currentUses + 1 >= inviteData.maxUses,
            lastUsedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUsedBy: userId
        });
        
        // Обновляем счетчик членов филиала
        if (inviteData.branchId) {
            batch.update(db.collection('branches').doc(inviteData.branchId), {
                memberCount: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        await batch.commit();
        
        console.log('✅ Invite applied successfully');
        return true;
        
    } catch (error) {
        console.error('Error applying invite:', error);
        throw error;
    }
}

/**
 * Получить список активных инвайтов
 */
export async function getActiveInvites() {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    
    try {
        const now = new Date();
        const snapshot = await db.collection('invites')
            .where('createdBy', '==', currentUser.uid)
            .where('expiresAt', '>', now)
            .orderBy('expiresAt', 'desc')
            .orderBy('createdAt', 'desc')
            .get();
        
        const invites = [];
        snapshot.forEach(doc => {
            invites.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return invites;
    } catch (error) {
        console.error('Error getting invites:', error);
        return [];
    }
}

/**
 * Отозвать инвайт
 */
export async function revokeInvite(inviteCode) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Необходима авторизация');
    
    try {
        const inviteDoc = await db.collection('invites').doc(inviteCode).get();
        if (!inviteDoc.exists) throw new Error('Инвайт не найден');
        
        const inviteData = inviteDoc.data();
        if (inviteData.createdBy !== currentUser.uid) {
            throw new Error('Вы можете отзывать только свои приглашения');
        }
        
        await db.collection('invites').doc(inviteCode).update({
            revoked: true,
            revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
            revokedBy: currentUser.uid
        });
        
        console.log('✅ Invite revoked:', inviteCode);
        return true;
        
    } catch (error) {
        console.error('Error revoking invite:', error);
        throw error;
    }
}

// Экспортируем для глобального доступа
window.inviteSystem = {
    createAdminInvite,
    validateAndUseInvite,
    applyInviteToUser,
    getActiveInvites,
    revokeInvite
};

export default {
    createAdminInvite,
    validateAndUseInvite,
    applyInviteToUser,
    getActiveInvites,
    revokeInvite
};
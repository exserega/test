// ====================================
// МОДУЛЬ УПРАВЛЕНИЯ ФИЛИАЛАМИ ПОЛЬЗОВАТЕЛЯ
// ====================================

import { db, auth } from '../../../js/firebase-config.js';
import { getCurrentUser } from '../auth/authCheck.js';

/**
 * Получить все филиалы пользователя
 * @returns {Object} { mainBranchId, additionalBranchIds }
 */
export async function getUserBranches() {
    const currentUser = getCurrentUser();
    if (!currentUser) return { mainBranchId: null, additionalBranchIds: [] };
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) return { mainBranchId: null, additionalBranchIds: [] };
        
        const userData = userDoc.data();
        return {
            mainBranchId: userData.branchId || null, // Основной филиал
            additionalBranchIds: userData.additionalBranchIds || [] // Дополнительные филиалы
        };
    } catch (error) {
        console.error('Error getting user branches:', error);
        return { mainBranchId: null, additionalBranchIds: [] };
    }
}

/**
 * Проверить, принадлежит ли пользователь к филиалу
 * @param {string} branchId - ID филиала
 * @returns {boolean}
 */
export async function isUserInBranch(branchId) {
    if (!branchId) return false;
    
    const { mainBranchId, additionalBranchIds } = await getUserBranches();
    
    // Проверяем основной филиал
    if (mainBranchId === branchId) return true;
    
    // Проверяем дополнительные филиалы
    return additionalBranchIds.includes(branchId);
}

/**
 * Создать запрос на смену основного филиала
 * @param {string} newBranchId - ID нового филиала
 * @param {string} reason - Причина смены
 */
export async function requestMainBranchChange(newBranchId, reason = '') {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
        // Создаем запрос
        await db.collection('branchRequests').add({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email,
            userEmail: currentUser.email,
            type: 'changeMain', // Тип запроса - смена основного филиала
            currentBranchId: currentUser.branchId,
            requestedBranchId: newBranchId,
            reason: reason,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Main branch change request created');
        return true;
    } catch (error) {
        console.error('Error creating branch change request:', error);
        throw error;
    }
}

/**
 * Создать запрос на присоединение к дополнительному филиалу
 * @param {string} branchId - ID филиала для присоединения
 * @param {string} reason - Причина присоединения
 */
export async function requestAdditionalBranch(branchId, reason = '') {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
        // Проверяем, не состоит ли уже пользователь в этом филиале
        const isAlreadyInBranch = await isUserInBranch(branchId);
        if (isAlreadyInBranch) {
            throw new Error('Вы уже состоите в этом филиале');
        }
        
        // Создаем запрос
        await db.collection('branchRequests').add({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email,
            userEmail: currentUser.email,
            type: 'addAdditional', // Тип запроса - добавление дополнительного филиала
            currentBranchId: currentUser.branchId,
            requestedBranchId: branchId,
            reason: reason,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Additional branch request created');
        return true;
    } catch (error) {
        console.error('Error creating additional branch request:', error);
        throw error;
    }
}

/**
 * Получить все запросы пользователя на филиалы
 */
export async function getUserBranchRequests() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    try {
        const snapshot = await db.collection('branchRequests')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
            
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });
        
        return requests;
    } catch (error) {
        console.error('Error getting user branch requests:', error);
        return [];
    }
}

/**
 * Отменить запрос на филиал
 * @param {string} requestId - ID запроса
 */
export async function cancelBranchRequest(requestId) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
        const requestRef = db.collection('branchRequests').doc(requestId);
        const requestDoc = await requestRef.get();
        
        if (!requestDoc.exists) {
            throw new Error('Request not found');
        }
        
        const requestData = requestDoc.data();
        if (requestData.userId !== currentUser.uid) {
            throw new Error('You can only cancel your own requests');
        }
        
        if (requestData.status !== 'pending') {
            throw new Error('Only pending requests can be cancelled');
        }
        
        await requestRef.update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Branch request cancelled');
        return true;
    } catch (error) {
        console.error('Error cancelling branch request:', error);
        throw error;
    }
}
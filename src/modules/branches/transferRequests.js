// Transfer Requests Module
// Управление заявками на перевод между филиалами

// Firebase уже инициализирован глобально в HTML
const db = firebase.firestore();

import { getCurrentUser } from '../auth/authCheck.js';

/**
 * Создать заявку на перевод в другой филиал
 */
export async function createTransferRequest(toBranchId, reason = '') {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('Необходима авторизация');
    }
    
    if (!user.branchId) {
        throw new Error('Вы не прикреплены к филиалу');
    }
    
    if (user.branchId === toBranchId) {
        throw new Error('Вы уже находитесь в этом филиале');
    }
    
    try {
        // Проверяем нет ли активной заявки
        const activeRequests = await db.collection('transferRequests')
            .where('userId', '==', user.id)
            .where('status', '==', 'pending')
            .get();
            
        if (!activeRequests.empty) {
            throw new Error('У вас уже есть активная заявка на перевод');
        }
        
        const request = {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            fromBranchId: user.branchId,
            toBranchId: toBranchId,
            reason: reason,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('transferRequests').add(request);
        console.log('📋 Transfer request created:', docRef.id);
        
        return {
            id: docRef.id,
            ...request
        };
    } catch (error) {
        console.error('Error creating transfer request:', error);
        throw error;
    }
}

/**
 * Получить заявки пользователя
 */
export async function getUserTransferRequests(userId = null) {
    const targetUserId = userId || getCurrentUser()?.id;
    if (!targetUserId) return [];
    
    try {
        const snapshot = await db.collection('transferRequests')
            .where('userId', '==', targetUserId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`📋 Found ${requests.length} transfer requests`);
        return requests;
    } catch (error) {
        console.error('Error getting user transfer requests:', error);
        return [];
    }
}

/**
 * Получить заявки для обработки (для админов)
 */
export async function getPendingTransferRequests() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Только администраторы могут просматривать заявки');
    }
    
    try {
        const snapshot = await db.collection('transferRequests')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .get();
        
        const requests = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Получаем информацию о филиалах
            const [fromBranch, toBranch] = await Promise.all([
                db.collection('branches').doc(data.fromBranchId).get(),
                db.collection('branches').doc(data.toBranchId).get()
            ]);
            
            requests.push({
                id: doc.id,
                ...data,
                fromBranchName: fromBranch.data()?.name || 'Неизвестный филиал',
                toBranchName: toBranch.data()?.name || 'Неизвестный филиал'
            });
        }
        
        console.log(`📋 Found ${requests.length} pending transfer requests`);
        return requests;
    } catch (error) {
        console.error('Error getting pending transfer requests:', error);
        return [];
    }
}

/**
 * Обработать заявку на перевод (только для админов)
 */
export async function processTransferRequest(requestId, approve, adminComment = '') {
    const admin = getCurrentUser();
    if (!admin || admin.role !== 'admin') {
        throw new Error('Только администраторы могут обрабатывать заявки');
    }
    
    try {
        // Получаем заявку
        const requestDoc = await db.collection('transferRequests').doc(requestId).get();
        if (!requestDoc.exists) {
            throw new Error('Заявка не найдена');
        }
        
        const request = requestDoc.data();
        if (request.status !== 'pending') {
            throw new Error('Заявка уже обработана');
        }
        
        const batch = db.batch();
        
        // Обновляем статус заявки
        batch.update(db.collection('transferRequests').doc(requestId), {
            status: approve ? 'approved' : 'rejected',
            processedAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedBy: admin.id,
            adminComment: adminComment
        });
        
        if (approve) {
            // Переводим пользователя
            batch.update(db.collection('users').doc(request.userId), {
                branchId: request.toBranchId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: admin.id
            });
            
            // Обновляем счетчики филиалов
            batch.update(db.collection('branches').doc(request.fromBranchId), {
                memberCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            batch.update(db.collection('branches').doc(request.toBranchId), {
                memberCount: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        await batch.commit();
        
        console.log(`📋 Transfer request ${requestId} ${approve ? 'approved' : 'rejected'}`);
        return true;
    } catch (error) {
        console.error('Error processing transfer request:', error);
        throw error;
    }
}

/**
 * Отменить заявку на перевод
 */
export async function cancelTransferRequest(requestId) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('Необходима авторизация');
    }
    
    try {
        const requestDoc = await db.collection('transferRequests').doc(requestId).get();
        if (!requestDoc.exists) {
            throw new Error('Заявка не найдена');
        }
        
        const request = requestDoc.data();
        if (request.userId !== user.id && user.role !== 'admin') {
            throw new Error('Вы не можете отменить эту заявку');
        }
        
        if (request.status !== 'pending') {
            throw new Error('Можно отменить только активные заявки');
        }
        
        await db.collection('transferRequests').doc(requestId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
            cancelledBy: user.id
        });
        
        console.log(`📋 Transfer request ${requestId} cancelled`);
        return true;
    } catch (error) {
        console.error('Error cancelling transfer request:', error);
        throw error;
    }
}

// Экспортируем для глобального доступа
window.transferRequests = {
    createTransferRequest,
    getUserTransferRequests,
    getPendingTransferRequests,
    processTransferRequest,
    cancelTransferRequest
};

console.log('📋 Transfer Requests module loaded');
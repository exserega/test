// Branch Manager Module
// Управление филиалами церкви

// Firebase уже инициализирован глобально в HTML
const db = firebase.firestore();

import { getCurrentUser } from '../auth/authCheck.js';

// Кэш филиалов
let branchesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

/**
 * Получить все филиалы
 */
export async function getAllBranches(forceRefresh = false) {
    const now = Date.now();
    
    // Используем кэш если он свежий
    if (!forceRefresh && branchesCache && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('📍 Using cached branches');
        return branchesCache;
    }
    
    try {
        console.log('📍 Loading branches from Firestore...');
        const snapshot = await db.collection('branches').get();
        
        const branches = [];
        snapshot.forEach(doc => {
            branches.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Обновляем кэш
        branchesCache = branches;
        cacheTimestamp = now;
        
        console.log(`📍 Loaded ${branches.length} branches`);
        return branches;
    } catch (error) {
        console.error('Error loading branches:', error);
        return [];
    }
}

/**
 * Получить филиал по ID
 */
export async function getBranchById(branchId) {
    if (!branchId) return null;
    
    try {
        const doc = await db.collection('branches').doc(branchId).get();
        if (doc.exists) {
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting branch:', error);
        return null;
    }
}

/**
 * Создать новый филиал (только для админов)
 */
export async function createBranch(branchData) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Только администраторы могут создавать филиалы');
    }
    
    try {
        const newBranch = {
            name: branchData.name,
            location: branchData.location || '',
            createdBy: user.id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            memberCount: 0
        };
        
        const docRef = await db.collection('branches').add(newBranch);
        console.log('📍 Branch created:', docRef.id);
        
        // Очищаем кэш
        branchesCache = null;
        
        return {
            id: docRef.id,
            ...newBranch
        };
    } catch (error) {
        console.error('Error creating branch:', error);
        throw error;
    }
}

/**
 * Обновить информацию о филиале (только для админов)
 */
export async function updateBranch(branchId, updates) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Только администраторы могут обновлять филиалы');
    }
    
    try {
        await db.collection('branches').doc(branchId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('📍 Branch updated:', branchId);
        
        // Очищаем кэш
        branchesCache = null;
        
        return true;
    } catch (error) {
        console.error('Error updating branch:', error);
        throw error;
    }
}

/**
 * Получить пользователей филиала
 */
export async function getBranchMembers(branchId) {
    if (!branchId) return [];
    
    try {
        const snapshot = await db.collection('users')
            .where('branchId', '==', branchId)
            .where('status', '==', 'active')
            .get();
        
        const members = [];
        snapshot.forEach(doc => {
            members.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`📍 Found ${members.length} members in branch ${branchId}`);
        return members;
    } catch (error) {
        console.error('Error getting branch members:', error);
        return [];
    }
}

/**
 * Назначить пользователя в филиал (только для админов)
 */
export async function assignUserToBranch(userId, branchId) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Только администраторы могут назначать пользователей в филиалы');
    }
    
    try {
        // Обновляем пользователя
        await db.collection('users').doc(userId).update({
            branchId: branchId,
            status: 'active',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.id
        });
        
        // Обновляем счетчик участников филиала
        await db.collection('branches').doc(branchId).update({
            memberCount: firebase.firestore.FieldValue.increment(1)
        });
        
        console.log(`📍 User ${userId} assigned to branch ${branchId}`);
        return true;
    } catch (error) {
        console.error('Error assigning user to branch:', error);
        throw error;
    }
}

/**
 * Удалить пользователя из филиала
 */
export async function removeUserFromBranch(userId) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Только администраторы могут удалять пользователей из филиалов');
    }
    
    try {
        // Получаем текущий филиал пользователя
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const oldBranchId = userData?.branchId;
        
        // Обновляем пользователя
        await db.collection('users').doc(userId).update({
            branchId: null,
            status: 'pending',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.id
        });
        
        // Уменьшаем счетчик участников старого филиала
        if (oldBranchId) {
            await db.collection('branches').doc(oldBranchId).update({
                memberCount: firebase.firestore.FieldValue.increment(-1)
            });
        }
        
        console.log(`📍 User ${userId} removed from branch`);
        return true;
    } catch (error) {
        console.error('Error removing user from branch:', error);
        throw error;
    }
}

// Экспортируем для глобального доступа
window.branchManager = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    getBranchMembers,
    assignUserToBranch,
    removeUserFromBranch
};

console.log('📍 Branch Manager module loaded');
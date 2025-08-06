/**
 * Root Admin Manager Module
 * Модуль управления главным администратором
 * 
 * Обеспечивает:
 * - Проверку прав главного администратора
 * - Защиту от удаления последнего админа
 * - Передачу прав главного админа
 */

const db = firebase.firestore();
const auth = firebase.auth();

/**
 * Проверить, является ли пользователь главным администратором
 * @param {string} userId - ID пользователя
 */
export async function isRootAdmin(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;
        
        const userData = userDoc.data();
        
        // Главный админ - это первый админ (isFounder) или с флагом isRootAdmin
        return userData.isFounder === true || userData.isRootAdmin === true;
        
    } catch (error) {
        console.error('Error checking root admin:', error);
        return false;
    }
}

/**
 * Получить главного администратора системы
 */
export async function getRootAdmin() {
    try {
        // Сначала ищем основателя
        let snapshot = await db.collection('users')
            .where('isFounder', '==', true)
            .limit(1)
            .get();
            
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        
        // Если нет основателя, ищем назначенного root админа
        snapshot = await db.collection('users')
            .where('isRootAdmin', '==', true)
            .limit(1)
            .get();
            
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        
        // Если нет ни того ни другого, берем первого админа
        snapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();
            
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            // Автоматически назначаем его root админом
            await doc.ref.update({ isRootAdmin: true });
            
            return {
                id: doc.id,
                ...doc.data(),
                isRootAdmin: true
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('Error getting root admin:', error);
        return null;
    }
}

/**
 * Передать права главного администратора
 * @param {string} fromUserId - ID текущего главного админа
 * @param {string} toUserId - ID нового главного админа
 */
export async function transferRootAdminRights(fromUserId, toUserId) {
    try {
        // Проверяем, что текущий пользователь - главный админ
        const isCurrentUserRoot = await isRootAdmin(fromUserId);
        if (!isCurrentUserRoot) {
            throw new Error('Только главный администратор может передавать свои права');
        }
        
        // Проверяем, что новый пользователь - админ
        const newAdminDoc = await db.collection('users').doc(toUserId).get();
        if (!newAdminDoc.exists) {
            throw new Error('Пользователь не найден');
        }
        
        const newAdminData = newAdminDoc.data();
        if (newAdminData.role !== 'admin') {
            throw new Error('Права главного администратора можно передать только администратору');
        }
        
        const batch = db.batch();
        
        // Убираем права у текущего главного админа
        batch.update(db.collection('users').doc(fromUserId), {
            isRootAdmin: false,
            // isFounder остается, если есть
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Даем права новому главному админу
        batch.update(db.collection('users').doc(toUserId), {
            isRootAdmin: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        
        console.log('✅ Root admin rights transferred successfully');
        return true;
        
    } catch (error) {
        console.error('Error transferring root admin rights:', error);
        throw error;
    }
}

/**
 * Проверить, можно ли изменить роль пользователя
 * @param {string} targetUserId - ID пользователя, чью роль хотят изменить
 * @param {string} requestorId - ID пользователя, который хочет изменить роль
 */
export async function canChangeUserRole(targetUserId, requestorId) {
    try {
        // Нельзя изменить свою роль
        if (targetUserId === requestorId) {
            return {
                allowed: false,
                reason: 'Вы не можете изменить свою собственную роль'
            };
        }
        
        // Проверяем, является ли цель главным админом
        const isTargetRoot = await isRootAdmin(targetUserId);
        if (isTargetRoot) {
            // Только главный админ может изменить роль другого главного админа
            const isRequestorRoot = await isRootAdmin(requestorId);
            if (!isRequestorRoot) {
                return {
                    allowed: false,
                    reason: 'Только главный администратор может изменить роль главного администратора'
                };
            }
        }
        
        // Проверяем, не останется ли система без админов
        if (await willLeaveNoAdmins(targetUserId)) {
            return {
                allowed: false,
                reason: 'Нельзя удалить последнего администратора системы'
            };
        }
        
        return {
            allowed: true,
            reason: null
        };
        
    } catch (error) {
        console.error('Error checking role change permission:', error);
        return {
            allowed: false,
            reason: 'Ошибка проверки прав'
        };
    }
}

/**
 * Проверить, останется ли система без администраторов
 * @param {string} userId - ID пользователя, которого хотят понизить
 */
async function willLeaveNoAdmins(userId) {
    try {
        // Получаем данные пользователя
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;
        
        const userData = userDoc.data();
        
        // Если это не админ, то все ок
        if (userData.role !== 'admin') return false;
        
        // Считаем количество активных админов
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .where('status', '==', 'active')
            .get();
            
        // Если это последний админ - нельзя понижать
        return adminsSnapshot.size <= 1;
        
    } catch (error) {
        console.error('Error checking admin count:', error);
        return true; // В случае ошибки - запрещаем
    }
}

/**
 * Получить статистику по администраторам
 */
export async function getAdminStats() {
    try {
        const stats = {
            totalAdmins: 0,
            activeAdmins: 0,
            rootAdmin: null,
            lastAdminActivity: null
        };
        
        // Получаем всех админов
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .get();
            
        stats.totalAdmins = adminsSnapshot.size;
        
        // Считаем активных и находим главного
        adminsSnapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.status === 'active') {
                stats.activeAdmins++;
            }
            
            if (data.isFounder || data.isRootAdmin) {
                stats.rootAdmin = {
                    id: doc.id,
                    name: data.name,
                    email: data.email
                };
            }
        });
        
        return stats;
        
    } catch (error) {
        console.error('Error getting admin stats:', error);
        return null;
    }
}

// Экспортируем для глобального доступа
window.rootAdminManager = {
    isRootAdmin,
    getRootAdmin,
    transferRootAdminRights,
    canChangeUserRole,
    getAdminStats
};

export default {
    isRootAdmin,
    getRootAdmin,
    transferRootAdminRights,
    canChangeUserRole,
    getAdminStats
};
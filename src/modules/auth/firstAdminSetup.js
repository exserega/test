// First Admin Setup Module
// Безопасная настройка первого администратора

const db = firebase.firestore();
const auth = firebase.auth();

/**
 * Проверить, есть ли уже администраторы в системе
 */
export async function hasAdmins() {
    try {
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .where('status', '==', 'active')  // Проверяем только активных админов
            .limit(1)
            .get();
            
        return !adminsSnapshot.empty;
    } catch (error) {
        console.error('Error checking admins:', error);
        return false;
    }
}

/**
 * Проверить, является ли текущий пользователь первым зарегистрированным
 */
export async function isFirstUser(userId) {
    try {
        // Получаем всех пользователей, отсортированных по дате создания
        const usersSnapshot = await db.collection('users')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();
            
        if (usersSnapshot.empty) return false;
        
        const firstUser = usersSnapshot.docs[0];
        return firstUser.id === userId;
    } catch (error) {
        console.error('Error checking first user:', error);
        return false;
    }
}

/**
 * Настроить первого администратора
 */
export async function setupFirstAdmin(userId) {
    try {
        // Проверяем, есть ли уже админы
        const adminsExist = await hasAdmins();
        if (adminsExist) {
            throw new Error('Администраторы уже существуют в системе');
        }
        
        // Проверяем, является ли пользователь первым
        const isFirst = await isFirstUser(userId);
        if (!isFirst) {
            throw new Error('Только первый зарегистрированный пользователь может стать администратором');
        }
        
        // Создаем первый филиал
        const branchData = {
            name: 'Основной филиал',
            location: 'Главный офис',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: userId,
            memberCount: 1,
            isDefault: true
        };
        
        const branchRef = await db.collection('branches').add(branchData);
        console.log('📍 First branch created:', branchRef.id);
        
        // Обновляем пользователя
        await db.collection('users').doc(userId).update({
            role: 'admin',
            status: 'active',
            branchId: branchRef.id,
            isFounder: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ First admin setup completed');
        return {
            success: true,
            branchId: branchRef.id
        };
        
    } catch (error) {
        console.error('Error setting up first admin:', error);
        throw error;
    }
}

/**
 * Проверить и предложить стать администратором
 */
export async function checkAndOfferAdminSetup() {
    const user = auth.currentUser;
    if (!user) return { shouldOffer: false };
    
    try {
        // Проверяем, есть ли уже админы
        const adminsExist = await hasAdmins();
        if (adminsExist) {
            return { shouldOffer: false };
        }
        
        // Проверяем, является ли пользователь первым
        const isFirst = await isFirstUser(user.uid);
        if (!isFirst) {
            return { shouldOffer: false };
        }
        
        return {
            shouldOffer: true,
            userId: user.uid,
            userEmail: user.email
        };
        
    } catch (error) {
        console.error('Error checking admin setup offer:', error);
        return { shouldOffer: false };
    }
}

export default {
    hasAdmins,
    isFirstUser,
    setupFirstAdmin,
    checkAndOfferAdminSetup
};
/**
 * Initial Branch Setup Module
 * Модуль начальной настройки филиалов
 * 
 * Автоматически создает первый филиал, если филиалов еще нет
 */

const db = firebase.firestore();
const auth = firebase.auth();

/**
 * Проверить и создать начальный филиал
 */
export async function checkAndCreateInitialBranch() {
    try {
        // Проверяем, есть ли филиалы
        const branchesSnapshot = await db.collection('branches').limit(1).get();
        
        if (branchesSnapshot.empty) {
            console.log('🏢 No branches found, creating initial branch...');
            
            // Создаем первый филиал
            const initialBranch = {
                name: 'Главный филиал',
                location: 'Основное местоположение',
                memberCount: 0,
                setlistCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'system'
            };
            
            const docRef = await db.collection('branches').add(initialBranch);
            
            console.log('✅ Initial branch created:', docRef.id);
            
            return {
                id: docRef.id,
                ...initialBranch,
                createdAt: new Date()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Error checking/creating initial branch:', error);
        // Не прерываем работу приложения
        return null;
    }
}

/**
 * Проверить и назначить пользователей в филиал по умолчанию
 */
export async function assignUsersToDefaultBranch() {
    try {
        // Получаем первый филиал
        const branchesSnapshot = await db.collection('branches')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();
            
        if (branchesSnapshot.empty) return;
        
        const defaultBranchId = branchesSnapshot.docs[0].id;
        
        // Находим пользователей без филиала
        const usersWithoutBranch = await db.collection('users')
            .where('branchId', '==', null)
            .get();
            
        if (usersWithoutBranch.empty) return;
        
        console.log(`🏢 Found ${usersWithoutBranch.size} users without branch`);
        
        // Назначаем их в филиал по умолчанию
        const batch = db.batch();
        let count = 0;
        
        usersWithoutBranch.forEach(doc => {
            batch.update(doc.ref, {
                branchId: defaultBranchId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            count++;
        });
        
        // Обновляем счетчик участников
        batch.update(db.collection('branches').doc(defaultBranchId), {
            memberCount: firebase.firestore.FieldValue.increment(count)
        });
        
        await batch.commit();
        
        console.log(`✅ Assigned ${count} users to default branch`);
        
    } catch (error) {
        console.error('❌ Error assigning users to default branch:', error);
    }
}

// Экспортируем функции
export default {
    checkAndCreateInitialBranch,
    assignUsersToDefaultBranch
};
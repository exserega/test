// Admin Setup Script
// Скрипт для первоначальной настройки администратора

const auth = firebase.auth();
const db = firebase.firestore();

// Функция для назначения пользователя администратором
export async function makeUserAdmin(userEmail) {
    try {
        console.log('🔐 Making user admin:', userEmail);
        
        // Находим пользователя по email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', userEmail)
            .limit(1)
            .get();
            
        if (usersSnapshot.empty) {
            console.error('User not found with email:', userEmail);
            return false;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        
        // Обновляем роль пользователя
        await db.collection('users').doc(userId).update({
            role: 'admin',
            status: 'active',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ User is now admin:', userId);
        return true;
        
    } catch (error) {
        console.error('Error making user admin:', error);
        return false;
    }
}

// Функция для создания первого филиала
export async function createFirstBranch() {
    try {
        console.log('📍 Creating first branch...');
        
        // Проверяем есть ли уже филиалы
        const branchesSnapshot = await db.collection('branches').limit(1).get();
        
        if (!branchesSnapshot.empty) {
            console.log('Branch already exists');
            return branchesSnapshot.docs[0].id;
        }
        
        // Создаем первый филиал
        const branchData = {
            name: 'Основной филиал',
            location: 'Москва',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            memberCount: 0
        };
        
        const docRef = await db.collection('branches').add(branchData);
        console.log('✅ First branch created:', docRef.id);
        
        return docRef.id;
        
    } catch (error) {
        console.error('Error creating first branch:', error);
        return null;
    }
}

// Функция для привязки пользователя к филиалу
export async function assignUserToBranch(userEmail, branchId) {
    try {
        console.log('📍 Assigning user to branch...');
        
        // Находим пользователя
        const usersSnapshot = await db.collection('users')
            .where('email', '==', userEmail)
            .limit(1)
            .get();
            
        if (usersSnapshot.empty) {
            console.error('User not found');
            return false;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        
        // Обновляем пользователя
        await db.collection('users').doc(userId).update({
            branchId: branchId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Увеличиваем счетчик участников филиала
        await db.collection('branches').doc(branchId).update({
            memberCount: firebase.firestore.FieldValue.increment(1)
        });
        
        console.log('✅ User assigned to branch');
        return true;
        
    } catch (error) {
        console.error('Error assigning user to branch:', error);
        return false;
    }
}

// Экспортируем функции глобально для вызова из консоли
window.adminSetup = {
    makeUserAdmin,
    createFirstBranch,
    assignUserToBranch,
    
    // Быстрая настройка всего
    async setupAll(userEmail) {
        console.log('🚀 Starting admin setup for:', userEmail);
        
        // 1. Делаем пользователя админом
        const adminSuccess = await makeUserAdmin(userEmail);
        if (!adminSuccess) {
            console.error('Failed to make user admin');
            return;
        }
        
        // 2. Создаем первый филиал
        const branchId = await createFirstBranch();
        if (!branchId) {
            console.error('Failed to create branch');
            return;
        }
        
        // 3. Привязываем админа к филиалу
        const assignSuccess = await assignUserToBranch(userEmail, branchId);
        if (!assignSuccess) {
            console.error('Failed to assign user to branch');
            return;
        }
        
        console.log('✅ Admin setup completed successfully!');
        console.log('📍 Branch ID:', branchId);
        console.log('🔐 Admin email:', userEmail);
        console.log('👉 Now you can access /public/admin.html');
    }
};

console.log('🛠️ Admin setup module loaded');
console.log('To make yourself admin, run in console:');
console.log('adminSetup.setupAll("your-email@example.com")');
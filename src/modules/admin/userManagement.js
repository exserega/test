/**
 * User Management Module for Admin Panel
 * Модуль управления пользователями для администраторов
 * 
 * Функции:
 * - Загрузка и отображение пользователей
 * - Фильтрация по филиалам, ролям, статусам
 * - Поиск по email/имени
 * - Изменение ролей и статусов
 * - Назначение в филиалы
 */

const db = firebase.firestore();
const auth = firebase.auth();

// Состояние модуля
const state = {
    users: [],
    filteredUsers: [],
    filters: {
        branch: '',
        role: '',
        status: '',
        search: ''
    },
    sortBy: 'createdAt',
    sortOrder: 'desc'
};

/**
 * Инициализация модуля управления пользователями
 */
export async function initUserManagement() {
    console.log('👥 Initializing user management module...');
    
    // Загружаем пользователей
    await loadAllUsers();
    
    // Настраиваем обработчики
    setupUserFilters();
    setupUserSearch();
    
    return state.users;
}

/**
 * Загрузить всех пользователей из Firestore
 */
async function loadAllUsers() {
    try {
        console.log('📊 Loading all users...');
        
        const snapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .get();
        
        state.users = [];
        snapshot.forEach(doc => {
            state.users.push({
                id: doc.id,
                ...doc.data(),
                // Преобразуем timestamp в дату
                createdAt: doc.data().createdAt?.toDate() || new Date()
            });
        });
        
        console.log(`✅ Loaded ${state.users.length} users`);
        
        // Применяем фильтры
        applyFilters();
        
        return state.users;
    } catch (error) {
        console.error('❌ Error loading users:', error);
        throw error;
    }
}

/**
 * Применить все активные фильтры
 */
function applyFilters() {
    state.filteredUsers = [...state.users];
    
    // Фильтр по филиалу
    if (state.filters.branch) {
        state.filteredUsers = state.filteredUsers.filter(user => 
            user.branchId === state.filters.branch
        );
    }
    
    // Фильтр по роли
    if (state.filters.role) {
        state.filteredUsers = state.filteredUsers.filter(user => 
            user.role === state.filters.role
        );
    }
    
    // Фильтр по статусу
    if (state.filters.status) {
        state.filteredUsers = state.filteredUsers.filter(user => 
            user.status === state.filters.status
        );
    }
    
    // Поиск по email/имени
    if (state.filters.search) {
        const searchLower = state.filters.search.toLowerCase();
        state.filteredUsers = state.filteredUsers.filter(user => 
            user.email?.toLowerCase().includes(searchLower) ||
            user.name?.toLowerCase().includes(searchLower) ||
            user.phone?.includes(searchLower)
        );
    }
    
    // Сортировка
    sortUsers();
    
    console.log(`🔍 Filtered to ${state.filteredUsers.length} users`);
}

/**
 * Сортировать пользователей
 */
function sortUsers() {
    state.filteredUsers.sort((a, b) => {
        let aVal = a[state.sortBy];
        let bVal = b[state.sortBy];
        
        // Обработка дат
        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();
        
        // Обработка строк
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        // Сравнение
        if (state.sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

/**
 * Настроить фильтры пользователей
 */
function setupUserFilters() {
    // Обработчики изменения фильтров будут подключены из главного модуля
    console.log('🔍 User filters ready');
}

/**
 * Настроить поиск пользователей
 */
function setupUserSearch() {
    // Обработчик поиска будет подключен из главного модуля
    console.log('🔎 User search ready');
}

/**
 * Обновить фильтр
 * @param {string} filterType - Тип фильтра (branch, role, status, search)
 * @param {string} value - Значение фильтра
 */
export function updateFilter(filterType, value) {
    state.filters[filterType] = value;
    applyFilters();
    return state.filteredUsers;
}

/**
 * Обновить сортировку
 * @param {string} field - Поле для сортировки
 * @param {string} order - Порядок (asc/desc)
 */
export function updateSort(field, order = 'asc') {
    state.sortBy = field;
    state.sortOrder = order;
    applyFilters();
    return state.filteredUsers;
}

/**
 * Получить отфильтрованных пользователей
 */
export function getFilteredUsers() {
    return state.filteredUsers;
}

/**
 * Получить статистику по пользователям
 */
export function getUserStats() {
    const stats = {
        total: state.users.length,
        active: state.users.filter(u => u.status === 'active').length,
        pending: state.users.filter(u => u.status === 'pending').length,
        banned: state.users.filter(u => u.status === 'banned' || u.status === 'blocked').length,
        admins: state.users.filter(u => u.role === 'admin').length,
        users: state.users.filter(u => u.role === 'user').length,
        byBranch: {}
    };
    
    // Статистика по филиалам
    state.users.forEach(user => {
        const branchId = user.branchId || 'unassigned';
        stats.byBranch[branchId] = (stats.byBranch[branchId] || 0) + 1;
    });
    
    return stats;
}

/**
 * Изменить роль пользователя
 * @param {string} userId - ID пользователя
 * @param {string} newRole - Новая роль (user/admin)
 */
export async function changeUserRole(userId, newRole) {
    try {
        console.log(`🔄 Changing role for user ${userId} to ${newRole}`);
        
        // Импортируем проверку прав из rootAdminManager
        const { canChangeUserRole } = await import('./rootAdminManager.js');
        
        // Проверяем права на изменение роли
        const permission = await canChangeUserRole(userId, auth.currentUser?.uid);
        if (!permission.allowed) {
            throw new Error(permission.reason);
        }
        
        // Обновляем в Firestore
        await db.collection('users').doc(userId).update({
            role: newRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid
        });
        
        // Обновляем локально
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            state.users[userIndex].role = newRole;
            applyFilters();
        }
        
        console.log(`✅ Role changed successfully`);
        return true;
        
    } catch (error) {
        console.error('❌ Error changing user role:', error);
        throw error;
    }
}

/**
 * Изменить статус пользователя
 * @param {string} userId - ID пользователя
 * @param {string} newStatus - Новый статус (pending/active/banned)
 */
export async function changeUserStatus(userId, newStatus) {
    try {
        console.log(`🔄 Changing status for user ${userId} to ${newStatus}`);
        
        // Обновляем в Firestore
        await db.collection('users').doc(userId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid
        });
        
        // Обновляем локально
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            state.users[userIndex].status = newStatus;
            applyFilters();
        }
        
        console.log(`✅ Status changed successfully`);
        return true;
        
    } catch (error) {
        console.error('❌ Error changing user status:', error);
        throw error;
    }
}

/**
 * Назначить пользователя в филиал
 * @param {string} userId - ID пользователя
 * @param {string} branchId - ID филиала
 */
export async function assignUserToBranch(userId, branchId) {
    try {
        console.log(`🏢 Assigning user ${userId} to branch ${branchId}`);
        
        const batch = db.batch();
        
        // Получаем старый филиал пользователя
        const userIndex = state.users.findIndex(u => u.id === userId);
        const oldBranchId = userIndex !== -1 ? state.users[userIndex].branchId : null;
        
        // Обновляем пользователя
        batch.update(db.collection('users').doc(userId), {
            branchId: branchId || null,
            status: 'active', // Автоматически активируем при назначении
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid
        });
        
        // Обновляем счетчики филиалов (проверяем существование)
        if (oldBranchId) {
            const oldBranchRef = db.collection('branches').doc(oldBranchId);
            const oldBranchDoc = await oldBranchRef.get();
            if (oldBranchDoc.exists) {
                batch.update(oldBranchRef, {
                    memberCount: firebase.firestore.FieldValue.increment(-1)
                });
            }
        }
        
        if (branchId) {
            const newBranchRef = db.collection('branches').doc(branchId);
            const newBranchDoc = await newBranchRef.get();
            if (newBranchDoc.exists) {
                batch.update(newBranchRef, {
                    memberCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        }
        
        await batch.commit();
        
        // Обновляем локально
        if (userIndex !== -1) {
            state.users[userIndex].branchId = branchId || null;
            state.users[userIndex].status = 'active';
            applyFilters();
        }
        
        console.log(`✅ User assigned to branch successfully`);
        return true;
        
    } catch (error) {
        console.error('❌ Error assigning user to branch:', error);
        throw error;
    }
}

/**
 * Массовое обновление пользователей
 * @param {Array<string>} userIds - Массив ID пользователей
 * @param {Object} updates - Обновления для применения
 */
export async function bulkUpdateUsers(userIds, updates) {
    try {
        console.log(`🔄 Bulk updating ${userIds.length} users...`);
        
        const batch = db.batch();
        
        userIds.forEach(userId => {
            batch.update(db.collection('users').doc(userId), {
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser.uid
            });
        });
        
        await batch.commit();
        
        // Перезагружаем пользователей
        await loadAllUsers();
        
        console.log(`✅ Bulk update completed`);
        return true;
        
    } catch (error) {
        console.error('❌ Error in bulk update:', error);
        throw error;
    }
}

/**
 * Экспортировать пользователей в CSV
 */
export function exportUsersToCSV() {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Branch', 'Created'];
    const rows = state.filteredUsers.map(user => [
        user.id,
        user.name || '',
        user.email || '',
        user.phone || '',
        user.role,
        user.status,
        user.branchId || 'Unassigned',
        user.createdAt.toLocaleDateString()
    ]);
    
    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    // Создаем и скачиваем файл
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`📥 Exported ${rows.length} users to CSV`);
}

// Экспортируем для глобального доступа
window.userManagement = {
    initUserManagement,
    updateFilter,
    updateSort,
    getFilteredUsers,
    getUserStats,
    changeUserRole,
    changeUserStatus,
    assignUserToBranch,
    bulkUpdateUsers,
    exportUsersToCSV,
    loadAllUsers
};
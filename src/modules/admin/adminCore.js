/**
 * Admin Core Module
 * Основная логика админ панели
 * 
 * Этот модуль управляет:
 * - Состоянием админ панели
 * - Навигацией между табами
 * - Базовой инициализацией
 */

// ====================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ====================================

window.adminState = {
    currentUser: null,
    isRootAdmin: false,
    currentTab: 'users',
    users: [],
    branches: [],

    filters: {
        role: '',
        status: '',
        branch: '',
        search: ''
    }
};

// ====================================
// ИНИЦИАЛИЗАЦИЯ
// ====================================

/**
 * Инициализация админ панели
 * @param {Object} user - Текущий пользователь
 * @param {boolean} isRootAdmin - Является ли основателем
 */
export async function initAdminPanel(user, isRootAdmin) {
    console.log('🚀 Initializing admin panel...');
    
    // Сохраняем данные пользователя
    window.adminState.currentUser = user;
    window.adminState.isRootAdmin = isRootAdmin;
    
    // Обновляем UI с информацией пользователя
    updateAdminInfo();
    
    // Настраиваем обработчики событий
    setupEventHandlers();
    
    // Загружаем начальные данные
    await loadInitialData();
    
    // Показываем первый таб
    showTab('users');
}

// ====================================
// UI ОБНОВЛЕНИЯ
// ====================================

/**
 * Обновляет информацию об администраторе в шапке
 */
function updateAdminInfo() {
    const nameEl = document.getElementById('admin-name');
    const roleEl = document.getElementById('admin-role');
    
    if (nameEl) {
        nameEl.textContent = window.adminState.currentUser.name || 
                            window.adminState.currentUser.email;
    }
    
    if (roleEl) {
        roleEl.textContent = window.adminState.isRootAdmin ? 'Основатель' : 'Администратор';
        roleEl.className = 'badge ' + (window.adminState.isRootAdmin ? 'badge-danger' : 'badge-warning');
    }
}

// ====================================
// ЗАГРУЗКА ДАННЫХ
// ====================================

/**
 * Загружает начальные данные
 */
async function loadInitialData() {
    try {
        // Показываем индикаторы загрузки
        showLoadingState('users');
        showLoadingState('branches');
        showLoadingState('requests');
        showLoadingState('branch-requests');
        
        // Загружаем данные параллельно
        const [users, branches, branchRequests] = await Promise.all([
            loadUsers(),
            loadBranches(), 
            loadBranchRequests()
        ]);
        
        // Сохраняем в состояние
        window.adminState.users = users;
        window.adminState.branches = branches;
        window.adminState.branchRequests = branchRequests;
        
        // Фильтруем пользователей со статусом pending для заявок
        window.adminState.requests = users.filter(user => user.status === 'pending');
        
        // Обновляем UI
        updateBranchFilter();
        
        // Отображаем данные
        const { displayUsers } = await import('./usersModule.js');
        const { displayBranches } = await import('./branchesModule.js');

        const { displayRequests } = await import('./requestsModule.js');
        const { displayBranchRequests } = await import('./branchRequestsModule.js');
        
        displayUsers();
        displayBranches();
        displayRequests();
        displayBranchRequests();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('Ошибка загрузки данных');
    }
}

/**
 * Загружает пользователей из Firestore
 */
async function loadUsers() {
    const db = firebase.firestore();
    const { currentUser, isRootAdmin } = window.adminState;
    
    let query = db.collection('users');
    
    // Если это администратор филиала (не главный админ), показываем только пользователей его филиала
    if (!isRootAdmin && currentUser.branchId) {
        query = query.where('branchId', '==', currentUser.branchId);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Загружает филиалы из Firestore
 */
async function loadBranches() {
    const db = firebase.firestore();
    const { currentUser, isRootAdmin } = window.adminState;
    
    let query = db.collection('branches');
    
    // Если это администратор филиала, показываем только его филиал
    if (!isRootAdmin && currentUser.branchId) {
        const snapshot = await query.doc(currentUser.branchId).get();
        if (snapshot.exists) {
            return [{ id: snapshot.id, ...snapshot.data() }];
        }
        return [];
    }
    
    // Главный админ видит все филиалы
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Загружает заявки на перевод
 */
/**
 * Загрузка заявок на филиалы
 */
async function loadBranchRequests() {
    const db = firebase.firestore();
    try {
        const snapshot = await db.collection('branchRequests')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading branch requests:', error);
        return [];
    }
}

// ====================================
// НАВИГАЦИЯ ПО ТАБАМ
// ====================================

/**
 * Показывает указанный таб
 * @param {string} tabName - Название таба
 */
export function showTab(tabName) {
    window.adminState.currentTab = tabName;
    
    // Обновляем активный таб
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Показываем соответствующий контент
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// ====================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ====================================

/**
 * Настраивает обработчики событий
 */
function setupEventHandlers() {
    // Табы
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            showTab(tab);
        });
    });
    
    // Фильтры для пользователей
    const roleFilter = document.getElementById('role-filter');
    const statusFilter = document.getElementById('status-filter');
    const branchFilter = document.getElementById('branch-filter');
    const userSearch = document.getElementById('user-search');
    
    if (roleFilter) {
        roleFilter.addEventListener('change', async () => {
            window.adminState.filters.role = roleFilter.value;
            const { displayUsers } = await import('./usersModule.js');
            displayUsers();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', async () => {
            window.adminState.filters.status = statusFilter.value;
            const { displayUsers } = await import('./usersModule.js');
            displayUsers();
        });
    }
    
    if (branchFilter) {
        branchFilter.addEventListener('change', async () => {
            window.adminState.filters.branch = branchFilter.value;
            const { displayUsers } = await import('./usersModule.js');
            displayUsers();
        });
    }
    
    if (userSearch) {
        userSearch.addEventListener('input', async () => {
            window.adminState.filters.search = userSearch.value;
            const { displayUsers } = await import('./usersModule.js');
            displayUsers();
        });
    }
}

// ====================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================================

/**
 * Обновляет фильтр филиалов
 */
function updateBranchFilter() {
    const select = document.getElementById('branch-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">Все филиалы</option>' +
        window.adminState.branches.map(b => 
            `<option value="${b.id}">${b.name}</option>`
        ).join('');
}

/**
 * Показывает состояние загрузки
 * @param {string} section - Секция (users, branches, requests, branch-requests)
 */
function showLoadingState(section) {
    const container = document.getElementById(`${section}-list`);
    if (container) {
        container.innerHTML = '<div class="loading">Загрузка...</div>';
    }
}

/**
 * Показывает сообщение об ошибке
 * @param {string} message - Текст ошибки
 */
function showError(message) {
    console.error(message);
    // TODO: Показать красивое уведомление
}
/**
 * Admin Panel Controller
 * Главный контроллер админ-панели
 * 
 * Координирует работу всех модулей админ-панели:
 * - Управление пользователями
 * - Управление филиалами
 * - Управление заявками
 */

// Firebase - инициализируем сразу как в settings.js
console.log('🔥 AdminController module loading, firebase available:', typeof firebase !== 'undefined');
const auth = firebase.auth();
const db = firebase.firestore();
console.log('🔥 Firebase services initialized in adminController');

// Импорты модулей
import { initUserManagement, updateFilter, changeUserRole, changeUserStatus, assignUserToBranch, exportUsersToCSV } from './userManagement.js';
import userListUI from './userListUI.js';
import { getAllBranches, createBranch } from '../branches/branchManager.js';
import { getPendingTransferRequests, processTransferRequest } from '../branches/transferRequests.js';
import { checkAndCreateInitialBranch, assignUsersToDefaultBranch } from '../branches/initialBranchSetup.js';

// Состояние
const state = {
    currentTab: 'users',
    branches: [],
    currentUser: null,
    isRootAdmin: false
};

// DOM элементы
let elements = {};

/**
 * Инициализация админ-панели
 */
export async function initAdminPanel() {
    console.log('🛠️ Initializing admin panel...');
    
    try {
        // Проверяем права доступа
        await checkAdminAccess();
        
        // Инициализируем DOM элементы
        initDOMElements();
        
        // Загружаем данные
        await loadInitialData();
        
        // Настраиваем обработчики событий
        setupEventHandlers();
        
        // Показываем первую вкладку
        showTab('users');
        
        console.log('✅ Admin panel initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize admin panel:', error);
        showAccessDenied(error.message);
    }
}

/**
 * Проверить права администратора
 */
async function checkAdminAccess() {
    const user = auth.currentUser;
    
    if (!user) {
        throw new Error('Требуется авторизация');
    }
    
    // Получаем токен с custom claims
    try {
        const idTokenResult = await user.getIdTokenResult();
        
        // Проверяем роль в custom claims
        if (idTokenResult.claims.role === 'admin') {
            console.log('✅ Admin access granted via custom claims');
            
            // Загружаем данные пользователя из Firestore для полной информации
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                state.currentUser = {
                    id: user.uid,
                    ...userDoc.data()
                };
                state.isRootAdmin = userDoc.data().isFounder || userDoc.data().isRootAdmin || false;
            }
            
            return;
        }
    } catch (error) {
        console.error('Error checking custom claims:', error);
    }
    
    // Fallback: проверка в Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
        throw new Error('Профиль пользователя не найден');
    }
    
    const userData = userDoc.data();
    if (userData.role !== 'admin') {
        throw new Error('Требуются права администратора');
    }
    
    state.currentUser = {
        id: user.uid,
        ...userData
    };
    
    // Проверяем, является ли пользователь главным админом
    // (первый администратор или имеет специальный флаг)
    state.isRootAdmin = userData.isFounder || userData.isRootAdmin || false;
    
    console.log('✅ Admin access granted', {
        userId: user.uid,
        isRootAdmin: state.isRootAdmin
    });
}

/**
 * Инициализировать DOM элементы
 */
function initDOMElements() {
    elements = {
        // Вкладки
        navTabs: document.querySelectorAll('.nav-tab'),
        tabContents: document.querySelectorAll('.tab-content'),
        
        // Контейнеры вкладок
        usersTab: document.getElementById('users-tab'),
        branchesTab: document.getElementById('branches-tab'),
        requestsTab: document.getElementById('requests-tab'),
        
        // Кнопки
        addBranchBtn: document.getElementById('add-branch-btn'),
        
        // Модальные окна
        branchModal: document.getElementById('branch-modal'),
        userModal: document.getElementById('user-modal')
    };
}

/**
 * Загрузить начальные данные
 */
async function loadInitialData() {
    try {
        // Проверяем и создаем начальный филиал, если нужно
        const initialBranch = await checkAndCreateInitialBranch();
        if (initialBranch) {
            console.log('🏢 Created initial branch');
        }
        
        // Загружаем филиалы
        state.branches = await getAllBranches();
        console.log(`📍 Loaded ${state.branches.length} branches`);
        
        // Если есть филиалы, назначаем пользователей без филиала
        if (state.branches.length > 0) {
            await assignUsersToDefaultBranch();
        }
        
        // Инициализируем модуль управления пользователями
        await initUserManagement();
        
        // Инициализируем UI для списка пользователей
        userListUI.initUserListUI(elements.usersTab);
        
        // Обновляем фильтр филиалов
        userListUI.updateBranchFilter(state.branches);
        
        // Отображаем пользователей
        userListUI.renderUsers(state.branches);
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
    }
}

/**
 * Настроить обработчики событий
 */
function setupEventHandlers() {
    // Переключение вкладок
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            showTab(tab.dataset.tab);
        });
    });
    
    // Фильтры пользователей
    setupUserFilters();
    
    // Действия с пользователями
    setupUserActions();
    
    // Управление филиалами
    setupBranchManagement();
    
    // Управление заявками
    setupRequestsManagement();
}

/**
 * Настроить фильтры пользователей
 */
function setupUserFilters() {
    // Поиск
    const searchInput = document.getElementById('user-search');
    let searchTimeout;
    
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            updateFilter('search', e.target.value);
            userListUI.renderUsers(state.branches);
        }, 300);
    });
    
    // Фильтр по филиалу
    document.getElementById('filter-branch')?.addEventListener('change', (e) => {
        updateFilter('branch', e.target.value);
        userListUI.renderUsers(state.branches);
    });
    
    // Фильтр по роли
    document.getElementById('filter-role')?.addEventListener('change', (e) => {
        updateFilter('role', e.target.value);
        userListUI.renderUsers(state.branches);
    });
    
    // Фильтр по статусу
    document.getElementById('filter-status')?.addEventListener('change', (e) => {
        updateFilter('status', e.target.value);
        userListUI.renderUsers(state.branches);
    });
    
    // Кнопка обновления
    document.getElementById('refresh-users')?.addEventListener('click', async () => {
        userListUI.showLoading();
        await window.userManagement.loadAllUsers();
        userListUI.renderUsers(state.branches);
    });
    
    // Кнопка экспорта
    document.getElementById('export-users')?.addEventListener('click', () => {
        exportUsersToCSV();
    });
}

/**
 * Настроить действия с пользователями
 */
function setupUserActions() {
    // Делаем функции доступными глобально для onclick обработчиков
    window.adminUI = {
        handleRoleChange: async (userId, newRole) => {
            if (confirm(`Изменить роль пользователя на "${newRole === 'admin' ? 'Администратор' : 'Пользователь'}"?`)) {
                try {
                    await changeUserRole(userId, newRole);
                    userListUI.renderUsers(state.branches);
                    showNotification('Роль успешно изменена', 'success');
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        },
        
        handleStatusChange: async (userId, newStatus) => {
            const statusText = {
                'active': 'активировать',
                'banned': 'заблокировать',
                'pending': 'перевести в ожидание'
            };
            
            if (confirm(`Вы уверены, что хотите ${statusText[newStatus]} пользователя?`)) {
                try {
                    await changeUserStatus(userId, newStatus);
                    userListUI.renderUsers(state.branches);
                    showNotification('Статус успешно изменен', 'success');
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        },
        
        handleBranchAssign: async (userId) => {
            const branchId = await showBranchSelectionDialog(userId);
            if (branchId !== null) {
                try {
                    await assignUserToBranch(userId, branchId);
                    userListUI.renderUsers(state.branches);
                    showNotification('Пользователь назначен в филиал', 'success');
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        },
        
        showUserDetails: (userId) => {
            // TODO: Показать детальную информацию о пользователе
            console.log('Show details for user:', userId);
        },
        
        // Обработка заявок на перевод
        approveRequest: async (requestId) => {
            if (confirm('Одобрить заявку на перевод?')) {
                try {
                    await processTransferRequest(requestId, true, 'Заявка одобрена администратором');
                    await renderRequests();
                    showNotification('Заявка одобрена', 'success');
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        },
        
        rejectRequest: async (requestId) => {
            const reason = prompt('Укажите причину отказа:');
            if (reason) {
                try {
                    await processTransferRequest(requestId, false, reason);
                    await renderRequests();
                    showNotification('Заявка отклонена', 'info');
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        }
    };
}

/**
 * Настроить управление филиалами
 */
function setupBranchManagement() {
    // Кнопка создания филиала
    elements.addBranchBtn?.addEventListener('click', () => {
        showCreateBranchModal();
    });
    
    // Форма создания филиала
    document.getElementById('branch-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('branch-name').value.trim();
        const location = document.getElementById('branch-location').value.trim();
        
        if (!name) return;
        
        try {
            const newBranch = await createBranch({ name, location });
            state.branches.push(newBranch);
            
            // Обновляем UI
            userListUI.updateBranchFilter(state.branches);
            renderBranches();
            
            // Закрываем модальное окно
            elements.branchModal.style.display = 'none';
            
            showNotification('Филиал успешно создан', 'success');
            
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

/**
 * Настроить управление заявками
 */
function setupRequestsManagement() {
    // Обработка заявок будет настроена при переключении на вкладку
}

/**
 * Показать вкладку
 */
function showTab(tabName) {
    state.currentTab = tabName;
    
    // Обновляем активную вкладку
    elements.navTabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Показываем соответствующий контент
    elements.tabContents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Загружаем данные для вкладки
    switch (tabName) {
        case 'users':
            userListUI.renderUsers(state.branches);
            break;
        case 'branches':
            renderBranches();
            break;
        case 'requests':
            renderRequests();
            break;
    }
}

/**
 * Отобразить филиалы
 */
function renderBranches() {
    const container = document.getElementById('branches-list');
    if (!container) return;
    
    if (state.branches.length === 0) {
        container.innerHTML = '<p class="empty-state">Филиалы не найдены</p>';
        return;
    }
    
    container.innerHTML = state.branches.map(branch => `
        <div class="branch-card" data-branch-id="${branch.id}">
            <div class="branch-name">${branch.name}</div>
            <div class="branch-location">${branch.location || 'Местоположение не указано'}</div>
            <div class="branch-stats">
                <div class="stat">
                    <span class="stat-value">${branch.memberCount || 0}</span>
                    <span class="stat-label">Участников</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${branch.setlistCount || 0}</span>
                    <span class="stat-label">Сет-листов</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Отобразить заявки
 */
async function renderRequests() {
    const container = document.getElementById('requests-list');
    if (!container) return;
    
    try {
        const requests = await getPendingTransferRequests();
        
        if (requests.length === 0) {
            container.innerHTML = '<p class="empty-state">Нет активных заявок</p>';
            return;
        }
        
        container.innerHTML = requests.map(request => {
            const date = request.createdAt?.toDate ? request.createdAt.toDate() : new Date();
            const dateStr = new Intl.DateTimeFormat('ru', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
            
            return `
                <div class="request-card" data-request-id="${request.id}">
                    <div class="request-header">
                        <span class="request-user">${request.userName}</span>
                        <span class="request-date">${dateStr}</span>
                    </div>
                    <div class="request-branches">
                        <span class="branch-tag">${request.fromBranchName}</span>
                        <i class="fas fa-arrow-right arrow-icon"></i>
                        <span class="branch-tag">${request.toBranchName}</span>
                    </div>
                    ${request.reason ? `<div class="request-reason">"${request.reason}"</div>` : ''}
                    <div class="request-actions">
                        <button class="btn-primary" onclick="window.adminUI.approveRequest('${request.id}')">
                            <i class="fas fa-check"></i> Одобрить
                        </button>
                        <button class="btn-secondary" onclick="window.adminUI.rejectRequest('${request.id}')">
                            <i class="fas fa-times"></i> Отклонить
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Обновляем бейдж
        const badge = document.getElementById('requests-badge');
        if (badge) {
            badge.textContent = requests.length;
            badge.style.display = requests.length > 0 ? 'block' : 'none';
        }
        
    } catch (error) {
        container.innerHTML = '<p class="error">Ошибка загрузки заявок</p>';
        console.error('Error loading requests:', error);
    }
}

/**
 * Показать диалог выбора филиала
 */
async function showBranchSelectionDialog(userId) {
    return new Promise((resolve) => {
        const branches = state.branches;
        const options = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                <h3>Назначить филиал</h3>
                <form id="branch-assign-form">
                    <div class="form-group">
                        <label>Выберите филиал:</label>
                        <select id="branch-select" required>
                            <option value="">Не назначен</option>
                            ${options}
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary">Назначить</button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#branch-assign-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const branchId = modal.querySelector('#branch-select').value;
            modal.remove();
            resolve(branchId);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}

/**
 * Показать модальное окно создания филиала
 */
function showCreateBranchModal() {
    document.getElementById('branch-modal-title').textContent = 'Создать филиал';
    document.getElementById('branch-name').value = '';
    document.getElementById('branch-location').value = '';
    elements.branchModal.style.display = 'flex';
}

/**
 * Показать уведомление
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Показать сообщение об отказе в доступе
 */
function showAccessDenied(message) {
    document.body.innerHTML = `
        <div class="access-denied">
            <i class="fas fa-lock"></i>
            <h1>Доступ запрещен</h1>
            <p>${message}</p>
            <a href="/" class="btn-primary">На главную</a>
        </div>
    `;
}

// Экспортируем функции
window.adminController = {
    initAdminPanel
};

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Отмечаем что контроллер загружен
    window._adminControllerLoaded = true;
    console.log('🔥 Admin controller loaded');
    
    // Ждем обычной авторизации как в settings.html
    let initialized = false;
    let authCheckTimeout = null;
    
    console.log('🔄 Setting up onAuthStateChanged listener');
    
    auth.onAuthStateChanged((user) => {
        console.log('🔔 Auth state changed, user:', user ? user.uid : 'null', 'initialized:', initialized);
        
        if (initialized) return; // Предотвращаем множественные вызовы
        
        // Отменяем таймаут если он был
        if (authCheckTimeout) {
            clearTimeout(authCheckTimeout);
            authCheckTimeout = null;
        }
        
        if (user) {
            initialized = true;
            console.log('🔐 User detected:', user.uid, user.email);
            // Небольшая задержка для синхронизации данных
            setTimeout(() => {
                initAdminPanel();
            }, 500);
        } else {
            console.log('⏳ No user yet, waiting...');
            // Даем Firebase время восстановить сессию
            authCheckTimeout = setTimeout(() => {
                // Проверяем еще раз
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    console.log('❌ No user authenticated after timeout');
                    showAccessDenied('Требуется авторизация');
                } else {
                    console.log('✅ User found after timeout:', currentUser.uid);
                    initialized = true;
                    initAdminPanel();
                }
            }, 2000); // Ждем 2 секунды
        }
    });
});
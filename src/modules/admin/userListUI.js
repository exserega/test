/**
 * User List UI Module
 * Модуль отображения списка пользователей
 * 
 * Отвечает за:
 * - Рендеринг таблицы пользователей
 * - Отображение действий для каждого пользователя
 * - Обработку UI событий
 */

import { getFilteredUsers, getUserStats } from './userManagement.js';

// DOM элементы будут инициализированы при загрузке
let elements = {};

/**
 * Инициализация UI модуля
 */
export function initUserListUI(containerElement) {
    console.log('🎨 Initializing user list UI...');
    
    elements.container = containerElement;
    
    // Создаем структуру UI
    createUIStructure();
    
    return elements;
}

/**
 * Создать структуру UI
 */
function createUIStructure() {
    elements.container.innerHTML = `
        <!-- Статистика пользователей -->
        <div class="user-stats-bar">
            <div class="stat-item">
                <span class="stat-value" id="stat-total">0</span>
                <span class="stat-label">Всего</span>
            </div>
            <div class="stat-item">
                <span class="stat-value active" id="stat-active">0</span>
                <span class="stat-label">Активных</span>
            </div>
            <div class="stat-item">
                <span class="stat-value pending" id="stat-pending">0</span>
                <span class="stat-label">Ожидают</span>
            </div>
            <div class="stat-item">
                <span class="stat-value admin" id="stat-admins">0</span>
                <span class="stat-label">Админов</span>
            </div>
        </div>
        
        <!-- Фильтры и поиск -->
        <div class="user-filters-bar">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" 
                       id="user-search" 
                       placeholder="Поиск по имени, email или телефону..."
                       class="search-input">
            </div>
            
            <div class="filter-group">
                <select id="filter-branch" class="filter-select">
                    <option value="">Все филиалы</option>
                </select>
                
                <select id="filter-role" class="filter-select">
                    <option value="">Все роли</option>
                    <option value="admin">Администраторы</option>
                    <option value="user">Пользователи</option>
                </select>
                
                <select id="filter-status" class="filter-select">
                    <option value="">Все статусы</option>
                    <option value="pending">Ожидают подтверждения</option>
                    <option value="active">Активные</option>
                    <option value="blocked">Заблокированы</option>
                </select>
            </div>
            
            <div class="action-buttons">
                <button class="btn-icon" id="refresh-users" title="Обновить">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="btn-icon" id="export-users" title="Экспорт в CSV">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        </div>
        
        <!-- Таблица пользователей -->
        <div class="users-table-container">
            <table class="users-table">
                <thead>
                    <tr>
                        <th class="sortable" data-sort="name">
                            Пользователь <i class="fas fa-sort"></i>
                        </th>
                        <th class="sortable" data-sort="role">
                            Роль <i class="fas fa-sort"></i>
                        </th>
                        <th class="sortable" data-sort="status">
                            Статус <i class="fas fa-sort"></i>
                        </th>
                        <th class="sortable" data-sort="branchId">
                            Филиал <i class="fas fa-sort"></i>
                        </th>
                        <th class="sortable" data-sort="createdAt">
                            Регистрация <i class="fas fa-sort"></i>
                        </th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    <tr>
                        <td colspan="6" class="loading-message">
                            <i class="fas fa-spinner fa-spin"></i> Загрузка пользователей...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Модальное окно массовых действий -->
        <div id="bulk-actions-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3>Массовые действия</h3>
                <div class="bulk-actions-content">
                    <p>Выбрано пользователей: <span id="selected-count">0</span></p>
                    <div class="bulk-actions-buttons">
                        <button class="btn-primary" id="bulk-activate">
                            <i class="fas fa-check"></i> Активировать
                        </button>
                        <button class="btn-secondary" id="bulk-assign-branch">
                            <i class="fas fa-building"></i> Назначить филиал
                        </button>
                        <button class="btn-danger" id="bulk-ban">
                            <i class="fas fa-ban"></i> Заблокировать
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Сохраняем ссылки на элементы
    elements.statsBar = elements.container.querySelector('.user-stats-bar');
    elements.searchInput = elements.container.querySelector('#user-search');
    elements.filtersBar = elements.container.querySelector('.user-filters-bar');
    elements.tableBody = elements.container.querySelector('#users-table-body');
    elements.branchFilter = elements.container.querySelector('#filter-branch');
    elements.roleFilter = elements.container.querySelector('#filter-role');
    elements.statusFilter = elements.container.querySelector('#filter-status');
}

/**
 * Обновить статистику
 */
export function updateStats() {
    const stats = getUserStats();
    
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-active').textContent = stats.active;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-admins').textContent = stats.admins;
}

/**
 * Обновить список филиалов в фильтре
 */
export function updateBranchFilter(branches) {
    elements.branchFilter.innerHTML = '<option value="">Все филиалы</option>';
    
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name;
        elements.branchFilter.appendChild(option);
    });
}

/**
 * Отобразить пользователей в таблице
 */
export function renderUsers(branches = []) {
    const users = getFilteredUsers();
    
    if (users.length === 0) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    <i class="fas fa-users-slash"></i>
                    <p>Пользователи не найдены</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Создаем map филиалов для быстрого доступа
    const branchMap = {};
    branches.forEach(b => branchMap[b.id] = b);
    
    elements.tableBody.innerHTML = users.map(user => {
        const branch = branchMap[user.branchId];
        const isCurrentUser = user.id === firebase.auth().currentUser?.uid;
        
        return `
            <tr class="user-row ${isCurrentUser ? 'current-user' : ''}" data-user-id="${user.id}">
                <td class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">${user.name || 'Без имени'}</div>
                        <div class="user-contact">${user.email || user.phone || ''}</div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${user.role}">
                        ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.status}">
                        ${getStatusText(user.status)}
                    </span>
                </td>
                <td>
                    ${branch ? branch.name : '<span class="text-muted">Не назначен</span>'}
                </td>
                <td class="date-cell">
                    ${formatDate(user.createdAt)}
                </td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        ${renderUserActions(user, isCurrentUser)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Обновляем статистику
    updateStats();
}

/**
 * Получить текст статуса
 */
function getStatusText(status) {
    const statusMap = {
        'active': 'Активен',
        'pending': 'Ожидает',
        'banned': 'Заблокирован'
    };
    return statusMap[status] || status;
}

/**
 * Форматировать дату
 */
function formatDate(date) {
    if (!date) return '-';
    
    const options = {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    };
    
    return new Intl.DateTimeFormat('ru', options).format(date);
}

/**
 * Отобразить действия для пользователя
 */
function renderUserActions(user, isCurrentUser) {
    if (isCurrentUser) {
        return `<span class="text-muted">Это вы</span>`;
    }
    
    const actions = [];
    
    // Кнопка изменения роли
    if (user.role === 'user') {
        actions.push(`
            <button class="btn-action" 
                    onclick="window.adminUI.handleRoleChange('${user.id}', 'admin')"
                    title="Сделать администратором">
                <i class="fas fa-user-shield"></i>
            </button>
        `);
    } else {
        actions.push(`
            <button class="btn-action" 
                    onclick="window.adminUI.handleRoleChange('${user.id}', 'user')"
                    title="Сделать пользователем">
                <i class="fas fa-user"></i>
            </button>
        `);
    }
    
    // Кнопка изменения статуса
    if (user.status === 'pending') {
        actions.push(`
            <button class="btn-action success" 
                    onclick="window.adminUI.handleStatusChange('${user.id}', 'active')"
                    title="Активировать">
                <i class="fas fa-check"></i>
            </button>
        `);
    } else if (user.status === 'active') {
        actions.push(`
            <button class="btn-action danger" 
                    onclick="window.adminUI.handleStatusChange('${user.id}', 'banned')"
                    title="Заблокировать">
                <i class="fas fa-ban"></i>
            </button>
        `);
    } else {
        actions.push(`
            <button class="btn-action warning" 
                    onclick="window.adminUI.handleStatusChange('${user.id}', 'active')"
                    title="Разблокировать">
                <i class="fas fa-unlock"></i>
            </button>
        `);
    }
    
    // Кнопка назначения филиала
    actions.push(`
        <button class="btn-action" 
                onclick="window.adminUI.handleBranchAssign('${user.id}')"
                title="Назначить филиал">
            <i class="fas fa-building"></i>
        </button>
    `);
    
    // Кнопка дополнительных действий
    actions.push(`
        <button class="btn-action" 
                onclick="window.adminUI.showUserDetails('${user.id}')"
                title="Подробнее">
            <i class="fas fa-ellipsis-v"></i>
        </button>
    `);
    
    return actions.join('');
}

/**
 * Показать сообщение об ошибке
 */
export function showError(message) {
    elements.tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

/**
 * Показать индикатор загрузки
 */
export function showLoading() {
    elements.tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="loading-message">
                <i class="fas fa-spinner fa-spin"></i> Загрузка пользователей...
            </td>
        </tr>
    `;
}

// Экспортируем функции
export default {
    initUserListUI,
    updateStats,
    updateBranchFilter,
    renderUsers,
    showError,
    showLoading
};
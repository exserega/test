/**
 * Users Module
 * Модуль управления пользователями
 * 
 * Функционал:
 * - Отображение списка пользователей
 * - Фильтрация и поиск
 * - Изменение ролей и статусов
 * - Назначение филиалов
 */

// ====================================
// ОТОБРАЖЕНИЕ ПОЛЬЗОВАТЕЛЕЙ
// ====================================

/**
 * Отображает список пользователей с учетом фильтров
 */
export function displayUsers() {
    const container = document.getElementById('users-list');
    if (!container) return;
    
    // Получаем состояние из глобального объекта
    const { users, filters, branches, currentUser, isRootAdmin } = window.adminState;
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет пользователей</div>';
        return;
    }
    
    // Применяем фильтры
    let filteredUsers = filterUsers(users, filters);
    
    // Сортируем: сначала админы, потом по дате регистрации
    filteredUsers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
    
    // Генерируем HTML
    container.innerHTML = filteredUsers.map(user => 
        createUserCard(user, branches, currentUser, isRootAdmin)
    ).join('');
    
    // Добавляем обработчики событий
    attachUserEventHandlers();
}

/**
 * Фильтрует пользователей по заданным критериям
 */
function filterUsers(users, filters) {
    return users.filter(user => {
        // Фильтр по роли
        if (filters.role && user.role !== filters.role) {
            return false;
        }
        
        // Фильтр по статусу
        if (filters.status && user.status !== filters.status) {
            return false;
        }
        
        // Фильтр по филиалу
        if (filters.branch && user.branchId !== filters.branch) {
            return false;
        }
        
        // Поиск
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const nameMatch = user.name?.toLowerCase().includes(searchLower);
            const emailMatch = user.email?.toLowerCase().includes(searchLower);
            const phoneMatch = user.phone?.includes(filters.search);
            
            if (!nameMatch && !emailMatch && !phoneMatch) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * Создает HTML карточки пользователя
 */
function createUserCard(user, branches, currentUser, isRootAdmin) {
    const branch = branches.find(b => b.id === user.branchId);
    const isCurrentUser = user.id === currentUser.id;
    
    return `
        <div class="user-card" data-user-id="${user.id}">
            <div class="user-header">
                <img src="${user.photoURL || getAvatarPlaceholder(user)}" 
                     alt="${user.name || 'User'}" 
                     class="user-avatar"
                     onerror="this.src='${getAvatarPlaceholder(user)}'">
                <div class="user-info">
                    <h3>${user.name || 'Без имени'}</h3>
                    <p>${user.email || user.phone || 'Нет контактов'}</p>
                </div>
            </div>
            
            <div class="user-badges">
                <span class="badge badge-${getRoleBadgeClass(user.role)}">
                    ${getRoleText(user.role)}
                </span>
                <span class="badge badge-${getStatusBadgeClass(user.status)}">
                    ${getStatusText(user.status)}
                </span>
                ${branch ? `<span class="badge">${branch.name}</span>` : ''}
                ${user.isFounder ? '<span class="badge badge-danger">Основатель</span>' : ''}
            </div>
            
            <div class="user-actions">
                ${(!isCurrentUser && !user.isFounder) || (isCurrentUser && user.isFounder) ? `
                    <button class="button small" 
                            onclick="window.adminModules.users.showEditUserModal('${user.id}')"
                            title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                
                ${isRootAdmin && !isCurrentUser && !user.isFounder ? `
                    <button class="button small danger" 
                            onclick="window.adminModules.users.deleteUser('${user.id}')"
                            title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ====================================
// МОДАЛЬНЫЕ ОКНА
// ====================================

/**
 * Показывает модальное окно редактирования пользователя
 */
export function showEditUserModal(userId) {
    const user = window.adminState.users.find(u => u.id === userId);
    if (!user) return;
    
    // Защита от редактирования основателя другими админами
    const currentUser = window.adminState.currentUser;
    if (user.isFounder && currentUser.id !== user.id) {
        showNotification('Только основатель может редактировать свой профиль', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="modal" id="edit-user-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Редактирование пользователя</h2>
                    <button class="close-modal" onclick="window.adminModules.users.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="user-details">
                        <div class="detail-row">
                            <img src="${user.photoURL || getAvatarPlaceholder(user)}" 
                                 alt="${user.name}" 
                                 class="user-avatar-large">
                            <div>
                                <h3>${user.name || 'Без имени'}</h3>
                                <p>${user.email || user.phone || ''}</p>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Роль</label>
                            <select id="user-role" ${user.isFounder ? 'disabled' : ''}>
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>
                                    Пользователь
                                </option>
                                <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>
                                    Модератор
                                </option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>
                                    Администратор
                                </option>
                            </select>
                            ${user.isFounder ? '<small class="text-muted">Роль основателя нельзя изменить</small>' : ''}
                        </div>
                        
                        <div class="form-group">
                            <label>Статус</label>
                            <select id="user-status" ${user.isFounder && currentUser.id !== user.id ? 'disabled' : ''}>
                                <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>
                                    Ожидает подтверждения
                                </option>
                                <option value="active" ${user.status === 'active' ? 'selected' : ''}>
                                    Активен
                                </option>
                                <option value="blocked" ${user.status === 'blocked' || user.status === 'banned' ? 'selected' : ''}>
                                    Заблокирован
                                </option>
                            </select>
                            ${user.isFounder && currentUser.id !== user.id ? '<small class="text-muted">Только основатель может изменить свой статус</small>' : ''}
                        </div>
                        
                        <div class="form-group">
                            <label>Филиал</label>
                            <select id="user-branch" ${user.isFounder && currentUser.id !== user.id ? 'disabled' : ''}>
                                <option value="">Не назначен</option>
                                ${window.adminState.branches.map(b => `
                                    <option value="${b.id}" 
                                            ${user.branchId === b.id ? 'selected' : ''}>
                                        ${b.name}
                                    </option>
                                `).join('')}
                            </select>
                            ${user.isFounder && currentUser.id !== user.id ? '<small class="text-muted">Только основатель может изменить свой филиал</small>' : ''}
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="button" onclick="window.adminModules.users.closeModal()">
                        Отмена
                    </button>
                    <button class="button primary" 
                            onclick="window.adminModules.users.saveUserChanges('${userId}')">
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем модальное окно в DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Добавляем обработчик закрытия по клику вне окна
    const modal = document.getElementById('edit-user-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

/**
 * Закрывает модальное окно
 */
export function closeModal() {
    const modal = document.getElementById('edit-user-modal');
    if (modal) {
        modal.remove();
    }
}

// ====================================
// ДЕЙСТВИЯ С ПОЛЬЗОВАТЕЛЯМИ
// ====================================

/**
 * Сохраняет изменения пользователя
 */
export async function saveUserChanges(userId) {
    try {
        const role = document.getElementById('user-role').value;
        const status = document.getElementById('user-status').value;
        const branchId = document.getElementById('user-branch').value;
        
        // Получаем текущие данные пользователя для проверки
        const user = window.adminState.users.find(u => u.id === userId);
        const currentUser = window.adminState.currentUser;
        
        // ЗАЩИТА: Только основатель может редактировать свой профиль
        if (user && user.isFounder && currentUser.id !== user.id) {
            showNotification('Только основатель может редактировать свой профиль', 'error');
            return;
        }
        
        // ЗАЩИТА: Не позволяем изменить роль основателя
        if (user && user.isFounder && role !== 'admin') {
            showNotification('Нельзя изменить роль основателя системы', 'error');
            return;
        }
        
        // Обновляем в Firestore
        const db = firebase.firestore();
        const updateData = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Для основателя другие админы не могут менять статус и филиал
        if (user && user.isFounder && currentUser.id === user.id) {
            // Только сам основатель может менять свой статус и филиал
            updateData.status = status;
            updateData.branchId = branchId || null;
        } else if (!user || !user.isFounder) {
            // Для обычных пользователей можно менять все
            updateData.status = status;
            updateData.branchId = branchId || null;
        }
        
        // Обновляем роль только если пользователь не основатель
        if (!user || !user.isFounder) {
            updateData.role = role;
        }
        
        await db.collection('users').doc(userId).update(updateData);
        
        // Обновляем локальное состояние
        const userToUpdate = window.adminState.users.find(u => u.id === userId);
        if (userToUpdate) {
            // Обновляем роль только если не основатель
            if (!userToUpdate.isFounder) {
                userToUpdate.role = role;
            }
            userToUpdate.status = status;
            userToUpdate.branchId = branchId || null;
        }
        
        // Закрываем модальное окно
        closeModal();
        
        // Обновляем отображение
        displayUsers();
        
        // Показываем уведомление
        showNotification('Изменения сохранены', 'success');
        
    } catch (error) {
        console.error('Error saving user changes:', error);
        showNotification('Ошибка при сохранении', 'error');
    }
}

/**
 * Удаляет пользователя (только для root админа)
 */
export async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие необратимо.')) {
        return;
    }
    
    try {
        // Удаляем из Firestore
        const db = firebase.firestore();
        await db.collection('users').doc(userId).delete();
        
        // Удаляем из локального состояния
        window.adminState.users = window.adminState.users.filter(u => u.id !== userId);
        
        // Обновляем отображение
        displayUsers();
        
        // Показываем уведомление
        showNotification('Пользователь удален', 'success');
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Ошибка при удалении', 'error');
    }
}

// ====================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================================

/**
 * Генерирует заглушку для аватара
 */
function getAvatarPlaceholder(user) {
    const initials = (user.name || user.email || '?')
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    
    // Генерируем цвет на основе ID пользователя
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
                   '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800'];
    const colorIndex = user.id.charCodeAt(0) % colors.length;
    const color = colors[colorIndex];
    
    // SVG с инициалами
    const svg = `
        <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
            <rect width="50" height="50" fill="${color}" rx="25"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".35em" 
                  fill="white" font-size="20" font-weight="600">
                ${initials}
            </text>
        </svg>
    `;
    
    // Кодируем SVG с поддержкой Unicode
    try {
        // Для поддержки кириллицы и других Unicode символов
        const encoded = btoa(unescape(encodeURIComponent(svg)));
        return `data:image/svg+xml;base64,${encoded}`;
    } catch (e) {
        // Если не удалось закодировать, возвращаем URL-encoded версию
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
}

function getRoleBadgeClass(role) {
    const classes = {
        admin: 'danger',
        moderator: 'warning',
        user: 'info'
    };
    return classes[role] || 'secondary';
}

function getRoleText(role) {
    const texts = {
        admin: 'Администратор',
        moderator: 'Модератор',
        user: 'Пользователь'
    };
    return texts[role] || role;
}

function getStatusBadgeClass(status) {
    const classes = {
        active: 'success',
        blocked: 'danger',
        banned: 'danger', // для обратной совместимости
        pending: 'warning' // pending - желтый цвет для ожидающих
    };
    return classes[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        active: 'Активен',
        blocked: 'Заблокирован',
        banned: 'Заблокирован', // для обратной совместимости
        pending: 'Ожидает подтверждения'
    };
    return texts[status] || status;
}

/**
 * Показывает уведомление
 */
async function showNotification(message, type = 'info') {
    // Используем глобальную функцию если доступна
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        // Пытаемся загрузить модуль уведомлений
        try {
            await import('./notifications.js');
            window.showNotification(message, type);
        } catch (error) {
            // Fallback на консоль
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

/**
 * Добавляет обработчики событий для динамических элементов
 */
function attachUserEventHandlers() {
    // Обработчики добавляются через onclick в HTML
}

// ====================================
// ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ====================================

// Делаем функции доступными глобально для onclick обработчиков
window.adminModules = window.adminModules || {};
window.adminModules.users = {
    showEditUserModal,
    closeModal,
    saveUserChanges,
    deleteUser
};
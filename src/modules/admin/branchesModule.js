/**
 * Branches Module
 * Модуль управления филиалами
 * 
 * Функционал:
 * - Отображение списка филиалов
 * - Создание новых филиалов
 * - Редактирование и удаление
 * - Просмотр статистики
 */

// ====================================
// ОТОБРАЖЕНИЕ ФИЛИАЛОВ
// ====================================

/**
 * Отображает список филиалов
 */
export function displayBranches() {
    const container = document.getElementById('branches-list');
    if (!container) return;
    
    const { branches, users, isRootAdmin } = window.adminState;
    
    // Добавляем кнопку создания филиала только для главного админа
    const controlsBar = document.getElementById('branches-controls');
    if (controlsBar) {
        if (isRootAdmin) {
            controlsBar.innerHTML = `
                <button class="button primary" onclick="window.adminModules.branches.showCreateBranchModal()">
                    <i class="fas fa-plus"></i>
                    Создать филиал
                </button>
            `;
        } else {
            controlsBar.innerHTML = '';
        }
    }
    
    if (branches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Филиалов пока нет</p>
                ${isRootAdmin ? `
                    <button class="button primary" onclick="window.adminModules.branches.showCreateBranchModal()">
                        <i class="fas fa-plus"></i>
                        Создать первый филиал
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    // Генерируем карточки филиалов
    container.innerHTML = branches.map(branch => 
        createBranchCard(branch, users, isRootAdmin)
    ).join('');
}

/**
 * Создает HTML карточки филиала
 */
function createBranchCard(branch, users, isRootAdmin) {
    const userCount = users.filter(u => u.branchId === branch.id).length;
    const adminCount = users.filter(u => u.branchId === branch.id && u.role === 'admin').length;
    
    return `
        <div class="branch-card" data-branch-id="${branch.id}">
            <div class="branch-header">
                <h3>${branch.name}</h3>
                ${branch.isMain ? '<span class="badge badge-success">Главный</span>' : ''}
            </div>
            
            <p class="branch-address">
                <i class="fas fa-map-marker-alt"></i>
                ${branch.address || 'Адрес не указан'}
            </p>
            
            <div class="branch-stats">
                <div class="stat-item">
                    <i class="fas fa-users"></i>
                    <span>${userCount} ${getPlural(userCount, 'пользователь', 'пользователя', 'пользователей')}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-user-shield"></i>
                    <span>${adminCount} ${getPlural(adminCount, 'админ', 'админа', 'админов')}</span>
                </div>
            </div>
            
            ${isRootAdmin ? `
                <div class="branch-actions">
                    <button class="button small" 
                            onclick="window.adminModules.branches.showEditBranchModal('${branch.id}')"
                            title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    ${!branch.isMain ? `
                        <button class="button small danger" 
                                onclick="window.adminModules.branches.deleteBranch('${branch.id}')"
                                title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// ====================================
// МОДАЛЬНЫЕ ОКНА
// ====================================

/**
 * Показывает модальное окно создания филиала
 */
export function showCreateBranchModal() {
    const modalHtml = `
        <div class="modal" id="branch-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Создать филиал</h2>
                    <button class="close-modal" onclick="window.adminModules.branches.closeBranchModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="branch-form">
                        <div class="form-group">
                            <label for="branch-name">Название филиала *</label>
                            <input type="text" 
                                   id="branch-name" 
                                   placeholder="Например: Филиал Центральный"
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="branch-address">Адрес</label>
                            <input type="text" 
                                   id="branch-address" 
                                   placeholder="Например: ул. Ленина, 10">
                        </div>
                        
                        <div class="form-group">
                            <label for="branch-phone">Телефон</label>
                            <input type="tel" 
                                   id="branch-phone" 
                                   placeholder="+7 (999) 123-45-67">
                        </div>
                        
                        <div class="form-group">
                            <label for="branch-description">Описание</label>
                            <textarea id="branch-description" 
                                      rows="3"
                                      placeholder="Дополнительная информация о филиале"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="branch-is-main">
                                Сделать главным филиалом
                            </label>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    <button class="button" onclick="window.adminModules.branches.closeBranchModal()">
                        Отмена
                    </button>
                    <button class="button primary" onclick="window.adminModules.branches.createBranch()">
                        <i class="fas fa-plus"></i>
                        Создать
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Фокус на первое поле
    setTimeout(() => {
        document.getElementById('branch-name').focus();
    }, 100);
    
    // Закрытие по клику вне окна
    const modal = document.getElementById('branch-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBranchModal();
        }
    });
}

/**
 * Показывает модальное окно редактирования филиала
 */
export function showEditBranchModal(branchId) {
    const branch = window.adminState.branches.find(b => b.id === branchId);
    if (!branch) return;
    
    const modalHtml = `
        <div class="modal" id="branch-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Редактировать филиал</h2>
                    <button class="close-modal" onclick="window.adminModules.branches.closeBranchModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="branch-form">
                        <div class="form-group">
                            <label for="branch-name">Название филиала *</label>
                            <input type="text" 
                                   id="branch-name" 
                                   value="${branch.name}"
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="branch-address">Адрес</label>
                            <input type="text" 
                                   id="branch-address" 
                                   value="${branch.address || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="branch-phone">Телефон</label>
                            <input type="tel" 
                                   id="branch-phone" 
                                   value="${branch.phone || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="branch-description">Описание</label>
                            <textarea id="branch-description" 
                                      rows="3">${branch.description || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" 
                                       id="branch-is-main"
                                       ${branch.isMain ? 'checked' : ''}>
                                Главный филиал
                            </label>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    <button class="button" onclick="window.adminModules.branches.closeBranchModal()">
                        Отмена
                    </button>
                    <button class="button primary" 
                            onclick="window.adminModules.branches.updateBranch('${branchId}')">
                        <i class="fas fa-save"></i>
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Закрытие по клику вне окна
    const modal = document.getElementById('branch-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBranchModal();
        }
    });
}

/**
 * Закрывает модальное окно филиала
 */
export function closeBranchModal() {
    const modal = document.getElementById('branch-modal');
    if (modal) {
        modal.remove();
    }
}

// ====================================
// ДЕЙСТВИЯ С ФИЛИАЛАМИ
// ====================================

/**
 * Создает новый филиал
 */
export async function createBranch() {
    try {
        // Получаем данные из формы
        const name = document.getElementById('branch-name').value.trim();
        const address = document.getElementById('branch-address').value.trim();
        const phone = document.getElementById('branch-phone').value.trim();
        const description = document.getElementById('branch-description').value.trim();
        const isMain = document.getElementById('branch-is-main').checked;
        
        // Валидация
        if (!name) {
            alert('Укажите название филиала');
            return;
        }
        
        // Если делаем главным, снимаем флаг с других
        if (isMain) {
            await unsetMainBranches();
        }
        
        // Создаем в Firestore
        const db = firebase.firestore();
        const currentUserId = window.adminState.currentUser?.id || window.adminState.currentUser?.uid;
        
        if (!currentUserId) {
            console.error('Current user ID not found:', window.adminState.currentUser);
            alert('Ошибка: не удалось определить текущего пользователя');
            return;
        }
        
        const docRef = await db.collection('branches').add({
            name,
            address: address || null,
            phone: phone || null,
            description: description || null,
            isMain: isMain || false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUserId
        });
        
        // Добавляем в локальное состояние
        const newBranch = {
            id: docRef.id,
            name,
            address,
            phone,
            description,
            isMain,
            createdAt: new Date(),
            createdBy: currentUserId
        };
        
        window.adminState.branches.push(newBranch);
        
        // Закрываем модальное окно
        closeBranchModal();
        
        // Обновляем отображение
        displayBranches();
        
        // Обновляем фильтр филиалов
        updateBranchFilter();
        
        // Показываем уведомление
        showNotification('Филиал создан', 'success');
        
    } catch (error) {
        console.error('Error creating branch:', error);
        showNotification('Ошибка при создании филиала', 'error');
    }
}

/**
 * Обновляет данные филиала
 */
export async function updateBranch(branchId) {
    try {
        // Получаем данные из формы
        const name = document.getElementById('branch-name').value.trim();
        const address = document.getElementById('branch-address').value.trim();
        const phone = document.getElementById('branch-phone').value.trim();
        const description = document.getElementById('branch-description').value.trim();
        const isMain = document.getElementById('branch-is-main').checked;
        
        // Валидация
        if (!name) {
            alert('Укажите название филиала');
            return;
        }
        
        // Если делаем главным, снимаем флаг с других
        if (isMain) {
            await unsetMainBranches();
        }
        
        // Обновляем в Firestore
        const db = firebase.firestore();
        await db.collection('branches').doc(branchId).update({
            name,
            address: address || null,
            phone: phone || null,
            description: description || null,
            isMain: isMain || false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Обновляем локальное состояние
        const branch = window.adminState.branches.find(b => b.id === branchId);
        if (branch) {
            branch.name = name;
            branch.address = address;
            branch.phone = phone;
            branch.description = description;
            branch.isMain = isMain;
        }
        
        // Закрываем модальное окно
        closeBranchModal();
        
        // Обновляем отображение
        displayBranches();
        
        // Обновляем фильтр филиалов
        updateBranchFilter();
        
        // Показываем уведомление
        showNotification('Филиал обновлен', 'success');
        
    } catch (error) {
        console.error('Error updating branch:', error);
        showNotification('Ошибка при обновлении филиала', 'error');
    }
}

/**
 * Удаляет филиал
 */
export async function deleteBranch(branchId) {
    const branch = window.adminState.branches.find(b => b.id === branchId);
    if (!branch) return;
    
    // Проверяем есть ли пользователи в филиале
    const usersInBranch = window.adminState.users.filter(u => u.branchId === branchId);
    
    if (usersInBranch.length > 0) {
        alert(`В филиале "${branch.name}" есть ${usersInBranch.length} пользователей. Сначала переведите их в другой филиал.`);
        return;
    }
    
    if (!confirm(`Вы уверены, что хотите удалить филиал "${branch.name}"?`)) {
        return;
    }
    
    try {
        // Удаляем из Firestore
        const db = firebase.firestore();
        await db.collection('branches').doc(branchId).delete();
        
        // Удаляем из локального состояния
        window.adminState.branches = window.adminState.branches.filter(b => b.id !== branchId);
        
        // Обновляем отображение
        displayBranches();
        
        // Обновляем фильтр филиалов
        updateBranchFilter();
        
        // Показываем уведомление
        showNotification('Филиал удален', 'success');
        
    } catch (error) {
        console.error('Error deleting branch:', error);
        showNotification('Ошибка при удалении филиала', 'error');
    }
}

// ====================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================================

/**
 * Снимает флаг главного филиала со всех филиалов
 */
async function unsetMainBranches() {
    const db = firebase.firestore();
    const mainBranches = window.adminState.branches.filter(b => b.isMain);
    
    for (const branch of mainBranches) {
        await db.collection('branches').doc(branch.id).update({
            isMain: false
        });
        branch.isMain = false;
    }
}

/**
 * Обновляет фильтр филиалов в списке пользователей
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
 * Склонение числительных
 */
function getPlural(count, one, two, five) {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    
    if (n > 10 && n < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 === 1) return one;
    
    return five;
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

// ====================================
// ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ====================================

// Делаем функции доступными глобально для onclick обработчиков
window.adminModules = window.adminModules || {};
window.adminModules.branches = {
    showCreateBranchModal,
    showEditBranchModal,
    closeBranchModal,
    createBranch,
    updateBranch,
    deleteBranch
};
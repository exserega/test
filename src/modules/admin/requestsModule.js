/**
 * Requests Module - Управление заявками пользователей
 * Обрабатывает отображение и управление заявками на вступление
 */

// ====================================
// ОТОБРАЖЕНИЕ ЗАЯВОК
// ====================================

/**
 * Отображает список заявок
 */
export function displayRequests() {
    const container = document.getElementById('requests-list');
    if (!container) return;
    
    const { requests, branches } = window.adminState;
    
    // Обновляем счетчик заявок
    updateRequestsCount(requests.length);
    
    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-check"></i>
                <p>Нет новых заявок</p>
            </div>
        `;
        return;
    }
    
    // Создаем карточки заявок
    const html = requests.map(user => createRequestCard(user, branches)).join('');
    container.innerHTML = html;
}

/**
 * Создает карточку заявки
 */
function createRequestCard(user, branches) {
    const branch = branches.find(b => b.id === user.branchId);
    const branchName = branch ? branch.name : 'Филиал не указан';
    
    return `
        <div class="request-card" data-user-id="${user.id}" style="background: var(--card-bg); border-radius: var(--radius); padding: var(--spacing-md); margin-bottom: var(--spacing-sm); box-shadow: var(--shadow);">
            <div class="request-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${user.name || 'Без имени'}</h3>
                <span class="request-date" style="font-size: 12px; opacity: 0.6;">${formatDate(user.createdAt)}</span>
            </div>
            
            <div class="request-info" style="margin-bottom: var(--spacing-md);">
                <div class="info-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-envelope" style="width: 16px; text-align: center; opacity: 0.6;"></i>
                    <span>${user.email}</span>
                </div>
                <div class="info-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-phone" style="width: 16px; text-align: center; opacity: 0.6;"></i>
                    <span>${user.phone || 'Не указан'}</span>
                </div>
                <div class="info-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-building" style="width: 16px; text-align: center; opacity: 0.6;"></i>
                    <span>${branchName}</span>
                </div>
            </div>
            
            <div class="request-actions" style="display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-sm);">
                <button class="btn-action success" 
                        onclick="window.adminRequests.approveRequest('${user.id}')"
                        title="Одобрить заявку"
                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-check" style="font-size: 12px;"></i>
                    <span>Одобрить</span>
                </button>
                <button class="btn-action danger" 
                        onclick="window.adminRequests.rejectRequest('${user.id}')"
                        title="Отклонить заявку"
                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: transparent; color: #dc3545; border: 1px solid #dc3545; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-times" style="font-size: 12px;"></i>
                    <span>Отклонить</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Обновляет счетчик заявок
 */
function updateRequestsCount(count) {
    const badge = document.getElementById('requests-count');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

/**
 * Форматирует дату
 */
function formatDate(date) {
    if (!date) return 'Дата не указана';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дней назад`;
    
    return d.toLocaleDateString('ru-RU');
}

// ====================================
// ОБРАБОТКА ЗАЯВОК
// ====================================

/**
 * Одобряет заявку пользователя
 */
export async function approveRequest(userId) {
    if (!confirm('Подтвердить заявку этого пользователя?')) return;
    
    try {
        showRequestLoading(userId);
        
        const db = firebase.firestore();
        console.log('Current user:', window.adminState.currentUser);
        
        // Обновляем статус пользователя на active
        await db.collection('users').doc(userId).update({
            status: 'active',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: window.adminState.currentUser?.id || window.adminState.currentUser?.uid
        });
        
        // Удаляем пользователя из списка заявок
        window.adminState.requests = window.adminState.requests.filter(u => u.id !== userId);
        
        // Обновляем пользователя в общем списке - загружаем свежие данные
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const updatedUser = { id: userDoc.id, ...userDoc.data() };
            const userIndex = window.adminState.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                window.adminState.users[userIndex] = updatedUser;
            }
        }
        
        // Обновляем отображение
        displayRequests();
        
        // Если открыт таб пользователей, обновляем его тоже
        if (window.adminState.currentTab === 'users') {
            const { displayUsers } = await import('./usersModule.js');
            await displayUsers();
            // Принудительное обновление обработчиков событий
            window.dispatchEvent(new Event('admin-data-updated'));
        }
        
        showSuccess('Заявка одобрена');
        
    } catch (error) {
        console.error('Error approving request:', error);
        showError('Ошибка при одобрении заявки');
        hideRequestLoading(userId);
    }
}

/**
 * Отклоняет заявку пользователя
 */
export async function rejectRequest(userId) {
    const reason = prompt('Укажите причину отклонения заявки (необязательно):');
    
    if (reason === null) return; // Отменили диалог
    
    try {
        showRequestLoading(userId);
        
        const db = firebase.firestore();
        console.log('Current user:', window.adminState.currentUser);
        
        // Получаем информацию о филиале пользователя
        const user = window.adminState.requests.find(u => u.id === userId);
        const branch = window.adminState.branches.find(b => b.id === user?.branchId);
        
        // Сохраняем информацию об отклонении но оставляем статус pending
        await db.collection('users').doc(userId).update({
            // status остается 'pending'
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: window.adminState.currentUser?.id || window.adminState.currentUser?.uid,
            rejectionReason: reason || 'Без указания причины',
            branchName: branch?.name || 'Филиал не указан',
            hasRejection: true
        });
        
        // НЕ удаляем пользователя из списка заявок - он остается в pending
        
        // Обновляем данные пользователя в общем списке
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const updatedUser = { id: userDoc.id, ...userDoc.data() };
            const userIndex = window.adminState.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                window.adminState.users[userIndex] = updatedUser;
            }
            
            // Обновляем также в списке заявок
            const requestIndex = window.adminState.requests.findIndex(u => u.id === userId);
            if (requestIndex !== -1) {
                window.adminState.requests[requestIndex] = updatedUser;
            }
        }
        
        // Обновляем отображение
        displayRequests();
        
        // Если открыт таб пользователей, обновляем его тоже
        if (window.adminState.currentTab === 'users') {
            const { displayUsers } = await import('./usersModule.js');
            await displayUsers();
            // Принудительное обновление обработчиков событий
            window.dispatchEvent(new Event('admin-data-updated'));
        }
        
        // Показываем уведомление пользователю при следующем входе
        showSuccess('Заявка отклонена. Пользователь получит уведомление при входе.');
        
    } catch (error) {
        console.error('Error rejecting request:', error);
        showError('Ошибка при отклонении заявки');
        hideRequestLoading(userId);
    }
}

// ====================================
// UI УТИЛИТЫ
// ====================================

function showRequestLoading(userId) {
    const card = document.querySelector(`[data-user-id="${userId}"]`);
    if (card) {
        card.classList.add('loading');
        card.querySelectorAll('button').forEach(btn => btn.disabled = true);
    }
}

function hideRequestLoading(userId) {
    const card = document.querySelector(`[data-user-id="${userId}"]`);
    if (card) {
        card.classList.remove('loading');
        card.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }
}

function showSuccess(message) {
    // Можно использовать toast или другой UI элемент
    console.log('✅', message);
}

function showError(message) {
    // Можно использовать toast или другой UI элемент
    console.error('❌', message);
}

// ====================================
// ИНИЦИАЛИЗАЦИЯ
// ====================================

// Экспортируем функции в глобальный объект для onclick обработчиков
window.adminRequests = {
    approveRequest,
    rejectRequest
};
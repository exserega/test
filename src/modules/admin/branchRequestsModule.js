// ====================================
// МОДУЛЬ УПРАВЛЕНИЯ ЗАЯВКАМИ НА ФИЛИАЛЫ
// ====================================

import { db } from '../../../js/firebase-config.js';

/**
 * Отображение заявок на филиалы
 */
export async function displayBranchRequests() {
    const { branchRequests, branches, users } = window.adminState;
    
    const container = document.getElementById('branch-requests-list');
    if (!container) {
        console.error('Branch requests container not found');
        return;
    }
    
    // Фильтруем только pending заявки
    const pendingRequests = branchRequests.filter(r => r.status === 'pending');
    
    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Нет активных заявок на филиалы</p>
            </div>
        `;
        updateBranchRequestsCount(0);
        return;
    }
    
    // Создаем карточки заявок
    const html = pendingRequests.map(request => createBranchRequestCard(request, branches, users)).join('');
    container.innerHTML = `<div class="requests-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--spacing-md);">${html}</div>`;
    
    updateBranchRequestsCount(pendingRequests.length);
}

/**
 * Создание карточки заявки
 */
function createBranchRequestCard(request, branches, users) {
    const user = users.find(u => u.id === request.userId);
    const currentBranch = branches.find(b => b.id === request.currentBranchId);
    const requestedBranch = branches.find(b => b.id === request.requestedBranchId);
    
    if (!user || !requestedBranch) {
        console.error('Invalid request data:', request);
        return '';
    }
    
    const typeText = request.type === 'changeMain' 
        ? 'Смена основного филиала' 
        : 'Присоединение к филиалу';
    
    const typeIcon = request.type === 'changeMain' 
        ? 'fa-exchange-alt' 
        : 'fa-plus';
    
    return `
        <div class="request-card" data-request-id="${request.id}" style="background: var(--card-bg); border-radius: var(--radius); padding: var(--spacing-md); margin-bottom: var(--spacing-sm); box-shadow: var(--shadow);">
            <div class="request-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;"><i class="fas ${typeIcon}" style="margin-right: 6px; font-size: 14px;"></i>${typeText}</h3>
                <span class="request-date" style="font-size: 12px; opacity: 0.6;">${formatDate(request.createdAt)}</span>
            </div>
            
            <div class="request-info" style="margin-bottom: var(--spacing-md);">
                <div class="info-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-user" style="width: 16px; text-align: center; opacity: 0.6;"></i>
                    <span>${user.name || user.email}</span>
                </div>
                
                ${currentBranch ? `
                <div class="info-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-building" style="width: 16px; text-align: center; opacity: 0.6;"></i>
                    <span>Текущий: ${currentBranch.name}</span>
                </div>
                ` : ''}
                
                <div class="info-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-arrow-right" style="width: 16px; text-align: center; opacity: 0.6;"></i>
                    <span>Запрашивает: ${requestedBranch.name}</span>
                </div>
                
                ${request.reason ? `
                <div class="info-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-comment" style="width: 16px; text-align: center; opacity: 0.6;"></i>
                    <span>${request.reason}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="request-actions" style="display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-sm);">
                <button class="btn-action success" 
                        onclick="window.adminBranchRequests.approveRequest('${request.id}')"
                        title="Одобрить заявку"
                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-check" style="font-size: 12px;"></i>
                    <span>Одобрить</span>
                </button>
                <button class="btn-action danger" 
                        onclick="window.adminBranchRequests.showRejectDialog('${request.id}')"
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
 * Обновление счетчика заявок
 */
function updateBranchRequestsCount(count) {
    const badge = document.getElementById('branch-requests-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Форматирование даты
 */
function formatDate(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Одобрение заявки
 */
async function approveRequest(requestId) {
    const request = window.adminState.branchRequests.find(r => r.id === requestId);
    if (!request) {
        console.error('Request not found:', requestId);
        return;
    }
    
    if (!confirm(`Одобрить заявку на ${request.type === 'changeMain' ? 'смену основного филиала' : 'присоединение к филиалу'}?`)) {
        return;
    }
    
    showRequestLoading(requestId);
    
    try {
        const userRef = db.collection('users').doc(request.userId);
        const requestRef = db.collection('branchRequests').doc(requestId);
        
        // Обновляем данные пользователя в зависимости от типа заявки
        if (request.type === 'changeMain') {
            // Смена основного филиала
            await userRef.update({
                branchId: request.requestedBranchId,
                lastBranchChange: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Добавление дополнительного филиала
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            const additionalBranches = userData.additionalBranchIds || [];
            
            if (!additionalBranches.includes(request.requestedBranchId)) {
                additionalBranches.push(request.requestedBranchId);
                await userRef.update({
                    additionalBranchIds: additionalBranches
                });
            }
        }
        
        // Обновляем статус заявки
        await requestRef.update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: window.adminState.currentUser?.id || window.adminState.currentUser?.uid
        });
        
        // Обновляем локальное состояние
        const requestIndex = window.adminState.branchRequests.findIndex(r => r.id === requestId);
        if (requestIndex !== -1) {
            window.adminState.branchRequests[requestIndex].status = 'approved';
        }
        
        // Обновляем данные пользователя в локальном состоянии
        const userIndex = window.adminState.users.findIndex(u => u.id === request.userId);
        if (userIndex !== -1) {
            const userRef = db.collection('users').doc(request.userId);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
                window.adminState.users[userIndex] = { id: request.userId, ...userDoc.data() };
            }
        }
        
        showSuccess('Заявка одобрена');
        displayBranchRequests();
        
        // Обновляем список пользователей
        const { displayUsers } = await import('./usersModule.js');
        displayUsers();
        
        // Вызываем событие обновления данных
        window.dispatchEvent(new Event('admin-data-updated'));
        
    } catch (error) {
        console.error('Error approving request:', error);
        showError('Ошибка при одобрении заявки');
    } finally {
        hideRequestLoading(requestId);
    }
}

/**
 * Показать диалог отклонения
 */
function showRejectDialog(requestId) {
    const reason = prompt('Укажите причину отклонения заявки:');
    if (reason === null) return; // Отмена
    
    rejectRequest(requestId, reason || 'Без указания причины');
}

/**
 * Отклонение заявки
 */
async function rejectRequest(requestId, reason) {
    const request = window.adminState.branchRequests.find(r => r.id === requestId);
    if (!request) {
        console.error('Request not found:', requestId);
        return;
    }
    
    showRequestLoading(requestId);
    
    try {
        const requestRef = db.collection('branchRequests').doc(requestId);
        
        // Обновляем статус заявки
        await requestRef.update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: window.adminState.currentUser?.id || window.adminState.currentUser?.uid,
            rejectionReason: reason
        });
        
        // Обновляем локальное состояние
        const requestIndex = window.adminState.branchRequests.findIndex(r => r.id === requestId);
        if (requestIndex !== -1) {
            window.adminState.branchRequests[requestIndex].status = 'rejected';
        }
        
        // Создаем уведомление для пользователя
        await db.collection('notifications').add({
            userId: request.userId,
            type: 'branchRequestRejected',
            requestType: request.type,
            branchId: request.requestedBranchId,
            reason: reason,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        showSuccess('Заявка отклонена');
        displayBranchRequests();
        
        // Вызываем событие обновления данных
        window.dispatchEvent(new Event('admin-data-updated'));
        
    } catch (error) {
        console.error('Error rejecting request:', error);
        showError('Ошибка при отклонении заявки');
    } finally {
        hideRequestLoading(requestId);
    }
}

/**
 * Показать состояние загрузки
 */
function showRequestLoading(requestId) {
    const card = document.querySelector(`[data-request-id="${requestId}"]`);
    if (card) {
        card.classList.add('loading');
        const buttons = card.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
    }
}

/**
 * Скрыть состояние загрузки
 */
function hideRequestLoading(requestId) {
    const card = document.querySelector(`[data-request-id="${requestId}"]`);
    if (card) {
        card.classList.remove('loading');
        const buttons = card.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Показать успешное сообщение
 */
function showSuccess(message) {
    // Используем существующую систему уведомлений админ панели
    if (window.showNotification) {
        window.showNotification(message, 'success');
    } else {
        alert(message);
    }
}

/**
 * Показать сообщение об ошибке
 */
function showError(message) {
    // Используем существующую систему уведомлений админ панели
    if (window.showNotification) {
        window.showNotification(message, 'error');
    } else {
        alert(message);
    }
}

// Экспортируем функции для onclick обработчиков
window.adminBranchRequests = {
    approveRequest,
    showRejectDialog
};

// Подписка на обновление данных админки
window.addEventListener('admin-data-updated', () => {
    const { branchRequests } = window.adminState;
    if (branchRequests) {
        const pendingRequests = branchRequests.filter(r => r.status === 'pending');
        updateBranchRequestsCount(pendingRequests.length);
    }
});
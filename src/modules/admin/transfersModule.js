/**
 * Transfers Module
 * Модуль управления заявками на перевод
 * 
 * Функционал:
 * - Отображение заявок на перевод
 * - Одобрение/отклонение заявок
 * - История переводов
 */

// ====================================
// ОТОБРАЖЕНИЕ ЗАЯВОК
// ====================================

/**
 * Отображает список заявок на перевод
 */
export function displayTransfers() {
    const container = document.getElementById('transfers-list');
    if (!container) return;
    
    const { transfers, users, branches } = window.adminState;
    
    if (transfers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Нет активных заявок на перевод</p>
                <p style="font-size: 14px; color: #999;">
                    Заявки появятся здесь, когда пользователи запросят перевод между филиалами
                </p>
            </div>
        `;
        return;
    }
    
    // Сортируем по дате (новые сверху)
    const sortedTransfers = [...transfers].sort((a, b) => {
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
    
    // Генерируем карточки заявок
    container.innerHTML = sortedTransfers.map(transfer => 
        createTransferCard(transfer, users, branches)
    ).join('');
}

/**
 * Создает HTML карточки заявки
 */
function createTransferCard(transfer, users, branches) {
    const user = users.find(u => u.id === transfer.userId);
    const fromBranch = branches.find(b => b.id === transfer.fromBranchId);
    const toBranch = branches.find(b => b.id === transfer.toBranchId);
    
    if (!user || !fromBranch || !toBranch) {
        console.error('Invalid transfer data', transfer);
        return '';
    }
    
    return `
        <div class="transfer-card" data-transfer-id="${transfer.id}">
            <div class="transfer-info">
                <h4>
                    <img src="${user.photoURL || getAvatarPlaceholder(user)}" 
                         alt="${user.name}" 
                         class="user-avatar-small">
                    ${user.name || user.email}
                </h4>
                
                <div class="transfer-branches">
                    <div class="branch-tag">
                        <i class="fas fa-building"></i>
                        ${fromBranch.name}
                    </div>
                    <i class="fas fa-arrow-right arrow-icon"></i>
                    <div class="branch-tag">
                        <i class="fas fa-building"></i>
                        ${toBranch.name}
                    </div>
                </div>
                
                ${transfer.reason ? `
                    <p class="transfer-reason">
                        <i class="fas fa-comment"></i>
                        ${transfer.reason}
                    </p>
                ` : ''}
                
                <small class="transfer-date">
                    <i class="fas fa-clock"></i>
                    ${formatDate(transfer.createdAt)}
                </small>
            </div>
            
            <div class="transfer-actions">
                <button class="button small success" 
                        onclick="window.adminModules.transfers.approveTransfer('${transfer.id}')"
                        title="Одобрить">
                    <i class="fas fa-check"></i>
                    <span>Одобрить</span>
                </button>
                <button class="button small danger" 
                        onclick="window.adminModules.transfers.rejectTransfer('${transfer.id}')"
                        title="Отклонить">
                    <i class="fas fa-times"></i>
                    <span>Отклонить</span>
                </button>
            </div>
        </div>
    `;
}

// ====================================
// ДЕЙСТВИЯ С ЗАЯВКАМИ
// ====================================

/**
 * Одобряет заявку на перевод
 */
export async function approveTransfer(transferId) {
    const transfer = window.adminState.transfers.find(t => t.id === transferId);
    if (!transfer) return;
    
    const user = window.adminState.users.find(u => u.id === transfer.userId);
    const toBranch = window.adminState.branches.find(b => b.id === transfer.toBranchId);
    
    if (!user || !toBranch) {
        showNotification('Ошибка: не найден пользователь или филиал', 'error');
        return;
    }
    
    if (!confirm(`Перевести пользователя ${user.name || user.email} в филиал "${toBranch.name}"?`)) {
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Начинаем транзакцию
        await db.runTransaction(async (transaction) => {
            // Обновляем пользователя
            transaction.update(db.collection('users').doc(transfer.userId), {
                branchId: transfer.toBranchId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Обновляем заявку
            transaction.update(db.collection('transferRequests').doc(transferId), {
                status: 'approved',
                processedBy: window.adminState.currentUser.id,
                processedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        // Обновляем локальное состояние
        user.branchId = transfer.toBranchId;
        
        // Удаляем из списка активных заявок
        window.adminState.transfers = window.adminState.transfers.filter(t => t.id !== transferId);
        
        // Обновляем отображение
        displayTransfers();
        
        // Обновляем список пользователей если он открыт
        if (window.adminState.currentTab === 'users') {
            const { displayUsers } = await import('./usersModule.js');
            displayUsers();
        }
        
        // Показываем уведомление
        showNotification(`Пользователь переведен в филиал "${toBranch.name}"`, 'success');
        
    } catch (error) {
        console.error('Error approving transfer:', error);
        showNotification('Ошибка при обработке заявки', 'error');
    }
}

/**
 * Отклоняет заявку на перевод
 */
export async function rejectTransfer(transferId) {
    const transfer = window.adminState.transfers.find(t => t.id === transferId);
    if (!transfer) return;
    
    const reason = prompt('Укажите причину отклонения (необязательно):');
    
    if (reason === null) {
        // Пользователь отменил
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Обновляем заявку
        await db.collection('transferRequests').doc(transferId).update({
            status: 'rejected',
            rejectionReason: reason || null,
            processedBy: window.adminState.currentUser.id,
            processedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Удаляем из списка активных заявок
        window.adminState.transfers = window.adminState.transfers.filter(t => t.id !== transferId);
        
        // Обновляем отображение
        displayTransfers();
        
        // Показываем уведомление
        showNotification('Заявка отклонена', 'info');
        
    } catch (error) {
        console.error('Error rejecting transfer:', error);
        showNotification('Ошибка при отклонении заявки', 'error');
    }
}

// ====================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================================

/**
 * Форматирует дату
 */
function formatDate(timestamp) {
    if (!timestamp) return 'Неизвестно';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Менее минуты назад
    if (diff < 60000) {
        return 'Только что';
    }
    
    // Менее часа назад
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} ${getPlural(minutes, 'минуту', 'минуты', 'минут')} назад`;
    }
    
    // Менее суток назад
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} ${getPlural(hours, 'час', 'часа', 'часов')} назад`;
    }
    
    // Более суток назад
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
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
 * Генерирует заглушку для аватара
 */
function getAvatarPlaceholder(user) {
    const initials = (user.name || user.email || '?')
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
                   '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800'];
    const colorIndex = user.id.charCodeAt(0) % colors.length;
    const color = colors[colorIndex];
    
    const svg = `
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" fill="${color}" rx="12"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".35em" 
                  fill="white" font-size="12" font-weight="600">
                ${initials}
            </text>
        </svg>
    `;
    
    // Кодируем SVG с поддержкой Unicode
    try {
        const encoded = btoa(unescape(encodeURIComponent(svg)));
        return `data:image/svg+xml;base64,${encoded}`;
    } catch (e) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
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
window.adminModules.transfers = {
    approveTransfer,
    rejectTransfer
};
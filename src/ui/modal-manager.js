/**
 * ===================================================================
 * MODAL MANAGER MODULE
 * ===================================================================
 * Модуль для управления модальными окнами, уведомлениями и диалогами
 * 
 * Функции:
 * - showNotification() - показ уведомлений с анимацией
 * - showConfirmDialog() - диалоги подтверждения
 * - showModal() - управление модальными окнами
 * - closeModal() - закрытие модальных окон
 * - showToast() - быстрые toast сообщения
 */

// ====================================
// NOTIFICATION SYSTEM
// ====================================

/**
 * Показывает уведомление пользователю с анимацией
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления: 'info', 'success', 'warning', 'error'
 * @param {number} duration - Длительность показа в миллисекундах (по умолчанию 3000)
 */
export function showNotification(message, type = 'info', duration = 3000) {
    console.log('📢 [ModalManager] showNotification:', message, type);
    
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--container-background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px 20px;
        font-size: 0.9rem;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Цветовая схема в зависимости от типа
    switch (type) {
        case 'success':
            notification.style.borderColor = '#10b981';
            notification.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            break;
        case 'error':
            notification.style.borderColor = '#ef4444';
            notification.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            break;
        case 'warning':
            notification.style.borderColor = '#f59e0b';
            notification.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            break;
        case 'info':
        default:
            notification.style.borderColor = '#3b82f6';
            notification.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            break;
    }
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Показываем с анимацией
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Скрываем через заданное время
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    return notification;
}

/**
 * Быстрые методы для разных типов уведомлений
 */
export function showSuccess(message, duration = 3000) {
    return showNotification(message, 'success', duration);
}

export function showError(message, duration = 3000) {
    return showNotification(message, 'error', duration);
}

export function showWarning(message, duration = 3000) {
    return showNotification(message, 'warning', duration);
}

export function showInfo(message, duration = 3000) {
    return showNotification(message, 'info', duration);
}

// ====================================
// MODAL SYSTEM
// ====================================

/**
 * Показывает модальное окно
 * @param {string} modalId - ID модального окна
 * @param {Object} options - Опции отображения
 */
export function showModal(modalId, options = {}) {
    console.log('🎭 [ModalManager] showModal:', modalId);
    
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('❌ Modal not found:', modalId);
        return false;
    }
    
    // Добавляем класс показа
    modal.classList.add('show');
    
    // Опциональная блокировка скролла
    if (options.blockScroll !== false) {
        document.body.style.overflow = 'hidden';
    }
    
    // Фокус на первом элементе
    if (options.autoFocus !== false) {
        const firstInput = modal.querySelector('input, button, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
    
    return true;
}

/**
 * Закрывает модальное окно
 * @param {string} modalId - ID модального окна
 */
export function closeModal(modalId) {
    console.log('🎭 [ModalManager] closeModal:', modalId);
    
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('❌ Modal not found:', modalId);
        return false;
    }
    
    // Убираем класс показа
    modal.classList.remove('show');
    
    // Восстанавливаем скролл
    document.body.style.overflow = '';
    
    return true;
}

/**
 * Закрывает все открытые модальные окна
 */
export function closeAllModals() {
    console.log('🎭 [ModalManager] closeAllModals');
    
    const modals = document.querySelectorAll('.global-fullscreen-overlay.show');
    modals.forEach(modal => {
        modal.classList.remove('show');
    });
    
    // Восстанавливаем скролл
    document.body.style.overflow = '';
}

// ====================================
// CONFIRMATION DIALOGS
// ====================================

/**
 * Показывает диалог подтверждения
 * @param {string} message - Текст вопроса
 * @param {Object} options - Опции диалога
 * @returns {Promise<boolean>} - true если подтверждено, false если отменено
 */
export function showConfirmDialog(message, options = {}) {
    return new Promise((resolve) => {
        console.log('❓ [ModalManager] showConfirmDialog:', message);
        
        const {
            title = 'Подтверждение',
            confirmText = 'Да',
            cancelText = 'Отмена',
            type = 'info'
        } = options;
        
        // Создаем элементы диалога
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.style.cssText = `
            background: var(--container-background-color);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            margin: 20px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: var(--text-color); font-size: 1.2rem;">${title}</h3>
            <p style="margin: 0 0 24px 0; color: var(--text-color); line-height: 1.5;">${message}</p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="cancel-btn" style="
                    padding: 8px 16px;
                    border: 1px solid var(--border-color);
                    background: transparent;
                    color: var(--text-color);
                    border-radius: 6px;
                    cursor: pointer;
                ">${cancelText}</button>
                <button class="confirm-btn" style="
                    padding: 8px 16px;
                    border: 1px solid #3b82f6;
                    background: #3b82f6;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                ">${confirmText}</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Обработчики событий
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        const cleanup = () => {
            document.body.removeChild(overlay);
        };
        
        confirmBtn.onclick = () => {
            cleanup();
            resolve(true);
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };
        
        // Закрытие по клику вне диалога
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        };
        
        // Закрытие по Escape
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKeydown);
                cleanup();
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Фокус на кнопке подтверждения
        setTimeout(() => confirmBtn.focus(), 100);
    });
}

// ====================================
// TOAST SYSTEM
// ====================================

/**
 * Показывает быстрое toast сообщение
 * @param {string} message - Текст сообщения
 * @param {Object} options - Опции toast
 */
export function showToast(message, options = {}) {
    const {
        type = 'info',
        duration = 2000,
        position = 'bottom-right'
    } = options;
    
    console.log('🍞 [ModalManager] showToast:', message, type);
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Позиционирование
    const positions = {
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' }
    };
    
    const pos = positions[position] || positions['bottom-right'];
    
    toast.style.cssText = `
        position: fixed;
        ${Object.entries(pos).map(([key, value]) => `${key}: ${value}`).join('; ')};
        background: var(--container-background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 0.8rem;
        z-index: 10002;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        max-width: 250px;
    `;
    
    document.body.appendChild(toast);
    
    // Показываем с анимацией
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 50);
    
    // Скрываем
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
    
    return toast;
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Проверяет, открыто ли модальное окно
 * @param {string} modalId - ID модального окна
 * @returns {boolean}
 */
export function isModalOpen(modalId) {
    const modal = document.getElementById(modalId);
    return modal ? modal.classList.contains('show') : false;
}

/**
 * Получает все открытые модальные окна
 * @returns {NodeList}
 */
export function getOpenModals() {
    return document.querySelectorAll('.global-fullscreen-overlay.show');
}

// ====================================
// MODULE METADATA
// ====================================

export const metadata = {
    name: 'ModalManager',
    version: '2.0.0',
    description: 'Полноценный модуль для управления модальными окнами, уведомлениями и диалогами',
    functions: [
        'showNotification',
        'showSuccess',
        'showError', 
        'showWarning',
        'showInfo',
        'showModal',
        'closeModal',
        'closeAllModals',
        'showConfirmDialog',
        'showToast',
        'isModalOpen',
        'getOpenModals'
    ]
};
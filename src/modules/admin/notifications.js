/**
 * Notifications Module
 * Модуль для отображения уведомлений
 * 
 * Показывает красивые всплывающие уведомления
 * с автоматическим скрытием
 */

// ====================================
// НАСТРОЙКИ
// ====================================

const NOTIFICATION_DURATION = 3000; // 3 секунды
const ANIMATION_DURATION = 300; // 300мс

// ====================================
// ИНИЦИАЛИЗАЦИЯ
// ====================================

// Создаем контейнер для уведомлений при загрузке
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('notifications-container')) {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        
        // Добавляем стили
        addNotificationStyles();
    }
});

// ====================================
// ОСНОВНАЯ ФУНКЦИЯ
// ====================================

/**
 * Показывает уведомление
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Длительность показа (мс)
 */
export function showNotification(message, type = 'info', duration = NOTIFICATION_DURATION) {
    const container = document.getElementById('notifications-container');
    if (!container) {
        console.error('Notifications container not found');
        return;
    }
    
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Иконка
    const icon = getIcon(type);
    
    // HTML структура
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Добавляем в контейнер
    container.appendChild(notification);
    
    // Анимация появления
    requestAnimationFrame(() => {
        notification.classList.add('notification-show');
    });
    
    // Автоматическое скрытие
    if (duration > 0) {
        setTimeout(() => {
            hideNotification(notification);
        }, duration);
    }
}

/**
 * Скрывает уведомление с анимацией
 */
function hideNotification(notification) {
    notification.classList.remove('notification-show');
    notification.classList.add('notification-hide');
    
    setTimeout(() => {
        notification.remove();
    }, ANIMATION_DURATION);
}

/**
 * Возвращает иконку для типа уведомления
 */
function getIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    return icons[type] || icons.info;
}

// ====================================
// СТИЛИ
// ====================================

/**
 * Добавляет стили для уведомлений
 */
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .notifications-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2000;
            pointer-events: none;
        }
        
        .notification {
            background: var(--card-bg, #1e1e1e);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            margin-bottom: 10px;
            padding: 16px;
            min-width: 300px;
            max-width: 500px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            pointer-events: all;
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease-out;
        }
        
        .notification-show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .notification-hide {
            transform: translateX(400px);
            opacity: 0;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .notification-content i {
            font-size: 20px;
        }
        
        .notification-close {
            background: transparent;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }
        
        .notification-close:hover {
            color: #fff;
        }
        
        /* Типы уведомлений */
        .notification-success {
            border-left: 4px solid #4CAF50;
        }
        
        .notification-success .notification-content i {
            color: #4CAF50;
        }
        
        .notification-error {
            border-left: 4px solid #f44336;
        }
        
        .notification-error .notification-content i {
            color: #f44336;
        }
        
        .notification-warning {
            border-left: 4px solid #ff9800;
        }
        
        .notification-warning .notification-content i {
            color: #ff9800;
        }
        
        .notification-info {
            border-left: 4px solid #2196F3;
        }
        
        .notification-info .notification-content i {
            color: #2196F3;
        }
        
        /* Мобильные стили */
        @media (max-width: 768px) {
            .notifications-container {
                top: 10px;
                left: 10px;
                right: 10px;
            }
            
            .notification {
                min-width: auto;
                max-width: none;
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ====================================
// ЭКСПОРТ
// ====================================

// Делаем функцию глобально доступной
window.showNotification = showNotification;
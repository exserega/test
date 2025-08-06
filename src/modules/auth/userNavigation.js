// ====================================
// 🚀 USER NAVIGATION MODULE
// ====================================
// Обработка кнопки "Профиль" в нижней навигации
// Для гостей показывает предложение зарегистрироваться
// ====================================

import { isUserGuest, showGuestProfileMessage } from './authCheck.js';
import logger from '../../utils/logger.js';

/**
 * Инициализирует обработчик кнопки пользователя
 */
export function initUserNavigation() {
    const userButton = document.getElementById('toggle-user');
    
    if (!userButton) {
        logger.warn('User navigation button not found');
        return;
    }
    
    userButton.addEventListener('click', () => {
        // Проверяем, является ли пользователь гостем
        if (isUserGuest()) {
            showGuestProfileMessage();
            return;
        }
        
        // Для зарегистрированных пользователей - переход на страницу настроек
        window.location.href = '/public/settings.html';
    });
    
    logger.log('👤 User navigation initialized');
}
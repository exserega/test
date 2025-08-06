// First Admin Modal Module
// Модальное окно для настройки первого администратора

import { setupFirstAdmin, checkAndOfferAdminSetup } from './firstAdminSetup.js';

let modalShown = false;

/**
 * Создать и показать модальное окно
 */
function showFirstAdminModal(userEmail) {
    if (modalShown) return;
    modalShown = true;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'first-admin-modal';
    modal.innerHTML = `
        <div class="first-admin-content">
            <div class="first-admin-icon">
                <i class="fas fa-crown"></i>
            </div>
            <h2>Добро пожаловать!</h2>
            <p class="first-admin-subtitle">
                Вы первый пользователь системы
            </p>
            <div class="first-admin-info">
                <p>Как первый зарегистрированный пользователь, вы можете стать администратором системы.</p>
                <p class="user-email"><i class="fas fa-user"></i> ${userEmail}</p>
            </div>
            <div class="first-admin-features">
                <h3>Возможности администратора:</h3>
                <ul>
                    <li><i class="fas fa-users"></i> Управление пользователями и ролями</li>
                    <li><i class="fas fa-building"></i> Создание и управление филиалами</li>
                    <li><i class="fas fa-exchange-alt"></i> Обработка заявок на перевод</li>
                    <li><i class="fas fa-cog"></i> Полный доступ к настройкам системы</li>
                </ul>
            </div>
            <div class="first-admin-actions">
                <button class="btn-primary" id="accept-admin-btn">
                    <i class="fas fa-check"></i> Стать администратором
                </button>
                <button class="btn-secondary" id="decline-admin-btn">
                    <i class="fas fa-times"></i> Отказаться
                </button>
            </div>
            <p class="first-admin-note">
                <i class="fas fa-info-circle"></i> 
                Это предложение показывается только первому пользователю системы
            </p>
        </div>
    `;
    
    // Добавляем стили
    if (!document.getElementById('first-admin-styles')) {
        const styles = document.createElement('style');
        styles.id = 'first-admin-styles';
        styles.textContent = `
            .first-admin-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .first-admin-content {
                background: var(--bg-secondary);
                border-radius: 16px;
                padding: 2.5rem;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.3s ease;
            }
            
            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .first-admin-icon {
                text-align: center;
                font-size: 4rem;
                color: var(--accent-color);
                margin-bottom: 1rem;
                animation: bounce 1s ease infinite;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .first-admin-content h2 {
                text-align: center;
                color: var(--text-color);
                margin-bottom: 0.5rem;
                font-size: 2rem;
            }
            
            .first-admin-subtitle {
                text-align: center;
                color: var(--text-secondary);
                margin-bottom: 1.5rem;
                font-size: 1.1rem;
            }
            
            .first-admin-info {
                background: var(--bg-color);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1.5rem;
            }
            
            .first-admin-info p {
                margin: 0.5rem 0;
                color: var(--text-color);
            }
            
            .user-email {
                text-align: center;
                font-weight: bold;
                color: var(--accent-color) !important;
            }
            
            .first-admin-features {
                margin-bottom: 2rem;
            }
            
            .first-admin-features h3 {
                color: var(--text-color);
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }
            
            .first-admin-features ul {
                list-style: none;
                padding: 0;
            }
            
            .first-admin-features li {
                padding: 0.5rem 0;
                color: var(--text-secondary);
            }
            
            .first-admin-features li i {
                color: var(--accent-color);
                margin-right: 0.75rem;
                width: 20px;
                text-align: center;
            }
            
            .first-admin-actions {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .first-admin-actions button {
                flex: 1;
                padding: 0.75rem;
                font-size: 1rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .first-admin-actions .btn-primary {
                background: var(--accent-color);
                color: white;
                border: none;
            }
            
            .first-admin-actions .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
            }
            
            .first-admin-actions .btn-secondary {
                background: transparent;
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
            }
            
            .first-admin-actions .btn-secondary:hover {
                background: var(--hover-color);
            }
            
            .first-admin-note {
                text-align: center;
                color: var(--text-secondary);
                font-size: 0.85rem;
                margin: 0;
            }
            
            .first-admin-note i {
                color: var(--accent-color);
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    
    // Обработчики
    document.getElementById('accept-admin-btn').addEventListener('click', async () => {
        const btn = document.getElementById('accept-admin-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Настройка...';
        
        try {
            const result = await setupFirstAdmin(firebase.auth().currentUser.uid);
            
            if (result.success) {
                modal.innerHTML = `
                    <div class="first-admin-content">
                        <div class="first-admin-icon">
                            <i class="fas fa-check-circle" style="color: #4caf50;"></i>
                        </div>
                        <h2>Поздравляем!</h2>
                        <p class="first-admin-subtitle">Вы теперь администратор системы</p>
                        <div class="first-admin-info">
                            <p>✅ Права администратора активированы</p>
                            <p>✅ Создан основной филиал</p>
                            <p>✅ Вы привязаны к филиалу</p>
                        </div>
                        <div class="first-admin-actions">
                            <button class="btn-primary" onclick="window.location.reload()">
                                <i class="fas fa-rocket"></i> Начать работу
                            </button>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error setting up admin:', error);
            alert('Ошибка при настройке администратора: ' + error.message);
        }
    });
    
    document.getElementById('decline-admin-btn').addEventListener('click', () => {
        if (confirm('Вы уверены? Это предложение больше не появится.')) {
            modal.remove();
            // Сохраняем отказ в localStorage
            localStorage.setItem('first_admin_declined', 'true');
        }
    });
}

/**
 * Проверить и показать модальное окно при необходимости
 */
export async function checkAndShowFirstAdminModal() {
    // Проверяем, не отказался ли пользователь ранее
    if (localStorage.getItem('first_admin_declined') === 'true') {
        // Очищаем флаг для нового пользователя
        localStorage.removeItem('first_admin_declined');
    }
    
    try {
        const result = await checkAndOfferAdminSetup();
        
        if (result.shouldOffer) {
            // Показываем модальное окно через небольшую задержку
            setTimeout(() => {
                showFirstAdminModal(result.userEmail);
            }, 2000);
        }
    } catch (error) {
        console.error('Error checking first admin offer:', error);
    }
}

export default {
    checkAndShowFirstAdminModal
};
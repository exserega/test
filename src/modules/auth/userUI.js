// ====================================
// 👤 USER UI MODULE
// ====================================
// Управление отображением информации о пользователе

import { logout } from './authCheck.js';

// ====================================
// DOM ELEMENTS
// ====================================

const elements = {
    userName: document.getElementById('user-name'),
    userMenuButton: document.getElementById('user-menu-button'),
    userDropdown: document.getElementById('user-dropdown'),
    dropdownUserName: document.getElementById('dropdown-user-name'),
    dropdownUserEmail: document.getElementById('dropdown-user-email'),
    adminLink: document.getElementById('admin-link'),
    logoutButton: document.getElementById('logout-button')
};

// ====================================
// UPDATE USER UI
// ====================================

/**
 * Обновляет UI с информацией о пользователе
 * @param {Object} user - Объект пользователя
 */
export function updateUserUI(user) {
    if (!user) {
        console.warn('No user data to display');
        return;
    }
    
    // Определяем отображаемое имя
    const displayName = user.name || user.email?.split('@')[0] || user.phone || 'Пользователь';
    
    // Обновляем имя в header
    if (elements.userName) {
        elements.userName.textContent = displayName;
    }
    
    // Обновляем dropdown
    if (elements.dropdownUserName) {
        elements.dropdownUserName.textContent = displayName;
    }
    
    if (elements.dropdownUserEmail) {
        const contactInfo = user.email || user.phone || '';
        elements.dropdownUserEmail.textContent = contactInfo;
    }
    
    // Показываем админ-ссылку если пользователь админ
    if (elements.adminLink && user.role === 'admin') {
        elements.adminLink.style.display = 'flex';
    }
    
    // Добавляем индикатор статуса
    if (user.status === 'pending') {
        addPendingBadge();
    }
    
    console.log('👤 User UI updated:', displayName);
}

// ====================================
// STATUS INDICATORS
// ====================================

/**
 * Добавляет индикатор ожидания подтверждения
 */
function addPendingBadge() {
    if (!elements.userName) return;
    
    const badge = document.createElement('span');
    badge.className = 'user-status-badge pending';
    badge.title = 'Ожидает подтверждения администратора';
    badge.innerHTML = '<i class="fas fa-clock"></i>';
    
    elements.userName.appendChild(badge);
}

// ====================================
// DROPDOWN HANDLERS
// ====================================

/**
 * Инициализирует обработчики dropdown меню
 */
export function initUserDropdown() {
    if (!elements.userMenuButton || !elements.userDropdown) {
        console.warn('User dropdown elements not found');
        return;
    }
    
    // Toggle dropdown
    elements.userMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.userDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.userDropdown.contains(e.target) && 
            !elements.userMenuButton.contains(e.target)) {
            elements.userDropdown.classList.remove('show');
        }
    });
    
    // Logout handler
    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите выйти?')) {
                await logout();
            }
        });
    }
    
    console.log('👤 User dropdown initialized');
}

// ====================================
// STYLES
// ====================================

// Добавляем стили для статусного бейджа
const style = document.createElement('style');
style.textContent = `
    .user-status-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        margin-left: 6px;
        font-size: 10px;
    }
    
    .user-status-badge.pending {
        background: var(--accent-warning);
        color: white;
    }
`;
document.head.appendChild(style);
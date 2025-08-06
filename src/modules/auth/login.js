// ====================================
// 🔐 LOGIN MODULE
// ====================================
// Модуль авторизации пользователей
// Поддерживает: Email, Google, Apple, Guest
// Новые пользователи получают статус 'pending'
// ====================================

import logger from '../../utils/logger.js';

// Firebase references
const auth = window.firebase.auth();
const db = window.firebase.firestore();

// DOM elements
const elements = {
    // Screens
    mainAuth: document.getElementById('main-auth'),
    emailForm: document.getElementById('email-form'),
    registerForm: document.getElementById('register-form'),
    
    // Buttons
    googleBtn: document.getElementById('google-login-btn'),
    emailBtn: document.getElementById('email-login-btn'),
    appleBtn: document.getElementById('apple-login-btn'),
    guestBtn: document.getElementById('guest-login-btn'),
    showRegisterBtn: document.getElementById('show-register'),
    backFromEmail: document.getElementById('back-from-email'),
    backFromRegister: document.getElementById('back-from-register'),
    
    // Forms
    loginForm: document.getElementById('login-form'),
    registerFormElement: document.getElementById('register-form-element'),
    
    // Messages
    authMessage: document.getElementById('auth-message'),
    authLoading: document.getElementById('auth-loading')
};

// ====================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================================

// Показать сообщение
function showMessage(message, type = 'error') {
    elements.authMessage.textContent = message;
    elements.authMessage.className = `auth-message ${type}`;
    elements.authMessage.style.display = 'block';
    
    setTimeout(() => {
        elements.authMessage.style.display = 'none';
    }, 5000);
}

// Показать/скрыть загрузку
function showLoading(show = true) {
    elements.authLoading.style.display = show ? 'flex' : 'none';
}

// Переключение экранов
function showScreen(screenId) {
    document.querySelectorAll('.auth-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

// ====================================
// СОЗДАНИЕ/ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
// ====================================

async function createOrUpdateUser(user, additionalData = {}) {
    const userRef = db.collection('users').doc(user.uid);
    
    try {
        const doc = await userRef.get();
        const now = new Date();
        
        if (!doc.exists) {
            // Новый пользователь
            const userData = {
                email: user.email || null,
                name: additionalData.name || user.displayName || 'Пользователь',
                phone: user.phoneNumber || null,
                status: additionalData.isGuest ? 'guest' : 'pending', // Гость или pending
                role: 'user',
                createdAt: now,
                updatedAt: now,
                lastLogin: now,
                photoURL: user.photoURL || null,
                ...additionalData
            };
            
            await userRef.set(userData);
            logger.log('✅ Новый пользователь создан:', userData);
        } else {
            // Существующий пользователь - обновляем lastLogin
            await userRef.update({
                lastLogin: now,
                updatedAt: now
            });
            logger.log('✅ Пользователь обновлен');
        }
        
        return true;
    } catch (error) {
        logger.error('❌ Ошибка создания/обновления пользователя:', error);
        throw error;
    }
}

// ====================================
// МЕТОДЫ АВТОРИЗАЦИИ
// ====================================

// Google Login
async function handleGoogleLogin() {
    showLoading();
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        await createOrUpdateUser(result.user);
        
        logger.log('✅ Google авторизация успешна');
        showMessage('Вход выполнен успешно!', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        logger.error('❌ Google login error:', error);
        showMessage(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
}

// Apple Login
async function handleAppleLogin() {
    showLoading();
    
    try {
        const provider = new firebase.auth.OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        
        const result = await auth.signInWithPopup(provider);
        
        await createOrUpdateUser(result.user);
        
        logger.log('✅ Apple авторизация успешна');
        showMessage('Вход выполнен успешно!', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        logger.error('❌ Apple login error:', error);
        showMessage(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
}

// Guest Login
async function handleGuestLogin() {
    showLoading();
    
    try {
        // Создаем анонимного пользователя
        const result = await auth.signInAnonymously();
        
        // НЕ создаем запись в БД для гостей!
        // Гости должны быть полностью анонимными
        
        logger.log('✅ Гостевой вход выполнен');
        showMessage('Вы вошли как гость', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        logger.error('❌ Guest login error:', error);
        
        // Специальная обработка для отключенной анонимной авторизации
        if (error.code === 'auth/admin-restricted-operation' || 
            error.code === 'auth/operation-not-allowed') {
            showMessage('Гостевой вход временно недоступен. Используйте email или Google для входа.', 'error');
            
            // Автоматически предлагаем email вход
            setTimeout(() => {
                if (confirm('Хотите войти через email?')) {
                    showScreen('email-form');
                }
            }, 1000);
        } else {
            showMessage(getErrorMessage(error.code) || 'Ошибка гостевого входа. Попробуйте другой способ.');
        }
    } finally {
        showLoading(false);
    }
}

// Email Login
async function handleEmailLogin(e) {
    e.preventDefault();
    showLoading();
    
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        
        await createOrUpdateUser(result.user);
        
        logger.log('✅ Email авторизация успешна');
        showMessage('Вход выполнен успешно!', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        logger.error('❌ Email login error:', error);
        showMessage(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
}

// Register
async function handleRegister(e) {
    e.preventDefault();
    showLoading();
    
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;
    
    if (password !== confirmPassword) {
        showMessage('Пароли не совпадают');
        showLoading(false);
        return;
    }
    
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        
        // Обновляем displayName
        await result.user.updateProfile({
            displayName: name
        });
        
        await createOrUpdateUser(result.user, { name });
        
        logger.log('✅ Регистрация успешна');
        showMessage('Регистрация успешна! Ожидайте подтверждения администратора.', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        
    } catch (error) {
        logger.error('❌ Register error:', error);
        showMessage(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
}

// ====================================
// ОБРАБОТКА ОШИБОК
// ====================================

function getErrorMessage(errorCode) {
    const errors = {
        'auth/email-already-in-use': 'Email уже используется',
        'auth/invalid-email': 'Неверный формат email',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/weak-password': 'Пароль слишком простой (минимум 6 символов)',
        'auth/popup-closed-by-user': 'Вход отменен',
        'auth/cancelled-popup-request': 'Вход отменен',
        'auth/account-exists-with-different-credential': 'Аккаунт уже существует с другим способом входа',
        'auth/network-request-failed': 'Ошибка сети. Проверьте подключение к интернету',
        'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
        'default': 'Произошла ошибка. Попробуйте еще раз'
    };
    return errors[errorCode] || errors.default;
}

// ====================================
// ИНИЦИАЛИЗАЦИЯ
// ====================================

function init() {
    // Google login
    if (elements.googleBtn) {
        elements.googleBtn.addEventListener('click', handleGoogleLogin);
    }
    
    // Apple login
    if (elements.appleBtn) {
        elements.appleBtn.addEventListener('click', handleAppleLogin);
    }
    
    // Guest login
    if (elements.guestBtn) {
        elements.guestBtn.addEventListener('click', handleGuestLogin);
    }
    
    // Email button
    if (elements.emailBtn) {
        elements.emailBtn.addEventListener('click', () => {
            showScreen('email-form');
        });
    }
    
    // Show register
    if (elements.showRegisterBtn) {
        elements.showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('register-form');
        });
    }
    
    // Back buttons
    if (elements.backFromEmail) {
        elements.backFromEmail.addEventListener('click', () => {
            showScreen('main-auth');
        });
    }
    
    if (elements.backFromRegister) {
        elements.backFromRegister.addEventListener('click', () => {
            showScreen('main-auth');
        });
    }
    
    // Forms
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleEmailLogin);
    }
    
    if (elements.registerFormElement) {
        elements.registerFormElement.addEventListener('submit', handleRegister);
    }
    
    // Проверяем, не авторизован ли уже пользователь
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.includes('login.html')) {
            window.location.href = '/';
        }
    });
}

// Запуск при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

logger.log('🔐 Login module initialized');
// ====================================
// 🔐 AUTH CHECK MODULE
// ====================================
// Проверка авторизации и прав доступа
// ====================================

import logger from '../../utils/logger.js';

// Firebase references
const auth = window.firebase.auth();
const db = window.firebase.firestore();

// ====================================
// STATE
// ====================================

let currentUser = null;
let authCheckPromise = null;

// ====================================
// AUTH CHECK FUNCTION
// ====================================

/**
 * Проверяет авторизацию пользователя
 * @returns {Promise<{user: Object|null, isAuthenticated: boolean}>}
 */
export function checkAuth() {
    // Проверяем что Firebase инициализирован
    if (!auth || !db) {
        console.error('Firebase not initialized');
        return Promise.resolve({ user: null, isAuthenticated: false });
    }
    
    // Возвращаем существующий промис если проверка уже идет
    if (authCheckPromise) return authCheckPromise;
    
    authCheckPromise = new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                logger.log('🔐 User authenticated:', firebaseUser.email || firebaseUser.phone || 'Anonymous');
                
                try {
                    // Проверяем, является ли пользователь анонимным (гостем)
                    if (firebaseUser.isAnonymous) {
                        logger.log('👤 Anonymous guest user detected');
                        
                        // Для гостей НЕ создаем профиль в БД
                        currentUser = {
                            uid: firebaseUser.uid,
                            email: null,
                            name: 'Гость',
                            role: 'guest',
                            status: 'guest',
                            isAnonymous: true,
                            firebaseUser
                        };
                        
                        resolve({ user: currentUser, isAuthenticated: true });
                        return;
                    }
                    
                    // Для обычных пользователей проверяем профиль в БД
                    const db = firebase.firestore();
                    const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
                        
                        if (userDoc.exists) {
                            currentUser = {
                                ...userDoc.data(),
                                uid: firebaseUser.uid,
                                firebaseUser
                            };
                            
                            console.log('🔐 User authenticated:', currentUser.email || currentUser.phone);
                            
                            // Проверяем статус пользователя
                            if (currentUser.status === 'banned' || currentUser.status === 'blocked') {
                                console.warn('🚫 User is blocked');
                                await auth.signOut();
                                // Показываем уведомление
                                if (typeof window !== 'undefined') {
                                    alert('Ваш аккаунт заблокирован. Обратитесь к администратору.');
                                }
                                resolve({ user: null, isAuthenticated: false, isBanned: true });
                            } else if (currentUser.status === 'pending' && currentUser.hasRejection && !currentUser.rejectionShown) {
                                console.warn('❌ User request was rejected but status is pending');
                                const branchName = currentUser.branchName || 'выбранный филиал';
                                const reason = currentUser.rejectionReason || 'Без указания причины';
                                const message = `Администратор отклонил вашу заявку на вступление в ${branchName}.\n\nПричина: ${reason}\n\nВы можете пользоваться сайтом с ограниченным функционалом или обратиться к администратору:\nTelegram: @Sha1oom`;
                                
                                if (typeof window !== 'undefined') {
                                    if (confirm(message + '\n\nНажмите OK, чтобы связаться с администратором в Telegram')) {
                                        window.open('https://t.me/Sha1oom', '_blank');
                                    }
                                    
                                    // Отмечаем что уведомление показано
                                    const db = firebase.firestore();
                                    db.collection('users').doc(firebaseUser.uid).update({
                                        rejectionShown: true
                                    }).catch(err => console.error('Error updating rejectionShown:', err));
                                }
                                resolve({ user: currentUser, isAuthenticated: true });
                            } else if (currentUser.status === 'active' && currentUser.approvedAt && !currentUser.approvalShown) {
                                console.log('✅ User was recently approved');
                                // Показываем уведомление об одобрении один раз
                                if (typeof window !== 'undefined') {
                                    const message = `Поздравляем! Ваша заявка одобрена.\n\nТеперь вы можете:\n• Создавать сет-листы\n• Редактировать сет-листы\n• Добавлять песни в сет-листы\n\nДобро пожаловать в команду!`;
                                    alert(message);
                                    
                                    // Отмечаем что уведомление показано
                                    const db = firebase.firestore();
                                    db.collection('users').doc(firebaseUser.uid).update({
                                        approvalShown: true
                                    }).catch(err => console.error('Error updating approvalShown:', err));
                                }
                                resolve({ user: currentUser, isAuthenticated: true });
                            } else {
                                resolve({ user: currentUser, isAuthenticated: true });
                            }
                        } else {
                            console.warn('⚠️ User profile not found in Firestore, creating...');
                        
                        // Создаем профиль пользователя если его нет
                        try {
                            const newUserData = {
                                id: firebaseUser.uid,
                                name: firebaseUser.displayName || 'Новый пользователь',
                                email: firebaseUser.email,
                                phone: firebaseUser.phoneNumber,
                                photoURL: firebaseUser.photoURL,
                                role: 'user',
                                branchId: null,
                                status: 'pending',
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                            
                            await db.collection('users').doc(firebaseUser.uid).set(newUserData);
                            console.log('✅ User profile created');
                            
                            currentUser = {
                                ...newUserData,
                                uid: firebaseUser.uid,
                                firebaseUser
                            };
                            
                            resolve({ user: currentUser, isAuthenticated: true });
                        } catch (createError) {
                            console.error('❌ Failed to create user profile:', createError);
                            resolve({ user: null, isAuthenticated: false });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    resolve({ user: null, isAuthenticated: false });
                }
            } else {
                console.log('🔒 No authenticated user');
                resolve({ user: null, isAuthenticated: false });
            }
            
            unsubscribe();
        });
    });
    
    return authCheckPromise;
}

// ====================================
// ACCESS CONTROL
// ====================================

/**
 * Проверяет есть ли у пользователя доступ к ресурсу
 * @param {string} resource - Название ресурса (setlists, users, branches, songs)
 * @param {string} action - Действие (create, read, update, delete)
 * @returns {boolean}
 */
export function hasAccess(resource, action) {
    if (!currentUser) return false;
    
    // Админы имеют полный доступ
    if (currentUser.role === 'admin') return true;
    
    // Проверка прав для обычных пользователей
    const userPermissions = {
        setlists: ['read'],
        songs: ['read'],
        users: [],
        branches: []
    };
    
    return userPermissions[resource]?.includes(action) || false;
}

/**
 * Проверяет является ли пользователь админом
 * @returns {boolean}
 */
export async function isAdmin() {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        // Получаем токен с custom claims
        const idTokenResult = await user.getIdTokenResult();
        
        // Проверяем custom claims (приоритет)
        if (idTokenResult.claims.role === 'admin') {
            return true;
        }
        
        // Fallback на Firestore (если claims еще не синхронизированы)
        return currentUser?.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return currentUser?.role === 'admin';
    }
}

/**
 * Проверяет принадлежит ли пользователь к филиалу
 * @param {string} branchId - ID филиала
 * @returns {boolean}
 */
export async function belongsToBranch(branchId) {
    if (!currentUser) return false;
    if (await isAdmin()) return true; // Админы видят все филиалы
    return currentUser.branchId === branchId;
}

// ====================================
// USER GETTERS
// ====================================

/**
 * Получить текущего пользователя
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Получить ID текущего филиала пользователя
 * @returns {string|null}
 */
export function getCurrentBranchId() {
    return currentUser?.branchId || null;
}

/**
 * Проверить является ли пользователь в статусе pending
 * @returns {boolean}
 */
export function isUserPending() {
    return currentUser?.status === 'pending';
}

/**
 * Проверить является ли пользователь гостем
 * @returns {boolean}
 */
export function isUserGuest() {
    return currentUser?.isAnonymous === true || currentUser?.status === 'guest';
}

/**
 * Проверить имеет ли пользователь ограниченный доступ (pending или guest)
 * @returns {boolean}
 */
export function hasLimitedAccess() {
    return currentUser?.status === 'pending' || currentUser?.status === 'guest';
}


/**
 * Получить статус текущего пользователя
 * @returns {string|null}
 */
export function getUserStatus() {
    return currentUser?.status || null;
}

/**
 * Показать сообщение о том, что функция недоступна для pending пользователей
 * @param {string} action - Название действия (например, "Создание сет-листов")
 */
export function showPendingUserMessage(action) {
    const message = `${action} временно недоступно.\n\nВаша заявка находится на рассмотрении администратора.\nПожалуйста, дождитесь подтверждения.\n\nЕсли у вас есть вопросы, обратитесь к администратору:\nTelegram: @Sha1oom`;
    
    alert(message);
}

/**
 * Показать сообщение о том, что функция недоступна для гостей
 * @param {string} action - Название действия (например, "Создание сет-листов")
 */
export function showGuestMessage(action) {
    const message = `${action} доступно только для зарегистрированных пользователей.\n\nХотите получить полный доступ ко всем функциям?\n\nЗарегистрируйтесь или войдите в свой аккаунт.`;
    
    if (confirm(message + '\n\nПерейти к регистрации?')) {
        // Выходим из гостевого режима
        auth.signOut().then(() => {
            window.location.href = './public/login.html';
        }).catch((error) => {
            console.error('Error signing out guest:', error);
            window.location.href = './public/login.html';
        });
    }
}

/**
 * Показать сообщение для гостя при попытке открыть профиль
 */
export function showGuestProfileMessage() {
    const message = `Вы вошли как гость.\n\nУ гостей нет профиля.\n\nЗарегистрируйтесь, чтобы получить полный доступ ко всем функциям сайта.`;
    
    if (confirm(message + '\n\nПерейти к регистрации?')) {
        // Выходим из гостевого режима
        auth.signOut().then(() => {
            window.location.href = './public/login.html';
        }).catch((error) => {
            console.error('Error signing out guest:', error);
            window.location.href = './public/login.html';
        });
    }
}

// ====================================
// AUTH GATE
// ====================================

/**
 * Инициализирует проверку авторизации и редиректит если нужно
 * @param {Object} options - Опции проверки
 * @param {boolean} options.requireAuth - Требуется ли авторизация
 * @param {boolean} options.requireBranch - Требуется ли принадлежность к филиалу
 * @param {boolean} options.requireAdmin - Требуется ли роль админа
 * @param {string} options.redirectTo - Куда редиректить при отсутствии доступа
 */
export async function initAuthGate(options = {}) {
    const {
        requireAuth = true,
        requireBranch = false,
        requireAdmin = false,
        redirectTo = '/public/login.html'
    } = options;
    
    console.log('🔒 Initializing auth gate...');
    console.log('Current path:', window.location.pathname);
    
    // Проверяем флаг редиректа
    if (sessionStorage.getItem('auth_redirecting') === 'true') {
        console.log('⚠️ Auth redirecting in progress, waiting...');
        sessionStorage.removeItem('auth_redirecting');
        // Даем время Firebase синхронизироваться
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Добавляем защиту от повторных проверок
    if (window._authGateChecking) {
        console.log('⚠️ Auth gate already checking, skipping...');
        return false;
    }
    window._authGateChecking = true;
    
    try {
        const { user, isAuthenticated, isBanned } = await checkAuth();
        
        // Проверка авторизации
        if (requireAuth && !isAuthenticated) {
            console.log('🚫 Authentication required, redirecting to login...');
            // Проверяем что мы не на странице логина чтобы избежать цикла
            if (!window.location.pathname.includes('login')) {
                // Используем replace чтобы не было цикла через историю
                window.location.replace(redirectTo);
            }
            return false;
        }
        
        // Проверка бана
        if (isBanned) {
            console.log('🚫 User is banned');
            showAuthMessage('Ваш аккаунт заблокирован. Обратитесь к администратору.');
            return false;
        }
        
        // Проверка филиала
        if (requireBranch && user && !user.branchId) {
            console.log('⚠️ User not assigned to any branch');
            showAuthMessage('Ваш аккаунт еще не привязан к филиалу. Ожидайте подтверждения администратора.');
            return false;
        }
        
        // Проверка админских прав
        if (requireAdmin && user && user.role !== 'admin') {
            console.log('🚫 Admin access required');
            window.location.href = '/';
            return false;
        }
        
        console.log('✅ Auth gate passed');
        window._authGateChecking = false;
        return true;
    } catch (error) {
        console.error('Auth gate error:', error);
        window._authGateChecking = false;
        if (requireAuth) {
            window.location.replace(redirectTo);
        }
        return false;
    }
}

// ====================================
// UI HELPERS
// ====================================

/**
 * Показывает сообщение об авторизации
 * @param {string} message
 */
function showAuthMessage(message) {
    // Создаем overlay с сообщением
    const overlay = document.createElement('div');
    overlay.className = 'auth-message-overlay';
    overlay.innerHTML = `
        <div class="auth-message-card">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
            <button onclick="window.location.href='/public/login.html'">Войти заново</button>
        </div>
    `;
    
    // Добавляем стили если их еще нет
    if (!document.getElementById('auth-message-styles')) {
        const style = document.createElement('style');
        style.id = 'auth-message-styles';
        style.textContent = `
            .auth-message-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .auth-message-card {
                background: var(--bg-secondary);
                padding: 40px;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
            }
            .auth-message-card i {
                font-size: 48px;
                color: var(--accent-warning);
                margin-bottom: 20px;
            }
            .auth-message-card p {
                margin: 0 0 30px;
                color: var(--text-primary);
                line-height: 1.5;
            }
            .auth-message-card button {
                background: var(--accent-primary);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(overlay);
}

// ====================================
// LOGOUT FUNCTION
// ====================================

/**
 * Выход из системы
 */
export async function logout() {
    try {
        await auth.signOut();
        currentUser = null;
        window.location.href = '/public/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}
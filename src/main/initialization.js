/**
 * ===================================================================
 * INITIALIZATION MODULE
 * ===================================================================
 * Модуль инициализации приложения - отвечает за запуск всех систем
 * 
 * Функции:
 * - initializeApp() - главная функция инициализации
 * - loadInitialData() - загрузка данных из Firebase
 * - setupUI() - настройка UI элементов
 * - setupTheme() - настройка темы
 * - setupMobileOptimizations() - оптимизации для мобильных
 */

// Импорты
import { setupEventListeners } from './event-handlers.js';
import * as api from '../api/index.js';
import * as ui from '../../ui.js';
import * as metronomeUI from '../../js/metronome.js';
import searchWorkerManager from '../../src/js/workers/workerManager.js';
import * as constants from '../../js/constants.js';
import { initAuthGate, getCurrentUser } from '../modules/auth/authCheck.js';
import { initUserNavigation } from '../modules/auth/userNavigation.js';

// Импортируем модуль setlist-selector для его инициализации
import '../ui/setlist-selector.js';

// ====================================
// MAIN INITIALIZATION FUNCTION
// ====================================

/**
 * Главная функция инициализации приложения
 */
export async function initializeApp() {
    console.log('🚀 [Initialization] initializeApp START');
    
    try {
        // ====================================
        // 🔐 AUTH CHECK - ПЕРВЫМ ДЕЛОМ!
        // ====================================
        console.log('🔐 [Initialization] Checking authentication...');
        const authPassed = await initAuthGate({
            requireAuth: true,
            requireBranch: false, // Пока не требуем филиал
            requireAdmin: false
        });
        
        if (!authPassed) {
            console.log('❌ [Initialization] Auth check failed');
            // Не делаем редирект здесь - authGate уже сделал это
            return;
        }
        
        const currentUser = getCurrentUser();
        console.log('✅ [Initialization] Auth check passed, user:', currentUser?.email || currentUser?.phone);
        
        // Сохраняем пользователя в глобальный state
        if (window.stateManager) {
            window.stateManager.setCurrentUser(currentUser);
        }
        
        // Инициализируем навигацию пользователя
        initUserNavigation();
        
        // Проверяем, нужно ли предложить стать администратором
        const { checkAndShowFirstAdminModal } = await import('../modules/auth/firstAdminModal.js');
        checkAndShowFirstAdminModal();
        
        // Проверяем, нужно ли выбрать филиал (после полной загрузки DOM)
        setTimeout(async () => {
            const { initBranchSelection, checkAndShowBranchSelection } = await import('../modules/branches/branchSelection.js');
            initBranchSelection();
            await checkAndShowBranchSelection();
        }, 100);
        
        // ====================================
        // THEME SETUP
        // ====================================
        
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        // Настройка темы (должна быть первой)
        setupTheme();
        
        // Настройка UI элементов
        setupUI();
        
        // Настройка обработчиков событий
        setupEventListeners();
        
        // ПАНЕЛИ НАСТРАИВАЮТСЯ В script.js - НЕ ЗДЕСЬ!
        
        // Настройка swipe жестов
        setupSwipeToClose();
        
        // Инициализация метронома
        await initializeMetronome();
        
        // Загрузка данных
        await loadInitialData();
        
        // Настройка мобильных оптимизаций
        setupMobileOptimizations();
        
        console.log('✅ [Initialization] Инициализация приложения завершена');
        
    } catch (error) {
        console.error('❌ [Initialization] Критическая ошибка инициализации:', error);
        showCriticalError(error);
    } finally {
        hideLoadingIndicator();
    }
}

// ====================================
// THEME SETUP
// ====================================

/**
 * Настраивает тему приложения
 */
function setupTheme() {
    console.log('🎨 [Initialization] setupTheme');
    
    // По умолчанию всегда темная тема
    let initialTheme = 'dark';
    
    try {
        // Проверяем, сохранял ли пользователь выбор темы
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            // Используем сохраненный выбор пользователя
            initialTheme = savedTheme;
            console.log('🎨 [Initialization] Загружена сохраненная тема:', savedTheme);
        } else {
            // Если выбор не сохранен - используем темную тему по умолчанию
            console.log('🎨 [Initialization] Тема не сохранена, используем темную по умолчанию');
            initialTheme = 'dark';
        }
    } catch (error) {
        console.error('❌ [Initialization] Ошибка определения темы:', error);
        // При ошибке также используем темную тему
        initialTheme = 'dark';
    }
    
    // Удаляем временный атрибут загрузки
    document.documentElement.removeAttribute('data-theme-loading');
    
    if (typeof ui.applyTheme === 'function') {
        ui.applyTheme(initialTheme);
    }
}

// ====================================
// UI SETUP
// ====================================

/**
 * Настраивает UI элементы
 */
function setupUI() {
    console.log('🎨 [Initialization] setupUI');
    
    // Обновляем размер шрифта
    if (typeof ui.updateFontSize === 'function') {
        ui.updateFontSize();
    }
    
    // Устанавливаем начальный размер шрифта из сохраненного или дефолтного
    const savedFontSize = localStorage.getItem('songFontSize');
    if (savedFontSize && window.state) {
        const size = parseInt(savedFontSize, 10);
        if (!isNaN(size) && size >= 4 && size <= 32) {
            window.state.setCurrentFontSize(size);
            if (typeof ui.updateFontSize === 'function') {
                ui.updateFontSize();
            }
        }
    }
    
    // Устанавливаем двухколоночный режим по умолчанию
    if (ui.songContent) {
        ui.songContent.classList.add('split-columns');
    }
    
    if (typeof ui.updateSplitButton === 'function') {
        ui.updateSplitButton();
    }
    
    // Скрываем элементы управления пока не выбрана песня
    if (typeof window.toggleSongControls === 'function') {
        window.toggleSongControls(false);
    }
}

/**
 * Настраивает swipe жесты для закрытия панелей
 */
function setupSwipeToClose() {
    console.log('👆 [Initialization] setupSwipeToClose');
    
    const panels = document.querySelectorAll('.side-panel, .global-fullscreen-overlay');
    
    panels.forEach(panel => {
        let startY = 0;
        let startX = 0;
        let startTime = 0;
        let isScrolling = null;
        
        panel.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
            startTime = Date.now();
            isScrolling = null; // Сбрасываем флаг скроллинга
            
            // Временно отключаем проверку скроллируемых элементов для отладки
            /*
            const target = e.target;
            const scrollableElements = [
                '.songs-list',
                '.results-section',
                '.search-results-container',
                '.setlist-songs-container',
                '.fullscreen-body',
                '.repertoire-list'
            ];
            
            const isOnScrollableElement = scrollableElements.some(selector => 
                target.closest(selector) !== null
            );
            
            if (isOnScrollableElement) {
                isScrolling = true; // Предполагаем скроллинг если касание на скроллируемом элементе
            }
            */
        });
        
        panel.addEventListener('touchmove', (e) => {
            if (isScrolling === null) {
                const currentX = e.touches[0].clientX;
                const currentY = e.touches[0].clientY;
                const deltaX = Math.abs(currentX - startX);
                const deltaY = Math.abs(currentY - startY);
                
                // Определяем направление движения на основе первых движений
                isScrolling = deltaY > deltaX;
            }
        });
        
        panel.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const endX = e.changedTouches[0].clientX;
            const deltaY = startY - endY;
            const deltaX = startX - endX;
            const duration = Date.now() - startTime;
            
            console.log('👆 [Swipe Debug]', {
                panel: panel.id || panel.className,
                deltaX,
                deltaY,
                duration,
                isScrolling,
                threshold: constants.SWIPE_THRESHOLD
            });
            
            // Если это был скроллинг, не закрываем панель
            if (isScrolling) {
                console.log('👆 [Swipe] Игнорируем - это был скроллинг');
                return;
            }
            
            // Для боковых панелей - проверяем с какой стороны панель
            if (panel.classList.contains('side-panel')) {
                const isHorizontalDominant = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
                const isFastSwipe = duration < 800;
                
                // Левые панели (setlists-panel, my-list-panel) - закрываются свайпом влево
                if (panel.id === 'setlists-panel' || panel.id === 'my-list-panel') {
                    const isLeftSwipe = deltaX > 80; // Свайп влево (deltaX положительный)
                    
                    console.log('👆 [Swipe Left Panel Check]', {
                        panelId: panel.id,
                        isLeftSwipe,
                        isHorizontalDominant,
                        isFastSwipe,
                        wouldClose: isLeftSwipe && isHorizontalDominant && isFastSwipe
                    });
                    
                    if (isLeftSwipe && isHorizontalDominant && isFastSwipe) {
                        if (panel.classList.contains('show') || panel.classList.contains('open')) {
                            panel.classList.remove('show', 'open');
                            console.log('👆 [Swipe] Закрытие левой панели свайпом влево');
                        }
                    }
                }
                
                // Правая панель (repertoire-panel) - закрывается свайпом вправо
                if (panel.id === 'repertoire-panel') {
                    const isRightSwipe = deltaX < -80; // Свайп вправо (deltaX отрицательный)
                    
                    console.log('👆 [Swipe Right Panel Check]', {
                        panelId: panel.id,
                        isRightSwipe,
                        isHorizontalDominant,
                        isFastSwipe,
                        wouldClose: isRightSwipe && isHorizontalDominant && isFastSwipe
                    });
                    
                    if (isRightSwipe && isHorizontalDominant && isFastSwipe) {
                        if (panel.classList.contains('show') || panel.classList.contains('open')) {
                            panel.classList.remove('show', 'open');
                            console.log('👆 [Swipe] Закрытие правой панели свайпом вправо');
                        }
                    }
                }
            }
            
            // Для оверлеев (add-songs-overlay, mobile-song-preview) - свайп вниз
            if (panel.classList.contains('global-fullscreen-overlay')) {
                // Свайп вниз для закрытия (deltaY отрицательный)
                const isDownSwipe = deltaY < -80; // Уменьшил с 100 до 80
                const isVerticalDominant = Math.abs(deltaY) > Math.abs(deltaX) * 1.5; // Уменьшил с 2 до 1.5
                const isFastSwipe = duration < 800; // Увеличил с 500 до 800мс
                
                console.log('👆 [Swipe Overlay Check]', {
                    isDownSwipe,
                    isVerticalDominant,
                    isFastSwipe,
                    wouldClose: isDownSwipe && isVerticalDominant && isFastSwipe
                });
                
                if (isDownSwipe && isVerticalDominant && isFastSwipe) {
                    if (panel.classList.contains('show')) {
                        panel.classList.remove('show');
                        console.log('👆 [Swipe] Закрытие оверлея свайпом вниз');
                    }
                }
            }
        });
    });
}

// ====================================
// METRONOME INITIALIZATION
// ====================================

/**
 * Инициализирует метроном
 */
async function initializeMetronome() {
    console.log('🥁 [Initialization] initializeMetronome');
    
    try {
        if (typeof metronomeUI?.initMetronomeUI === 'function') {
            await metronomeUI.initMetronomeUI();
        }
        
        // Делаем метроном доступным глобально для обратной совместимости
        if (typeof window !== 'undefined') {
            window.metronomeUI = metronomeUI;
        }
        
    } catch (error) {
        console.error('❌ [Initialization] Ошибка инициализации метронома:', error);
    }
}

// ====================================
// DATA LOADING
// ====================================

/**
 * Загружает начальные данные из Firebase
 */
async function loadInitialData() {
    console.log('📊 [Initialization] loadInitialData');
    
    try {
        // Загружаем все песни из Firestore
        await api.loadAllSongsFromFirestore();
        
        // Заполняем селекторы
        populateSelectors();
        
        // Загружаем вокалистов
        const vocalists = await api.loadVocalists();
        if (typeof ui.populateVocalistSelect === 'function') {
            ui.populateVocalistSelect(vocalists);
        }
        
        // Делаем search worker manager доступным глобально
        if (typeof window !== 'undefined') {
            window.searchWorkerManager = searchWorkerManager;
        }
        
        // Инициализируем селектор филиалов для сет-листов
        const { initBranchSelector } = await import('../modules/branches/branchSelector.js');
        initBranchSelector();
        
    } catch (error) {
        console.error('❌ [Initialization] Ошибка загрузки данных:', error);
        throw error;
    }
}

/**
 * Заполняет селекторы данными
 */
function populateSelectors() {
    console.log('📋 [Initialization] populateSelectors');
    
    try {
        // Заполняем селектор листов
        if (typeof ui.populateSheetSelect === 'function') {
            ui.populateSheetSelect();
        }
        
        // Заполняем селектор песен
        if (typeof ui.populateSongSelect === 'function') {
            ui.populateSongSelect();
        }
        
        // Заполняем фильтр категорий (если есть функция)
        if (typeof window.populateCategoryFilter === 'function') {
            window.populateCategoryFilter();
        }
        
    } catch (error) {
        console.error('❌ [Initialization] Ошибка заполнения селекторов:', error);
    }
}

// ====================================
// MOBILE OPTIMIZATIONS
// ====================================

/**
 * Настраивает оптимизации для мобильных устройств
 */
function setupMobileOptimizations() {
    console.log('📱 [Initialization] setupMobileOptimizations');
    
    // Проверяем, является ли устройство мобильным
    const isMobile = window.innerWidth <= 480;
    
    if (!isMobile) {
        return;
    }
    
    console.log('📱 [Initialization] Применяем мобильные оптимизации');
    
    // КРИТИЧЕСКАЯ ЗАЩИТА: принудительно исправляем размеры панелей на мобильных
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.side-panel').forEach(panel => {
            if (panel.classList.contains('open')) {
                // ПРИНУДИТЕЛЬНЫЕ РАЗМЕРЫ
                const maxWidth = Math.min(280, window.innerWidth * 0.85);
                panel.style.width = maxWidth + 'px';
                panel.style.maxWidth = maxWidth + 'px';
                
                // ПРИНУДИТЕЛЬНОЕ ПОЗИЦИОНИРОВАНИЕ
                panel.style.position = 'fixed';
                panel.style.left = '0';
                panel.style.top = '0';
                panel.style.height = '100vh';
                panel.style.zIndex = '9999';
                
                console.log('📱 [MobileOptimization] Исправлены размеры панели:', maxWidth + 'px');
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Сохраняем observer для возможной очистки
    if (typeof window !== 'undefined') {
        window.mobileOptimizationObserver = observer;
    }
}

// ====================================
// LOADING INDICATORS
// ====================================

/**
 * Показывает индикатор загрузки
 */
function showLoadingIndicator() {
    if (ui.loadingIndicator) {
        ui.loadingIndicator.style.display = 'block';
    }
}

/**
 * Скрывает индикатор загрузки
 */
function hideLoadingIndicator() {
    if (ui.loadingIndicator) {
        ui.loadingIndicator.style.display = 'none';
    }
}

/**
 * Показывает критическую ошибку
 * @param {Error} error - Объект ошибки
 */
function showCriticalError(error) {
    console.error('💥 [Initialization] КРИТИЧЕСКАЯ ОШИБКА:', error);
    
    const errorMessage = `
        <div style="
            color: #ef4444; 
            background: #1f1f1f; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px; 
            border: 1px solid #ef4444;
            font-family: monospace;
        ">
            <h2 style="color: #ef4444; margin-top: 0;">🚨 Критическая ошибка инициализации</h2>
            <p><strong>Сообщение:</strong> ${error.message}</p>
            <p><strong>Стек:</strong></p>
            <pre style="background: #000; padding: 10px; border-radius: 4px; overflow: auto;">${error.stack}</pre>
            <p style="margin-bottom: 0;">
                <strong>Действия:</strong><br>
                1. Обновите страницу (Ctrl+F5)<br>
                2. Очистите кэш браузера<br>
                3. Проверьте подключение к интернету<br>
                4. Если проблема повторяется, обратитесь к разработчику
            </p>
        </div>
    `;
    
    document.body.innerHTML = errorMessage;
}

// ====================================
// DOM READY HANDLER
// ====================================

/**
 * Обработчик готовности DOM
 */
export function onDOMContentLoaded() {
    console.log('📄 [Initialization] DOM loaded');
    console.log('📄 [Initialization] Checking key elements:');
    console.log('📄 [Initialization] confirm-key-selection element:', document.getElementById('confirm-key-selection'));
    console.log('📄 [Initialization] key-selection-modal element:', document.getElementById('key-selection-modal'));
    console.log('📄 [Initialization] add-songs-overlay element:', document.getElementById('add-songs-overlay'));
    
    // Запускаем инициализацию
    initializeApp();
}

// ====================================
// AUTO-INITIALIZATION
// ====================================

// Автоматическая инициализация при загрузке модуля
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
    } else {
        // DOM уже загружен
        onDOMContentLoaded();
    }
}

// ====================================
// MODULE METADATA
// ====================================

export const metadata = {
    name: 'Initialization',
    version: '1.0.0',
    description: 'Модуль инициализации приложения',
    functions: [
        'initializeApp',
        'setupTheme',
        'setupUI',
        'setupSwipeToClose',
        'initializeMetronome',
        'loadInitialData',
        'populateSelectors',
        'setupMobileOptimizations',
        'showLoadingIndicator',
        'hideLoadingIndicator',
        'showCriticalError',
        'onDOMContentLoaded'
    ]
};
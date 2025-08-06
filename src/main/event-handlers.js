// ====================================
// 🎮 EVENT HANDLERS MODULE
// ====================================
// Основной модуль обработчиков событий

/**
 * @module EventHandlers
 * @description Централизованная настройка всех обработчиков событий
 * 
 * Основные функции:
 * - setupEventListeners() - главная функция инициализации
 * - setupUIEventHandlers() - обработчики UI элементов
 * - setupSearchEventHandlers() - обработчики поиска
 * - setupModalEventHandlers() - обработчики модальных окон
 * - setupKeyboardEventHandlers() - обработчики клавиатуры
 */

// Импорты
import * as controller from './controller.js';
import { 
    startAddingSongs as startAddingSongsModule,
    closeAddSongsOverlay as closeAddSongsOverlayModule,
    filterAndDisplaySongs as filterAndDisplaySongsModule
} from '../core/index.js';
import { showMobileSongPreview } from '../core/index.js';
import * as ui from '../../ui.js';
import * as state from '../../js/state.js';
import { 
    isUserPending, 
    isUserGuest, 
    hasLimitedAccess, 
    getUserStatus, 
    showPendingUserMessage, 
    showGuestMessage 
} from '../modules/auth/authCheck.js';
import logger from '../utils/logger.js';

// ====================================
// MAIN SETUP FUNCTION
// ====================================

/**
 * Настраивает все обработчики событий приложения
 */
export function setupEventListeners() {
    console.log('🎮 [EventHandlers] setupEventListeners START');
    
    // Основные UI обработчики
    setupUIEventHandlers();
    
    // Обработчики поиска
    setupSearchEventHandlers();
    
    // Обработчики модальных окон
    setupModalEventHandlers();
    
    // Обработчики клавиатуры
    setupKeyboardEventHandlers();
    
    // Обработчики сетлистов
    setupSetlistEventHandlers();
    
    // Обработчики песен
    setupSongEventHandlers();
    
    // ====================================
    // ОБРАБОТЧИК КНОПКИ "ВСЕ ПЕСНИ"
    // ====================================
    
    const openSongsOverlayBtn = document.getElementById('open-songs-overlay');
    if (openSongsOverlayBtn) {
        openSongsOverlayBtn.addEventListener('click', async () => {
            console.log('🎵 [EventHandlers] Open songs overlay button clicked');
            try {
                const { openSongsOverlay } = await import('../modules/songs/songsOverlay.js');
                openSongsOverlay();
            } catch (error) {
                console.error('Error opening songs overlay:', error);
            }
        });
        console.log('🎵 [EventHandlers] Songs overlay button attached');
    } else {
        console.error('🎵 [EventHandlers] open-songs-overlay button not found!');
    }

    console.log('🎮 [EventHandlers] setupEventListeners COMPLETED');
}

// ====================================
// UI EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики основных UI элементов
 */
function setupUIEventHandlers() {
    console.log('🎨 [EventHandlers] setupUIEventHandlers');
    
    // Кнопки масштабирования
    if (ui.zoomInButton) {
        ui.zoomInButton.addEventListener('click', () => {
            if (typeof window.increaseFontSize === 'function') {
                window.increaseFontSize();
            }
        });
    }
    
    if (ui.zoomOutButton) {
        ui.zoomOutButton.addEventListener('click', () => {
            if (typeof window.decreaseFontSize === 'function') {
                window.decreaseFontSize();
            }
        });
    }
    
    // Кнопка разделения текста
    if (ui.splitTextButton) {
        ui.splitTextButton.addEventListener('click', () => {
            if (typeof window.splitTextIntoColumns === 'function') {
                window.splitTextIntoColumns();
            }
        });
    }
    
    // Кнопка переключения аккордов
    if (ui.toggleChordsButton) {
        ui.toggleChordsButton.addEventListener('click', () => {
            if (typeof window.toggleChords === 'function') {
                window.toggleChords();
            }
        });
    }
    
    // Кнопка "только аккорды"
    if (ui.chordsOnlyButton) {
        ui.chordsOnlyButton.addEventListener('click', () => {
            if (typeof window.showChordsOnly === 'function') {
                window.showChordsOnly();
            }
        });
    }
    
    // Переключение темы
    if (ui.themeToggleButton) {
        ui.themeToggleButton.addEventListener('click', () => {
            if (typeof window.toggleTheme === 'function') {
                window.toggleTheme();
            }
        });
    }
    
    // Селекторы инструментов
    if (ui.sheetSelect) {
        ui.sheetSelect.addEventListener('change', () => {
            console.log('🎵 [EventHandlers] Sheet selector changed:', ui.sheetSelect.value);
            // Очищаем поиск и обновляем список песен
            if (ui.searchInput) ui.searchInput.value = '';
            if (ui.searchResults) ui.searchResults.innerHTML = '';
            if (typeof ui.populateSongSelect === 'function') {
                ui.populateSongSelect();
            }
        });
    }
    
    if (ui.songSelect) {
        ui.songSelect.addEventListener('change', () => {
            console.log('🎵 [EventHandlers] Song selector changed:', ui.songSelect.value);
            const songId = ui.songSelect.value;
            if (songId && window.state && window.state.allSongs) {
                const songData = window.state.allSongs.find(s => s.id === songId);
                console.log('🎵 [EventHandlers] Found song data:', songData?.name);
                if (songData && typeof ui.displaySongDetails === 'function') {
                    ui.displaySongDetails(songData);
                }
            }
        });
    }
    
    if (ui.keySelect) {
        ui.keySelect.addEventListener('change', () => {
            console.log('🎵 [EventHandlers] Key selector changed:', ui.keySelect.value);
            const songId = ui.keySelect.dataset.songId;
            if (songId && window.state && window.state.allSongs) {
                const songData = window.state.allSongs.find(s => s.id === songId);
                if (songData && typeof ui.displaySongDetails === 'function') {
                    const newKey = ui.keySelect.value;
                    ui.displaySongDetails(songData, newKey);
                }
            }
        });
    }
}

// ====================================
// SEARCH EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики поиска
 */
function setupSearchEventHandlers() {
    console.log('🔍 [EventHandlers] setupSearchEventHandlers');
    
    // Основной поиск с debounce
    if (ui.searchInput) {
        // Простая debounce функция
        let searchTimeout;
        
        ui.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (typeof window.handleMainSearch === 'function') {
                    window.handleMainSearch();
                }
            }, 150); // Задержка 150мс
        });
        
        ui.searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (ui.searchResults) {
                    ui.searchResults.innerHTML = '';
                }
            }, 200);
        });
    }
    
    // Поиск в overlay добавления песен
    if (ui.songSearchInput) {
        ui.songSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            const currentCategory = ui.categoryFilter ? ui.categoryFilter.value : '';
            const showAddedOnly = ui.showAddedOnly ? ui.showAddedOnly.classList.contains('active') : false;
            
            // Используем модульную функцию
            filterAndDisplaySongsModule(searchTerm, currentCategory, showAddedOnly);
        });
    }
    
    // Очистка поиска
    if (ui.clearSearch) {
        ui.clearSearch.addEventListener('click', () => {
            if (ui.songSearchInput) {
                ui.songSearchInput.value = '';
                ui.songSearchInput.dispatchEvent(new Event('input'));
            }
        });
    }
    
    // Фильтр категорий
    if (ui.categoryFilter) {
        ui.categoryFilter.addEventListener('change', (e) => {
            const searchTerm = ui.songSearchInput ? ui.songSearchInput.value.trim() : '';
            const currentCategory = e.target.value;
            const showAddedOnly = ui.showAddedOnly ? ui.showAddedOnly.classList.contains('active') : false;
            
            filterAndDisplaySongsModule(searchTerm, currentCategory, showAddedOnly);
        });
    }
    
    // Показать только добавленные
    if (ui.showAddedOnly) {
        ui.showAddedOnly.addEventListener('click', () => {
            ui.showAddedOnly.classList.toggle('active');
            
            const searchTerm = ui.songSearchInput ? ui.songSearchInput.value.trim() : '';
            const currentCategory = ui.categoryFilter ? ui.categoryFilter.value : '';
            const showAddedOnly = ui.showAddedOnly.classList.contains('active');
            
            filterAndDisplaySongsModule(searchTerm, currentCategory, showAddedOnly);
        });
    }
}

// ====================================
// MODAL EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики модальных окон
 */
function setupModalEventHandlers() {
    console.log('🎭 [EventHandlers] setupModalEventHandlers');
    
    // Обработчик создания сетлиста перенесен ниже с проверками прав
    
    if (ui.closeCreateModal) {
        ui.closeCreateModal.addEventListener('click', () => {
            if (ui.createSetlistModal) {
                ui.createSetlistModal.classList.remove('show');
            }
        });
    }
    
    if (ui.cancelCreateSetlist) {
        ui.cancelCreateSetlist.addEventListener('click', () => {
            if (ui.createSetlistModal) {
                ui.createSetlistModal.classList.remove('show');
            }
        });
    }
    
    if (ui.createSetlistButton) {
        ui.createSetlistButton.addEventListener('click', async () => {
            const name = ui.newSetlistNameInput ? ui.newSetlistNameInput.value.trim() : '';
            await controller.handleCreateSetlist(name);
            
            if (ui.createSetlistModal) {
                ui.createSetlistModal.classList.remove('show');
            }
        });
    }
    
    // Закрытие модального окна по клику вне области
    if (ui.createSetlistModal) {
        ui.createSetlistModal.addEventListener('click', (e) => {
            if (e.target === ui.createSetlistModal) {
                ui.createSetlistModal.classList.remove('show');
            }
        });
    }
    
    // Модальное окно подтверждения добавления песен
    if (ui.closeConfirmModal) {
        ui.closeConfirmModal.addEventListener('click', () => {
            if (ui.addSongsConfirmModal) {
                ui.addSongsConfirmModal.classList.remove('show');
            }
        });
    }
    
    if (ui.skipAddSongs) {
        ui.skipAddSongs.addEventListener('click', () => {
            if (ui.addSongsConfirmModal) {
                ui.addSongsConfirmModal.classList.remove('show');
            }
        });
    }
    
    if (ui.startAddSongs) {
        ui.startAddSongs.addEventListener('click', () => {
            startAddingSongsModule('create');
        });
    }
    
    // Модальное окно заметок
    if (ui.saveNoteButton) {
        ui.saveNoteButton.addEventListener('click', async () => {
            const songId = ui.notesSongId ? ui.notesSongId.value : '';
            const note = ui.notesTextarea ? ui.notesTextarea.value : '';
            await controller.handleSaveNote(songId, note);
        });
    }
    
    if (ui.cancelNoteButton) {
        ui.cancelNoteButton.addEventListener('click', () => {
            if (ui.notesModal) {
                ui.notesModal.classList.remove('show');
            }
        });
    }
    
    if (ui.closeNoteModalX) {
        ui.closeNoteModalX.addEventListener('click', () => {
            if (ui.notesModal) {
                ui.notesModal.classList.remove('show');
            }
        });
    }
    
    // Overlay добавления песен
    if (ui.closeAddSongs) {
        ui.closeAddSongs.addEventListener('click', () => {
            closeAddSongsOverlayModule();
        });
    }
    
    if (ui.finishAddingSongs) {
        ui.finishAddingSongs.addEventListener('click', async () => {
            await controller.finishAddingSongs();
        });
    }
}

// ====================================
// KEYBOARD EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики клавиатуры
 */
function setupKeyboardEventHandlers() {
    console.log('⌨️ [EventHandlers] setupKeyboardEventHandlers');
    
    // Enter для создания сетлиста
    if (ui.newSetlistNameInput) {
        ui.newSetlistNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (ui.createSetlistButton) {
                    ui.createSetlistButton.click();
                }
            }
        });
    }
    
    // Escape для закрытия модальных окон
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Закрываем модальное окно заметок
            if (ui.notesModal && ui.notesModal.classList.contains('visible')) {
                ui.notesModal.classList.remove('show');
            }
            
            // Закрываем редактор песен
            if (ui.songEditorOverlay && ui.songEditorOverlay.classList.contains('visible')) {
                ui.songEditorOverlay.classList.remove('visible');
            }
        }
    });
}

// ====================================
// SETLIST EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики сетлистов
 */
function setupSetlistEventHandlers() {
    console.log('🎵 [EventHandlers] setupSetlistEventHandlers');
    
    // Dropdown сетлистов
    if (ui.setlistDropdownBtn) {
        ui.setlistDropdownBtn.addEventListener('click', async () => {
            await controller.refreshSetlists();
            
            if (ui.setlistDropdown) {
                ui.setlistDropdown.classList.toggle('show');
            }
        });
    }
    
    // Закрытие dropdown по клику вне области
    document.addEventListener('click', (e) => {
        if (ui.setlistDropdown && 
            !ui.setlistDropdownBtn?.contains(e.target) && 
            !ui.setlistDropdown.contains(e.target)) {
            ui.setlistDropdown.classList.remove('show');
        }
    });
    
    // Обработчик изменения филиала в селекторе
    window.addEventListener('branchChanged', async (event) => {
        console.log('🏢 [EventHandlers] Branch changed:', event.detail);
        
        // Сбрасываем текущий выбранный сет-лист
        if (window.state && typeof window.state.setCurrentSetlistId === 'function') {
            window.state.setCurrentSetlistId(null);
        }
        
        // Очищаем все отображения выбранного сет-листа
        const currentSetlistName = document.getElementById('current-setlist-name');
        if (currentSetlistName) {
            currentSetlistName.textContent = 'Выберите список';
        }
        
        const selectedSetlistControl = document.getElementById('selected-setlist-control');
        if (selectedSetlistControl) {
            selectedSetlistControl.style.display = 'none';
        }
        
        const currentSetlistSongsContainer = document.getElementById('current-setlist-songs-container');
        if (currentSetlistSongsContainer) {
            currentSetlistSongsContainer.innerHTML = '';
        }
        
        // Сбрасываем текст в dropdown кнопке
        const dropdownBtnText = document.querySelector('#setlist-dropdown-btn .selector-text');
        if (dropdownBtnText) {
            dropdownBtnText.textContent = 'Выберите список';
        }
        
        // Скрываем dropdown если он открыт
        const dropdown = document.getElementById('setlist-dropdown-menu');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        
        // Проверяем, открыта ли панель сет-листов
        const setlistsPanel = document.getElementById('setlists-panel');
        if (setlistsPanel && setlistsPanel.classList.contains('open')) {
            // Перезагружаем сет-листы для нового филиала
            try {
                // Показываем индикатор загрузки
                const setlistsContainer = document.getElementById('setlists-container');
                if (setlistsContainer) {
                    setlistsContainer.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Загрузка сет-листов...</div>';
                }
                
                // Загружаем сет-листы нового филиала
                const { loadSetlists } = await import('../api/index.js');
                const setlists = await loadSetlists();
                
                // Обновляем отображение с правильными обработчиками
                if (typeof ui.renderSetlists === 'function') {
                    ui.renderSetlists(setlists, 
                        window.handleSetlistSelect || function(setlist) {
                            console.log('📋 Setlist selected:', setlist.name);
                            if (window.state) window.state.setCurrentSetlistId(setlist.id);
                            if (ui.displaySelectedSetlist) {
                                ui.displaySelectedSetlist(setlist, 
                                    window.handleFavoriteOrRepertoireSelect,
                                    window.handleRemoveSongFromSetlist
                                );
                            }
                        },
                        window.handleSetlistDelete || async function(setlistId, setlistName) {
                            console.log('📋 Delete setlist:', setlistName);
                            if (confirm(`Удалить сет-лист "${setlistName}"?`)) {
                                try {
                                                                            const { deleteSetlist } = await import('../api/index.js');
                                        await deleteSetlist(setlistId);
                                    ui.toggleSetlistsButton.click(); // Refresh panel
                                } catch (error) {
                                    console.error('Ошибка удаления:', error);
                                    alert('Не удалось удалить сет-лист');
                                }
                            }
                        }
                    );
                }
                
                // Обновляем состояние кнопок в зависимости от прав
                const { canEditInCurrentBranch } = await import('../modules/branches/branchSelector.js');
                const canEdit = await canEditInCurrentBranch();
                
                // Обновляем состояние всех кнопок редактирования
                const createBtn = document.getElementById('create-new-setlist-header-btn');
                const addSongBtn = document.getElementById('add-song-btn');
                const addToSetlistBtn = document.getElementById('add-to-setlist-button');
                
                if (createBtn) {
                    if (!canEdit) {
                        createBtn.classList.add('pending-disabled');
                        createBtn.title = 'Недоступно для редактирования';
                        createBtn.style.opacity = '0.5';
                        createBtn.style.cursor = 'not-allowed';
                    } else {
                        createBtn.classList.remove('pending-disabled');
                        createBtn.title = '';
                        createBtn.style.opacity = '';
                        createBtn.style.cursor = '';
                    }
                }
                
                if (addSongBtn) {
                    if (!canEdit) {
                        addSongBtn.classList.add('pending-disabled');
                        addSongBtn.title = 'Недоступно для редактирования';
                        addSongBtn.style.opacity = '0.5';
                        addSongBtn.style.cursor = 'not-allowed';
                        // НЕ используем disabled, чтобы обработчик клика работал и показывал сообщение
                    } else {
                        addSongBtn.classList.remove('pending-disabled');
                        addSongBtn.title = '';
                        addSongBtn.style.opacity = '';
                        addSongBtn.style.cursor = '';
                    }
                }
                
                if (addToSetlistBtn) {
                    if (!canEdit) {
                        addToSetlistBtn.classList.add('pending-disabled');
                        addToSetlistBtn.title = 'Недоступно для редактирования';
                        addToSetlistBtn.style.opacity = '0.5';
                        addToSetlistBtn.style.cursor = 'not-allowed';
                    } else {
                        addToSetlistBtn.classList.remove('pending-disabled');
                        addToSetlistBtn.title = '';
                        addToSetlistBtn.style.opacity = '';
                        addToSetlistBtn.style.cursor = '';
                    }
                }
                
            } catch (error) {
                console.error('Error reloading setlists:', error);
            }
        }
    });
    
    // Переключение панелей - ПРЯМАЯ ЛОГИКА БЕЗ WINDOW ФУНКЦИЙ
    if (ui.toggleSetlistsButton) {
        ui.toggleSetlistsButton.addEventListener('click', async () => {
            console.log('📋 [EventHandlers] Setlists button clicked');
            const isAlreadyOpen = ui.setlistsPanel.classList.contains('open');
            ui.closeAllSidePanels();
            if (!isAlreadyOpen) {
                ui.toggleSetlistsButton.classList.add('loading');
                try {
                    ui.setlistsPanel.classList.add('open');
                    
                    // Проверяем права пользователя для текущего филиала
                    const createBtn = document.getElementById('create-new-setlist-header-btn');
                    const addSongBtn = document.getElementById('add-song-btn');
                    
                    // Проверяем можно ли редактировать в текущем филиале
                    let canEdit = true;
                    try {
                        const { canEditInCurrentBranch } = await import('../modules/branches/branchSelector.js');
                        canEdit = canEditInCurrentBranch();
                    } catch (e) {
                        // Если модуль не загружен, проверяем только статус пользователя
                        canEdit = !hasLimitedAccess();
                    }
                    
                    if (!canEdit) {
                        if (createBtn) {
                            // Не используем disabled, чтобы обработчик клика работал
                            createBtn.title = 'Недоступно для редактирования';
                            createBtn.style.opacity = '0.5';
                            createBtn.style.cursor = 'not-allowed';
                            createBtn.classList.add('pending-disabled');
                        }
                        if (addSongBtn) {
                            // Не используем disabled, чтобы обработчик клика работал
                            addSongBtn.title = 'Недоступно. Ваша заявка на рассмотрении';
                            addSongBtn.style.opacity = '0.5';
                            addSongBtn.style.cursor = 'not-allowed';
                            addSongBtn.classList.add('pending-disabled');
                        }
                    }
                    // Прямой вызов API и UI функций
                    const { loadSetlists } = await import('../api/index.js');
                    const setlists = await loadSetlists();
                    console.log('📋 [EventHandlers] Loaded setlists:', setlists.length);
                    if (window.state && typeof window.state.setSetlists === 'function') {
                        window.state.setSetlists(setlists);
                    }
                    if (typeof ui.renderSetlists === 'function') {
                        await ui.renderSetlists(setlists, 
                            window.handleSetlistSelect || function(setlist) {
                                console.log('📋 Setlist selected:', setlist.name);
                                if (window.state) window.state.setCurrentSetlistId(setlist.id);
                                if (ui.displaySelectedSetlist) {
                                    ui.displaySelectedSetlist(setlist, 
                                        window.handleFavoriteOrRepertoireSelect,
                                        window.handleRemoveSongFromSetlist
                                    );
                                }
                            },
                            window.handleSetlistDelete || async function(setlistId, setlistName) {
                                console.log('📋 Delete setlist:', setlistName);
                                if (confirm(`Удалить сет-лист "${setlistName}"?`)) {
                                    try {
                                        const { deleteSetlist } = await import('../api/index.js');
                                        await deleteSetlist(setlistId);
                                        ui.toggleSetlistsButton.click(); // Refresh panel
                                    } catch (error) {
                                        console.error('Ошибка удаления:', error);
                                        alert('Не удалось удалить сет-лист');
                                    }
                                }
                            }
                        );
                        
                        // Показываем dropdown только если сет-лист не выбран
                        const dropdown = document.getElementById('setlist-dropdown-menu');
                        if (dropdown) {
                            const currentSetlistId = window.state?.currentSetlistId;
                            if (!currentSetlistId) {
                                dropdown.classList.add('show');
                                console.log('📋 [EventHandlers] Dropdown показан - сет-лист не выбран');
                            } else {
                                console.log('📋 [EventHandlers] Dropdown скрыт - сет-лист уже выбран:', currentSetlistId);
                            }
                        } else {
                            console.error('📋 [EventHandlers] setlist-dropdown-menu не найден!');
                        }
                    }
                } catch (error) {
                    console.error('Ошибка загрузки сет-листов:', error);
                } finally {
                    ui.toggleSetlistsButton.classList.remove('loading');
                }
            }
        });
        console.log('📋 [EventHandlers] Setlists panel handler attached');
    }
    
    // Панель "Мои" - ПРЯМАЯ ЛОГИКА
    if (ui.toggleMyListButton) {
        ui.toggleMyListButton.addEventListener('click', async () => {
            console.log('⭐ [EventHandlers] My List button clicked');
            const isAlreadyOpen = ui.myListPanel.classList.contains('open');
            ui.closeAllSidePanels();
            if (!isAlreadyOpen) {
                ui.toggleMyListButton.classList.add('loading');
                try {
                    ui.myListPanel.classList.add('open');
                    if (window.state && window.state.allSongs && window.state.favorites) {
                        const favoriteSongs = window.state.allSongs.filter(song => 
                            window.state.favorites.some(fav => fav.songId === song.id)
                        ).map(song => {
                            const fav = window.state.favorites.find(f => f.songId === song.id);
                            return { ...song, preferredKey: fav.preferredKey };
                        });
                        console.log('⭐ [EventHandlers] Rendering favorites:', favoriteSongs.length);
                        ui.renderFavorites(favoriteSongs, 
                            window.handleFavoriteOrRepertoireSelect,
                            async function(songId) {
                                if(confirm("Удалить песню из 'Моих'?")) {
                                    try {
                                        const { removeFromFavorites } = await import('../api/index.js');
                                    await removeFromFavorites(songId);
                                        ui.toggleMyListButton.click(); // Refresh panel
                                    } catch (error) {
                                        console.error('Ошибка удаления из избранного:', error);
                                        alert('Не удалось удалить песню из списка');
                                    }
                                }
                            }
                        );
                    } else {
                        console.log('⭐ [EventHandlers] No favorites data available');
                    }
                } catch (error) {
                    console.error('Ошибка загрузки избранных:', error);
                } finally {
                    ui.toggleMyListButton.classList.remove('loading');
                }
            }
        });
        console.log('⭐ [EventHandlers] My List panel handler attached');
    }
    
    // Панель "Репертуар" - Новый оверлей
    if (ui.toggleRepertoireButton) {
        ui.toggleRepertoireButton.addEventListener('click', async () => {
            console.log('🎭 [EventHandlers] Repertoire button clicked');
            
            // Закрываем все панели
            ui.closeAllSidePanels();
            
            try {
                // Загружаем и открываем новый оверлей репертуара
                const { openRepertoireOverlay } = await import('../modules/repertoire/repertoireOverlay.js');
                openRepertoireOverlay();
                console.log('🎭 [EventHandlers] Repertoire overlay opened');
            } catch (error) {
                console.error('Ошибка открытия репертуара:', error);
                window.showNotification('❌ Ошибка открытия репертуара', 'error');
            }
        });
    }
    
    // ОБРАБОТЧИК DROPDOWN СЕТЛИСТОВ - КРИТИЧЕСКИ ВАЖНО!
    const setlistDropdownBtn = document.getElementById('setlist-dropdown-btn');
    if (setlistDropdownBtn) {
        setlistDropdownBtn.addEventListener('click', () => {
            console.log('📋 [EventHandlers] Dropdown button clicked');
            const dropdown = document.getElementById('setlist-dropdown-menu');
            if (dropdown) {
                dropdown.classList.toggle('show');
                console.log('📋 [EventHandlers] Dropdown toggled:', dropdown.classList.contains('show'));
            }
        });
        console.log('📋 [EventHandlers] Dropdown button handler attached');
    } else {
        console.error('📋 [EventHandlers] setlist-dropdown-btn не найден!');
    }
    
    // ОБРАБОТЧИКИ КНОПОК ЗАКРЫТИЯ ПАНЕЛЕЙ - КРИТИЧЕСКИ ВАЖНО!
    const sidePanelCloseBtns = document.querySelectorAll('.side-panel-close-btn');
    sidePanelCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('❌ [EventHandlers] Panel close button clicked');
            ui.closeAllSidePanels();
        });
    });
    console.log('❌ [EventHandlers] Panel close buttons attached:', sidePanelCloseBtns.length);
    
    // ОБРАБОТЧИК КНОПКИ СОЗДАНИЯ СЕТЛИСТА - КРИТИЧЕСКИ ВАЖНО!
    const createSetlistBtn = document.getElementById('create-new-setlist-header-btn');
    if (createSetlistBtn) {
        createSetlistBtn.addEventListener('click', async () => {
            console.log('🎵 [EventHandlers] Create setlist button clicked');
            
            // Проверяем права для текущего филиала
            let canEdit = true;
            try {
                const { canEditInCurrentBranch, isUserMainBranch, showOtherBranchMessage } = await import('../modules/branches/branchSelector.js');
                canEdit = await canEditInCurrentBranch();
                
                if (!canEdit && !isUserMainBranch()) {
                    // Если это чужой филиал
                    console.log('⚠️ [EventHandlers] Cannot create in other branch');
                    await showOtherBranchMessage('Создание сет-листов');
                    return;
                }
            } catch (e) {
                // Если модуль не загружен, проверяем только статус
                canEdit = !hasLimitedAccess();
            }
            
            // Проверяем статус пользователя
            if (!canEdit) {
                console.log('⚠️ [EventHandlers] User cannot edit, creation blocked');
                if (isUserGuest()) {
                    showGuestMessage('Создание сет-листов');
                } else {
                    showPendingUserMessage('Создание сет-листов');
                }
                return;
            }
            
            // Открываем модал создания сетлиста
            if (ui.createSetlistModal) {
                ui.createSetlistModal.classList.add('show');
                if (ui.newSetlistNameInput) {
                    ui.newSetlistNameInput.focus();
                }
            }
        });
        console.log('🎵 [EventHandlers] Create setlist button handler attached');
    } else {
        console.error('🎵 [EventHandlers] create-new-setlist-header-btn не найден!');
    }
    
    // ОБРАБОТЧИКИ КНОПОК ОВЕРЛЕЕВ - КРИТИЧЕСКИ ВАЖНО!
    
    // Кнопка закрытия overlay добавления песен
    const closeAddSongsBtn = document.getElementById('close-add-songs');
    if (closeAddSongsBtn) {
        closeAddSongsBtn.addEventListener('click', () => {
            console.log('❌ [EventHandlers] Close add songs overlay clicked');
            const overlay = document.getElementById('add-songs-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        });
        console.log('❌ [EventHandlers] Close add songs button attached');
    }
    
    // УДАЛЕН ДУБЛИРУЮЩИЙ ОБРАБОТЧИК - уже есть в setupModalEventHandlers
    
    // Кнопка подтверждения выбора тональности
    const confirmKeyBtn = document.getElementById('confirm-key-selection');
    if (confirmKeyBtn) {
        confirmKeyBtn.addEventListener('click', () => {
            console.log('🎯 [EventHandlers] Confirm key selection clicked');
            // Логика подтверждения будет в overlay-manager.js
            if (typeof window.confirmAddSongWithKey === 'function') {
                window.confirmAddSongWithKey();
            }
        });
        console.log('🎯 [EventHandlers] Confirm key selection button attached');
    }
    
    // Кнопка закрытия key selection modal
    const closeKeyModalBtn = document.getElementById('close-key-modal');
    if (closeKeyModalBtn) {
        closeKeyModalBtn.addEventListener('click', () => {
            console.log('❌ [EventHandlers] Close key modal clicked');
            const modal = document.getElementById('key-selection-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
        console.log('❌ [EventHandlers] Close key modal button attached');
    }
    
    // Кнопка закрытия мобильного preview
    const closeMobilePreviewBtn = document.getElementById('close-mobile-song-preview');
    if (closeMobilePreviewBtn) {
        closeMobilePreviewBtn.addEventListener('click', () => {
            console.log('❌ [EventHandlers] Close mobile preview clicked');
            const overlay = document.getElementById('mobile-song-preview-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        });
        console.log('❌ [EventHandlers] Close mobile preview button attached');
    }
    
    // ОБРАБОТЧИКИ МОБИЛЬНОГО ОВЕРЛЕЯ ВЫБОРА ТОНАЛЬНОСТИ - КРИТИЧЕСКИ ВАЖНО!
    
    // Кнопка добавления в мобильном оверлее
    const addSongToSetlistMobileBtn = document.getElementById('add-song-to-setlist-mobile');
    if (addSongToSetlistMobileBtn) {
        addSongToSetlistMobileBtn.addEventListener('click', async () => {
            console.log('🎵 [EventHandlers] Mobile add song button clicked');
            
            const songTitle = document.getElementById('mobile-song-title')?.textContent;
            const selectedKey = document.getElementById('mobile-key-selector')?.value;
            
            console.log('🎵 [EventHandlers] Song:', songTitle, 'Key:', selectedKey);
            
            // Находим песню по названию
            const allSongs = window.state?.allSongs || [];
            const song = allSongs.find(s => s.name === songTitle);
            
            if (song && selectedKey) {
                try {
                    // Добавляем песню в сетлист
                    if (typeof window.addSongToSetlist === 'function') {
                        await window.addSongToSetlist(song, selectedKey);
                        console.log('✅ [EventHandlers] Song added successfully');
                        
                        // Закрываем мобильный оверлей
                        const mobileOverlay = document.getElementById('mobile-song-preview-overlay');
                        if (mobileOverlay) {
                            mobileOverlay.classList.remove('show');
                        }
                        
                        // Показываем уведомление
                        if (typeof window.showNotification === 'function') {
                            window.showNotification('✅ Песня добавлена в сет-лист', 'success');
                        }
                    } else {
                        console.error('🎵 [EventHandlers] addSongToSetlist function not found');
                    }
                } catch (error) {
                    console.error('🎵 [EventHandlers] Error adding song:', error);
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('❌ Ошибка добавления песни', 'error');
                    }
                }
            } else {
                console.error('🎵 [EventHandlers] Song or key not found:', song, selectedKey);
            }
        });
        console.log('🎵 [EventHandlers] Mobile add song button attached');
    } else {
        console.error('🎵 [EventHandlers] add-song-to-setlist-mobile не найден!');
    }
    
    // Селектор тональности в мобильном оверлее
    const mobileKeySelector = document.getElementById('mobile-key-selector');
    if (mobileKeySelector) {
        mobileKeySelector.addEventListener('change', async (e) => {
            console.log('🎵 [EventHandlers] Mobile key selector changed:', e.target.value);
            
            const songTitle = document.getElementById('mobile-song-title')?.textContent;
            const allSongs = window.state?.allSongs || [];
            const song = allSongs.find(s => s.name === songTitle);
            
            if (song) {
                try {
                    // Импортируем и обновляем текст песни
                                         const { displaySongTextInMobileOverlay } = await import('../ui/overlay-manager.js');
                    displaySongTextInMobileOverlay(song, e.target.value);
                    console.log('✅ [EventHandlers] Song text updated for new key');
                } catch (error) {
                    console.error('🎵 [EventHandlers] Error updating song text:', error);
                }
            }
        });
        console.log('🎵 [EventHandlers] Mobile key selector attached');
    } else {
        console.error('🎵 [EventHandlers] mobile-key-selector не найден!');
    }
    
    // ОБРАБОТЧИКИ КНОПОК ДОБАВЛЕНИЯ ПЕСЕН - КРИТИЧЕСКИ ВАЖНО!
    
    // Кнопка "Добавить" в панели сетлистов
    const addSongBtn = document.getElementById('add-song-btn');
    if (addSongBtn) {
        addSongBtn.addEventListener('click', async () => {
            console.log('🎵 [EventHandlers] Add song button clicked');
            
            // Проверяем статус пользователя
            if (hasLimitedAccess()) {
                console.log('⚠️ [EventHandlers] User has limited access, add songs blocked');
                if (isUserGuest()) {
                    showGuestMessage('Добавление песен в сет-листы');
                } else {
                    showPendingUserMessage('Добавление песен в сет-листы');
                }
                return;
            }
            
            // Проверяем доступ к текущему филиалу
            try {
                const { canEditInCurrentBranch, showOtherBranchMessage } = await import('../modules/branches/branchSelector.js');
                const canEdit = await canEditInCurrentBranch();
                
                if (!canEdit) {
                    console.log('⚠️ [EventHandlers] User cannot edit in current branch');
                    await showOtherBranchMessage('Добавление песен в сет-листы');
                    return;
                }
            } catch (error) {
                console.error('❌ [EventHandlers] Error checking branch access:', error);
            }
            
            // Проверяем есть ли выбранный сетлист
            const currentSetlistId = window.state?.currentSetlistId;
            if (currentSetlistId) {
                // Открываем overlay для добавления в существующий сетлист
                if (typeof startAddingSongsModule === 'function') {
                    startAddingSongsModule('edit', currentSetlistId, window.state?.currentSetlistName);
                }
            } else {
                console.warn('🎵 [EventHandlers] No setlist selected for adding songs');
                if (typeof window.showNotification === 'function') {
                    window.showNotification('❌ Сначала выберите сет-лист', 'warning');
                }
            }
        });
        console.log('🎵 [EventHandlers] Add song button attached');
    } else {
        console.error('🎵 [EventHandlers] add-song-btn не найден!');
    }
    
    // Кнопка "Добавить песни" в модале подтверждения (после создания сетлиста)
    const startAddSongsBtn = document.getElementById('start-add-songs');
    if (startAddSongsBtn) {
        startAddSongsBtn.addEventListener('click', () => {
            console.log('🎵 [EventHandlers] Start add songs button clicked');
            // Закрываем модал подтверждения
            const confirmModal = document.getElementById('add-songs-confirm-modal');
            if (confirmModal) {
                confirmModal.classList.remove('show');
            }
            // Открываем overlay для добавления в новый сетлист
            if (typeof startAddingSongsModule === 'function') {
                startAddingSongsModule('create');
            }
        });
        console.log('🎵 [EventHandlers] Start add songs button attached');
    } else {
        console.error('🎵 [EventHandlers] start-add-songs не найден!');
    }
    
    // Кнопка "Пока нет" в модале подтверждения
    const skipAddSongsBtn = document.getElementById('skip-add-songs');
    if (skipAddSongsBtn) {
        skipAddSongsBtn.addEventListener('click', () => {
            console.log('🎵 [EventHandlers] Skip add songs button clicked');
            // Просто закрываем модал подтверждения
            const confirmModal = document.getElementById('add-songs-confirm-modal');
            if (confirmModal) {
                confirmModal.classList.remove('show');
            }
        });
        console.log('🎵 [EventHandlers] Skip add songs button attached');
    } else {
        console.error('🎵 [EventHandlers] skip-add-songs не найден!');
    }
    
    // Кнопка закрытия модала подтверждения
    const closeConfirmModalBtn = document.getElementById('close-confirm-modal');
    if (closeConfirmModalBtn) {
        closeConfirmModalBtn.addEventListener('click', () => {
            console.log('❌ [EventHandlers] Close confirm modal button clicked');
            const confirmModal = document.getElementById('add-songs-confirm-modal');
            if (confirmModal) {
                confirmModal.classList.remove('show');
            }
        });
        console.log('❌ [EventHandlers] Close confirm modal button attached');
    } else {
        console.error('❌ [EventHandlers] close-confirm-modal не найден!');
    }
    
    // ОБРАБОТЧИКИ ОВЕРЛЕЯ ДОБАВЛЕНИЯ ПЕСЕН - КРИТИЧЕСКИ ВАЖНО!
    
    // Поиск в оверлее добавления песен
    const songSearchInput = document.getElementById('song-search-input');
    if (songSearchInput) {
        let searchTimeout;
        songSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            console.log('🔍 [EventHandlers] Overlay search input:', searchTerm);
            
            // Debounce поиска
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                if (searchTerm.length >= 2) {
                    // Импортируем и вызываем поиск
                    try {
                        const { performOverlayDropdownSearch } = await import('../ui/search-manager.js');
                        await performOverlayDropdownSearch(searchTerm);
                        console.log('🔍 [EventHandlers] Overlay search completed');
                    } catch (error) {
                        console.error('🔍 [EventHandlers] Overlay search error:', error);
                    }
                } else {
                    // Скрываем результаты если запрос слишком короткий
                    const dropdown = document.getElementById('overlay-search-results');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
                }
            }, 300);
        });
        console.log('🔍 [EventHandlers] Overlay search input attached');
    } else {
        console.error('🔍 [EventHandlers] song-search-input не найден!');
    }
    
    // Кнопка очистки поиска в оверлее
    const clearSearchBtn = document.getElementById('clear-search');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            console.log('🔍 [EventHandlers] Clear search clicked');
            const searchInput = document.getElementById('song-search-input');
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
            clearSearchBtn.style.display = 'none';
        });
        console.log('🔍 [EventHandlers] Clear search button attached');
    }
    
    // Фильтр категорий в оверлее
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', async (e) => {
            console.log('📂 [EventHandlers] Category filter changed:', e.target.value);
            // Применяем фильтр к текущим результатам
            const { filterAndDisplaySongs: filterAndDisplaySongsModule } = await import('../ui/search-manager.js');
            const searchTerm = document.getElementById('song-search-input')?.value || '';
            const showAddedOnly = document.getElementById('show-added-only')?.classList.contains('active') || false;
            filterAndDisplaySongsModule(searchTerm, e.target.value, showAddedOnly);
        });
        console.log('📂 [EventHandlers] Category filter attached');
    }
    
    // УДАЛЕН ДУБЛИРУЮЩИЙ ОБРАБОТЧИК - уже есть в setupSearchEventHandlers
    
    // ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ДЛЯ ДИНАМИЧЕСКИХ КНОПОК ДОБАВЛЕНИЯ ПЕСЕН
    const songsGrid = document.getElementById('songs-grid');
    if (songsGrid) {
        songsGrid.addEventListener('click', async (e) => {
            // Кнопка добавления песни
            if (e.target.closest('.song-add-btn')) {
                const button = e.target.closest('.song-add-btn');
                const songId = button.getAttribute('data-song-id');
                
                console.log('🎵 [EventHandlers] Song add button clicked:', songId);
                
                if (songId) {
                    // Находим песню по ID
                    const allSongs = window.state?.allSongs || [];
                    const song = allSongs.find(s => s.id === songId);
                    
                    if (song) {
                        console.log('🎵 [EventHandlers] Found song:', song.name);
                        
                        // Проверяем не добавлена ли уже
                        const isAdded = window.addedSongsToCurrentSetlist?.has(songId);
                        
                        // Проверяем режим "Показать добавленные"
                        const showAddedOnly = document.getElementById('show-added-only');
                        const isShowingAddedOnly = showAddedOnly && showAddedOnly.classList.contains('active');
                        
                        if (isAdded && isShowingAddedOnly) {
                            // В режиме "Показать добавленные" удаляем песню
                            console.log('🎵 [EventHandlers] Removing song from added list:', song.name);
                            window.addedSongsToCurrentSetlist.delete(songId);
                            
                            // Обновляем счетчик
                            if (typeof window.updateAddedSongsCount === 'function') {
                                window.updateAddedSongsCount();
                            }
                            
                            // Обновляем отображение
                            const searchTerm = document.getElementById('search-input')?.value || '';
                            const currentCategory = document.getElementById('category-select')?.value || '';
                            const { filterAndDisplaySongs: filterAndDisplaySongsModule } = await import('../ui/search-manager.js');
                            filterAndDisplaySongsModule(searchTerm, currentCategory, true);
                            
                            if (typeof window.showNotification === 'function') {
                                window.showNotification(`➖ "${song.name}" удалена из списка`, 'info');
                            }
                            return;
                        } else if (isAdded) {
                            console.log('🎵 [EventHandlers] Song already added');
                            return;
                        }
                        
                        // Показываем оверлей выбора тональности
                        try {
                            const { showMobileSongPreview } = await import('../ui/overlay-manager.js');
                            showMobileSongPreview(song);
                            console.log('🎵 [EventHandlers] Mobile song preview shown');
                        } catch (error) {
                            console.error('🎵 [EventHandlers] Error showing song preview:', error);
                            // Fallback - прямое добавление
                            if (typeof window.addSongToSetlist === 'function') {
                                await window.addSongToSetlist(song);
                            }
                        }
                    } else {
                        console.error('🎵 [EventHandlers] Song not found:', songId);
                    }
                } else {
                    console.error('🎵 [EventHandlers] No song ID found');
                }
            }
        });
        console.log('🎵 [EventHandlers] Songs grid click delegation attached');
    } else {
        console.error('🎵 [EventHandlers] songs-grid не найден!');
    }
    
    // Селектор вокалистов
    if (ui.vocalistSelect) {
        ui.vocalistSelect.addEventListener('change', (e) => {
            if (typeof window.handleVocalistChange === 'function') {
                window.handleVocalistChange(e.target.value);
            }
        });
    }
}

// ====================================
// SONG EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики песен
 */
function setupSongEventHandlers() {
    console.log('🎼 [EventHandlers] setupSongEventHandlers');
    
    // Кнопка добавления песни в сетлист
    if (ui.addToSetlistButton) {
        console.log('📋 [EventHandlers] Add to setlist button found, attaching handler');
        ui.addToSetlistButton.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('📋 [EventHandlers] Add to setlist button clicked');
            
            // Проверяем статус пользователя
            if (hasLimitedAccess()) {
                console.log('⚠️ [EventHandlers] User has limited access, add to setlist blocked');
                if (isUserGuest()) {
                    showGuestMessage('Добавление песен в сет-листы');
                } else {
                    showPendingUserMessage('Добавление песен в сет-листы');
                }
                return;
            }
            
            // Проверяем доступ к текущему филиалу
            try {
                const { canEditInCurrentBranch, showOtherBranchMessage } = await import('../modules/branches/branchSelector.js');
                const canEdit = await canEditInCurrentBranch();
                
                if (!canEdit) {
                    console.log('⚠️ [EventHandlers] User cannot edit in current branch');
                    await showOtherBranchMessage('Добавление песен в сет-листы');
                    return;
                }
            } catch (error) {
                console.error('❌ [EventHandlers] Error checking branch access:', error);
            }
            
            if (typeof window.handleAddSongToSetlist === 'function') {
                await window.handleAddSongToSetlist();
            } else {
                console.error('❌ [EventHandlers] handleAddSongToSetlist function not found');
            }
        });
    } else {
        console.warn('⚠️ [EventHandlers] Add to setlist button not found');
    }
    
    // Обработчик обновления сет-листа
    window.addEventListener('setlist-updated', async (event) => {
        console.log('📋 [EventHandlers] Setlist updated event:', event.detail);
        
        try {
            const { loadSetlists } = await import('../api/index.js');
        const setlists = await loadSetlists();
            if (window.state && typeof window.state.setSetlists === 'function') {
                window.state.setSetlists(setlists);
            }
            
            // Если панель сет-листов открыта, обновляем её
            if (ui.setlistsPanel?.classList.contains('open')) {
                // Обновляем отображение
                if (typeof ui.renderSetlists === 'function') {
                                        await ui.renderSetlists(setlists,
                        window.handleSetlistSelect,
                        window.handleSetlistDelete
                    );
                }
            }
            
            // ВАЖНО: Обновляем список песен ВСЕГДА, если сет-лист выбран
            // независимо от того, открыта ли панель
            const currentSetlistId = window.state?.currentSetlistId;
            if (currentSetlistId === event.detail?.setlistId) {
                console.log('📋 [EventHandlers] Updating songs for current setlist:', currentSetlistId);
                const currentSetlist = setlists.find(s => s.id === currentSetlistId);
                if (currentSetlist && typeof ui.displaySelectedSetlist === 'function') {
                    console.log('📋 [EventHandlers] Found setlist, songs count:', currentSetlist.songs?.length);
                    ui.displaySelectedSetlist(currentSetlist, 
                        window.handleFavoriteOrRepertoireSelect,
                        window.handleRemoveSongFromSetlist
                    );
                }
            }
        } catch (error) {
            console.error('Error updating setlist panel:', error);
        }
    });
    
    // Кнопка добавления в репертуар
    if (ui.repertoireButton) {
        console.log('🎤 [EventHandlers] Repertoire (mic) button found, attaching handler');
        ui.repertoireButton.addEventListener('click', async () => {
            console.log('🎤 [EventHandlers] Repertoire (mic) button clicked');
            // Используем window.currentSong, так как там хранится текущая песня
            const currentSong = window.currentSong;
            console.log('🎤 [EventHandlers] Current song:', currentSong);
            if (currentSong) {
                await controller.handleAddToRepertoire(currentSong);
            } else {
                console.error('🎤 [EventHandlers] No current song selected');
                console.log('🎤 [EventHandlers] Checked: window.currentSong, state.currentSong:', state.currentSong);
            }
        });
    } else {
        console.error('🎤 [EventHandlers] Repertoire (mic) button NOT FOUND');
    }
    
    // Кнопка избранного
    if (ui.favoriteButton) {
        ui.favoriteButton.addEventListener('click', async () => {
            const currentSong = window.currentSong;
            if (currentSong) {
                controller.handleFavoriteOrRepertoireSelect(currentSong);
            }
        });
    }
    
    // Редактор песен
    if (ui.editSongButton) {
        ui.editSongButton.addEventListener('click', () => {
            console.log('📝 [EventHandlers] Edit song button clicked');
            
            // Получаем текущую песню
            const currentSong = window.stateManager?.getCurrentSong?.() || window.currentSong;
            if (!currentSong) {
                console.error('❌ [EventHandlers] No song selected for editing');
                console.log('Checked: stateManager.getCurrentSong, window.currentSong');
                return;
            }
            
            // Вызываем функцию открытия редактора с данными песни
            if (typeof ui.openSongEditor === 'function') {
                console.log('📝 [EventHandlers] Opening editor with song:', currentSong.name);
                ui.openSongEditor(currentSong);
            } else {
                console.error('❌ [EventHandlers] openSongEditor function not found!');
            }
        });
        console.log('📝 [EventHandlers] Edit song button handler attached');
    } else {
        console.warn('⚠️ [EventHandlers] Edit song button not found');
    }
    
    if (ui.saveEditButton) {
        ui.saveEditButton.addEventListener('click', async () => {
            if (typeof window.handleSaveEdit === 'function') {
                await window.handleSaveEdit();
            }
        });
    }
    
    if (ui.cancelEditButton) {
        ui.cancelEditButton.addEventListener('click', () => {
            if (ui.songEditorOverlay) {
                ui.songEditorOverlay.classList.remove('visible'); // Исправлено: visible вместо show
            }
        });
    }
    
    if (ui.closeEditorButton) {
        ui.closeEditorButton.addEventListener('click', () => {
            if (ui.songEditorOverlay) {
                ui.songEditorOverlay.classList.remove('visible'); // Исправлено: visible вместо show
            }
        });
    }
    
    if (ui.revertToOriginalButton) {
        ui.revertToOriginalButton.addEventListener('click', async () => {
            if (typeof window.handleRevertToOriginal === 'function') {
                await window.handleRevertToOriginal();
            }
        });
    }
}

// ====================================
// PRESENTATION EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики презентации
 */
function setupPresentationEventHandlers() {
    console.log('📽️ [EventHandlers] setupPresentationEventHandlers');
    
    if (ui.presentationCloseBtn) {
        ui.presentationCloseBtn.addEventListener('click', () => {
            if (typeof window.closePresentationMode === 'function') {
                window.closePresentationMode();
            }
        });
    }
    
    if (ui.presPrevBtn) {
        ui.presPrevBtn.addEventListener('click', () => {
            if (typeof window.previousSlide === 'function') {
                window.previousSlide();
            }
        });
    }
    
    if (ui.presNextBtn) {
        ui.presNextBtn.addEventListener('click', () => {
            if (typeof window.nextSlide === 'function') {
                window.nextSlide();
            }
        });
    }
    
    if (ui.presSplitTextBtn) {
        ui.presSplitTextBtn.addEventListener('click', () => {
            if (typeof window.togglePresentationSplit === 'function') {
                window.togglePresentationSplit();
            }
        });
    }
}

// ====================================
// TOUCH EVENT HANDLERS
// ====================================

/**
 * Настраивает обработчики touch событий
 */
function setupTouchEventHandlers() {
    console.log('👆 [EventHandlers] setupTouchEventHandlers');
    
    // Удаляем дублирующий обработчик свайпов - они уже настроены в initialization.js
}

// ====================================
// MODULE METADATA
// ====================================

export const metadata = {
    name: 'EventHandlers',
    version: '1.0.0',
    description: 'Модуль для обработчиков событий приложения',
    functions: [
        'setupEventListeners',
        'setupUIEventHandlers',
        'setupSearchEventHandlers',
        'setupModalEventHandlers',
        'setupKeyboardEventHandlers',
        'setupSetlistEventHandlers',
        'setupSongEventHandlers',
        'setupPresentationEventHandlers',
        'setupTouchEventHandlers'
    ]
};
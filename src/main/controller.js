/**
 * ===================================================================
 * MAIN CONTROLLER MODULE
 * ===================================================================
 * Главный контроллер приложения - управляет основной логикой
 * 
 * Функции:
 * - Управление сетлистами (создание, удаление, выбор)
 * - Управление песнями (добавление, удаление, заметки)
 * - Управление репертуаром
 * - Обработка пользовательских действий
 */

// Импорты
import { eventBus, stateManager } from '../core/index.js';
import { showNotification, showConfirmDialog } from '../core/index.js';
import * as api from '../api/index.js';
import * as state from '../../js/state.js';
import * as ui from '../../ui.js';

// ====================================
// SETLIST MANAGEMENT
// ====================================

/**
 * Создает новый сетлист
 * @param {string} name - Название сетлиста
 */
export async function handleCreateSetlist(name) {
    console.log('🎵 [Controller] handleCreateSetlist:', name);
    
    if (!name || !name.trim()) {
        showNotification('❌ Название сет-листа не может быть пустым', 'error');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        if (ui.createSetlistButton) {
            ui.createSetlistButton.disabled = true;
            ui.createSetlistButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Создание...</span>';
        }
        
        const setlistId = await api.createSetlist(name.trim());
        
        // Сохраняем созданный сетлист как текущий
        eventBus.setState('currentCreatedSetlistId', setlistId);
        eventBus.setState('currentCreatedSetlistName', name.trim());
        
        // КРИТИЧЕСКИ ВАЖНО: Синхронизируем с window для совместимости
        window.currentCreatedSetlistId = setlistId;
        window.currentCreatedSetlistName = name.trim();
        console.log('🎯 [Controller] Synced with window:', window.currentCreatedSetlistId, window.currentCreatedSetlistName);
        
        // Обновляем список сетлистов
        const setlists = await refreshSetlists();
        
        // Находим созданный сет-лист
        const createdSetlist = setlists.find(s => s.id === setlistId);
        if (createdSetlist) {
            // Автоматически выбираем новый сет-лист
            handleSetlistSelect(createdSetlist);
            
            // Обновляем UI для отображения выбранного сет-листа
            if (typeof ui.displaySelectedSetlist === 'function') {
                ui.displaySelectedSetlist(createdSetlist, 
                    window.handleFavoriteOrRepertoireSelect,
                    window.handleRemoveSongFromSetlist
                );
            }
            
            // Обновляем текст в селекторе
            const dropdownBtnText = document.querySelector('#setlist-dropdown-btn .selector-text');
            if (dropdownBtnText) {
                dropdownBtnText.textContent = name.trim();
            }
            
            // Показываем панель выбранного сет-листа
            const selectedSetlistControl = document.getElementById('selected-setlist-control');
            if (selectedSetlistControl) {
                selectedSetlistControl.style.display = 'block';
            }
            
            const currentSetlistName = document.getElementById('current-setlist-name');
            if (currentSetlistName) {
                currentSetlistName.textContent = name.trim();
            }
        }
        
        // Показываем модальное окно подтверждения добавления песен
        if (ui.createdSetlistName) {
            ui.createdSetlistName.textContent = name.trim();
        }
        if (ui.addSongsConfirmModal) {
            ui.addSongsConfirmModal.classList.add('show');
        }
        
        showNotification('✅ Сет-лист создан успешно!', 'success');
        
        return setlistId;
        
    } catch (error) {
        console.error('❌ [Controller] Ошибка создания сетлиста:', error);
        showNotification('❌ Не удалось создать сет-лист', 'error');
        throw error;
    } finally {
        // Восстанавливаем кнопку
        if (ui.createSetlistButton) {
            ui.createSetlistButton.disabled = false;
            ui.createSetlistButton.innerHTML = '<i class="fas fa-arrow-right"></i><span>Продолжить</span>';
        }
    }
}

/**
 * Обновляет список сетлистов
 */
export async function refreshSetlists() {
    console.log('🔄 [Controller] refreshSetlists');
    
    try {
        const setlists = await api.loadSetlists();
        
        // Обновляем состояние
        stateManager.setAllSetlists(setlists);
        
        // Обновляем UI если есть соответствующие элементы
        if (typeof window.updateSetlistsUI === 'function') {
            window.updateSetlistsUI(setlists);
        }
        
        // Если панель сет-листов открыта, обновляем отображение
        if (ui.setlistsPanel?.classList.contains('open')) {
            if (typeof ui.renderSetlists === 'function') {
                await ui.renderSetlists(setlists, 
                    window.handleSetlistSelect,
                    window.handleSetlistDelete
                );
            }
        }
        
        return setlists;
        
    } catch (error) {
        console.error('❌ [Controller] Ошибка обновления сетлистов:', error);
        showNotification('❌ Ошибка загрузки сетлистов', 'error');
        throw error;
    }
}

/**
 * Выбирает сетлист для редактирования
 * @param {Object} setlist - Объект сетлиста
 */
export function handleSetlistSelect(setlist) {
    console.log('🎯 [Controller] handleSetlistSelect:', setlist.name);
    
    // Сохраняем выбранный сетлист в состояние используя функции обновления
    state.setCurrentSetlistId(setlist.id);
    state.setCurrentSetlistName(setlist.name);
    state.setCurrentSetlistSongs(setlist.songs || []);
    
    // Обновляем Event Bus
    eventBus.setState('currentSetlistId', setlist.id);
    eventBus.setState('currentSetlistName', setlist.name);
    eventBus.setState('currentSetlistSongs', setlist.songs || []);
    
    // Обновляем UI
    console.log('🔄 [Controller] Обновляем отображение выбранного сет-листа');
    ui.displaySelectedSetlist(
        setlist,
        window.handleFavoriteOrRepertoireSelect || function() {},
        window.handleRemoveSongFromSetlist || function() {}
    );
}

/**
 * Удаляет сетлист с подтверждением
 * @param {string} setlistId - ID сетлиста
 * @param {string} setlistName - Название сетлиста
 */
export async function handleSetlistDelete(setlistId, setlistName) {
    console.log('🗑️ [Controller] handleSetlistDelete:', setlistName);
    
    const confirmed = await showConfirmDialog(
        `Вы уверены, что хотите удалить сет-лист "${setlistName}"?`,
        {
            title: 'Подтверждение удаления',
            confirmText: 'Удалить',
            cancelText: 'Отмена'
        }
    );
    
    if (!confirmed) {
        return false;
    }
    
    try {
        await api.deleteSetlist(setlistId);
        
        // Если удаляем текущий сетлист, очищаем состояние
        if (state.currentSetlistId === setlistId) {
            state.currentSetlistId = null;
            state.currentSetlistName = '';
            state.currentSetlistSongs = [];
            
            eventBus.setState('currentSetlistId', null);
            eventBus.setState('currentSetlistName', '');
            eventBus.setState('currentSetlistSongs', []);
        }
        
        // Обновляем список сетлистов
        await refreshSetlists();
        
        showNotification(`🗑️ Сет-лист "${setlistName}" удален`, 'info');
        
        return true;
        
    } catch (error) {
        console.error('❌ [Controller] Ошибка удаления сетлиста:', error);
        showNotification('❌ Ошибка при удалении сет-листа', 'error');
        throw error;
    }
}

// ====================================
// SONG MANAGEMENT
// ====================================

/**
 * Удаляет песню из сетлиста
 * @param {string} songId - ID песни
 * @param {string} songName - Название песни
 */
export async function handleRemoveSongFromSetlist(songId, songName) {
    console.log('➖ [Controller] handleRemoveSongFromSetlist:', songName);
    
    if (!state.currentSetlistId) {
        showNotification('❌ Сетлист не выбран', 'error');
        return false;
    }
    
    const confirmed = await showConfirmDialog(
        `Удалить "${songName}" из сет-листа?`,
        {
            title: 'Подтверждение удаления',
            confirmText: 'Удалить',
            cancelText: 'Отмена'
        }
    );
    
    if (!confirmed) {
        return false;
    }
    
    try {
        await api.removeSongFromSetlist(state.currentSetlistId, songId);
        
        // Загружаем обновленные данные сет-листа
        const setlists = await api.loadSetlists();
        const updatedSetlist = setlists.find(s => s.id === state.currentSetlistId);
        
        if (updatedSetlist) {
            // Обновляем локальное состояние
            state.currentSetlistSongs = updatedSetlist.songs || [];
            eventBus.setState('currentSetlistSongs', state.currentSetlistSongs);
            
            // Обновляем UI
            console.log('🔄 [Controller] Обновляем отображение после удаления песни');
            ui.displaySelectedSetlist(
                updatedSetlist,
                window.handleFavoriteOrRepertoireSelect || function() {},
                window.handleRemoveSongFromSetlist || function() {}
            );
        }
        
        showNotification(`➖ "${songName}" удалена из сет-листа`, 'info');
        
        return true;
        
    } catch (error) {
        console.error('❌ [Controller] Ошибка удаления песни:', error);
        showNotification('❌ Ошибка при удалении песни', 'error');
        throw error;
    }
}

/**
 * Сохраняет заметку к песне
 * @param {string} songId - ID песни
 * @param {string} note - Текст заметки
 */
export async function handleSaveNote(songId, note) {
    console.log('📝 [Controller] handleSaveNote:', songId);
    
    try {
        await api.saveSongNote(songId, note);
        
        showNotification('✅ Заметка сохранена', 'success');
        
        // Закрываем модальное окно заметок
        if (ui.notesModal) {
            ui.notesModal.classList.remove('show');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ [Controller] Ошибка сохранения заметки:', error);
        showNotification('❌ Ошибка сохранения заметки', 'error');
        throw error;
    }
}

// ====================================
// REPERTOIRE MANAGEMENT
// ====================================

/**
 * Обрабатывает выбор избранного или репертуара
 * @param {Object} song - Объект песни
 */
export function handleFavoriteOrRepertoireSelect(song) {
    console.log('⭐ [Controller] handleFavoriteOrRepertoireSelect:', song.name);
    
    // Логика обработки будет зависеть от UI
    // Пока просто эмитим событие
    eventBus.emit('favoriteOrRepertoireSelect', { song });
}

/**
 * Добавляет или удаляет песню из репертуара пользователя
 * @param {Object} song - Объект песни
 */
export async function handleAddToRepertoire(song) {
    console.log('📚 [Controller] handleAddToRepertoire:', song.name);
    
    try {
        // Импортируем API для работы с репертуаром пользователя
        const { 
            addToUserRepertoire, 
            removeFromUserRepertoire, 
            checkSongInUserRepertoire,
            replaceKeyInRepertoire 
        } = await import('../api/userRepertoire.js');
        
        // Получаем текущую тональность из селектора
        const keySelect = document.getElementById('key-select');
        const currentKey = keySelect?.value || song.defaultKey || song.keys?.[0] || 'C';
        
        // Добавляем песню или проверяем статус
        const result = await addToUserRepertoire(song, currentKey);
        
        if (result.status === 'exists') {
            // Песня уже есть в той же тональности
            const action = confirm(
                `Песня "${song.name}" уже есть в репертуаре в тональности ${currentKey}.\n\n` +
                `Удалить её из репертуара?`
            );
            
            if (action) {
                await removeFromUserRepertoire(song.id);
                showNotification(`🎤 "${song.name}" удалена из репертуара`, 'info');
            }
        } else if (result.status === 'different_key') {
            // Песня есть в другой тональности
            const action = confirm(
                `Песня "${song.name}" уже добавлена в репертуар в тональности ${result.key}.\n\n` +
                `Заменить на тональность ${currentKey}?`
            );
            
            if (action) {
                await replaceKeyInRepertoire(song.id, currentKey);
                showNotification(`🎤 Тональность изменена с ${result.key} на ${currentKey}`, 'success');
            }
        } else if (result.status === 'added') {
            // Песня успешно добавлена
            showNotification(`🎤 "${song.name}" добавлена в репертуар (${currentKey})`, 'success');
        }
        
        // Обновляем кнопку репертуара
        if (typeof ui.updateRepertoireButton === 'function') {
            await ui.updateRepertoireButton(song);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ [Controller] Ошибка работы с репертуаром:', error);
        showNotification('❌ Ошибка работы с репертуаром', 'error');
        throw error;
    }
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Завершает процесс добавления песен
 */
export async function finishAddingSongs() {
    console.log('🏁 [Controller] finishAddingSongs');
    
    const addedCount = window.addedSongsToCurrentSetlist?.size || 0;
    const setlistName = eventBus.getState('currentCreatedSetlistName') || 
                       eventBus.getState('currentSetlistName') || 
                       state.currentSetlistName;
    
    const currentSetlistId = eventBus.getState('currentSetlistId') || state.currentSetlistId;
    
    // Закрываем overlay
    if (ui.addSongsOverlay) {
        ui.addSongsOverlay.classList.remove('show');
    }
    
    // Показываем уведомление о завершении
    if (addedCount > 0) {
        if (eventBus.getState('activeOverlayMode') === 'create') {
            showNotification(`🎉 Сет-лист "${setlistName}" создан с ${addedCount} песнями!`, 'success');
        } else {
            showNotification(`🎉 Добавлено ${addedCount} песен в "${setlistName}"!`, 'success');
        }
    } else {
        if (eventBus.getState('activeOverlayMode') === 'create') {
            showNotification(`✅ Сет-лист "${setlistName}" готов к использованию!`, 'success');
        } else {
            showNotification(`✅ Редактирование "${setlistName}" завершено!`, 'success');
        }
    }
    
    // Обновляем отображение сет-листа если панель открыта
    if (currentSetlistId && ui.setlistsPanel && ui.setlistsPanel.classList.contains('open')) {
        try {
            // Загружаем обновленные данные сет-листа
            const setlists = await api.loadSetlists();
            const updatedSetlist = setlists.find(s => s.id === currentSetlistId);
            
            if (updatedSetlist) {
                console.log('🔄 [Controller] Обновляем отображение сет-листа:', updatedSetlist.name);
                // Используем те же функции что и при выборе сет-листа
                ui.displaySelectedSetlist(
                    updatedSetlist,
                    window.handleFavoriteOrRepertoireSelect || function() {},
                    window.handleRemoveSongFromSetlist || function() {}
                );
            }
        } catch (error) {
            console.error('❌ [Controller] Ошибка обновления сет-листа:', error);
        }
    }
    
    // Очищаем состояние
    eventBus.setState('activeOverlayMode', null);
    eventBus.setState('activeSetlistId', null);
    eventBus.setState('activeSetlistName', null);
    
    // Очищаем глобальные переменные
    if (window.addedSongsToCurrentSetlist) {
        window.addedSongsToCurrentSetlist.clear();
    }
}

// ====================================
// MODULE METADATA
// ====================================

export const metadata = {
    name: 'MainController',
    version: '1.0.0',
    description: 'Главный контроллер приложения для управления основной логикой',
    functions: [
        'handleCreateSetlist',
        'refreshSetlists',
        'handleSetlistSelect',
        'handleSetlistDelete',
        'handleRemoveSongFromSetlist',
        'handleSaveNote',
        'handleFavoriteOrRepertoireSelect',
        'handleAddToRepertoire',
        'finishAddingSongs'
    ]
};
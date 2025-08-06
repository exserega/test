/**
 * ===================================================================
 * SETLIST MANAGER MODULE
 * ===================================================================
 * Модуль для управления сетлистами, добавления песен, overlay управления
 * 
 * Функции:
 * - startAddingSongs() - открытие overlay добавления песен
 * - closeAddSongsOverlay() - закрытие overlay
 * - addSongToSetlist() - добавление песни в сетлист
 * - removeSongFromSetlist() - удаление песни из сетлиста
 * - handleCreateSetlist() - создание нового сетлиста
 * - refreshSetlists() - обновление списка сетлистов
 */

// Импорты из core модулей
import { eventBus, stateManager } from '../core/index.js';

// Импорты состояния и API
import * as state from '../../js/state.js';
import * as songsApi from '../js/api/songs.js';
import * as ui from '../../ui.js';

// Глобальные переменные для совместимости (временно)
let currentCreatedSetlistId = null;
let currentCreatedSetlistName = '';

/**
 * Универсальная функция для запуска overlay добавления песен
 * @param {string} mode - Режим: 'create' или 'edit'
 * @param {string} targetSetlistId - ID целевого сетлиста
 * @param {string} targetSetlistName - Название целевого сетлиста
 */
export async function startAddingSongs(mode = 'create', targetSetlistId = null, targetSetlistName = '') {
    console.log('🎵 [SetlistManager] startAddingSongs START');
    console.log('Mode:', mode);
    console.log('targetSetlistId:', targetSetlistId);
    console.log('targetSetlistName:', targetSetlistName);
    
    // Закрываем модальное окно подтверждения если открыто
    if (typeof window.closeAddSongsConfirmModal === 'function') {
        window.closeAddSongsConfirmModal();
    }
    
    // Определяем целевой setlist в зависимости от режима
    let activeSetlistId, activeSetlistName;
    
    if (mode === 'create') {
        // Режим создания нового списка - ИСПОЛЬЗУЕМ WINDOW ДЛЯ СИНХРОНИЗАЦИИ!
        activeSetlistId = window.currentCreatedSetlistId || currentCreatedSetlistId;
        activeSetlistName = window.currentCreatedSetlistName || currentCreatedSetlistName;
        console.log('CREATE mode - using currentCreated:', activeSetlistId, activeSetlistName);
        console.log('🎯 [DEBUG] window.currentCreated:', window.currentCreatedSetlistId, window.currentCreatedSetlistName);
    } else if (mode === 'edit') {
        // Режим редактирования существующего списка
        activeSetlistId = targetSetlistId || state.currentSetlistId;
        activeSetlistName = targetSetlistName || state.currentSetlistName;
        console.log('EDIT mode - using current:', activeSetlistId, activeSetlistName);
    }
    
    // Сохраняем активные данные в Event Bus
    eventBus.setState('activeOverlayMode', mode);
    eventBus.setState('activeSetlistId', activeSetlistId);
    eventBus.setState('activeSetlistName', activeSetlistName);
    
    // Оставляем старые переменные для совместимости (временно)
    if (typeof window !== 'undefined') {
        window.activeOverlayMode = mode;
        window.activeSetlistId = activeSetlistId;
        window.activeSetlistName = activeSetlistName;
    }
    
    // Очищаем и инициализируем состояние
    const addedSongsToCurrentSetlist = window.addedSongsToCurrentSetlist || new Map();
    addedSongsToCurrentSetlist.clear();
    
    if (ui.addedSongsCount) {
        ui.addedSongsCount.textContent = '0';
    }
    // Обнуляем бейдж в кнопке фильтра
    if (ui.addedSongsCountBadge) {
        ui.addedSongsCountBadge.textContent = '0';
        ui.addedSongsCountBadge.style.display = 'none';
    }
    
    // Показываем полноэкранный overlay
    if (ui.targetSetlistName) {
        ui.targetSetlistName.textContent = activeSetlistName;
    }
    if (ui.addSongsOverlay) {
        ui.addSongsOverlay.classList.add('show');
    }
    
    // Заполняем фильтр категорий
    if (typeof window.populateCategoryFilter === 'function') {
        window.populateCategoryFilter();
    }
    
    console.log('🎵 Overlay shown, addedSongsToCurrentSetlist cleared');
    
    // Загружаем все песни если еще не загружены
    const currentSongs = stateManager.getAllSongs().length > 0 ? stateManager.getAllSongs() : state.allSongs;
    if (currentSongs.length === 0) {
        try {
            await songsApi.loadAllSongsFromFirestore();
        } catch (error) {
            console.error('❌ Ошибка загрузки песен:', error);
        }
    }
    
    // Сбрасываем фильтр категорий на "Все категории"
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.value = '';
    }
    
    // Сбрасываем состояние кнопки "Показать добавленные"
    const showAddedOnlyBtn = document.getElementById('show-added-only');
    if (showAddedOnlyBtn) {
        showAddedOnlyBtn.classList.remove('active');
    }
    
    // Отображаем песни
    if (typeof window.filterAndDisplaySongs === 'function') {
        await window.filterAndDisplaySongs('', '');
    } else {
        // Импортируем функцию динамически
        const { filterAndDisplaySongs } = await import('./search-manager.js');
        await filterAndDisplaySongs('', '');
    }
    
    console.log('🎵 [SetlistManager] startAddingSongs END');
}

/**
 * Закрытие overlay добавления песен
 */
export function closeAddSongsOverlay() {
    console.log('🎵 [SetlistManager] closeAddSongsOverlay');
    
    if (ui.addSongsOverlay) {
        ui.addSongsOverlay.classList.remove('show');
    }
    
    // Очищаем состояние Event Bus
    eventBus.setState('activeOverlayMode', null);
    eventBus.setState('activeSetlistId', null);
    eventBus.setState('activeSetlistName', null);
    
    // Очищаем глобальные переменные для совместимости
    if (typeof window !== 'undefined') {
        window.activeOverlayMode = null;
        window.activeSetlistId = null;
        window.activeSetlistName = null;
    }
}

/**
 * Добавление песни в сетлист (улучшенная версия)
 * @param {Object} song - Объект песни
 * @param {string} key - Тональность
 */
export async function addSongToSetlist(song, key) {
    console.log('🎵 [SetlistManager] addSongToSetlist START');
    console.log('song:', song.name);
    console.log('key:', key);
    
    // Получаем активный setlist
    const targetSetlistId = eventBus.getState('activeSetlistId') || window.activeSetlistId;
    const activeOverlayMode = eventBus.getState('activeOverlayMode') || window.activeOverlayMode;
    
    console.log('targetSetlistId:', targetSetlistId);
    console.log('activeOverlayMode:', activeOverlayMode);
    
    if (!targetSetlistId) {
        console.error('❌ No target setlist ID');
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Сет-лист не выбран', 'error');
        }
        return;
    }
    
    try {
        // Вызываем API для добавления песни
        const apiModule = await import('../../js/api.js');
        const result = await apiModule.addSongToSetlist(targetSetlistId, song.id, key);
        
        console.log('API result:', result);
        
        if (result.status === 'added') {
            console.log('✅ Song added successfully, updating UI...');
            
            // Обновляем локальное состояние
            const addedSongsToCurrentSetlist = window.addedSongsToCurrentSetlist || new Map();
            addedSongsToCurrentSetlist.set(song.id, key); // Сохраняем песню с выбранной тональностью
            
            // Показываем уведомление
            if (typeof window.showNotification === 'function') {
                window.showNotification(`➕ "${song.name}" добавлена в тональности ${key}`, 'success');
            }
            
            // Обновляем счетчик
            const count = addedSongsToCurrentSetlist.size;
            if (ui.addedSongsCount) {
                ui.addedSongsCount.textContent = count;
            }
            // Обновляем бейдж в кнопке фильтра
            if (ui.addedSongsCountBadge) {
                ui.addedSongsCountBadge.textContent = count;
                ui.addedSongsCountBadge.style.display = count > 0 ? 'inline-flex' : 'none';
            }
            console.log('Updated counter to:', count);
            
            // Обновляем отображение
            if (typeof window.refreshSongsDisplay === 'function') {
                window.refreshSongsDisplay();
            }
            
        } else if (result.status === 'duplicate_different') {
            console.log('⚠️ Song exists with different key');
            if (typeof window.showNotification === 'function') {
                window.showNotification(`⚠️ Песня уже есть в тональности ${result.existingKey}. Заменить на ${key}?`, 'warning');
            }
        } else if (result.status === 'duplicate_same') {
            console.log('ℹ️ Song already exists with same key');
            if (typeof window.showNotification === 'function') {
                window.showNotification(`ℹ️ Песня уже есть в сет-листе с тональностью ${key}`, 'info');
            }
        }
        
    } catch (error) {
        console.error('❌ Error adding song to setlist:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Ошибка добавления песни', 'error');
        }
    }
    
    console.log('🎵 [SetlistManager] addSongToSetlist END');
}

/**
 * Подтверждение добавления песни с выбранной тональностью
 */
export async function confirmAddSongWithKey() {
    console.log('🎵 [SetlistManager] confirmAddSongWithKey called');
    
    // Делегируем выполнение глобальной функции
    if (typeof window.confirmAddSongWithKey === 'function') {
        return await window.confirmAddSongWithKey();
    }
    
    throw new Error('confirmAddSongWithKey not found in global scope');
}

// Геттеры для доступа к внутренним переменным
export function getCurrentCreatedSetlistId() {
    return currentCreatedSetlistId;
}

export function getCurrentCreatedSetlistName() {
    return currentCreatedSetlistName;
}

export function setCurrentCreatedSetlist(id, name) {
    currentCreatedSetlistId = id;
    currentCreatedSetlistName = name;
}

export const metadata = {
    name: 'SetlistManager',
    version: '2.0.0',
    description: 'Полноценный модуль для управления сетлистами и добавления песен',
    functions: [
        'startAddingSongs',
        'closeAddSongsOverlay', 
        'addSongToSetlist',
        'confirmAddSongWithKey',
        'getCurrentCreatedSetlistId',
        'getCurrentCreatedSetlistName',
        'setCurrentCreatedSetlist'
    ]
};
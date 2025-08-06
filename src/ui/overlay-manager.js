/**
 * Agape Worship App - Overlay Management Module
 * Модуль для управления оверлеями и модальными окнами
 */

import { 
    getSongKey,
    getTransposition, 
    transposeLyrics, 
    processLyrics, 
    highlightChords 
} from '../core/index.js';
import * as ui from '../../ui.js';
import * as core from '../../js/core.js';

// Глобальные переменные для состояния оверлеев
let currentMobileSong = null;
let currentSongForKey = null;
let currentSelectedKey = 'C';

/**
 * Показ мобильного превью песни
 * @param {Object} song - Объект песни
 */
export function showMobileSongPreview(song) {
    console.log('🔍 Показ мобильного overlay для песни:', song.name);
    
    currentMobileSong = song;
    
    // Получаем элементы
    const overlay = document.getElementById('mobile-song-preview-overlay');
    const titleElement = document.getElementById('mobile-song-title');
    const keySelector = document.getElementById('mobile-key-selector');
    const songTextElement = document.getElementById('mobile-song-text');
    
    if (!overlay || !titleElement || !keySelector || !songTextElement) {
        console.error('❌ Не найдены элементы мобильного overlay:');
        console.error('overlay:', overlay);
        console.error('titleElement:', titleElement);
        console.error('keySelector:', keySelector);
        console.error('songTextElement:', songTextElement);
        return;
    }
    
    // Устанавливаем название
    titleElement.textContent = song.name;
    
    // Устанавливаем оригинальную тональность
    const originalKey = getSongKey(song);
    keySelector.value = originalKey;
    
    // Отображаем текст песни
    displaySongTextInMobileOverlay(song, originalKey);
    
    // Показываем overlay
    overlay.classList.add('show');
    document.body.classList.add('overlay-active');
    
    // Убеждаемся что обработчики кнопок подключены
    setupMobileOverlayEventListeners();
    
    console.log('✅ Мобильный overlay показан');
}

/**
 * Скрытие мобильного overlay
 */
export function hideMobileSongPreview() {
    console.log('🔒 Скрытие мобильного overlay');
    
    const overlay = document.getElementById('mobile-song-preview-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.classList.remove('overlay-active');
    }
    
    currentMobileSong = null;
    
    console.log('✅ Мобильный overlay скрыт');
}

/**
 * Отображение текста песни в мобильном overlay
 * @param {Object} song - Объект песни
 * @param {string} selectedKey - Выбранная тональность
 */
export function displaySongTextInMobileOverlay(song, selectedKey) {
    console.log('📝 displaySongTextInMobileOverlay called:', song.name, selectedKey);
    const songTextElement = document.getElementById('mobile-song-text');
    if (!songTextElement) {
        console.error('❌ Элемент mobile-song-text не найден');
        return;
    }
    
    // Получаем текст песни
    let songText = song.hasWebEdits 
        ? (song['Текст и аккорды (edited)'] || song['Текст и аккорды'] || '') 
        : (song['Текст и аккорды'] || '');
    
    if (!songText) {
        songTextElement.innerHTML = '<div style="text-align: center; color: var(--label-color); font-style: italic;">Текст песни не найден</div>';
        return;
    }
    
    // Транспонируем аккорды если нужно
    const originalKey = getSongKey(song);
    console.log(`🎵 Транспонирование: ${originalKey} → ${selectedKey}`);
    
    if (selectedKey !== originalKey) {
        // Используем продвинутую функцию транспонирования с поддержкой бемолей
        const transposition = getTransposition(originalKey, selectedKey);
        songText = transposeLyrics(songText, transposition, selectedKey);
        console.log('✅ Транспонирование выполнено с поддержкой бемолей');
    } else {
        console.log('⚪ Транспонирование не требуется');
    }
    
    // Обрабатываем и отображаем
    const processedLyrics = processLyrics(songText);
    songTextElement.innerHTML = processedLyrics;
    console.log('📝 Текст песни отображен в mobile overlay');
}

/**
 * Настройка обработчиков событий для мобильного overlay
 */
export function setupMobileOverlayEventListeners() {
    console.log('🔧 Настройка обработчиков для мобильного overlay');
    
    // Кнопка закрытия
    const closeBtn = document.getElementById('close-mobile-song-preview');
    if (closeBtn) {
        // Удаляем старые обработчики
        closeBtn.replaceWith(closeBtn.cloneNode(true));
        const newCloseBtn = document.getElementById('close-mobile-song-preview');
        
        newCloseBtn.addEventListener('click', () => {
            console.log('❌ Кнопка закрытия мобильного overlay нажата');
            hideMobileSongPreview();
        });
        console.log('✅ Обработчик кнопки закрытия подключен');
    } else {
        console.error('❌ Кнопка close-mobile-song-preview не найдена');
    }
    
    // Кнопка добавления (будет импортирована из setlist-manager)
    const addBtn = document.getElementById('add-song-to-setlist-mobile');
    if (addBtn) {
        // Удаляем старые обработчики
        addBtn.replaceWith(addBtn.cloneNode(true));
        const newAddBtn = document.getElementById('add-song-to-setlist-mobile');
        
        newAddBtn.addEventListener('click', async () => {
            console.log('🎵 Кнопка "Добавить" нажата в мобильном overlay');
            if (currentMobileSong) {
                const selectedKey = document.getElementById('mobile-key-selector').value;
                console.log('📝 Добавляем песню:', currentMobileSong.name, 'в тональности:', selectedKey);
                
                try {
                    // Импортируем функцию динамически чтобы избежать циклических зависимостей
                    const { addSongToSetlist } = await import('./setlist-manager.js');
                    await addSongToSetlist(currentMobileSong, selectedKey);
                    console.log('✅ Песня успешно добавлена');
                    hideMobileSongPreview();
                    
                    // Показываем уведомление (будет импортировано из modal-manager)
                    const { showNotification } = await import('./modal-manager.js');
                    showNotification('✅ Песня добавлена в сет-лист', 'success');
                } catch (error) {
                    console.error('❌ Ошибка добавления песни:', error);
                    const { showNotification } = await import('./modal-manager.js');
                    showNotification('❌ Ошибка добавления песни', 'error');
                }
            }
        });
        console.log('✅ Обработчик кнопки добавления подключен');
    } else {
        console.error('❌ Кнопка add-song-to-setlist-mobile не найдена');
    }
    
    // Селектор тональности
    const keySelector = document.getElementById('mobile-key-selector');
    if (keySelector) {
        // Удаляем старые обработчики
        keySelector.replaceWith(keySelector.cloneNode(true));
        const newKeySelector = document.getElementById('mobile-key-selector');
        
        // Восстанавливаем выбранное значение
        if (currentMobileSong) {
            const originalKey = getSongKey(currentMobileSong);
            newKeySelector.value = originalKey;
        }
        
        newKeySelector.addEventListener('change', (e) => {
            console.log('🎵 Смена тональности на:', e.target.value);
            if (currentMobileSong) {
                displaySongTextInMobileOverlay(currentMobileSong, e.target.value);
            }
        });
        console.log('✅ Обработчик селектора тональности подключен');
    } else {
        console.error('❌ Селектор mobile-key-selector не найден');
    }
}

/**
 * Закрытие модального окна выбора ключа
 */
export function closeKeySelectionModal() {
    if (ui.keySelectionModal) {
        ui.keySelectionModal.classList.remove('show');
    }
    currentSongForKey = null;
    currentSelectedKey = 'C';
}

/**
 * Показ модального окна выбора ключа
 * @param {Object} song - Объект песни
 */
export function showKeySelectionModal(song) {
    console.log('=== showKeySelectionModal START ===');
    console.log('song:', song);
    
    if (!ui.keySelectionModal) {
        console.error('keySelectionModal not found!');
        return;
    }
    
    currentSongForKey = song;
    const originalSongKey = getSongKey(song);
    currentSelectedKey = originalSongKey;
    
    console.log('Set currentSongForKey:', currentSongForKey);
    console.log('Set currentSelectedKey:', currentSelectedKey);
    
    // Заполняем информацию о песне
    if (ui.keySongName) {
        ui.keySongName.textContent = `Выберите тональность для песни "${song.name}"`;
    }
    
    // Устанавливаем оригинальную тональность в селектор и бейдж
    const keySelector = document.getElementById('key-selector');
    const originalKeyBadge = document.getElementById('original-key-badge');
    
    if (keySelector) {
        keySelector.value = originalSongKey;
        // Добавляем обработчик изменения тональности
        keySelector.onchange = (e) => {
            currentSelectedKey = e.target.value;
            updateSongTextInModal(song, currentSelectedKey);
        };
    }
    
    if (originalKeyBadge) {
        originalKeyBadge.textContent = `оригинал: ${originalSongKey}`;
    }
    
    // Отображаем текст песни
    updateSongTextInModal(song, currentSelectedKey);
    
    // ДОБАВЛЯЕМ ОБРАБОТЧИК СОБЫТИЯ ПРЯМО ЗДЕСЬ
    const confirmBtn = document.getElementById('confirm-key-selection');
    console.log('Found confirm button:', confirmBtn);
    
    if (confirmBtn) {
        // Удаляем старые обработчики
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Добавляем новый обработчик
        newConfirmBtn.addEventListener('click', async (e) => {
            console.log('=== CONFIRM BUTTON CLICKED IN MODAL ===');
            console.log('Event:', e);
            e.preventDefault();
            e.stopPropagation();
            
            // Импортируем функцию динамически
            const { confirmAddSongWithKey } = await import('./setlist-manager.js');
            confirmAddSongWithKey();
        });
        
        console.log('Event listener added to confirm button');
    } else {
        console.error('Confirm button not found!');
    }
    
    // Показываем модальное окно
    ui.keySelectionModal.classList.add('show');
    console.log('Modal shown with class "show"');
    console.log('=== showKeySelectionModal END ===');
}

/**
 * Обновление текста песни в modal с транспонированием
 * @param {Object} song - Объект песни
 * @param {string} selectedKey - Выбранная тональность
 */
export function updateSongTextInModal(song, selectedKey) {
    const songTextDisplay = document.getElementById('song-text-display');
    if (!songTextDisplay) return;
    
    // Получаем текст песни
    let songText = song.hasWebEdits 
        ? (song['Текст и аккорды (edited)'] || song['Текст и аккорды'] || '') 
        : (song['Текст и аккорды'] || '');
    
    if (!songText) {
        songTextDisplay.innerHTML = `
            <div class="loading-text">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Текст песни не найден</p>
            </div>
        `;
        return;
    }
    
    // Транспонируем аккорды если нужно
    const originalKey = getSongKey(song);
    if (selectedKey !== originalKey) {
        // Используем новую улучшенную логику транспонирования
        const transposition = core.getTransposition(originalKey, selectedKey);
        songText = core.transposeLyrics(songText, transposition, selectedKey);
    }
    
    // Форматируем аккорды для отображения
    const formattedText = highlightChords(songText);
    
    songTextDisplay.innerHTML = formattedText;
    
    console.log(`📝 Текст песни обновлен (${originalKey} → ${selectedKey})`);
}

/**
 * Обновление кнопок выбора тональности
 */
export function updateKeyButtons() {
    const keyButtons = document.querySelectorAll('.key-btn');
    keyButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.key === currentSelectedKey) {
            btn.classList.add('selected');
        }
    });
}

// Геттеры для доступа к текущему состоянию
export function getCurrentMobileSong() {
    return currentMobileSong;
}

export function getCurrentSongForKey() {
    return currentSongForKey;
}

export function getCurrentSelectedKey() {
    return currentSelectedKey;
}

export function setCurrentSelectedKey(key) {
    currentSelectedKey = key;
}

export const metadata = {
    name: 'OverlayManager',
    version: '1.0.0',
    description: 'Модуль для управления оверлеями и модальными окнами',
    functions: [
        'showMobileSongPreview',
        'hideMobileSongPreview', 
        'displaySongTextInMobileOverlay',
        'setupMobileOverlayEventListeners',
        'closeKeySelectionModal',
        'showKeySelectionModal',
        'updateSongTextInModal',
        'updateKeyButtons'
    ]
};
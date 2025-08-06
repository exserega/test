// Agape Worship App - ui.js

import { SONG_CATEGORIES_ORDER, MIN_FONT_SIZE, chords } from './js/constants.js';
import logger from './src/utils/logger.js';

// --- UTILITY FUNCTIONS ---

/** Универсальная функция для получения тональности песни из разных возможных полей */
function getSongKey(song) {
    // Проверяем различные возможные поля для тональности
    // В порядке приоритета: русские названия, затем английские
    return song['Оригинальная тональность'] || 
           song['Тональность'] || 
           song['originalKey'] || 
           song['key'] || 
           song.originalKey || 
           song.key || 
           'C'; // Fallback по умолчанию
}
import * as state from './js/state.js';
import { 
    getTransposition, 
    transposeLyrics, 
    processLyrics, 
    highlightChords, 
    highlightStructure, 
    wrapSongBlocks,
    correctBlockType,
    getRenderedSongText, 
    extractYouTubeVideoId, 
    isMobileView,
    distributeSongBlocksToColumns
} from './js/core.js';
import * as api from './js/api.js';
import { 
    isUserPending, 
    isUserGuest, 
    hasLimitedAccess, 
    showPendingUserMessage, 
    showGuestMessage 
} from './src/modules/auth/authCheck.js';

// Проверка может ли пользователь редактировать
let canEditInCurrentBranch = async () => !hasLimitedAccess(); // Проверяем и pending, и guest
let isUserMainBranch = () => true; // По умолчанию считаем что это основной филиал
let showOtherBranchMessage = () => {}; // Пустая функция по умолчанию

// Пытаемся загрузить функции из branchSelector
import('./src/modules/branches/branchSelector.js').then(module => {
    canEditInCurrentBranch = module.canEditInCurrentBranch;
    isUserMainBranch = module.isUserMainBranch;
    showOtherBranchMessage = module.showOtherBranchMessage;
}).catch(e => {
    console.log('Branch selector module not loaded yet');
});


// --- DOM ELEMENT REFERENCES ---
export const sheetSelect = document.getElementById('sheet-select');
export const songSelect = document.getElementById('song-select');
export const keySelect = document.getElementById('key-select');
export const searchInput = document.getElementById('search-input');
export const searchResults = document.getElementById('search-results');
export const loadingIndicator = document.getElementById('loading-indicator');
export const songContent = document.getElementById('song-content');
export const splitTextButton = document.getElementById('split-text-button');
export const zoomInButton = document.getElementById('zoom-in');
export const zoomOutButton = document.getElementById('zoom-out');
export const bpmDisplay = document.getElementById('bpm-display');
export const holychordsButton = document.getElementById('holychords-button');
export const timeSignatureSelect = document.getElementById('time-signature');
export const metronomeButton = document.getElementById('metronome-button');
export const playerContainer = document.getElementById('youtube-player-container');
export const playerSection = document.getElementById('youtube-player-section');
export const themeToggleButton = document.getElementById('theme-toggle-button');
export const toggleChordsButton = document.getElementById('toggle-chords-button');
export const chordsOnlyButton = document.getElementById('chords-only-button');
export const favoriteButton = document.getElementById('favorite-button');
export const addToSetlistButton = document.getElementById('add-to-setlist-button');
export const repertoireButton = document.getElementById('repertoire-button');
export const toggleSetlistsButton = document.getElementById('toggle-setlists');
export const setlistsPanel = document.getElementById('setlists-panel');
export const toggleMyListButton = document.getElementById('toggle-my-list');
export const myListPanel = document.getElementById('my-list-panel');
export const toggleRepertoireButton = document.getElementById('toggle-repertoire');
export const repertoirePanel = document.getElementById('repertoire-panel');
export const favoritesList = document.getElementById('favorites-list');
// Новые селекторы для dropdown структуры
export const setlistDropdownBtn = document.getElementById('setlist-dropdown-btn');
export const currentSetlistName = document.getElementById('current-setlist-name');
export const setlistDropdownMenu = document.getElementById('setlist-dropdown-menu');
export const createNewSetlistHeaderBtn = document.getElementById('create-new-setlist-header-btn');
export const setlistsListContainer = document.getElementById('setlists-list-container');
export const setlistActions = document.getElementById('setlist-actions');
export const editSetlistBtn = document.getElementById('edit-setlist-btn');
export const deleteSetlistButton = document.getElementById('delete-setlist-button');
export const songsCount = document.getElementById('songs-count');
export const currentSetlistSongsContainer = document.getElementById('current-setlist-songs-container');

// Слушаем событие изменения филиала
window.addEventListener('branchChanged', () => {
    // Обновляем состояние кнопки сет-лист при изменении филиала
    if (window.currentSong && addToSetlistButton && !hasLimitedAccess()) {
        import('../src/modules/branches/branchSelector.js').then(({ canEditInCurrentBranch }) => {
            return canEditInCurrentBranch();
        }).then(canEdit => {
            if (!canEdit) {
                addToSetlistButton.title = 'Недоступно. Вы не состоите в этом филиале';
                addToSetlistButton.style.opacity = '0.5';
                addToSetlistButton.style.cursor = 'not-allowed';
                addToSetlistButton.classList.add('branch-disabled');
            } else {
                addToSetlistButton.disabled = false;
                addToSetlistButton.title = 'Добавить в сет-лист';
                addToSetlistButton.style.opacity = '1';
                addToSetlistButton.style.cursor = 'pointer';
                addToSetlistButton.classList.remove('pending-disabled');
                addToSetlistButton.classList.remove('branch-disabled');
            }
        }).catch(error => {
            logger.error('Error checking branch access on branch change:', error);
        });
    }
});
export const selectedSetlistControl = document.getElementById('selected-setlist-control');
export const songsCountText = document.getElementById('songs-count-text');

// Примечание: Основные обработчики dropdown находятся в script.js
export const addSongBtn = document.getElementById('add-song-btn');
export const startPresentationButton = document.getElementById('start-presentation-button');

// Модальное окно создания сет-листа
// Элементы создания сет-листа
export const createSetlistModal = document.getElementById('create-setlist-modal');
export const closeCreateModal = document.getElementById('close-create-modal');
export const newSetlistNameInput = document.getElementById('new-setlist-name-input');
export const cancelCreateSetlist = document.getElementById('cancel-create-setlist');
export const createSetlistButton = document.getElementById('create-setlist-button');
export const nameCharCount = document.getElementById('name-char-count');

// Элементы подтверждения добавления песен
export const addSongsConfirmModal = document.getElementById('add-songs-confirm-modal');
export const closeConfirmModal = document.getElementById('close-confirm-modal');
export const createdSetlistName = document.getElementById('created-setlist-name');
export const skipAddSongs = document.getElementById('skip-add-songs');
export const startAddSongs = document.getElementById('start-add-songs');

// Элементы полноэкранного оверлея добавления песен
export const addSongsOverlay = document.getElementById('add-songs-overlay');
export const closeAddSongs = document.getElementById('close-add-songs');
export const targetSetlistName = document.getElementById('target-setlist-name');
export const addedSongsCount = document.getElementById('added-songs-count');
export const addedSongsCountBadge = document.getElementById('added-songs-count-badge');
export const finishAddingSongs = document.getElementById('finish-adding-songs');
export const songSearchInput = document.getElementById('song-search-input');
export const clearSearch = document.getElementById('clear-search');
export const categoryFilter = document.getElementById('category-filter');
export const showAddedOnly = document.getElementById('show-added-only');
export const songsGrid = document.getElementById('songs-grid');

// Элементы модального окна выбора тональности
export const keySelectionModal = document.getElementById('key-selection-modal');
export const closeKeyModal = document.getElementById('close-key-modal');
export const keySongName = document.getElementById('key-song-name');
export const originalKey = document.getElementById('original-key');
// export const selectedKey = document.getElementById('selected-key'); // Удален за ненадобностью
export const cancelKeySelection = document.getElementById('cancel-key-selection');
export const confirmKeySelection = document.getElementById('confirm-key-selection');
export const vocalistSelect = document.getElementById('vocalist-select');
export const repertoirePanelList = document.getElementById('repertoire-panel-list');
export const presentationOverlay = document.getElementById('presentation-overlay');
export const presentationContent = document.getElementById('presentation-content');
export const presentationCloseBtn = document.getElementById('presentation-close-btn');
export const presSplitTextBtn = document.getElementById('pres-split-text-btn');
export const presentationControls = document.querySelector('.presentation-controls');
export const presPrevBtn = document.getElementById('pres-prev-btn');
export const presNextBtn = document.getElementById('pres-next-btn');
export const presCounter = document.getElementById('pres-counter');
export const notesModal = document.getElementById('notes-modal');
export const noteEditTextarea = document.getElementById('note-edit-textarea');
export const saveNoteButton = document.getElementById('save-note-button');
export const cancelNoteButton = document.getElementById('cancel-note-button');
export const closeNoteModalX = document.getElementById('close-note-modal-x');
export const repertoireViewKeyBtn = document.getElementById('repertoire-view-key');
export const repertoireViewSheetBtn = document.getElementById('repertoire-view-sheet');
export const repertoireViewAllBtn = document.getElementById('repertoire-view-all');

// Song Editor elements
export const editSongButton = document.getElementById('edit-song-button');
export const songEditor = document.getElementById('song-editor');
export const songEditorOverlay = document.getElementById('song-editor-overlay');
export const songEditTextarea = document.getElementById('song-edit-textarea');
export const saveEditButton = document.getElementById('save-edit-button');
export const cancelEditButton = document.getElementById('cancel-edit-button');
export const closeEditorButton = document.getElementById('close-editor-button');
export const revertToOriginalButton = document.getElementById('revert-to-original-button');
export const editStatusInfo = document.getElementById('edit-status-info');


// --- UI GENERAL ---

/** Закрывает все боковые панели и деактивирует кнопки в футере */
export function closeAllSidePanels() {
    if (setlistsPanel) setlistsPanel.classList.remove('open');
    if (myListPanel) myListPanel.classList.remove('open');
    if (repertoirePanel) repertoirePanel.classList.remove('open');

    // Также убираем класс active у всех кнопок мобильной навигации
    if (toggleSetlistsButton) toggleSetlistsButton.classList.remove('active');
    if (toggleMyListButton) toggleMyListButton.classList.remove('active');
    if (toggleRepertoireButton) toggleRepertoireButton.classList.remove('active');
}

/**
 * Переключает видимость боковой панели.
 * @param {HTMLElement} panel - Элемент панели для переключения.
 * @param {Function} [onOpenCallback] - Функция, которая будет вызвана, если панель открывается.
 */
export function togglePanel(panel, onOpenCallback) {
    if (!panel) return;

    const isAlreadyOpen = panel.classList.contains('open');

    // Сначала всегда закрываем все панели
    closeAllSidePanels();

    // Если панель не была открыта, открываем ее и выполняем колбэк
    if (!isAlreadyOpen) {
        panel.classList.add('open');
        
        // Активируем соответствующую кнопку в мобильной навигации
        let mobileButton;
        if (panel.id === 'setlists-panel') {
            mobileButton = toggleSetlistsButton;
        } else if (panel.id === 'my-list-panel') {
            mobileButton = toggleMyListButton;
        } else if (panel.id === 'repertoire-panel') {
            mobileButton = toggleRepertoireButton;
        }
        if (mobileButton) {
            mobileButton.classList.add('active');
        }

        if (onOpenCallback && typeof onOpenCallback === 'function') {
            onOpenCallback();
        }
    }
}

/** Применяет указанную тему (light/dark) */
export function applyTheme(themeName) {
    const newTheme = (themeName === 'light' || themeName === 'dark') ? themeName : 'dark';
    document.body.dataset.theme = newTheme;

    if (themeToggleButton) {
        const sliderIcon = themeToggleButton.querySelector('.theme-toggle-slider i');
        if (sliderIcon) {
            if (newTheme === 'light') {
                sliderIcon.className = 'fas fa-sun';
                themeToggleButton.title = "Переключить на темную тему";
            } else {
                sliderIcon.className = 'fas fa-moon';
                themeToggleButton.title = "Переключить на светлую тему";
            }
        }
    }
    try {
        localStorage.setItem('theme', newTheme);
    } catch (e) {
        console.error("Ошибка сохранения темы в localStorage:", e);
    }
}

/** Отображает детали выбранной песни */
export function displaySongDetails(songData, keyToSelect) {
    const keyDisplay = document.getElementById('youtube-video-key-display');
    
    // Устанавливаем текущую песню через stateManager
    if (window.stateManager && typeof window.stateManager.setCurrentSong === 'function') {
        window.stateManager.setCurrentSong(songData);
        logger.log('📝 [UI] Set currentSong via stateManager:', songData?.name);
    }
    
    // ВСЕГДА сохраняем в window.currentSong для обратной совместимости
    window.currentSong = songData;
    logger.log('📝 [UI] Set currentSong on window:', songData?.name);
    
    // Убедимся, что песня действительно установлена
    logger.log('📝 [UI] After setting - window.currentSong:', window.currentSong);

    if (!songData) {
        // Обновляем legend и pre, сохраняя fieldset структуру
        const songTitle = songContent.querySelector('#song-title');
        const songTitleText = songContent.querySelector('.song-title-text');
        const songPre = songContent.querySelector('#song-display');
        if (songTitleText) songTitleText.textContent = 'Выберите песню';
        if (songPre) songPre.textContent = '';
        
        playerContainer.innerHTML = '';
        playerSection.style.display = 'none';
        if (bpmDisplay) bpmDisplay.textContent = 'N/A';
        if (holychordsButton) holychordsButton.style.display = 'none';
        keySelect.value = "C";
        
        // Reset metronome when no song selected
        if (window.metronomeUI && window.metronomeUI.updateBPMFromSong) {
            console.log('Clearing metronome BPM - no song selected');
            window.metronomeUI.updateBPMFromSong(null);
        }
        keySelect.dataset.songId = '';
        if (keyDisplay) keyDisplay.style.display = 'none';
        
        // Скрываем элементы управления
        if (typeof window.toggleSongControls === 'function') {
            window.toggleSongControls(false);
        }
        favoriteButton.disabled = true;
        addToSetlistButton.disabled = true;
        repertoireButton.disabled = true;
        toggleChordsButton.disabled = true;
        chordsOnlyButton.disabled = true;
        songContent.classList.remove('chords-hidden');
        const editBtn = songContent.querySelector('#edit-song-button');
        if (editBtn) editBtn.style.display = 'none';
        return;
    }

    const title = songData.name || 'Без названия';
    // 🔥 ПРИОРИТЕТ: Используем отредактированный текст, если есть
    const originalLyrics = songData.hasWebEdits 
        ? (songData['Текст и аккорды (edited)'] || '') 
        : (songData['Текст и аккорды'] || '');
    const originalKeyFromSheet = getSongKey(songData);
    const srcUrl = songData.Holychords || '#';
    const bpm = songData.BPM || 'N/A';
    const ytLink = songData['YouTube Link'];
    const videoKey = songData.videoKey ? String(songData.videoKey).trim() : null;

    const currentSelectedKey = keyToSelect || originalKeyFromSheet;
    keySelect.value = currentSelectedKey;
    keySelect.dataset.songId = songData.id;

    // Update metronome with BPM from Firebase
    if (window.metronomeUI && window.metronomeUI.updateBPMFromSong) {
        const bpmValue = (bpm === 'N/A' || bpm === null || bpm === undefined) ? null : parseInt(bpm, 10);
        console.log('Updating metronome with BPM from song:', bpmValue);
        window.metronomeUI.updateBPMFromSong(bpmValue);
    }
    if (holychordsButton) {
        if (srcUrl && srcUrl.trim() !== '' && srcUrl.trim() !== '#') {
            holychordsButton.href = srcUrl;
            holychordsButton.style.display = 'inline-block';
        } else {
            holychordsButton.style.display = 'none';
        }
    }

    let finalHighlightedLyrics = getRenderedSongText(originalLyrics, originalKeyFromSheet, currentSelectedKey);
    
    // Если включен двухколоночный режим, распределяем блоки по колонкам
    if (songContent.classList.contains('split-columns')) {
        finalHighlightedLyrics = distributeSongBlocksToColumns(finalHighlightedLyrics);
    }
    
    // Обновляем legend и pre, сохраняя fieldset структуру
    const songTitle = songContent.querySelector('#song-title');
    const songTitleText = songContent.querySelector('.song-title-text');
    const songPre = songContent.querySelector('#song-display');
    const copyBtn = songContent.querySelector('#copy-text-button');
    const editBtn = songContent.querySelector('#edit-song-button');
    
    // Убираем из заголовка всё что идет после скобок (строчки для поиска)
    const cleanTitle = title.includes('(') ? title.split('(')[0].trim() : title;
    if (songTitleText) songTitleText.textContent = cleanTitle;
    if (songPre) songPre.innerHTML = finalHighlightedLyrics;
            // Кнопка копирования теперь управляется через CSS
    if (editBtn) {
        editBtn.style.display = 'block';
        console.log('📝 [UI] Edit button shown for song:', cleanTitle);
    } else {
        console.warn('⚠️ [UI] Edit button not found in song content');
    }
    
    // Обновляем статус редактирования
    updateEditStatus(songData);
    
    updateFontSize();
    songContent.classList.toggle('chords-hidden', !state.areChordsVisible);
    songContent.classList.toggle('chords-only-mode', state.isChordsOnlyMode);
    
    // Скрываем блоки с только аккордами если аккорды скрыты
    toggleChordOnlyBlocks(!state.areChordsVisible);

    const vId = extractYouTubeVideoId(ytLink);
    if (vId) {
        const embedUrl = `https://www.youtube.com/embed/${vId}`;
        playerContainer.innerHTML = `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        playerSection.style.display = 'block';
        if (keyDisplay) {
            if (videoKey) {
                keyDisplay.textContent = `Тональность в видео: ${videoKey}`;
                keyDisplay.style.display = 'block';
            } else {
                keyDisplay.style.display = 'none';
            }
        }
    } else {
        playerContainer.innerHTML = '';
        playerSection.style.display = 'none';
        if (keyDisplay) keyDisplay.style.display = 'none';
    }

    favoriteButton.disabled = false;
    
    // Проверяем статус пользователя и доступ к филиалу для кнопки добавления в сет-лист
    if (hasLimitedAccess()) {
        // Не используем disabled, чтобы обработчик клика работал
        if (isUserGuest()) {
            addToSetlistButton.title = 'Недоступно для гостей. Зарегистрируйтесь для полного доступа';
        } else {
            addToSetlistButton.title = 'Недоступно. Ваша заявка на рассмотрении';
        }
        addToSetlistButton.style.opacity = '0.5';
        addToSetlistButton.style.cursor = 'not-allowed';
        addToSetlistButton.classList.add('pending-disabled');
    } else {
        // Проверяем доступ к текущему филиалу
        import('../src/modules/branches/branchSelector.js').then(({ canEditInCurrentBranch }) => {
            return canEditInCurrentBranch();
        }).then(canEdit => {
            if (!canEdit) {
                addToSetlistButton.title = 'Недоступно. Вы не состоите в этом филиале';
                addToSetlistButton.style.opacity = '0.5';
                addToSetlistButton.style.cursor = 'not-allowed';
                addToSetlistButton.classList.add('branch-disabled');
            } else {
                addToSetlistButton.disabled = false;
                addToSetlistButton.title = 'Добавить в сет-лист';
                addToSetlistButton.style.opacity = '1';
                addToSetlistButton.style.cursor = 'pointer';
                addToSetlistButton.classList.remove('pending-disabled');
                addToSetlistButton.classList.remove('branch-disabled');
            }
        }).catch(error => {
            logger.error('Error checking branch access:', error);
            // В случае ошибки разрешаем доступ
            addToSetlistButton.disabled = false;
            addToSetlistButton.title = 'Добавить в сет-лист';
            addToSetlistButton.style.opacity = '1';
            addToSetlistButton.style.cursor = 'pointer';
            addToSetlistButton.classList.remove('pending-disabled');
            addToSetlistButton.classList.remove('branch-disabled');
        });
    }
    
    repertoireButton.disabled = false;
    toggleChordsButton.disabled = false;
    chordsOnlyButton.disabled = false;
    updateToggleChordsButton();
    updateChordsOnlyButton();
    updateRepertoireButton(songData);
    
    // Показываем элементы управления
    if (typeof window.toggleSongControls === 'function') {
        window.toggleSongControls(true);
    }
}

/** Обновление размера шрифта текста песни */
export function updateFontSize() {
    document.documentElement.style.setProperty('--lyrics-font-size', `${state.currentFontSize}px`);
    
    // Обновляем состояние кнопок
    if (zoomOutButton) {
        // Импортируем MIN_FONT_SIZE из constants.js
        const minSize = MIN_FONT_SIZE || 4;
        if (state.currentFontSize <= minSize) {
            zoomOutButton.disabled = true;
            zoomOutButton.style.opacity = '0.5';
            zoomOutButton.style.cursor = 'not-allowed';
        } else {
            zoomOutButton.disabled = false;
            zoomOutButton.style.opacity = '1';
            zoomOutButton.style.cursor = 'pointer';
        }
    }
    
    if (zoomInButton) {
        // Максимальный размер 32px
        const maxSize = 32;
        if (state.currentFontSize >= maxSize) {
            zoomInButton.disabled = true;
            zoomInButton.style.opacity = '0.5';
            zoomInButton.style.cursor = 'not-allowed';
        } else {
            zoomInButton.disabled = false;
            zoomInButton.style.opacity = '1';
            zoomInButton.style.cursor = 'pointer';
        }
    }
}

/** Обновление отображения и логики BPM */
export function updateBPM(newBPM) {
    if (bpmDisplay) bpmDisplay.textContent = newBPM;
}

/** Обновление состояния кнопки репертуара */
export async function updateRepertoireButton(songData) {
    if (!songData) {
        repertoireButton.classList.remove('active');
        repertoireButton.parentElement.classList.remove('active');
        return;
    }
    
    try {
        // Проверяем, есть ли песня в репертуаре пользователя
        const { checkSongInUserRepertoire } = await import('../src/api/userRepertoire.js');
        const repertoireSong = await checkSongInUserRepertoire(songData.id);
        
        if (repertoireSong) {
            repertoireButton.classList.add('active');
            repertoireButton.parentElement.classList.add('active');
            repertoireButton.title = `В репертуаре (${repertoireSong.preferredKey})`;
            repertoireButton.setAttribute('aria-label', `В репертуаре (${repertoireSong.preferredKey})`);
        } else {
            repertoireButton.classList.remove('active');
            repertoireButton.parentElement.classList.remove('active');
            repertoireButton.title = 'Добавить в репертуар';
            repertoireButton.setAttribute('aria-label', 'Добавить в репертуар');
        }
    } catch (error) {
        logger.error('Ошибка проверки репертуара:', error);
        repertoireButton.classList.remove('active');
        repertoireButton.parentElement.classList.remove('active');
    }
}

/** Обновление кнопки скрытия/показа аккордов */
export function updateToggleChordsButton() {
    // Всегда используем музыкальную ноту
    const icon = '<i class="fas fa-guitar"></i>';
    const textShow = '<span class="button-text">Аккорды</span>';
    
    const currentTitle = state.areChordsVisible ? 'Скрыть аккорды' : 'Показать аккорды';

    toggleChordsButton.innerHTML = icon + (isMobileView() ? '' : textShow);
    toggleChordsButton.title = currentTitle;
    // Кнопка доступна когда песня загружена
    toggleChordsButton.disabled = false;
    
    // Меняем цвет кнопки в зависимости от состояния
    toggleChordsButton.classList.toggle('chords-hidden-active', !state.areChordsVisible);
}

/** Обновление кнопки "только аккорды" */
export function updateChordsOnlyButton() {
    // Используем букву T
    const icon = '<span class="text-icon">T</span>';
    const textShow = state.isChordsOnlyMode ? 
        '<span class="button-text">Полный текст</span>' : 
        '<span class="button-text">Только аккорды</span>';
    
    const currentTitle = state.isChordsOnlyMode ? 'Показать полный текст' : 'Показать только аккорды';

    chordsOnlyButton.innerHTML = icon + (isMobileView() ? '' : textShow);
    chordsOnlyButton.title = currentTitle;
    // Кнопка доступна когда песня загружена
    chordsOnlyButton.disabled = false;
    
    // Меняем цвет кнопки в зависимости от состояния
    chordsOnlyButton.classList.toggle('chords-only-active', state.isChordsOnlyMode);
}

/** Обновление кнопки разделения текста */
export function updateSplitButton() {
    const isSplit = songContent.classList.contains('split-columns');
    // Поменяли логику: теперь по умолчанию двухколоночный режим
    const icon = isSplit ? '<i class="fas fa-columns"></i>' : '<i class="fas fa-align-justify"></i>';
    const text = isSplit ? '<span class="button-text">2 колонки</span>' : '<span class="button-text">1 колонка</span>';
    splitTextButton.innerHTML = icon + (isMobileView() ? '' : text);
    splitTextButton.setAttribute('aria-label', isSplit ? 'Режим: 2 колонки' : 'Режим: 1 колонка');
}

/** Обновление кнопки метронома */
export function updateMetronomeButton(isActive) {
    const playIcon = '<i class="fas fa-play"></i>';
    const stopIcon = '<i class="fas fa-stop"></i>';
    const text = '<span class="button-text">Метроном</span>';

    metronomeButton.innerHTML = (isActive ? stopIcon : playIcon) + (isMobileView() ? '' : text);
    metronomeButton.setAttribute('aria-label', isActive ? 'Выключить метроном' : 'Включить метроном');
    metronomeButton.classList.toggle('active', isActive);
}

// --- SONG/SHEET SELECTS ---

/** Заполняет выпадающий список категорий (листов) */
export function populateSheetSelect() {
    // Проверяем существование элемента (он может быть удален в новом дизайне)
    if (!sheetSelect) {
        logger.log('📋 sheetSelect element not found, skipping population');
        return;
    }
    
    sheetSelect.innerHTML = '<option value="">-- Выберите категорию --</option>';
    SONG_CATEGORIES_ORDER.forEach(categoryName => {
        if (state.songsBySheet[categoryName] && state.songsBySheet[categoryName].length > 0) {
            const option = document.createElement('option');
            option.value = categoryName;
            option.textContent = categoryName;
            sheetSelect.appendChild(option);
        }
    });
    Object.keys(state.songsBySheet).forEach(categoryName => {
        if (!SONG_CATEGORIES_ORDER.includes(categoryName)) {
            const option = document.createElement('option');
            option.value = categoryName;
            option.textContent = categoryName;
            sheetSelect.appendChild(option);
        }
    });
}

/** Загрузка песен в select#song-select для выбранной категории или всех песен */
export function populateSongSelect(categoryName) {
    // Проверяем существование элемента (он может быть удален в новом дизайне)
    if (!songSelect) {
        logger.log('🎵 songSelect element not found, skipping population');
        return;
    }
    
    songSelect.innerHTML = '<option value="">-- Песня --</option>';
    
    if (categoryName && state.songsBySheet[categoryName]) {
        state.songsBySheet[categoryName].forEach(song => {
            const option = document.createElement('option');
            option.value = song.id;
            option.textContent = song.name;
            songSelect.appendChild(option);
        });
    }
}

// --- SEARCH ---

/**
 * Нормализует текст для поиска (копия из script.js)
 */
function normalizeTextForSearch(text) {
    if (!text) return '';
    
    return text
        .toLowerCase()
        .replace(/[^\w\s\u0400-\u04FF-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Нормализует поисковый запрос (копия из script.js)
 */
function normalizeSearchQuery(query) {
    if (!query) return '';
    
    return query
        .toLowerCase()
        .trim()
        .replace(/[^\w\s\u0400-\u04FF-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Находит фрагмент текста с выделением найденного запроса
 * Показывает ТОЧНО найденную часть в начале фрагмента
 * @param {string} text - Полный текст
 * @param {string} query - Поисковый запрос  
 * @param {number} contextLength - Длина контекста вокруг найденного
 * @returns {string} HTML с выделенным текстом
 */
function getHighlightedTextFragment(text, query, contextLength = 100) {
    if (!text || !query) return '';
    
    const normalizedQuery = normalizeSearchQuery(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
    
    if (queryWords.length === 0) return '';
    
    // Ищем самое длинное совпадение из слов запроса
    let bestMatch = { index: -1, length: 0, word: '' };
    
    queryWords.forEach(word => {
        // Ищем точное совпадение слова в тексте (игнорируя аккорды и препинания)
        const cleanText = text.replace(/\[[^\]]*\]/g, ' '); // убираем аккорды
        const textWords = cleanText.split(/\s+/);
        
        for (let i = 0; i < textWords.length; i++) {
            const cleanWord = normalizeTextForSearch(textWords[i]);
            if (cleanWord.includes(word) && word.length > bestMatch.length) {
                // Найдем позицию этого слова в оригинальном тексте
                const wordStart = cleanText.toLowerCase().indexOf(textWords[i].toLowerCase());
                if (wordStart !== -1) {
                    bestMatch = { index: wordStart, length: word.length, word: word };
                }
            }
        }
    });
    
    if (bestMatch.index === -1) {
        // Если точное совпадение не найдено, ищем первое хотя бы частичное
        const firstWord = queryWords[0];
        const lowerText = text.toLowerCase();
        const searchIndex = lowerText.indexOf(firstWord);
        if (searchIndex !== -1) {
            bestMatch = { index: searchIndex, length: firstWord.length, word: firstWord };
        }
    }
    
    if (bestMatch.index === -1) {
        return text.slice(0, contextLength) + '...';
    }
    
    // Определяем границы фрагмента с найденным словом в начале
    const beforeContext = Math.min(30, bestMatch.index); // немного контекста перед
    const start = Math.max(0, bestMatch.index - beforeContext);
    const end = Math.min(text.length, bestMatch.index + contextLength);
    
    let fragment = text.slice(start, end);
    
    // Добавляем многоточие
    if (start > 0) fragment = '...' + fragment;
    if (end < text.length) fragment = fragment + '...';
    
    // Выделяем все найденные слова
    queryWords.forEach(word => {
        if (word.length > 1) {
            const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            fragment = fragment.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
    });
    
    return fragment;
}

/** Отображение результатов поиска с поддержкой фрагментов текста */
export function displaySearchResults(matchingSongs, onSelect, query = '') {
    searchResults.innerHTML = '';
    if (matchingSongs.length === 0) {
        searchResults.innerHTML = `
            <div class="search-result no-results">
                <i class="fas fa-search"></i>
                😕 Ничего не найдено по запросу "${query}"
            </div>`;
        return;
    }
    
    matchingSongs.forEach((songMatch) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result';
        
        // Нормализуем запрос для проверки
        const normalizedQuery = normalizeSearchQuery(query);
        
        // Проверяем, найдено ли в названии или тексте
        const normalizedTitle = normalizeTextForSearch(songMatch.name || '');
        const titleMatch = normalizedTitle.includes(normalizedQuery);
        
        const lyrics = songMatch.hasWebEdits 
            ? (songMatch['Текст и аккорды (edited)'] || '') 
            : (songMatch['Текст и аккорды'] || '');
        
        // Убираем аккорды для более точного поиска
        const cleanedLyrics = lyrics.replace(/\[[^\]]*\]/g, ' ');
        const normalizedLyrics = normalizeTextForSearch(cleanedLyrics);
        const lyricsMatch = !titleMatch && normalizedLyrics.includes(normalizedQuery);
        
        // Формируем HTML для результата (БЕЗ КАТЕГОРИИ!)
        let resultHTML = `
            <div class="search-result-title">${songMatch.name}</div>
        `;
        
        // Если найдено в тексте песни, показываем фрагмент С НАЧАЛА
        if (lyricsMatch && query) {
            const fragment = getHighlightedTextFragment(cleanedLyrics, query);
            if (fragment) {
                resultHTML += `<div class="search-result-fragment">${fragment}</div>`;
            }
        }
        
        resultItem.innerHTML = resultHTML;
        resultItem.addEventListener('click', () => onSelect(songMatch));
        searchResults.appendChild(resultItem);
    });
}

// --- REPERTOIRE PANEL ---

/** Загрузка списка вокалистов в dropdown */
export function populateVocalistSelect(vocalists) {
    vocalistSelect.innerHTML = '<option value="">-- Выберите вокалиста --</option>';
    if (vocalists.length === 0) {
        console.warn("В коллекции 'vocalists' не найдено ни одного документа.");
    } else {
        vocalists.forEach((vocalist) => {
            const option = document.createElement('option');
            option.value = vocalist.id;
            option.textContent = vocalist.name || vocalist.id;
            vocalistSelect.appendChild(option);
        });
    }
}

function createRepertoireSongElement(song, vocalistId, onClick) {
    const listItem = document.createElement('div');
    listItem.className = 'repertoire-item';
    const songName = song.name || song.id; 
    const shortSheetName = song.sheet || '';
    
    const songInfo = document.createElement('span');
    songInfo.className = 'song-name';
    songInfo.textContent = `${songName} (${song.preferredKey || 'N/A'}${shortSheetName ? ', ' + shortSheetName : ''})`;
    listItem.appendChild(songInfo);

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.className = 'remove-button';
    removeBtn.title = 'Удалить из репертуара';
    removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Удалить песню "${songName}" из репертуара?`)) {
            await api.removeFromRepertoire(vocalistId, song.repertoireDocId);
        }
    });
    listItem.appendChild(removeBtn);

    listItem.addEventListener('click', () => onClick(song));

    return listItem;
}

function renderRepertoireView(songs, vocalistId, mode, container, onSongSelect) {
    container.innerHTML = '';
    if (songs.length === 0) {
        container.innerHTML = '<div class="empty-message">Репертуар пуст.</div>';
        return;
    }

    const createGroup = (title, songList) => {
        const heading = document.createElement('div');
        heading.className = 'repertoire-key-heading';
        heading.innerHTML = `${title} <i class="fas fa-chevron-down"></i>`;
        container.appendChild(heading);

        const songsWrapper = document.createElement('div');
        songsWrapper.className = 'repertoire-songs-for-key collapsed';
        songList.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
        songList.forEach(song => {
            const songElement = createRepertoireSongElement(song, vocalistId, onSongSelect);
            songsWrapper.appendChild(songElement);
        });
        container.appendChild(songsWrapper);

        heading.addEventListener('click', () => {
            const isCollapsed = songsWrapper.classList.contains('collapsed');
            document.querySelectorAll('.repertoire-songs-for-key').forEach(el => el.classList.add('collapsed'));
            document.querySelectorAll('.repertoire-key-heading i').forEach(i => i.className = 'fas fa-chevron-down');
            if(isCollapsed) {
                songsWrapper.classList.remove('collapsed');
                heading.querySelector('i').className = 'fas fa-chevron-up';
            }
        });
    };

    if (mode === 'byKey') {
        const grouped = songs.reduce((acc, song) => {
            const key = song.preferredKey || "N/A";
            if (!acc[key]) acc[key] = [];
            acc[key].push(song);
            return acc;
        }, {});
        Object.keys(grouped).sort((a,b) => (chords.indexOf(a) - chords.indexOf(b))).forEach(key => createGroup(`Тональность: ${key}`, grouped[key]));
    } else if (mode === 'bySheet') {
        const grouped = songs.reduce((acc, song) => {
            const sheet = song.sheet || "N/A";
            if (!acc[sheet]) acc[sheet] = [];
            acc[sheet].push(song);
            return acc;
        }, {});
        Object.keys(grouped).sort().forEach(sheet => createGroup(sheet, grouped[sheet]));
    } else { // allAlphabetical
        songs.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(song => {
            const songElement = createRepertoireSongElement(song, vocalistId, onSongSelect);
            container.appendChild(songElement);
        });
    }
}

export function renderRepertoire(onSongSelect) {
    const vocalistId = state.currentVocalistId;
    if (!vocalistId) {
        repertoirePanelList.innerHTML = '<div class="empty-message">Выберите вокалиста.</div>';
        return;
    }
    
    const songsData = state.currentRepertoireSongsData;
    const fullSongsData = songsData.map(repertoireSong => {
        const songDetails = state.allSongs.find(s => s.name === repertoireSong.name) || {};
        return { ...songDetails, ...repertoireSong };
    }).filter(s => s.id); // Убираем песни, которых нет в allSongs

    renderRepertoireView(fullSongsData, vocalistId, state.currentRepertoireViewMode, repertoirePanelList, onSongSelect);
}


// --- PRESENTATION VIEW ---
let controlsHideTimeout;

export function showPresentationView(onSongChange) {
    const songsToShow = state.currentSetlistSongs;
    if (!songsToShow || songsToShow.length === 0) {
         alert("Нет песен для показа в презентации.");
         return;
    }
    state.setPresentationSongs([...songsToShow]);
    state.setCurrentPresentationIndex(0);
    state.setIsPresentationSplit(false);
    updatePresentationSplitButtonState();
    
    onSongChange(); // Display first song

    presentationOverlay.classList.add('visible');
    presentationOverlay.scrollTop = 0;
    showPresentationControls();
}

export function displayCurrentPresentationSong() {
    if (state.presentationSongs.length === 0) return;

    state.setCurrentPresentationIndex(Math.max(0, Math.min(state.currentPresentationIndex, state.presentationSongs.length - 1)));
    const songRef = state.presentationSongs[state.currentPresentationIndex];
    presentationContent.innerHTML = `<div class="presentation-loading">Загрузка...</div>`;

    const song = state.allSongs.find(s => s.id === songRef.songId);
    if (!song) {
        presentationContent.innerHTML = `<div class="presentation-song error"><h2>Ошибка загрузки песни</h2><p>Не найдены данные для песни.</p></div>`;
        return;
    }

    const songTitle = song.name;
    const originalLyrics = song['Текст и аккорды'] || '';
    const originalKey = getSongKey(song);
    const targetKey = songRef.preferredKey || originalKey;
    const songNote = songRef.notes || '';

    let finalHighlightedLyrics = getRenderedSongText(originalLyrics, originalKey, targetKey);
    
    // Если включен двухколоночный режим в презентации, распределяем блоки
    if (state.isPresentationSplit) {
        finalHighlightedLyrics = distributeSongBlocksToColumns(finalHighlightedLyrics);
    }

    const songHtml = `
        <div class="presentation-song">
            <h2>${songTitle} — ${targetKey}</h2>
            ${songNote ? `<div class="presentation-notes"><i class="fas fa-info-circle"></i> ${songNote.replace(/\n/g, '<br>')}</div>` : ''}
            <pre>${finalHighlightedLyrics}</pre> 
        </div>
    `;
    presentationContent.innerHTML = songHtml;
    presentationContent.classList.toggle('split-columns', state.isPresentationSplit);
    presentationContent.classList.toggle('chords-hidden', !state.areChordsVisible);
    presentationContent.classList.toggle('chords-only-mode', state.isChordsOnlyMode);
    
    // Применяем скрытие блоков с только аккордами в режиме презентации
    toggleChordOnlyBlocks(!state.areChordsVisible);

    presCounter.textContent = `${state.currentPresentationIndex + 1} / ${state.presentationSongs.length}`;
    presPrevBtn.disabled = (state.currentPresentationIndex === 0);
    presNextBtn.disabled = (state.currentPresentationIndex >= state.presentationSongs.length - 1);
}

export function showPresentationControls() {
    presentationControls.classList.remove('controls-hidden');
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = setTimeout(hidePresentationControls, 3000); // CONTROLS_HIDE_DELAY
}

export function hidePresentationControls() {
    presentationControls.classList.add('controls-hidden');
}

export function updatePresentationSplitButtonState() {
    const iconElement = presSplitTextBtn.querySelector('i');
    if (state.isPresentationSplit) {
        iconElement.className = 'fas fa-align-justify';
        presSplitTextBtn.title = 'Объединить колонки';
    } else {
        iconElement.className = 'fas fa-columns';
        presSplitTextBtn.title = 'Разделить текст';
    }
}


// --- FAVORITES PANEL ---
export function renderFavorites(favoriteSongs, onSelect, onRemove) {
    console.log('⭐ [UI] renderFavorites called with:', favoriteSongs?.length, 'favorites');
    favoritesList.innerHTML = '';
    // Используем переданные данные или данные из state
    const favorites = favoriteSongs || state.favorites;

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<div class="empty-message">В "Моих" пока нет песен.</div>';
        return;
    }
    
    favorites.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    favorites.forEach(favSong => {
        const listItem = document.createElement('div');
        listItem.className = 'favorite-item';
        
        const songInfo = document.createElement('span');
        songInfo.textContent = `${favSong.name} (${favSong.preferredKey})`;
        listItem.appendChild(songInfo);

        listItem.addEventListener('click', () => onSelect(favSong));

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.className = 'remove-button';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onRemove(favSong.id);
        });
        listItem.appendChild(removeBtn);
        
        favoritesList.appendChild(listItem);
    });
}


// --- SETLIST PANEL ---

async function renderCurrentSetlistSongs(songs, onSongSelect, onSongRemove) {
    if (!currentSetlistSongsContainer) return;
    currentSetlistSongsContainer.innerHTML = '';

    if (!songs || songs.length === 0) {
        currentSetlistSongsContainer.innerHTML = '<div class="empty-message">В этом сет-листе пока нет песен.</div>';
        // Скрываем счетчик если нет песен
        const songsCountElement = document.getElementById('songs-count');
        if (songsCountElement) {
            songsCountElement.style.display = 'none';
        }
        return;
    }

    // Обновляем счетчик песен
    const songsCountElement = document.getElementById('songs-count');
    if (songsCountElement) {
        const countText = getSongCountText(songs.length);
        songsCountElement.querySelector('span').textContent = `${songs.length} ${countText}`;
        songsCountElement.style.display = 'flex';
    }

    const fullSongsData = songs
        .map(setlistSong => {
            const songDetails = state.allSongs.find(s => s.id === setlistSong.songId) || {};
            return { ...songDetails, ...setlistSong };
        })
        .filter(s => s.id)
        .sort((a,b) => a.order - b.order);

    // Проверяем права для текущего филиала один раз для всех песен
    const canEdit = await canEditInCurrentBranch();

    fullSongsData.forEach(song => {
        const songItem = document.createElement('div');
        songItem.className = 'setlist-song-item';
        songItem.addEventListener('click', () => onSongSelect(song)); // Клик на весь блок
        
        // Контейнер для информации о песне
        const songInfo = document.createElement('div');
        songInfo.className = 'song-info';
        
        // Название песни
        const songName = document.createElement('div');
        songName.className = 'song-name';
        songName.textContent = song.name;
        
        // Метаданные песни (тональность и BPM)
        const songMeta = document.createElement('div');
        songMeta.className = 'song-meta';
        
        // Красивая тональность
        const keyElement = document.createElement('span');
        keyElement.className = 'song-key';
        keyElement.textContent = song.preferredKey || 'C';
        
        songMeta.appendChild(keyElement);
        
        // BPM если есть
        if (song.BPM && song.BPM !== 'NA') {
            const bpmElement = document.createElement('span');
            bpmElement.className = 'song-bpm';
            bpmElement.innerHTML = `<i class="fas fa-tachometer-alt"></i>${song.BPM}`;
            songMeta.appendChild(bpmElement);
        }
        
        songInfo.appendChild(songName);
        songInfo.appendChild(songMeta);
        songItem.appendChild(songInfo);

        // Кнопки действий
        const songActions = document.createElement('div');
        songActions.className = 'song-actions';
        
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.className = 'song-action-btn';
        
        // Используем результат проверки прав
        if (!canEdit) {
            // Не используем disabled, чтобы обработчик клика работал
            removeBtn.title = isUserMainBranch() ? 'Недоступно. Ваша заявка на рассмотрении' : 'Недоступно в чужом филиале';
            removeBtn.style.opacity = '0.5';
            removeBtn.style.cursor = 'not-allowed';
            removeBtn.classList.add('pending-disabled');
        } else {
            removeBtn.title = 'Удалить из сет-листа';
        }
        
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // Дополнительная проверка при клике
            if (!(await canEditInCurrentBranch())) {
                if (isUserMainBranch()) {
                    if (isUserGuest()) {
                showGuestMessage('Удаление песен из сет-листов');
            } else {
                showPendingUserMessage('Удаление песен из сет-листов');
            }
                } else {
                    showOtherBranchMessage('Удаление песен из сет-листов');
                }
                return;
            }
            
            onSongRemove(song.id, song.name);
        });
        
        songActions.appendChild(removeBtn);
        songItem.appendChild(songActions);

        currentSetlistSongsContainer.appendChild(songItem);
    });
}

export function clearSetlistSelection() {
    // Сбрасываем dropdown кнопку
    if (currentSetlistName) {
        currentSetlistName.textContent = 'Выберите сет-лист';
    }
    
    // Скрываем кнопки действий
    if (setlistActions) {
        setlistActions.style.display = 'none';
    }
    
    if (selectedSetlistControl) {
        selectedSetlistControl.style.display = 'none';
    }
    
    // Сбрасываем счетчик песен
    if (songsCountText) {
        songsCountText.textContent = '0 песен';
    }
    
    // Очищаем список песен
    if (currentSetlistSongsContainer) {
        currentSetlistSongsContainer.innerHTML = `
            <div class="empty-message">
                <span>Сначала выберите сет-лист</span>
            </div>`;
    }
    
    // Убираем выделение с элементов
    if (setlistsListContainer) {
        const items = setlistsListContainer.querySelectorAll('.setlist-item');
        items.forEach(item => item.classList.remove('selected'));
    }
}


export function displaySelectedSetlist(setlist, onSongSelect, onSongRemove) {
    if (!setlist || !setlist.id) {
        clearSetlistSelection();
        return;
    }

    // Обновляем dropdown кнопку с названием выбранного сет-листа
    if (currentSetlistName) {
        currentSetlistName.textContent = setlist.name;
    }

    // Показываем блок управления выбранным списком
    if (selectedSetlistControl) {
        selectedSetlistControl.style.display = 'block';
    }

    // Обновляем счетчик песен в новом блоке управления
    const songsCount = setlist.songs ? setlist.songs.length : 0;
    if (songsCountText) {
        const countText = getSongCountText(songsCount);
        songsCountText.textContent = `${songsCount} ${countText}`;
    }

    // Отмечаем выбранный сет-лист в dropdown
    if (setlistsListContainer) {
        const items = setlistsListContainer.querySelectorAll('.setlist-item');
        items.forEach(item => {
            item.classList.toggle('selected', item.dataset.setlistId === setlist.id);
        });
    }

    renderCurrentSetlistSongs(setlist.songs || [], onSongSelect, onSongRemove);
}

// Функция для правильного склонения слова "песня"
function getSongCountText(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'песня';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'песни';
    } else {
        return 'песен';
    }
}


/**
 * Отрисовывает список сетлистов.
 * @param {Array} setlists - Массив объектов сетлистов.
 * @param {function} onSelect - Функция обратного вызова при выборе сетлиста.
 * @param {function} onDelete - Функция обратного вызова при удалении сетлиста.
 */
export async function renderSetlists(setlists, onSelect, onDelete) {
    console.log('📋 [UI] renderSetlists called with:', setlists?.length, 'setlists');
    console.log('📋 [UI] setlistsListContainer:', setlistsListContainer);
    if (!setlistsListContainer) {
        console.error('📋 [UI] setlistsListContainer not found!');
        return;
    }
    setlistsListContainer.innerHTML = '';
    console.log('📋 [UI] Rendering setlists...');

    if (!setlists || setlists.length === 0) {
        setlistsListContainer.innerHTML = `
            <div class="empty-message">
                <span>Сет-листов пока нет. Создайте новый!</span>
            </div>`;
        return;
    }

    // Проверяем права для текущего филиала один раз для всех сет-листов
    const canEdit = await canEditInCurrentBranch();
    
    setlists.forEach(setlist => {
        const item = document.createElement('div');
        item.className = 'setlist-item';
        item.dataset.setlistId = setlist.id;
        item.addEventListener('click', () => {
            console.log('📋 [UI] Setlist item clicked:', setlist.name);
            if (onSelect && typeof onSelect === 'function') {
                onSelect(setlist);
            } else {
                // Если onSelect не передан, используем глобальный обработчик
                if (window.handleSetlistSelect && typeof window.handleSetlistSelect === 'function') {
                    window.handleSetlistSelect(setlist);
                } else {
                    console.error('📋 [UI] No setlist select handler available');
                }
            }
            // Закрываем dropdown после выбора
            const dropdown = document.getElementById('setlist-dropdown-menu');
            const dropdownBtn = document.getElementById('setlist-dropdown-btn');
            if (dropdown) dropdown.classList.remove('show');
            if (dropdownBtn) dropdownBtn.classList.remove('active');
        });

        const nameSpan = document.createElement('span');
        nameSpan.className = 'setlist-name-display';
        nameSpan.textContent = setlist.name;
        item.appendChild(nameSpan);

        // Кнопка редактирования
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.className = 'edit-button';
        
        // Используем результат проверки прав
        if (!canEdit) {
            // Не используем disabled, чтобы обработчик клика работал
            editBtn.title = isUserMainBranch() ? 'Недоступно. Ваша заявка на рассмотрении' : 'Недоступно в чужом филиале';
            editBtn.style.opacity = '0.5';
            editBtn.style.cursor = 'not-allowed';
            editBtn.classList.add('pending-disabled');
        } else {
            editBtn.title = 'Редактировать название';
        }
        
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // Дополнительная проверка при клике
            if (!(await canEditInCurrentBranch())) {
                if (isUserMainBranch()) {
                    if (isUserGuest()) {
                showGuestMessage('Редактирование сет-листов');
            } else {
                showPendingUserMessage('Редактирование сет-листов');
            }
                } else {
                    showOtherBranchMessage('Редактирование сет-листов');
                }
                return;
            }
            
            const newName = prompt('Введите новое название сет-листа:', setlist.name);
            if (newName && newName.trim() && newName !== setlist.name) {
                try {
                    await api.updateSetlistName(setlist.id, newName.trim());
                    if (typeof window.refreshSetlists === 'function') {
                        await window.refreshSetlists();
                    }
                    window.showNotification(`Сет-лист переименован в "${newName.trim()}"`, 'success');
                } catch (error) {
                    console.error('Ошибка переименования:', error);
                    window.showNotification('Ошибка при переименовании сет-листа', 'error');
                }
            }
        });
        item.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = 'remove-button';
        
        // Проверяем права для текущего филиала
        if (!canEdit) {
            // Не используем disabled, чтобы обработчик клика работал
            deleteBtn.title = isUserMainBranch() ? 'Недоступно. Ваша заявка на рассмотрении' : 'Недоступно в чужом филиале';
            deleteBtn.style.opacity = '0.5';
            deleteBtn.style.cursor = 'not-allowed';
            deleteBtn.classList.add('pending-disabled');
        } else {
            deleteBtn.title = 'Удалить сет-лист';
        }
        
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // Дополнительная проверка при клике
            if (!(await canEditInCurrentBranch())) {
                if (isUserMainBranch()) {
                    if (isUserGuest()) {
                showGuestMessage('Удаление сет-листов');
            } else {
                showPendingUserMessage('Удаление сет-листов');
            }
                } else {
                    showOtherBranchMessage('Удаление сет-листов');
                }
                return;
            }
            
            if (onDelete && typeof onDelete === 'function') {
                onDelete(setlist.id, setlist.name);
            } else {
                // Если onDelete не передан, используем глобальный обработчик
                if (window.handleSetlistDelete && typeof window.handleSetlistDelete === 'function') {
                    window.handleSetlistDelete(setlist.id, setlist.name);
                } else {
                    console.error('📋 [UI] No setlist delete handler available');
                }
            }
        });
        item.appendChild(deleteBtn);

        setlistsListContainer.appendChild(item);
    });
    console.log('📋 [UI] renderSetlists completed, rendered', setlists.length, 'setlists');
}

// Функция позиционирования кнопки копирования удалена - 
// кнопка теперь находится в legend и позиционируется через CSS

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С БЛОКАМИ СОДЕРЖАЩИМИ ТОЛЬКО АККОРДЫ ---

/** Функция для скрытия/показа блоков содержащих только аккорды */
export function toggleChordOnlyBlocks(shouldHide) {
    // Находим все блоки песни в основном контенте
    const songBlocks = songContent.querySelectorAll('.song-block');
    
    songBlocks.forEach(block => {
        if (shouldHide) {
            // Проверяем, содержит ли блок только аккорды
            if (isChordOnlyBlock(block)) {
                block.style.display = 'none';
                block.classList.add('chord-only-hidden');
            }
        } else {
            // Показываем все ранее скрытые блоки с только аккордами
            if (block.classList.contains('chord-only-hidden')) {
                block.style.display = '';
                block.classList.remove('chord-only-hidden');
            }
        }
    });
    
    // Также обрабатываем блоки в режиме презентации
    const presentationBlocks = document.querySelectorAll('.presentation-content .song-block');
    presentationBlocks.forEach(block => {
        if (shouldHide) {
            if (isChordOnlyBlock(block)) {
                block.style.display = 'none';
                block.classList.add('chord-only-hidden');
            }
        } else {
            if (block.classList.contains('chord-only-hidden')) {
                block.style.display = '';
                block.classList.remove('chord-only-hidden');
            }
        }
    });
    
    // ВРЕМЕННО ОТКЛЮЧЕНО: Обработка пустых строк
    // if (shouldHide) {
    //     removeEmptyLinesAfterChordHiding();
    // } else {
    //     restoreOriginalHTML();
    // }
}

/** Функция для проверки, содержит ли блок только аккорды */
function isChordOnlyBlock(block) {
    const content = block.querySelector('.song-block-content');
    if (!content) return false;
    
    // Клонируем контент для анализа
    const contentClone = content.cloneNode(true);
    
    // Убираем все элементы с классом chord
    const chordElements = contentClone.querySelectorAll('.chord');
    chordElements.forEach(chord => chord.remove());
    
    // Проверяем, остался ли какой-то значимый текст
    const remainingText = contentClone.textContent.trim();
    
    // Если остался только пробелы, переносы строк и знаки препинания - считаем блок содержащим только аккорды
    const onlyWhitespaceAndPunctuation = /^[\s\n\r\t.,;:!?\-()[\]{}|/\\]*$/;
    
    return remainingText === '' || onlyWhitespaceAndPunctuation.test(remainingText);
}

// Переменные для хранения оригинального HTML
let originalMainContentHTML = null;
let originalPresentationContentHTML = null;

/** Удаляет пустые строки после скрытия аккордов */
function removeEmptyLinesAfterChordHiding() {
    // Сохраняем оригинальный HTML основного контента
    const mainPre = songContent.querySelector('#song-display');
    if (mainPre && !originalMainContentHTML) {
        originalMainContentHTML = mainPre.innerHTML;
    }
    
    // Сохраняем оригинальный HTML презентации
    const presentationPre = document.querySelector('.presentation-content pre');
    if (presentationPre && !originalPresentationContentHTML) {
        originalPresentationContentHTML = presentationPre.innerHTML;
    }
    
    // Обрабатываем основной контент
    if (mainPre) {
        setTimeout(() => {
            processElementTextContent(mainPre);
        }, 150); // Еще больше времени для CSS
    }
    
    // Обрабатываем презентацию
    if (presentationPre) {
        setTimeout(() => {
            processElementTextContent(presentationPre);
        }, 150);
    }
}

/** Обрабатывает DOM, удаляя пустые строки из текстовых узлов */
function processElementTextContent(element) {
    // Получаем все текстовые узлы в элементе
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    // Обрабатываем каждый текстовый узел
    textNodes.forEach(textNode => {
        if (textNode.nodeValue) {
            // Удаляем пустые строки из текстового узла
            const cleanedText = textNode.nodeValue
                .replace(/\n\s*\n+/g, '\n') // Убираем множественные переносы
                .replace(/^\s*\n+/, '') // Убираем переносы в начале
                .replace(/\n+\s*$/, ''); // Убираем переносы в конце
            
            textNode.nodeValue = cleanedText;
        }
    });
}

/** Восстанавливает оригинальный HTML при показе аккордов */
function restoreOriginalHTML() {
    // Восстанавливаем основной контент
    const mainPre = songContent.querySelector('#song-display');
    if (mainPre && originalMainContentHTML) {
        mainPre.innerHTML = originalMainContentHTML;
        originalMainContentHTML = null;
    }
    
    // Восстанавливаем презентацию
    const presentationPre = document.querySelector('.presentation-content pre');
    if (presentationPre && originalPresentationContentHTML) {
        presentationPre.innerHTML = originalPresentationContentHTML;
        originalPresentationContentHTML = null;
    }
}

// --- SONG EDITOR FUNCTIONS ---

/** Обновляет статус редактирования песни */
export function updateEditStatus(songData) {
    if (!songData || !editStatusInfo) return;
    
    if (songData.hasWebEdits) {
        const editDate = songData.lastEditedInApp?.toDate ? 
            songData.lastEditedInApp.toDate().toLocaleDateString() : 
            'недавно';
        editStatusInfo.textContent = `✏️ Отредактировано ${editDate}`;
        editStatusInfo.style.color = 'var(--accent-color)';
        if (revertToOriginalButton) revertToOriginalButton.style.display = 'inline-flex';
    } else {
        editStatusInfo.textContent = '📄 Оригинал из Google Таблицы';
        editStatusInfo.style.color = 'var(--label-color)';
        if (revertToOriginalButton) revertToOriginalButton.style.display = 'none';
    }
}

/** Открывает редактор песни */
export function openSongEditor(songData) {
    console.log('📝 [UI] openSongEditor called with:', songData?.name);
    
    if (!songData) {
        console.error('❌ [UI] No songData provided to openSongEditor');
        return;
    }
    if (!songEditorOverlay) {
        console.error('❌ [UI] songEditorOverlay element not found');
        return;
    }
    if (!songEditTextarea) {
        console.error('❌ [UI] songEditTextarea element not found');
        return;
    }
    
    // Устанавливаем заголовок
    const editorTitle = document.getElementById('song-editor-title');
    if (editorTitle) {
        const cleanTitle = songData.name?.includes('(') ? 
            songData.name.split('(')[0].trim() : 
            (songData.name || 'Без названия');
        editorTitle.textContent = `Редактирование: ${cleanTitle}`;
    }
    
    // Загружаем текст в textarea
    const originalLyrics = songData.hasWebEdits 
        ? (songData['Текст и аккорды (edited)'] || '') 
        : (songData['Текст и аккорды'] || '');
    
    console.log('📝 [UI] Loading lyrics, hasWebEdits:', songData.hasWebEdits);
    console.log('📝 [UI] Original lyrics length:', originalLyrics.length);
    
    songEditTextarea.value = originalLyrics;
    
    // Обновляем статус
    updateEditStatus(songData);
    
    // Показываем модальное окно
    songEditorOverlay.classList.add('visible');
    
    // Фокусируемся на textarea
    setTimeout(() => {
        songEditTextarea.focus();
        songEditTextarea.setSelectionRange(0, 0);
    }, 100);
}

/** Закрывает редактор песни */
export function closeSongEditor() {
    if (!songEditorOverlay) return;
    
    songEditorOverlay.classList.remove('visible');
    
    // Очищаем textarea
    if (songEditTextarea) {
        songEditTextarea.value = '';
    }
}

/** Получает текущие данные песни */
export function getCurrentSongData() {
    // Получаем ID текущей выбранной песни из селекта
    const songSelect = document.getElementById('song-select');
    if (!songSelect || !songSelect.value) return null;
    
    // Находим песню в состоянии приложения
    const songId = songSelect.value;
    return state.allSongs.find(s => s.id === songId) || null;
}



 
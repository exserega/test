/**
 * @fileoverview Core Modules Index - Центральный экспорт всех core модулей
 * @module CoreIndex
 * @version 1.0.0
 * @author Agape Worship Team
 * @since 2024
 */

// ====================================
// CORE MODULES IMPORTS
// ====================================

// Event Bus и State Manager
export { default as eventBus, EventBus } from './event-bus.js';
export { default as stateManager, StateManager } from './state-manager.js';

// UI Components
export { 
  elements as domElements,
  validateDOMElements,
  getElement,
  isElementVisible,
  setElementVisibility,
  addClass,
  removeClass,
  toggleClass
} from '../ui/dom-refs.js';

// Search functionality
export {
  searchSongs,
  searchSongsWithCache,
  displaySearchResults,
  createSearchResultElement,
  highlightText,
  clearSearchCache,
  normalizeTextForSearch
} from '../ui/search.js';

// Song display functionality
export {
  displaySongDetails,
  createSongListItem,
  displaySongsList,
  toggleChordsVisibility,
  toggleChordsOnlyMode,
  toggleChordOnlyBlocks,
  increaseFontSize,
  decreaseFontSize,
  resetFontSize
} from '../ui/song-display.js';

// UI utilities (без showModal - теперь в modal-manager.js)
export {
  showLoadingIndicator,
  hideLoadingIndicator,
  hideModal,
  validateForm,
  clearForm,
  scrollToElement,
  isElementInViewport,
  debounce,
  throttle
} from '../ui/utils.js';

// API functions
export {
  loadAllSongsFromFirestore,
  saveSongEdit,
  revertToOriginal,
  getSongEditStatus,
  loadSetlists,
  createSetlist,
  deleteSetlist,
  addSongToSetlist,
  removeSongFromSetlist,
  loadVocalists,
  loadRepertoire,
  addToRepertoire,
  removeFromRepertoire
} from '../api/index.js';

// Транспонирование и обработка текста
export { 
  getTransposition, 
  transposeLyrics, 
  processLyrics, 
  highlightChords 
} from '../js/core/transposition.js';

// Парсинг песен
export { 
  wrapSongBlocks,
  correctBlockType,
  demonstrateParser,
  resetParserLearning 
} from '../js/core/songParser.js';

// Метроном
export {
  setupAudioContext,
  resumeAudioContext,
  loadAudioFile,
  playClick,
  toggleMetronome,
  getMetronomeState,
  initAudioOnUserGesture,
  setSoundType,
  setAccentEnabled
} from '../js/core/metronome.js';

// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Проверка мобильного устройства
 * @returns {boolean} True если мобильное устройство
 */
export function isMobileDevice() {
  return window.innerWidth <= 768;
}

/**
 * Нормализация поискового запроса
 * @param {string} query - Поисковый запрос
 * @returns {string} Нормализованный запрос
 */
export function normalizeSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0400-\u04FF]/g, '') // Оставляем только буквы, цифры, пробелы и кириллицу
    .replace(/\s+/g, ' '); // Заменяем множественные пробелы одним
}

/**
 * Получение нормализованного названия песни
 * @param {Object} song - Объект песни
 * @returns {string} Нормализованное название
 */
export function getNormalizedTitle(song) {
  if (!song || !song.name) return '';
  return normalizeSearchQuery(song.name);
}

/**
 * Получение нормализованного текста песни
 * @param {Object} song - Объект песни
 * @returns {string} Нормализованный текст
 */
export function getNormalizedLyrics(song) {
  if (!song) return '';
  
  const lyrics = song['Текст и аккорды'] || song.lyrics || '';
  return normalizeSearchQuery(lyrics);
}

/**
 * Получение очищенного текста песни (без аккордов)
 * @param {Object} song - Объект песни
 * @returns {string} Очищенный текст
 */
export function getCleanedLyrics(song) {
  if (!song) return '';
  
  const lyrics = song['Текст и аккорды'] || song.lyrics || '';
  
  // Удаляем аккорды (буквы с диезами/бемолями)
  return lyrics
    .replace(/[A-H][#b]?(?:maj7|maj9|m7|m9|m11|7sus4|sus4|sus2|add9|dim7|dim|aug7|aug|7|m|6|9|11|13|sus)?(?:\s*\/\s*[A-H][#b]?)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Получение тональности песни из разных полей
 * @param {Object} song - Объект песни
 * @returns {string} Тональность песни
 */
export function getSongKey(song) {
  if (!song) return 'C';
  
  // Проверяем различные возможные поля для тональности
  const key = song['Оригинальная тональность'] || 
              song['Тональность'] || 
              song['originalKey'] || 
              song['key'] || 
              song.originalKey || 
              song.key || 
              'C'; // Fallback по умолчанию
  
  return key;
}

// ====================================
// CONSTANTS RE-EXPORT
// ====================================

// Основные константы из constants.js
export const CHORDS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'H', 'B'
];

export const STRUCTURE_MARKERS = [
  'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro', 
  'Pre-Chorus', 'Tag', 'Interlude', 'Solo'
];

// ====================================
// MODULE METADATA
// ====================================

// Overlay Manager exports
export {
    showMobileSongPreview,
    hideMobileSongPreview,
    displaySongTextInMobileOverlay,
    setupMobileOverlayEventListeners,
    closeKeySelectionModal,
    showKeySelectionModal,
    updateSongTextInModal,
    updateKeyButtons,
    getCurrentMobileSong,
    getCurrentSongForKey,
    getCurrentSelectedKey,
    setCurrentSelectedKey,
    metadata as overlayManagerMetadata
} from '../ui/overlay-manager.js';

// Search Manager exports
export {
    performOverlayDropdownSearch,
    showOverlaySearchResults,
    hideOverlaySearchResults,
    createOverlaySearchResultElement,
    cleanLyricsForSearch,
    getHighlightedTextFragment,
    filterAndDisplaySongs,
    metadata as searchManagerMetadata
} from '../ui/search-manager.js';

// Setlist Manager exports
export {
    startAddingSongs,
    closeAddSongsOverlay,
    addSongToSetlist as addSongToSetlistModule,
    confirmAddSongWithKey,
    getCurrentCreatedSetlistId,
    getCurrentCreatedSetlistName,
    setCurrentCreatedSetlist,
    metadata as setlistManagerMetadata
} from '../ui/setlist-manager.js';

// Modal Manager exports
export {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showModal,
    closeModal,
    closeAllModals,
    showConfirmDialog,
    showToast,
    isModalOpen,
    getOpenModals,
    metadata as modalManagerMetadata
} from '../ui/modal-manager.js';

// ====================================
// СЕЛЕКТОР СЕТ-ЛИСТОВ
// ====================================
export {
    openSetlistSelector
} from '../ui/setlist-selector.js';

/**
 * Core modules metadata
 * @readonly
 */
export const metadata = {
  name: 'CoreIndex',
  version: '1.0.0',
  description: 'Central export for all core modules',
  modules: [
    'event-bus',
    'state-manager',
    'dom-refs',
    'search',
    'song-display',
    'ui-utils',
    'overlay-manager',
    'api',
    'transposition',
    'song-parser',
    'metronome',
    'utilities'
  ],
  exports: [
    'eventBus',
    'stateManager',
    'domElements',
    'validateDOMElements',
    'getElement',
    'getTransposition',
    'transposeLyrics',
    'processLyrics',
    'highlightChords',
    'wrapSongBlocks',
    'showMobileSongPreview',
    'hideMobileSongPreview',
    'displaySongTextInMobileOverlay',
    'setupMobileOverlayEventListeners',
    'closeKeySelectionModal',
    'showKeySelectionModal',
    'updateSongTextInModal',
    'updateKeyButtons',
    'isMobileDevice',
    'normalizeSearchQuery',
    'getNormalizedTitle',
    'getSongKey'
  ]
};
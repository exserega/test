/**
 * Agape Worship App - Search Management Module
 * Модуль для управления поиском и отображением результатов
 */

import { 
    stateManager,
    normalizeSearchQuery,
    getNormalizedTitle,
    getNormalizedLyrics
} from '../core/index.js';
import * as state from '../../js/state.js';

/**
 * Поиск в выпадающем списке overlay
 * @param {string} searchTerm - поисковый запрос
 */
export async function performOverlayDropdownSearch(searchTerm) {
    try {
        // Используем Web Worker для поиска если доступен
        if (window.searchWorkerManager && typeof window.searchWorkerManager.overlaySearch === 'function') {
            // Используем State Manager с fallback к старому state
            const allSongs = stateManager.getAllSongs().length > 0 ? stateManager.getAllSongs() : state.allSongs;
            const { results } = await window.searchWorkerManager.overlaySearch(searchTerm, allSongs, {
                enablePrioritySearch: true
            });
            
            const allResults = [
                ...results.exactResults.map(r => r.song),
                ...results.fuzzyResults.map(r => r.song)
            ];
            
            showOverlaySearchResults(allResults, searchTerm);
        } else {
            // Fallback: обычный поиск
            const query = normalizeSearchQuery(searchTerm);
            const allSongs = stateManager.getAllSongs().length > 0 ? stateManager.getAllSongs() : state.allSongs;
            let matchingSongs = allSongs.filter(song => {
                const titleMatch = getNormalizedTitle(song).includes(query);
                const lyricsMatch = getNormalizedLyrics(song).includes(query);
                return titleMatch || lyricsMatch;
            });
            
            // Применяем smart sorting
            matchingSongs.sort((a, b) => {
                const aNormalizedTitle = getNormalizedTitle(a);
                const bNormalizedTitle = getNormalizedTitle(b);
                
                // Приоритет для точных совпадений в начале названия
                const aStartsWithQuery = aNormalizedTitle.startsWith(query);
                const bStartsWithQuery = bNormalizedTitle.startsWith(query);
                
                if (aStartsWithQuery && !bStartsWithQuery) return -1;
                if (!aStartsWithQuery && bStartsWithQuery) return 1;
                
                // Приоритет для более коротких названий
                const lengthDiff = a.name.length - b.name.length;
                if (Math.abs(lengthDiff) > 10) return lengthDiff;
                
                // Алфавитная сортировка
                return a.name.localeCompare(b.name);
            });

            // Ограничиваем количество результатов
            if (matchingSongs.length > 20) {
                matchingSongs = matchingSongs.slice(0, 20);
            }
            
            showOverlaySearchResults(matchingSongs, searchTerm);
        }
    } catch (error) {
        console.error('❌ Ошибка поиска в overlay:', error);
        hideOverlaySearchResults();
    }
}

/**
 * Показ результатов поиска в dropdown overlay
 * @param {Array} results - массив результатов поиска
 * @param {string} query - поисковый запрос
 */
export function showOverlaySearchResults(results, query) {
    const dropdown = document.getElementById('overlay-search-results');
    const container = dropdown.querySelector('.search-results-container');
    
    if (!dropdown || !container) {
        console.error('❌ Не найдены элементы dropdown поиска');
        return;
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    if (!results || results.length === 0) {
        // Показываем сообщение "ничего не найдено"
        container.innerHTML = `
            <div class="overlay-search-no-results">
                <i class="fas fa-search"></i>
                Ничего не найдено по запросу "${query}"
            </div>
        `;
    } else {
        // Добавляем результаты
        results.forEach(song => {
            const resultElement = createOverlaySearchResultElement(song, query);
            container.appendChild(resultElement);
        });
    }
    
    // Показываем dropdown
    dropdown.style.display = 'block';
    
    console.log(`🔍 Показано ${results.length} результатов поиска в dropdown`);
}

/**
 * Скрытие dropdown результатов поиска
 */
export function hideOverlaySearchResults() {
    const dropdown = document.getElementById('overlay-search-results');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

/**
 * Создание элемента результата поиска для dropdown
 * @param {Object} song - объект песни
 * @param {string} query - поисковый запрос
 * @returns {HTMLElement} элемент результата
 */
export function createOverlaySearchResultElement(song, query) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'search-result';
    
    // Нормализуем запрос для проверки
    const normalizedQuery = normalizeSearchQuery(query);
    
    // Проверяем, найдено ли в названии или тексте
    const normalizedTitle = getNormalizedTitle(song);
    const titleMatch = normalizedTitle.includes(normalizedQuery);
    
    const lyrics = song.hasWebEdits 
        ? (song['Текст и аккорды (edited)'] || '') 
        : (song['Текст и аккорды'] || '');
    
    // Убираем аккорды для более точного поиска
    const cleanedLyrics = lyrics.replace(/\[[^\]]*\]/g, ' ');
    const normalizedLyrics = getNormalizedLyrics({ 'Текст и аккорды': cleanedLyrics });
    const lyricsMatch = !titleMatch && normalizedLyrics.includes(normalizedQuery);
    
    // Формируем HTML для результата
    let resultHTML = `
        <div class="search-result-title">${song.name}</div>
    `;
    
    // Если найдено в тексте песни, показываем фрагмент с подсветкой
    if (lyricsMatch && query) {
        // Импортируем функцию для получения фрагмента (будет добавлена позже)
        const fragment = getHighlightedTextFragment(cleanedLyrics, query, 60);
        if (fragment) {
            resultHTML += `<div class="search-result-fragment">${fragment}</div>`;
        }
    }
    
    resultDiv.innerHTML = resultHTML;
    
    // Добавляем обработчик клика
    resultDiv.addEventListener('click', () => {
        console.log('🎵 Клик на результат поиска:', song.name);
        
        // Скрываем dropdown
        hideOverlaySearchResults();
        
        // Используем РАБОЧИЙ механизм - тот же что и кнопка "добавить"
        // Показываем мобильный overlay для выбора тональности (как работающая кнопка)
        import('../ui/overlay-manager.js').then(({ showMobileSongPreview }) => {
            showMobileSongPreview(song);
        });
    });
    
    return resultDiv;
}

/**
 * Очистка текста песни для поиска (удаление аккордов)
 * @param {string} text - исходный текст
 * @returns {string} очищенный текст
 */
export function cleanLyricsForSearch(text) {
    if (!text) return '';
    
    // Убираем аккорды в квадратных скобках [C], [Am7], etc.
    let cleaned = text.replace(/\[[^\]]*\]/g, ' ');
    
    // Убираем лишние пробелы и переносы строк
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

/**
 * Получение выделенного фрагмента текста с подсветкой найденных слов
 * @param {string} text - исходный текст
 * @param {string} query - поисковый запрос
 * @param {number} contextLength - длина контекста
 * @returns {string} фрагмент с подсветкой
 */
export function getHighlightedTextFragment(text, query, contextLength = 100) {
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
            const cleanWord = normalizeSearchQuery(textWords[i]);
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

// Переменная для отслеживания текущего поискового запроса в overlay
let currentOverlaySearchRequest = null;

/**
 * Расширенный поиск по названию и тексту песни с Web Worker поддержкой
 * @param {string} searchTerm - Поисковый запрос
 * @param {string} category - Категория для фильтрации
 * @param {boolean} showAddedOnly - Показывать только добавленные песни
 */
export async function filterAndDisplaySongs(searchTerm = '', category = '', showAddedOnly = false) {
    // Отменяем предыдущий поиск если есть
    if (currentOverlaySearchRequest) {
        window.searchWorkerManager?.cancelSearch(currentOverlaySearchRequest);
        currentOverlaySearchRequest = null;
    }
    
    // ИСПРАВЛЕНИЕ: Используем те же источники данных что и старые функции
    // Проверяем все возможные источники в том же порядке что и старый код
    const globalStateSongs = window.state?.allSongs || [];
    const globalStateManagerSongs = window.stateManager?.getAllSongs() || [];
    const importedStateManagerSongs = stateManager?.getAllSongs() || [];
    const importedStateSongs = state?.allSongs || [];
    
    // Диагностические логи (можно удалить после стабилизации)
    console.log('🔍 [DEBUG] Data sources - window.state:', globalStateSongs.length, 'imported state:', importedStateSongs.length);
    
    // Выбираем первый непустой источник
    let allSongs = [];
    let selectedSource = 'none';
    
    if (globalStateSongs.length > 0) {
        allSongs = globalStateSongs;
        selectedSource = 'window.state.allSongs';
    } else if (globalStateManagerSongs.length > 0) {
        allSongs = globalStateManagerSongs;
        selectedSource = 'window.stateManager.getAllSongs()';
    } else if (importedStateManagerSongs.length > 0) {
        allSongs = importedStateManagerSongs;
        selectedSource = 'imported stateManager.getAllSongs()';
    } else if (importedStateSongs.length > 0) {
        allSongs = importedStateSongs;
        selectedSource = 'imported state.allSongs';
    }
    
    console.log('🔍 [DEBUG] Selected source:', selectedSource, 'with', allSongs.length, 'songs');
    
    let filteredSongs = allSongs;
    
    // Фильтр по поиску через Web Worker (если есть поисковый запрос)
    if (searchTerm) {
        try {
            console.log(`🔍 Overlay поиск через Worker: "${searchTerm}"`);
            
            const startTime = performance.now();
            const { results, metadata } = await window.searchWorkerManager.overlaySearch(searchTerm, allSongs, {
                category: category || undefined,
                enablePrioritySearch: true
            });
            const duration = performance.now() - startTime;
            
            console.log(`✅ Overlay поиск завершен за ${duration.toFixed(2)}ms (Worker: ${metadata.duration.toFixed(2)}ms)`);
            
            // Объединяем точные и нечеткие результаты
            filteredSongs = [
                ...results.exactResults.map(r => r.song),
                ...results.fuzzyResults.map(r => r.song)
            ];
            
        } catch (error) {
            console.error('❌ Ошибка Web Worker overlay поиска, fallback:', error);
            
            // Fallback: стандартный поиск
            const query = normalizeSearchQuery(searchTerm);
            filteredSongs = filteredSongs.filter(song => {
                // Поиск по названию
                const normalizedTitle = getNormalizedTitle(song);
                const titleMatch = normalizedTitle.includes(query);
                
                // Поиск по тексту песни
                const normalizedLyrics = getNormalizedLyrics(song);
                const lyricsMatch = normalizedLyrics.includes(query);
                
                return titleMatch || lyricsMatch;
            });
            
            // Умная сортировка для fallback
            filteredSongs.sort((a, b) => {
                const aNormalizedTitle = getNormalizedTitle(a);
                const bNormalizedTitle = getNormalizedTitle(b);
                const aTitleMatch = aNormalizedTitle.includes(query);
                const bTitleMatch = bNormalizedTitle.includes(query);
                const aTitleStartsWith = aNormalizedTitle.startsWith(query);
                const bTitleStartsWith = bNormalizedTitle.startsWith(query);
                
                // 1. Сначала песни, название которых начинается с запроса
                if (aTitleStartsWith && !bTitleStartsWith) return -1;
                if (!aTitleStartsWith && bTitleStartsWith) return 1;
                
                // 2. Потом песни, где запрос содержится в названии (но не в начале)
                if (aTitleMatch && !aTitleStartsWith && (!bTitleMatch || bTitleStartsWith)) return -1;
                if (bTitleMatch && !bTitleStartsWith && (!aTitleMatch || aTitleStartsWith)) return 1;
                
                // 3. Наконец песни по тексту (где нет совпадения в названии)
                if (aTitleMatch && !bTitleMatch) return -1;
                if (!aTitleMatch && bTitleMatch) return 1;
                
                return 0;
            });
        }
    }
    
    // Фильтр по категории (если не обработан в Worker)
    if (category && searchTerm) {
        // Если поиск был через Worker с категорией, фильтр уже применен
    } else if (category) {
        filteredSongs = filteredSongs.filter(song => song.sheet === category);
    }
    
    // Фильтр только добавленные
    if (showAddedOnly) {
        // Получаем addedSongsToCurrentSetlist из глобальной области
        const addedSongs = window.addedSongsToCurrentSetlist || new Set();
        console.log('🔍 filterAndDisplaySongs: showAddedOnly=true');
        console.log('🔍 addedSongs size:', addedSongs.size);
        console.log('🔍 addedSongs contents:', Array.from(addedSongs));
        console.log('🔍 Total songs before filter:', filteredSongs.length);
        console.log('🔍 First 3 song IDs in filteredSongs:', filteredSongs.slice(0, 3).map(s => s.id));
        
        filteredSongs = filteredSongs.filter(song => {
            const hasMatch = addedSongs.has(song.id);
            if (hasMatch) {
                console.log('🎯 MATCH FOUND:', song.id, song.name);
            }
            return hasMatch;
        });
        console.log('🔍 Filtered songs count:', filteredSongs.length);
        if (filteredSongs.length > 0) {
            console.log('🔍 Filtered songs:', filteredSongs.map(s => ({id: s.id, name: s.name})));
        }
    }
    
    // Вызываем displaySongsGrid через глобальную область
    if (typeof window.displaySongsGrid === 'function') {
        window.displaySongsGrid(filteredSongs, searchTerm);
    } else {
        console.error('❌ displaySongsGrid function not found');
    }
}

export const metadata = {
    name: 'SearchManager',
    version: '1.0.0',
    description: 'Модуль для управления поиском и отображением результатов',
    functions: [
        'performOverlayDropdownSearch',
        'showOverlaySearchResults',
        'hideOverlaySearchResults',
        'createOverlaySearchResultElement',
        'cleanLyricsForSearch',
        'getHighlightedTextFragment',
        'filterAndDisplaySongs'
    ]
};
/**
 * @fileoverview Search Module - Функции поиска и отображения результатов
 * @module Search
 * @version 1.0.0
 * @author Agape Worship Team
 * @since 2024
 */

import { normalizeSearchQuery, getNormalizedTitle, getNormalizedLyrics } from '../core/index.js';

// ====================================
// SEARCH UTILITIES
// ====================================

/**
 * Нормализует текст для поиска (устаревшая функция для совместимости)
 * @param {string} text - Исходный текст
 * @returns {string} Нормализованный текст
 * @deprecated Используйте normalizeSearchQuery из core/index.js
 */
export function normalizeTextForSearch(text) {
  return normalizeSearchQuery(text);
}

/**
 * Выполняет поиск песен по запросу
 * @param {Array} songs - Массив песен для поиска
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @param {boolean} options.searchInLyrics - Искать в тексте песен (по умолчанию true)
 * @param {boolean} options.caseSensitive - Учитывать регистр (по умолчанию false)
 * @param {number} options.maxResults - Максимальное количество результатов (по умолчанию 50)
 * @returns {Array} Массив найденных песен
 */
export function searchSongs(songs, query, options = {}) {
  const {
    searchInLyrics = true,
    caseSensitive = false,
    maxResults = 50
  } = options;

  if (!query || !query.trim() || !Array.isArray(songs)) {
    return [];
  }

  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return [];

  const results = [];
  
  for (const song of songs) {
    if (results.length >= maxResults) break;
    
    let matchScore = 0;
    let matchType = '';
    
    // Поиск в названии
    const normalizedTitle = getNormalizedTitle(song);
    if (normalizedTitle.includes(normalizedQuery)) {
      matchScore += normalizedTitle.startsWith(normalizedQuery) ? 100 : 50;
      matchType = 'title';
    }
    
    // Поиск в тексте (если не найдено в названии и включен поиск в тексте)
    if (searchInLyrics && matchScore === 0) {
      const normalizedLyrics = getNormalizedLyrics(song);
      if (normalizedLyrics.includes(normalizedQuery)) {
        matchScore += 10;
        matchType = 'lyrics';
      }
    }
    
    if (matchScore > 0) {
      results.push({
        song,
        matchScore,
        matchType,
        normalizedTitle
      });
    }
  }
  
  // Сортировка по релевантности
  results.sort((a, b) => {
    // Сначала по score
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    // Потом по алфавиту
    return a.normalizedTitle.localeCompare(b.normalizedTitle);
  });
  
  return results.map(result => result.song);
}

/**
 * Получает фрагмент текста с выделенным поисковым запросом
 * @param {string} text - Исходный текст
 * @param {string} query - Поисковый запрос
 * @param {number} contextLength - Длина контекста вокруг найденного текста
 * @returns {string} Фрагмент текста с выделением
 */
export function getHighlightedTextFragment(text, query, contextLength = 100) {
  if (!text || !query) return '';
  
  const normalizedText = normalizeSearchQuery(text);
  const normalizedQuery = normalizeSearchQuery(query);
  
  if (!normalizedQuery) return '';
  
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
  if (queryWords.length === 0) return '';
  
  // Находим первое вхождение любого из слов запроса
  let bestMatch = { index: -1, word: '' };
  
  for (const word of queryWords) {
    const index = normalizedText.indexOf(word);
    if (index !== -1 && (bestMatch.index === -1 || index < bestMatch.index)) {
      bestMatch = { index, word };
    }
  }
  
  if (bestMatch.index === -1) return '';
  
  // Определяем границы фрагмента
  const start = Math.max(0, bestMatch.index - contextLength / 2);
  const end = Math.min(text.length, bestMatch.index + contextLength / 2);
  
  let fragment = text.substring(start, end);
  
  // Добавляем многоточие если нужно
  if (start > 0) fragment = '...' + fragment;
  if (end < text.length) fragment = fragment + '...';
  
  return fragment;
}

// ====================================
// SEARCH RESULTS DISPLAY
// ====================================

/**
 * Отображает результаты поиска в указанном контейнере
 * @param {Array} matchingSongs - Массив найденных песен
 * @param {Function} onSelect - Callback для выбора песни
 * @param {string} query - Поисковый запрос для выделения
 * @param {HTMLElement} container - Контейнер для результатов
 */
export function displaySearchResults(matchingSongs, onSelect, query = '', container = null) {
  // Получаем контейнер
  const resultsContainer = container || document.getElementById('search-results');
  if (!resultsContainer) {
    console.warn('⚠️ Search results container not found');
    return;
  }

  // Очищаем предыдущие результаты
  resultsContainer.innerHTML = '';

  if (!matchingSongs || matchingSongs.length === 0) {
    if (query.trim()) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <p>Ничего не найдено по запросу "${query}"</p>
        </div>
      `;
    }
    return;
  }

  // Отображаем результаты
  matchingSongs.forEach(song => {
    const resultElement = createSearchResultElement(song, query, onSelect);
    resultsContainer.appendChild(resultElement);
  });
}

/**
 * Создает элемент результата поиска
 * @param {Object} song - Объект песни
 * @param {string} query - Поисковый запрос
 * @param {Function} onSelect - Callback для выбора песни
 * @returns {HTMLElement} DOM элемент результата
 */
export function createSearchResultElement(song, query, onSelect) {
  const resultDiv = document.createElement('div');
  resultDiv.className = 'search-result';
  
  // Получаем данные песни
  const songTitle = song.name || 'Без названия';
  const songKey = song['Оригинальная тональность'] || song.key || 'C';
  const songCategory = song.sheet || 'Без категории';
  
  // Создаем фрагмент текста если есть поиск
  let textFragment = '';
  if (query && query.trim()) {
    const lyrics = song['Текст и аккорды'] || '';
    const normalizedTitle = getNormalizedTitle(song);
    const normalizedQuery = normalizeSearchQuery(query);
    
    // Если не найдено в названии, показываем фрагмент из текста
    if (!normalizedTitle.includes(normalizedQuery)) {
      textFragment = getHighlightedTextFragment(lyrics, query, 80);
    }
  }
  
  // Формируем HTML
  resultDiv.innerHTML = `
    <div class="search-result-header">
      <h3 class="search-result-title">${highlightText(songTitle, query)}</h3>
      <div class="search-result-meta">
        <span class="song-key">${songKey}</span>
        <span class="song-category">${songCategory}</span>
      </div>
    </div>
    ${textFragment ? `<div class="search-result-fragment">${highlightText(textFragment, query)}</div>` : ''}
  `;
  
  // Добавляем обработчик клика
  resultDiv.addEventListener('click', () => {
    if (typeof onSelect === 'function') {
      onSelect(song);
    }
  });
  
  return resultDiv;
}

/**
 * Выделяет поисковый запрос в тексте
 * @param {string} text - Исходный текст
 * @param {string} query - Поисковый запрос
 * @returns {string} Текст с HTML выделением
 */
export function highlightText(text, query) {
  if (!text || !query || !query.trim()) return text;
  
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return text;
  
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
  let highlightedText = text;
  
  // Выделяем каждое слово запроса
  queryWords.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });
  
  return highlightedText;
}

// ====================================
// SEARCH PERFORMANCE OPTIMIZATION
// ====================================

/**
 * Кэш для результатов поиска
 * @private
 */
const searchCache = new Map();

/**
 * Максимальный размер кэша
 * @private
 */
const MAX_CACHE_SIZE = 100;

/**
 * Выполняет поиск с кэшированием результатов
 * @param {Array} songs - Массив песен
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @returns {Array} Результаты поиска
 */
export function searchSongsWithCache(songs, query, options = {}) {
  if (!query || !query.trim()) return [];
  
  const cacheKey = `${query.trim().toLowerCase()}_${JSON.stringify(options)}`;
  
  // Проверяем кэш
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  
  // Выполняем поиск
  const results = searchSongs(songs, query, options);
  
  // Сохраняем в кэш
  if (searchCache.size >= MAX_CACHE_SIZE) {
    // Удаляем самый старый элемент
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  
  searchCache.set(cacheKey, results);
  return results;
}

/**
 * Очищает кэш поиска
 */
export function clearSearchCache() {
  searchCache.clear();
}

// ====================================
// MODULE METADATA
// ====================================

/**
 * Search module metadata
 * @readonly
 */
export const metadata = {
  name: 'Search',
  version: '1.0.0',
  description: 'Search functionality and results display',
  functions: [
    'searchSongs',
    'searchSongsWithCache',
    'displaySearchResults',
    'createSearchResultElement',
    'getHighlightedTextFragment',
    'highlightText',
    'clearSearchCache'
  ],
  features: [
    'Smart search with scoring',
    'Results caching',
    'Text highlighting',
    'Fragment extraction',
    'Customizable options'
  ]
};
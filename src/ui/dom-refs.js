/**
 * @fileoverview DOM References - Централизованное управление ссылками на DOM элементы
 * @module DOMRefs
 * @version 1.0.0
 * @author Agape Worship Team
 * @since 2024
 */

// ====================================
// DOM ELEMENT REFERENCES
// ====================================

/**
 * Основные элементы интерфейса
 * @readonly
 */
export const elements = {
  // Основные селекторы
  sheetSelect: document.getElementById('sheet-select'),
  songSelect: document.getElementById('song-select'),
  keySelect: document.getElementById('key-select'),
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),
  
  // Контент и отображение
  loadingIndicator: document.getElementById('loading-indicator'),
  songContent: document.getElementById('song-content'),
  bpmDisplay: document.getElementById('bpm-display'),
  
  // Кнопки управления
  splitTextButton: document.getElementById('split-text-button'),
  zoomInButton: document.getElementById('zoom-in'),
  zoomOutButton: document.getElementById('zoom-out'),
  holychordsButton: document.getElementById('holychords-button'),
  metronomeButton: document.getElementById('metronome-button'),
  
  // Метроном
  timeSignatureSelect: document.getElementById('time-signature'),
  
  // Модальные окна и overlay
  keySelectionModal: document.getElementById('key-selection-modal'),
  addSongsOverlay: document.getElementById('add-songs-overlay'),
  confirmKeySelection: document.getElementById('confirm-key-selection'),
  
  // Мобильный overlay
  mobileOverlay: document.getElementById('mobile-song-preview'),
  mobileKeySelector: document.getElementById('mobile-key-selector'),
  closeMobilePreview: document.getElementById('close-mobile-song-preview'),
  addSongToSetlistMobile: document.getElementById('add-song-to-setlist-mobile'),
  
  // Сетлисты
  setlistContainer: document.getElementById('setlist-container'),
  currentSetlistDiv: document.getElementById('current-setlist'),
  setlistSongs: document.getElementById('setlist-songs'),
  
  // Поиск и фильтры
  categoryFilter: document.getElementById('category-filter'),
  clearSearchButton: document.getElementById('clear-search'),
  
  // Тема
  themeToggleButton: document.getElementById('theme-toggle-button')
};

/**
 * Проверяет существование критически важных DOM элементов
 * @returns {Object} Результат проверки с отчетом
 */
export function validateDOMElements() {
  const report = {
    valid: true,
    missing: [],
    present: []
  };
  
  const criticalElements = [
    'sheetSelect', 'songSelect', 'keySelect', 'searchInput',
    'songContent', 'loadingIndicator', 'searchResults'
  ];
  
  for (const elementName of criticalElements) {
    const element = elements[elementName];
    if (element) {
      report.present.push(elementName);
    } else {
      report.missing.push(elementName);
      report.valid = false;
    }
  }
  
  return report;
}

/**
 * Получает элемент по имени с проверкой существования
 * @param {string} elementName - Имя элемента из объекта elements
 * @returns {HTMLElement|null} DOM элемент или null
 */
export function getElement(elementName) {
  const element = elements[elementName];
  if (!element) {
    console.warn(`⚠️ DOM element '${elementName}' not found`);
  }
  return element || null;
}

/**
 * Проверяет, является ли элемент видимым
 * @param {string|HTMLElement} element - Имя элемента или сам элемент
 * @returns {boolean} True если элемент видим
 */
export function isElementVisible(element) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return false;
  
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/**
 * Устанавливает видимость элемента
 * @param {string|HTMLElement} element - Имя элемента или сам элемент
 * @param {boolean} visible - Показать или скрыть
 * @param {string} displayType - Тип display (по умолчанию 'block')
 */
export function setElementVisibility(element, visible, displayType = 'block') {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;
  
  el.style.display = visible ? displayType : 'none';
}

/**
 * Добавляет класс к элементу с проверкой существования
 * @param {string|HTMLElement} element - Имя элемента или сам элемент
 * @param {string} className - Класс для добавления
 */
export function addClass(element, className) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (el && className) {
    el.classList.add(className);
  }
}

/**
 * Удаляет класс у элемента с проверкой существования
 * @param {string|HTMLElement} element - Имя элемента или сам элемент
 * @param {string} className - Класс для удаления
 */
export function removeClass(element, className) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (el && className) {
    el.classList.remove(className);
  }
}

/**
 * Переключает класс у элемента
 * @param {string|HTMLElement} element - Имя элемента или сам элемент
 * @param {string} className - Класс для переключения
 * @returns {boolean} True если класс был добавлен
 */
export function toggleClass(element, className) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (el && className) {
    return el.classList.toggle(className);
  }
  return false;
}

// ====================================
// BACKWARD COMPATIBILITY EXPORTS
// ====================================

// Экспортируем отдельные элементы для обратной совместимости
export const {
  sheetSelect,
  songSelect,
  keySelect,
  searchInput,
  searchResults,
  loadingIndicator,
  songContent,
  bpmDisplay,
  splitTextButton,
  zoomInButton,
  zoomOutButton,
  holychordsButton,
  metronomeButton,
  timeSignatureSelect,
  keySelectionModal,
  addSongsOverlay,
  confirmKeySelection
} = elements;

// ====================================
// MODULE METADATA
// ====================================

/**
 * DOM References module metadata
 * @readonly
 */
export const metadata = {
  name: 'DOMRefs',
  version: '1.0.0',
  description: 'Centralized DOM element references and utilities',
  elements: Object.keys(elements).length,
  utilities: [
    'validateDOMElements',
    'getElement',
    'isElementVisible', 
    'setElementVisibility',
    'addClass',
    'removeClass',
    'toggleClass'
  ]
};
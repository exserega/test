/**
 * @fileoverview Song Display Module - Функции отображения песен и их контента
 * @module SongDisplay
 * @version 1.0.0
 * @author Agape Worship Team
 * @since 2024
 */

import { 
  getTransposition, 
  transposeLyrics, 
  processLyrics, 
  highlightChords,
  getSongKey,
  domElements 
} from '../core/index.js';

// ====================================
// SONG DISPLAY UTILITIES
// ====================================

/**
 * Отображает детали песни в основном интерфейсе
 * @param {Object} songData - Данные песни
 * @param {string} keyToSelect - Тональность для отображения
 */
export function displaySongDetails(songData, keyToSelect) {
  if (!songData) {
    console.warn('⚠️ No song data provided to displaySongDetails');
    return;
  }

  const songContent = domElements.songContent;
  if (!songContent) {
    console.warn('⚠️ Song content element not found');
    return;
  }

  // Получаем данные песни
  const songTitle = songData.name || 'Без названия';
  const originalLyrics = songData['Текст и аккорды'] || songData.lyrics || '';
  const originalKey = getSongKey(songData);
  const targetKey = keyToSelect || originalKey;
  const bpm = songData.BPM || songData.bpm || null;
  const category = songData.sheet || 'Без категории';

  // Транспонируем если нужно
  let displayLyrics = originalLyrics;
  if (targetKey !== originalKey) {
    const transposition = getTransposition(originalKey, targetKey);
    displayLyrics = transposeLyrics(displayLyrics, transposition, targetKey);
  }

  // Обрабатываем и выделяем
  displayLyrics = processLyrics(displayLyrics);
  displayLyrics = highlightChords(displayLyrics);

  // Формируем HTML
  const songHtml = `
    <div class="song-header">
      <h2 class="song-title">${songTitle}</h2>
      <div class="song-meta">
        <span class="song-key">Тональность: ${targetKey}</span>
        ${bpm ? `<span class="song-bpm">BPM: ${bpm}</span>` : ''}
        <span class="song-category">${category}</span>
      </div>
    </div>
    <div class="song-content-wrapper">
      <pre id="song-display" class="song-text">${displayLyrics}</pre>
    </div>
  `;

  songContent.innerHTML = songHtml;

  // Обновляем BPM дисплей если есть
  if (bpm && domElements.bpmDisplay) {
    domElements.bpmDisplay.textContent = bpm;
  }

  // Показываем кнопку HolyChords если есть ссылка
  if (songData.Holychords && domElements.holychordsButton) {
    domElements.holychordsButton.style.display = 'inline-block';
    domElements.holychordsButton.onclick = () => {
      window.open(songData.Holychords, '_blank');
    };
  } else if (domElements.holychordsButton) {
    domElements.holychordsButton.style.display = 'none';
  }
}

/**
 * Отображает текст песни в мобильном overlay
 * @param {Object} song - Объект песни
 * @param {string} selectedKey - Выбранная тональность
 */
export function displaySongTextInMobileOverlay(song, selectedKey) {
  if (!song) {
    console.warn('⚠️ No song provided to displaySongTextInMobileOverlay');
    return;
  }

  console.log(`📝 displaySongTextInMobileOverlay called: ${song.name} ${selectedKey}`);

  const overlay = document.getElementById('mobile-song-preview');
  const textContainer = overlay?.querySelector('.mobile-song-text');
  
  if (!overlay || !textContainer) {
    console.warn('⚠️ Mobile overlay elements not found');
    return;
  }

  // Получаем данные песни
  const originalLyrics = song['Текст и аккорды'] || song.lyrics || '';
  const originalKey = getSongKey(song);
  const targetKey = selectedKey || originalKey;

  console.log(`🎵 Транспонирование: ${originalKey} → ${targetKey}`);

  // Транспонируем если нужно
  let displayLyrics = originalLyrics;
  if (targetKey !== originalKey) {
    const transposition = getTransposition(originalKey, targetKey);
    displayLyrics = transposeLyrics(displayLyrics, transposition, targetKey);
    console.log('🎵 Транспонирование выполнено');
  } else {
    console.log('⚪ Транспонирование не требуется');
  }

  // Обрабатываем и выделяем
  displayLyrics = processLyrics(displayLyrics);
  displayLyrics = highlightChords(displayLyrics);

  // Отображаем в overlay
  textContainer.innerHTML = `<pre class="mobile-song-display">${displayLyrics}</pre>`;
  
  console.log('📝 Текст песни отображен в mobile overlay');
}

/**
 * Создает HTML элемент для отображения песни в списке
 * @param {Object} song - Объект песни
 * @param {Object} options - Опции отображения
 * @param {Function} options.onSelect - Callback для выбора песни
 * @param {Function} options.onRemove - Callback для удаления песни
 * @param {boolean} options.showKey - Показывать тональность
 * @param {boolean} options.showCategory - Показывать категорию
 * @param {boolean} options.showBPM - Показывать BPM
 * @returns {HTMLElement} DOM элемент песни
 */
export function createSongListItem(song, options = {}) {
  const {
    onSelect,
    onRemove,
    showKey = true,
    showCategory = true,
    showBPM = true
  } = options;

  const songElement = document.createElement('div');
  songElement.className = 'song-list-item';
  
  // Получаем данные песни
  const songTitle = song.name || 'Без названия';
  const songKey = getSongKey(song);
  const songCategory = song.sheet || '';
  const songBPM = song.BPM || song.bpm || null;

  // Формируем HTML
  let songHtml = `
    <div class="song-list-item-header">
      <h3 class="song-list-item-title">${songTitle}</h3>
      <div class="song-list-item-meta">
        ${showKey ? `<span class="song-key">${songKey}</span>` : ''}
        ${showBPM && songBPM ? `<span class="song-bpm">${songBPM} BPM</span>` : ''}
        ${showCategory && songCategory ? `<span class="song-category">${songCategory}</span>` : ''}
      </div>
    </div>
  `;

  // Добавляем кнопки действий если есть callbacks
  if (onSelect || onRemove) {
    songHtml += '<div class="song-list-item-actions">';
    
    if (onSelect) {
      songHtml += '<button class="btn-select" title="Выбрать песню">▶</button>';
    }
    
    if (onRemove) {
      songHtml += '<button class="btn-remove" title="Удалить песню">✕</button>';
    }
    
    songHtml += '</div>';
  }

  songElement.innerHTML = songHtml;

  // Добавляем обработчики событий
  if (onSelect) {
    const selectBtn = songElement.querySelector('.btn-select');
    const titleElement = songElement.querySelector('.song-list-item-title');
    
    const selectHandler = () => onSelect(song);
    
    if (selectBtn) selectBtn.addEventListener('click', selectHandler);
    if (titleElement) titleElement.addEventListener('click', selectHandler);
  }

  if (onRemove) {
    const removeBtn = songElement.querySelector('.btn-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(song);
      });
    }
  }

  return songElement;
}

/**
 * Отображает список песен в контейнере
 * @param {Array} songs - Массив песен
 * @param {HTMLElement} container - Контейнер для отображения
 * @param {Object} options - Опции отображения
 */
export function displaySongsList(songs, container, options = {}) {
  if (!container) {
    console.warn('⚠️ No container provided to displaySongsList');
    return;
  }

  // Очищаем контейнер
  container.innerHTML = '';

  if (!songs || songs.length === 0) {
    container.innerHTML = `
      <div class="empty-list">
        <i class="fas fa-music"></i>
        <p>Список песен пуст</p>
      </div>
    `;
    return;
  }

  // Создаем элементы песен
  songs.forEach(song => {
    const songElement = createSongListItem(song, options);
    container.appendChild(songElement);
  });
}

// ====================================
// CHORD VISIBILITY MANAGEMENT
// ====================================

/**
 * Переключает видимость аккордов в отображаемой песне
 * @param {boolean} visible - Показать или скрыть аккорды
 */
export function toggleChordsVisibility(visible) {
  const songDisplay = document.getElementById('song-display');
  if (!songDisplay) return;

  if (visible) {
    songDisplay.classList.remove('chords-hidden');
  } else {
    songDisplay.classList.add('chords-hidden');
  }
}

/**
 * Переключает режим "только аккорды"
 * @param {boolean} chordsOnly - Показывать только аккорды
 */
export function toggleChordsOnlyMode(chordsOnly) {
  const songDisplay = document.getElementById('song-display');
  if (!songDisplay) return;

  if (chordsOnly) {
    songDisplay.classList.add('chords-only-mode');
  } else {
    songDisplay.classList.remove('chords-only-mode');
  }
}

/**
 * Скрывает блоки, содержащие только аккорды
 * @param {boolean} hide - Скрыть или показать блоки с аккордами
 */
export function toggleChordOnlyBlocks(hide) {
  const songDisplay = document.getElementById('song-display');
  if (!songDisplay) return;

  // Находим все строки с аккордами
  const chordLines = songDisplay.querySelectorAll('.chord-line');
  
  chordLines.forEach(line => {
    if (hide) {
      line.style.display = 'none';
    } else {
      line.style.display = '';
    }
  });
}

// ====================================
// FONT SIZE MANAGEMENT
// ====================================

/**
 * Увеличивает размер шрифта песни
 */
export function increaseFontSize() {
  const songDisplay = document.getElementById('song-display');
  if (!songDisplay) return;

  const currentSize = parseFloat(window.getComputedStyle(songDisplay).fontSize);
  const newSize = Math.min(currentSize + 2, 24); // Максимум 24px
  
  songDisplay.style.fontSize = `${newSize}px`;
}

/**
 * Уменьшает размер шрифта песни
 */
export function decreaseFontSize() {
  const songDisplay = document.getElementById('song-display');
  if (!songDisplay) return;

  const currentSize = parseFloat(window.getComputedStyle(songDisplay).fontSize);
  const newSize = Math.max(currentSize - 2, 10); // Минимум 10px
  
  songDisplay.style.fontSize = `${newSize}px`;
}

/**
 * Сбрасывает размер шрифта к значению по умолчанию
 */
export function resetFontSize() {
  const songDisplay = document.getElementById('song-display');
  if (!songDisplay) return;

  songDisplay.style.fontSize = ''; // Сброс к CSS значению
}

// ====================================
// MODULE METADATA
// ====================================

/**
 * Song Display module metadata
 * @readonly
 */
export const metadata = {
  name: 'SongDisplay',
  version: '1.0.0',
  description: 'Song display and rendering functionality',
  functions: [
    'displaySongDetails',
    'displaySongTextInMobileOverlay',
    'createSongListItem',
    'displaySongsList',
    'toggleChordsVisibility',
    'toggleChordsOnlyMode',
    'toggleChordOnlyBlocks',
    'increaseFontSize',
    'decreaseFontSize',
    'resetFontSize'
  ],
  features: [
    'Song content rendering',
    'Mobile overlay display',
    'List item creation',
    'Chord visibility control',
    'Font size management',
    'BPM and metadata display'
  ]
};
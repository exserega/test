// ====================================
// 🎵 SONGS OVERLAY MODULE
// ====================================
// Модуль оверлея для выбора песен
// Показывает все песни с фильтрами по категориям
// ====================================

import logger from '../../utils/logger.js';
import { displaySongDetails } from '../../../ui.js';
import * as state from '../../../js/state.js';

// Основные категории (первый уровень)
const MAIN_CATEGORIES = {
    'all': 'Все',
    'fast': 'Быстрые',
    'worship': 'Поклонение'
};

// Подкатегории (второй уровень)
const SUB_CATEGORIES = {
    'vertical': 'Вертикаль',
    'horizontal': 'Горизонталь'
};

class SongsOverlay {
    constructor() {
        this.overlay = null;
        this.songs = [];
        this.filteredSongs = [];
        this.selectedMainCategory = 'all';
        this.selectedSubCategory = null; // null означает "показать все"
        this.isOpen = false;
        
        this.init();
    }
    
    /**
     * Инициализация оверлея
     */
    init() {
        this.createOverlayHTML();
        this.attachEventListeners();
        logger.log('🎵 Songs overlay initialized');
    }
    
    /**
     * Создание HTML структуры оверлея
     */
    createOverlayHTML() {
        const overlayHTML = `
            <div id="songs-overlay" class="songs-overlay">
                <div class="songs-overlay-backdrop"></div>
                <div class="songs-overlay-content">
                    <!-- Шапка -->
                    <div class="songs-overlay-header">
                        <h2 class="songs-overlay-title">Выбор песни</h2>
                        <button class="songs-overlay-close" aria-label="Закрыть">
                            <span class="close-icon"></span>
                        </button>
                    </div>
                    
                    <!-- Фильтры категорий -->
                    <div class="songs-filters-container">
                        <!-- Основные категории -->
                        <div class="songs-category-filters main-filters">
                            ${Object.entries(MAIN_CATEGORIES).map(([key, label]) => `
                                <button class="category-chip main-category ${key === 'all' ? 'active' : ''}" 
                                        data-main-category="${key}">
                                    ${label}
                                </button>
                            `).join('')}
                        </div>
                        
                        <!-- Подкатегории (скрыты изначально) -->
                        <div class="songs-category-filters sub-filters" style="display: none;">
                            ${Object.entries(SUB_CATEGORIES).map(([key, label]) => `
                                <button class="category-chip sub-category" 
                                        data-sub-category="${key}">
                                    ${label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Список песен -->
                    <div class="songs-list-container">
                        <div class="songs-list">
                            <!-- Песни будут добавлены динамически -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
        this.overlay = document.getElementById('songs-overlay');
    }
    
    /**
     * Привязка обработчиков событий
     */
    attachEventListeners() {
        // Закрытие оверлея
        const closeBtn = this.overlay.querySelector('.songs-overlay-close');
        const backdrop = this.overlay.querySelector('.songs-overlay-backdrop');
        
        closeBtn.addEventListener('click', () => this.close());
        backdrop.addEventListener('click', () => this.close());
        
        // Основные категории
        const mainCategoryChips = this.overlay.querySelectorAll('.main-category');
        mainCategoryChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const category = e.target.dataset.mainCategory;
                this.selectMainCategory(category);
            });
        });
        
        // Подкатегории
        const subCategoryChips = this.overlay.querySelectorAll('.sub-category');
        subCategoryChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const subCategory = e.target.dataset.subCategory;
                this.selectSubCategory(subCategory);
            });
        });
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    /**
     * Открытие оверлея
     */
    async open() {
        this.isOpen = true;
        this.overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
        
        // Загружаем песни из state
        this.loadSongs();
        this.renderSongs();
        
        logger.log('🎵 Songs overlay opened');
    }
    
    /**
     * Закрытие оверлея
     */
    close() {
        this.isOpen = false;
        this.overlay.classList.remove('visible');
        document.body.style.overflow = '';
        logger.log('🎵 Songs overlay closed');
    }
    
    /**
     * Загрузка песен из state
     */
    loadSongs() {
        try {
            // Получаем песни из глобального state
            this.songs = state.allSongs || [];
            this.filteredSongs = [...this.songs];
            logger.log(`🎵 Loaded ${this.songs.length} songs from state`);
            
            // Выводим уникальные категории для отладки
            const uniqueSheets = [...new Set(this.songs.map(s => s.sheet))];
            logger.log('📂 Available sheets (categories):', uniqueSheets);
            
            // Проверяем структуру данных первой песни для отладки
            if (this.songs.length > 0) {
                const firstSong = this.songs[0];
                logger.log('🎵 Sample song structure:', {
                    name: firstSong.name,
                    'Оригинальная тональность': firstSong['Оригинальная тональность'],
                    defaultKey: firstSong.defaultKey,
                    BPM: firstSong.BPM,
                    bpm: firstSong.bpm
                });
            }
            
        } catch (error) {
            logger.error('Error loading songs:', error);
            this.songs = [];
            this.filteredSongs = [];
        }
    }
    
    /**
     * Выбор основной категории
     */
    selectMainCategory(category) {
        this.selectedMainCategory = category;
        this.selectedSubCategory = null; // Сбрасываем подкатегорию
        
        // Обновляем активную кнопку
        const chips = this.overlay.querySelectorAll('.main-category');
        chips.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.mainCategory === category);
        });
        
        // Показываем/скрываем подкатегории
        const subFilters = this.overlay.querySelector('.sub-filters');
        if (category === 'fast' || category === 'worship') {
            subFilters.style.display = 'flex';
        } else {
            subFilters.style.display = 'none';
        }
        
        // Убираем активный класс со всех подкатегорий
        const subChips = this.overlay.querySelectorAll('.sub-category');
        subChips.forEach(chip => {
            chip.classList.remove('active');
        });
        
        this.filterSongs();
    }
    
    /**
     * Выбор подкатегории
     */
    selectSubCategory(subCategory) {
        // Если кликнули на уже активную подкатегорию - снимаем выбор
        if (this.selectedSubCategory === subCategory) {
            this.selectedSubCategory = null;
        } else {
            this.selectedSubCategory = subCategory;
        }
        
        // Обновляем активную кнопку
        const chips = this.overlay.querySelectorAll('.sub-category');
        chips.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.subCategory === this.selectedSubCategory);
        });
        
        this.filterSongs();
    }
    
    /**
     * Фильтрация песен по выбранным категориям
     */
    filterSongs() {
        logger.log(`🎵 Filtering: main=${this.selectedMainCategory}, sub=${this.selectedSubCategory}`);
        
        if (this.selectedMainCategory === 'all') {
            this.filteredSongs = [...this.songs];
        } else {
            // Маппинг категорий
            const categoryMap = {
                'fast': {
                    'vertical': ['Быстрые (вертикаль)'],
                    'horizontal': ['Быстрые (горизонталь)']
                },
                'worship': {
                    'vertical': ['Поклонение (вертикаль)'],
                    'horizontal': ['Поклонение (горизонталь)']
                }
            };
            
            // Если подкатегория не выбрана (null), показываем все песни категории
            let targetSheets;
            if (this.selectedSubCategory) {
                targetSheets = categoryMap[this.selectedMainCategory]?.[this.selectedSubCategory] || [];
            } else {
                // Показываем все подкатегории основной категории
                const allSubCategories = categoryMap[this.selectedMainCategory] || {};
                targetSheets = Object.values(allSubCategories).flat();
            }
            logger.log(`🎵 Target sheets: ${targetSheets.join(', ')}`);
            
            this.filteredSongs = this.songs.filter(song => {
                const matches = targetSheets.includes(song.sheet);
                if (matches) {
                    logger.log(`✅ Song "${song.name}" matches filter`);
                }
                return matches;
            });
        }
        
        logger.log(`🎵 Filtered songs count: ${this.filteredSongs.length}`);
        this.renderSongs();
    }
    
    /**
     * Отрисовка списка песен
     */
    renderSongs() {
        const songsList = this.overlay.querySelector('.songs-list');
        
        if (this.filteredSongs.length === 0) {
            songsList.innerHTML = `
                <div class="no-songs-message">
                    Песни не найдены
                </div>
            `;
            return;
        }
        
        songsList.innerHTML = this.filteredSongs.map(song => `
            <div class="song-item" data-song-id="${song.id}">
                <div class="song-info">
                    <span class="song-name">${song.name || 'Без названия'}</span>
                </div>
                <div class="song-meta">
                    <span class="song-key">${song['Оригинальная тональность'] || song.defaultKey || 'C'}</span>
                    <span class="song-bpm">${song.BPM || song.bpm || '—'} BPM</span>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики клика на песни
        const songItems = songsList.querySelectorAll('.song-item');
        songItems.forEach(item => {
            item.addEventListener('click', () => {
                const songId = item.dataset.songId;
                this.selectSong(songId);
            });
        });
    }
    
    /**
     * Выбор песни
     */
    selectSong(songId) {
        const song = this.songs.find(s => s.id === songId);
        if (song) {
            logger.log(`🎵 Selected song: ${song.name}`);
            this.close();
            // Отображаем песню на главном экране
            displaySongDetails(song);
        }
    }
}

// Создаем экземпляр оверлея
const songsOverlay = new SongsOverlay();

// Экспортируем функцию открытия
export function openSongsOverlay() {
    songsOverlay.open();
}

logger.log('🎵 Songs overlay module loaded');
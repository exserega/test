/**
 * @fileoverview Оверлей репертуара пользователя
 * @module RepertoireOverlay
 */

import logger from '../../utils/logger.js';
import { db, collection, getDocs, getDoc, doc, query, orderBy, onSnapshot } from '../../utils/firebase-v8-adapter.js';
import { auth } from '../../../firebase-init.js';
import { displaySongDetails } from '../../../ui.js';

/**
 * Класс для управления оверлеем репертуара
 */
class RepertoireOverlay {
    constructor() {
        this.overlay = null;
        this.isOpen = false;
        this.currentFilter = 'all';
        this.currentKeyFilter = null;
        this.repertoireSongs = [];
        this.filteredSongs = [];
        this.unsubscribe = null;
        this.init();
    }
    
    /**
     * Инициализация оверлея
     */
    init() {
        this.createOverlayHTML();
        this.attachEventListeners();
        this.loadUserRepertoire();
    }
    
    /**
     * Создание HTML структуры оверлея
     */
    createOverlayHTML() {
        const overlayHTML = `
            <div id="repertoire-overlay" class="songs-overlay">
                <div class="songs-overlay-backdrop"></div>
                <div class="songs-overlay-content">
                    <!-- Шапка -->
                    <div class="songs-overlay-header">
                        <h2 class="songs-overlay-title">Мой репертуар</h2>
                        <button class="songs-overlay-close" aria-label="Закрыть">
                            <span class="close-icon"></span>
                        </button>
                    </div>
                    
                    <!-- Фильтры категорий -->
                    <div class="songs-filters-container">
                        <!-- Основные фильтры -->
                        <div class="songs-category-filters main-filters">
                            <button class="category-chip active" data-main-filter="all">
                                Все
                            </button>
                            <button class="category-chip" data-main-filter="Быстрые">
                                Быстрые
                            </button>
                            <button class="category-chip" data-main-filter="Поклонение">
                                Поклонение
                            </button>
                            <button class="category-chip" data-main-filter="tonality">
                                Тональность
                            </button>
                        </div>
                        
                        <!-- Подфильтры категорий (скрыты по умолчанию) -->
                        <div class="songs-category-filters sub-filters" style="display: none;">
                            <!-- Будут добавлены динамически -->
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
        this.overlay = document.getElementById('repertoire-overlay');
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
        
        // Основные фильтры
        const mainFilterButtons = this.overlay.querySelectorAll('[data-main-filter]');
        mainFilterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.mainFilter;
                this.selectMainFilter(filter);
            });
        });
        
        // Закрытие по Escape
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
    }
    
    /**
     * Загрузка репертуара пользователя
     */
    async loadUserRepertoire() {
        const user = auth.currentUser;
        if (!user) {
            logger.log('Пользователь не авторизован');
            return;
        }
        
        logger.log(`🎤 Загружаем репертуар для пользователя: ${user.uid}`);
        
        // Проверка документа пользователя (временно отключена из-за проблем с кешем)
        // try {
        //     const userDocRef = doc(db, 'users', user.uid);
        //     const userDoc = await getDoc(userDocRef);
        //     if (userDoc.exists) {
        //         logger.log('📊 Документ пользователя найден:', userDoc.data());
        //     }
        // } catch (error) {
        //     logger.warn('⚠️ Ошибка проверки документа пользователя:', error);
        // }
        
        // В Firebase v8 нужно использовать правильный путь к подколлекции
        const userDocRef = doc(db, 'users', user.uid);
        const repertoireRef = userDocRef.collection('repertoire');
        const q = repertoireRef.orderBy('name');
        
        // Подписываемся на изменения
        this.unsubscribe = onSnapshot(q, (snapshot) => {
            this.repertoireSongs = [];
            logger.log(`📊 Получено документов: ${snapshot.size}`);
            
            snapshot.forEach(doc => {
                const data = doc.data();
                logger.log(`📄 Документ ${doc.id}:`, data);
                
                // Фильтруем только песни (должны иметь preferredKey или category)
                if (data.preferredKey || data.category || data.BPM) {
                    // Это песня
                    this.repertoireSongs.push({
                        id: doc.id,
                        ...data
                    });
                } else {
                    // Это не песня, пропускаем
                    logger.warn(`⚠️ Документ ${doc.id} не является песней, пропускаем:`, data);
                }
            });
            
            logger.log(`✅ Загружено ${this.repertoireSongs.length} песен из репертуара`);
            this.filterSongs();
            this.renderSongs();
        }, (error) => {
            logger.error('❌ Ошибка загрузки репертуара:', error);
        });
    }
    
    /**
     * Выбор основного фильтра
     */
    selectMainFilter(filter) {
        this.currentFilter = filter;
        
        // Обновляем активную кнопку
        const mainButtons = this.overlay.querySelectorAll('[data-main-filter]');
        mainButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mainFilter === filter);
        });
        
        // Управляем подфильтрами
        const subFilters = this.overlay.querySelector('.sub-filters');
        
        if (filter === 'tonality') {
            // Показываем тональности из репертуара
            const tonalities = [...new Set(this.repertoireSongs.map(s => s.preferredKey).filter(Boolean))].sort();
            
            if (tonalities.length > 0) {
                subFilters.innerHTML = tonalities.map(key => `
                    <button class="category-chip sub-category ${this.currentKeyFilter === key ? 'active' : ''}" data-key-filter="${key}">
                        ${key}
                    </button>
                `).join('');
                
                // Добавляем обработчики для тональностей
                subFilters.querySelectorAll('[data-key-filter]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.selectKeyFilter(e.target.dataset.keyFilter);
                    });
                });
                
                subFilters.style.display = 'flex';
            } else {
                subFilters.style.display = 'none';
            }
        } else if (filter === 'Быстрые' || filter === 'Поклонение') {
            // Показываем подфильтры Вертикаль/Горизонталь
            subFilters.innerHTML = `
                <button class="category-chip sub-category" data-sub-filter="вертикаль">
                    Вертикаль
                </button>
                <button class="category-chip sub-category" data-sub-filter="горизонталь">
                    Горизонталь
                </button>
            `;
            
            // Добавляем обработчики для подфильтров
            subFilters.querySelectorAll('[data-sub-filter]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Обновляем активность
                    subFilters.querySelectorAll('[data-sub-filter]').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    this.filterSongs();
                    this.renderSongs();
                });
            });
            
            subFilters.style.display = 'flex';
        } else {
            // Скрываем подфильтры для "Все"
            subFilters.style.display = 'none';
            this.currentKeyFilter = null;
        }
        
        this.filterSongs();
        this.renderSongs();
    }
    
    /**
     * Выбор фильтра тональности
     */
    selectKeyFilter(key) {
        this.currentKeyFilter = key;
        
        // Обновляем активную кнопку
        const keyButtons = this.overlay.querySelectorAll('[data-key-filter]');
        keyButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.keyFilter === key);
        });
        
        this.filterSongs();
        this.renderSongs();
    }
    
    /**
     * Фильтрация песен
     */
    filterSongs() {
        this.filteredSongs = [...this.repertoireSongs];
        
        // Фильтрация по основной категории
        if (this.currentFilter === 'Быстрые' || this.currentFilter === 'Поклонение') {
            this.filteredSongs = this.filteredSongs.filter(song => 
                song.category?.includes(this.currentFilter)
            );
            
            // Дополнительная фильтрация по подкатегории
            const activeSubFilter = this.overlay.querySelector('.sub-filters [data-sub-filter].active');
            if (activeSubFilter) {
                const subFilter = activeSubFilter.dataset.subFilter;
                this.filteredSongs = this.filteredSongs.filter(song => 
                    song.category?.toLowerCase().includes(subFilter)
                );
            }
        }
        
        // Фильтрация по тональности
        if (this.currentFilter === 'tonality' && this.currentKeyFilter) {
            this.filteredSongs = this.filteredSongs.filter(song => 
                song.preferredKey === this.currentKeyFilter
            );
        }
        
        // Сортировка по имени
        this.filteredSongs.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }
    
    /**
     * Отрисовка списка песен
     */
    renderSongs() {
        const songsList = this.overlay.querySelector('.songs-list');
        
        if (this.filteredSongs.length === 0) {
            songsList.innerHTML = `
                <div class="empty-message">
                    ${this.repertoireSongs.length === 0 
                        ? 'Ваш репертуар пуст' 
                        : 'Нет песен по выбранным фильтрам'}
                </div>
            `;
            return;
        }
        
        logger.log('🎨 Отрисовка песен:', this.filteredSongs);
        
        songsList.innerHTML = this.filteredSongs.map(song => {
            // Проверяем наличие обязательных полей
            const songName = song.name || `Песня ${song.id}`;
            const songId = song.id || 'unknown';
            
            return `
                <div class="song-item" data-song-id="${songId}">
                    <div class="song-info">
                        <span class="song-name">${songName}</span>
                    </div>
                    <div class="song-meta">
                        ${song.preferredKey ? `<span class="song-key">${song.preferredKey}</span>` : ''}
                        ${(song.BPM || song.bpm) ? `<span class="song-bpm">${song.BPM || song.bpm} BPM</span>` : ''}
                    </div>
                    <button class="song-delete-btn" data-song-id="${songId}" title="Удалить из репертуара">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики кликов
        const songItems = songsList.querySelectorAll('.song-item');
        songItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Игнорируем клик по кнопке удаления
                if (e.target.closest('.song-delete-btn')) return;
                
                const songId = item.dataset.songId;
                const song = this.filteredSongs.find(s => s.id === songId);
                if (song) {
                    this.selectSong(song);
                }
            });
        });
        
        // Добавляем обработчики для кнопок удаления
        const deleteButtons = songsList.querySelectorAll('.song-delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const songId = btn.dataset.songId;
                const song = this.filteredSongs.find(s => s.id === songId);
                
                if (song && confirm(`Удалить песню "${song.name}" из репертуара?`)) {
                    try {
                        const { removeFromUserRepertoire } = await import('../../api/userRepertoire.js');
                        await removeFromUserRepertoire(songId);
                        
                        // Обновляем отображение
                        await this.loadUserRepertoire();
                        this.filterSongs();
                        this.renderSongs();
                        
                        // Показываем уведомление
                        if (window.showNotification) {
                            window.showNotification(`🎤 "${song.name}" удалена из репертуара`, 'info');
                        }
                    } catch (error) {
                        logger.error('Ошибка удаления песни:', error);
                        alert('Ошибка удаления песни');
                    }
                }
            });
        });
    }
    
    /**
     * Выбор песни
     */
    async selectSong(song) {
        logger.log('Выбрана песня из репертуара:', song.name);
        
        try {
            // Получаем полные данные песни из общей коллекции
            const { getSongById } = await import('../../api/index.js');
            const fullSongData = await getSongById(song.id);
            
            if (fullSongData) {
                // Открываем песню в основном окне с сохраненной тональностью
                if (typeof displaySongDetails === 'function') {
                    displaySongDetails(fullSongData, song.preferredKey);
                }
                
                // Закрываем оверлей
                this.close();
            } else {
                logger.error('Песня не найдена в общей коллекции:', song.id);
                alert('Песня не найдена');
            }
        } catch (error) {
            logger.error('Ошибка загрузки песни:', error);
            alert('Ошибка загрузки песни');
        }
    }
    
    /**
     * Открытие оверлея
     */
    open() {
        if (!this.overlay) return;
        
        this.overlay.classList.add('visible');
        this.isOpen = true;
        document.addEventListener('keydown', this.escapeHandler);
        
        // Обновляем данные при открытии
        this.filterSongs();
        this.renderSongs();
    }
    
    /**
     * Закрытие оверлея
     */
    close() {
        if (!this.overlay) return;
        
        this.overlay.classList.remove('visible');
        this.isOpen = false;
        document.removeEventListener('keydown', this.escapeHandler);
    }
    
    /**
     * Уничтожение оверлея
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        if (this.overlay) {
            this.overlay.remove();
        }
        
        document.removeEventListener('keydown', this.escapeHandler);
    }
}

// Создаем и экспортируем экземпляр
let repertoireOverlayInstance = null;

export function initRepertoireOverlay() {
    if (!repertoireOverlayInstance) {
        repertoireOverlayInstance = new RepertoireOverlay();
    }
    return repertoireOverlayInstance;
}

export function openRepertoireOverlay() {
    if (!repertoireOverlayInstance) {
        initRepertoireOverlay();
    }
    repertoireOverlayInstance.open();
}

export function closeRepertoireOverlay() {
    if (repertoireOverlayInstance) {
        repertoireOverlayInstance.close();
    }
}
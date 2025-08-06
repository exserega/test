/**
 * Модуль управления overlay выбора сет-листа
 */

import { loadSetlists, createSetlist, addSongToSetlist } from '../api/index.js';

console.log('📋 [SetlistSelector] Module loading...');

class SetlistSelector {
    constructor() {
        // DOM элементы
        this.overlay = document.getElementById('setlist-select-overlay');
        this.songNameDisplay = document.getElementById('adding-song-name');
        this.songKeyDisplay = document.getElementById('adding-song-key');
        this.setlistsGrid = document.getElementById('setlists-grid');
        this.newNameInput = document.getElementById('new-setlist-name-modal');
        this.createButton = document.getElementById('create-and-add');
        this.closeButton = document.getElementById('close-setlist-select');
        
        // Состояние
        this.currentSong = null;
        this.selectedSetlistId = null;
        this.setlists = [];
        
        // Инициализация
        this.init();
        
        // Проверяем наличие элементов
        console.log('📋 [SetlistSelector] Constructor - Key display element:', this.songKeyDisplay);
        if (!this.songKeyDisplay) {
            console.error('❌ [SetlistSelector] Key display element not found on init!');
        }
    }
    
    init() {
        // Обработчики событий
        this.createButton?.addEventListener('click', () => this.handleCreateNew());
        this.closeButton?.addEventListener('click', () => this.close());
        
        // Закрытие по клику на фон
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay?.classList.contains('visible')) {
                this.close();
            }
        });
        
        // Обработчик изменения в поле нового сет-листа
        this.newNameInput?.addEventListener('input', () => {
            this.createButton.disabled = !this.newNameInput.value.trim();
        });
        
        // Enter в поле ввода
        this.newNameInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.createButton.disabled) {
                this.handleCreateNew();
            }
        });
        
        // Клик по сет-листу
        this.setlistsGrid?.addEventListener('click', (e) => {
            const item = e.target.closest('.setlist-item');
            if (item) {
                this.selectSetlist(item.dataset.id);
            }
        });
    }
    
    /**
     * Открывает overlay для выбора сет-листа
     * @param {Object} song - Объект песни для добавления
     * @param {string} key - Выбранная тональность
     */
    async open(song, key) {
        if (!song) {
            console.error('No song provided to SetlistSelector');
            return;
        }
        
        this.currentSong = song;
        this.currentSong.selectedKey = key || song.keys?.[0] || 'C';
        
        console.log('📋 [SetlistSelector] Opening with key:', this.currentSong.selectedKey);
        
        // Отображаем информацию о песне
        if (this.songNameDisplay) {
            this.songNameDisplay.textContent = song.name || 'Без названия';
        }
        
        if (this.songKeyDisplay) {
            console.log('📋 [SetlistSelector] Key display element:', this.songKeyDisplay);
            console.log('📋 [SetlistSelector] Key display HTML before:', this.songKeyDisplay.outerHTML);
            console.log('📋 [SetlistSelector] Setting key value:', this.currentSong.selectedKey);
            this.songKeyDisplay.textContent = this.currentSong.selectedKey;
            console.log('📋 [SetlistSelector] Key display HTML after:', this.songKeyDisplay.outerHTML);
            // Убедимся что элемент видим
            this.songKeyDisplay.style.display = 'inline-block';
            this.songKeyDisplay.style.visibility = 'visible';
        } else {
            console.error('❌ [SetlistSelector] Key display element not found!');
        }
        
        // Сбрасываем состояние
        this.selectedSetlistId = null;
        if (this.newNameInput) {
            this.newNameInput.value = '';
            this.createButton.disabled = true;
        }
        
        // Показываем overlay
        this.overlay?.classList.add('visible');
        
        // Загружаем сет-листы
        await this.loadSetlists();
    }
    
    /**
     * Закрывает overlay
     */
    close() {
        this.overlay?.classList.remove('visible');
        this.currentSong = null;
        this.selectedSetlistId = null;
        
        // Очищаем форму
        if (this.newNameInput) {
            this.newNameInput.value = '';
            this.createButton.disabled = true;
        }
        
        // Убираем выделение с сет-листов
        if (this.setlistsGrid) {
            this.setlistsGrid.querySelectorAll('.setlist-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
    }
    
    /**
     * Загружает список сет-листов
     */
    async loadSetlists() {
        try {
            // Показываем загрузку
            if (this.setlistsGrid) {
                this.setlistsGrid.innerHTML = '<div class="loading-text">Загрузка...</div>';
            }
            
            // Загружаем сет-листы
            this.setlists = await loadSetlists();
            
            // Обновляем сетку
            if (this.setlistsGrid) {
                this.setlistsGrid.innerHTML = '';
                
                if (this.setlists.length === 0) {
                    this.setlistsGrid.innerHTML = '<div class="empty-text">Нет сет-листов</div>';
                } else {
                    this.setlists.forEach(setlist => {
                        const item = document.createElement('div');
                        item.className = 'setlist-item';
                        item.dataset.id = setlist.id;
                        
                        const songsCount = setlist.songs?.length || 0;
                        item.innerHTML = `
                            <span class="setlist-name">${setlist.name}</span>
                            <span class="setlist-songs-count">${songsCount} песен</span>
                        `;
                        
                        this.setlistsGrid.appendChild(item);
                    });
                }
            }
            
        } catch (error) {
            console.error('Error loading setlists:', error);
            if (this.setlistsGrid) {
                this.setlistsGrid.innerHTML = '<div class="error-text">Ошибка загрузки</div>';
            }
        }
    }
    
    /**
     * Выбирает сет-лист
     */
    selectSetlist(setlistId) {
        // Убираем выделение со всех
        this.setlistsGrid.querySelectorAll('.setlist-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Добавляем выделение выбранному
        const selectedItem = this.setlistsGrid.querySelector(`[data-id="${setlistId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            this.selectedSetlistId = setlistId;
            
            // Сразу добавляем песню
            this.addToSetlist(setlistId);
        }
    }
    
    /**
     * Добавляет песню в выбранный сет-лист
     */
    async addToSetlist(setlistId) {
        if (!this.currentSong || !setlistId) return;
        
        try {
            // Добавляем песню с выбранной тональностью
            console.log('📋 [SetlistSelector] Adding song:', this.currentSong.id, 'to setlist:', setlistId, 'in key:', this.currentSong.selectedKey);
            
            await addSongToSetlist(setlistId, this.currentSong.id, this.currentSong.selectedKey);
            
            // Показываем уведомление
            this.showNotification('✅ Песня успешно добавлена в сет-лист!', 'success');
            
            // Если текущий сет-лист совпадает с тем, куда добавляем - обновляем сразу
            if (window.state?.currentSetlistId === setlistId) {
                console.log('📋 [SetlistSelector] Current setlist was updated, refreshing display');
                console.log('📋 [SetlistSelector] currentSetlistId:', window.state?.currentSetlistId);
                console.log('📋 [SetlistSelector] setlistId:', setlistId);
                
                // Делаем небольшую задержку чтобы данные успели сохраниться
                setTimeout(async () => {
                    try {
                        // Загружаем обновленные данные
                        const setlists = await loadSetlists();
                        const updatedSetlist = setlists.find(s => s.id === setlistId);
                        
                        if (updatedSetlist && window.handleSetlistSelect) {
                            console.log('📋 [SetlistSelector] Calling handleSetlistSelect with updated data');
                            console.log('📋 [SetlistSelector] Updated setlist songs count:', updatedSetlist.songs?.length);
                            // Вызываем handleSetlistSelect для полного обновления UI
                            window.handleSetlistSelect(updatedSetlist);
                        }
                    } catch (error) {
                        console.error('Error updating setlist display:', error);
                    }
                }, 300); // Увеличиваем задержку для надежности
            }
            
            // Отправляем событие для обновления счетчиков и других компонентов
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('setlist-updated', { 
                    detail: { setlistId } 
                }));
            }, 500);
            
            // Закрываем overlay
            this.close();
            
        } catch (error) {
            console.error('Error adding song to setlist:', error);
            this.showNotification('❌ Ошибка при добавлении песни', 'error');
        }
    }
    
    /**
     * Обрабатывает создание нового сет-листа и добавление песни
     */
    async handleCreateNew() {
        if (!this.currentSong || !this.newNameInput?.value.trim()) return;
        
        try {
            // Блокируем кнопку
            if (this.createButton) {
                this.createButton.disabled = true;
                this.createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
            }
            
            const newName = this.newNameInput.value.trim();
            console.log('Creating new setlist:', newName);
            
            // Создаем новый сет-лист
            const setlistId = await createSetlist(newName);
            console.log('Created setlist with ID:', setlistId);
            
            // Добавляем песню
            await this.addToSetlist(setlistId);
            
        } catch (error) {
            console.error('Error creating setlist:', error);
            this.showNotification('❌ Ошибка при создании сет-листа', 'error');
        } finally {
            // Восстанавливаем кнопку
            if (this.createButton) {
                this.createButton.innerHTML = '<i class="fas fa-plus"></i> Создать';
                this.createButton.disabled = !this.newNameInput?.value.trim();
            }
        }
    }
    
    /**
     * Показывает уведомление
     */
    showNotification(message, type = 'info') {
        // Используем глобальную функцию уведомлений если она есть
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Иначе простой alert
        alert(message);
    }
}

// Создаем экземпляр
const setlistSelector = new SetlistSelector();
console.log('📋 [SetlistSelector] Instance created');

// Экспортируем функцию открытия
export function openSetlistSelector(song, key) {
    console.log('📋 [SetlistSelector] openSetlistSelector called with song:', song?.name, 'key:', key);
    return setlistSelector.open(song, key);
}

// Экспортируем для глобального доступа
window.openSetlistSelector = openSetlistSelector;
console.log('📋 [SetlistSelector] Module initialized, window.openSetlistSelector =', typeof window.openSetlistSelector);
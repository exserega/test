/**
 * Модуль пакетной обработки поиска
 * Оптимизирован для песен прославления и поклонения
 */

/**
 * Ключевые слова для песен прославления (для smart-фильтрации)
 */
const WORSHIP_KEYWORDS = {
    // Имена Бога
    divine: ['бог', 'господь', 'иисус', 'христос', 'дух святой', 'яхве', 'альфа', 'омега', 'царь', 'лев иудин'],
    
    // Слова поклонения  
    worship: ['слава', 'хвала', 'прославляем', 'славлю', 'достоин', 'святой', 'прекрасен', 'величие'],
    
    // Духовные понятия
    spiritual: ['любовь', 'благодать', 'победа', 'верность', 'спасение', 'сила', 'власть', 'престол'],
    
    // Эмоции поклонения
    emotions: ['трепет', 'восхищение', 'верю', 'доверяю', 'надеюсь', 'благодарю', 'спасибо'],
    
    // Природные образы (часто в прославлении)
    nature: ['свет', 'ветер', 'небо', 'звезды', 'море', 'гора', 'река', 'огонь'],
    
    // Действия поклонения
    actions: ['пою', 'поет', 'славь', 'возвысят', 'наполняй', 'двигайся', 'царствуй', 'используй']
};

/**
 * Создает нормализованный словарь ключевых слов
 */
function createWorshipDictionary() {
    const dictionary = new Set();
    
    Object.values(WORSHIP_KEYWORDS).forEach(category => {
        category.forEach(word => {
            dictionary.add(word.toLowerCase());
            
            // Добавляем варианты склонений для русского языка
            if (word.endsWith('ь') || word.endsWith('й')) {
                dictionary.add(word.slice(0, -1) + 'я');
                dictionary.add(word.slice(0, -1) + 'е');
            }
            if (word.endsWith('а')) {
                dictionary.add(word.slice(0, -1) + 'ы');
                dictionary.add(word.slice(0, -1) + 'е');
            }
            if (word.endsWith('о')) {
                dictionary.add(word.slice(0, -1) + 'а');
            }
        });
    });
    
    return dictionary;
}

/**
 * Глобальный словарь поклонения
 */
const WORSHIP_DICTIONARY = createWorshipDictionary();

/**
 * Batch-процессор для поиска
 */
class BatchProcessor {
    constructor(batchSize = 50) {
        this.batchSize = batchSize;
        this.processingQueue = [];
        this.isProcessing = false;
        this.results = [];
        this.callbacks = [];
        this.stats = {
            totalProcessed: 0,
            batchesProcessed: 0,
            averageTime: 0,
            filtered: 0,
            prefiltered: 0
        };
    }
    
    /**
     * Умная предварительная фильтрация для песен прославления
     */
    smartPrefilter(songs, query) {
        const normalizedQuery = query.toLowerCase().trim();
        const queryWords = normalizedQuery.split(/\s+/);
        
        // Проверяем, есть ли в запросе слова поклонения
        const hasWorshipWords = queryWords.some(word => 
            WORSHIP_DICTIONARY.has(word) || 
            Array.from(WORSHIP_DICTIONARY).some(worshipWord => 
                worshipWord.includes(word) || word.includes(worshipWord)
            )
        );
        
        // Если запрос содержит слова поклонения, фильтруем более агрессивно
        if (hasWorshipWords) {
            const filtered = songs.filter(song => {
                const title = (song.name || '').toLowerCase();
                const lyrics = song.hasWebEdits 
                    ? (song['Текст и аккорды (edited)'] || '') 
                    : (song['Текст и аккорды'] || '');
                const cleanLyrics = this.cleanLyricsForSearch(lyrics).toLowerCase();
                
                // Быстрая проверка на наличие хотя бы одного слова из запроса
                return queryWords.some(word => 
                    title.includes(word) || cleanLyrics.includes(word)
                );
            });
            
            this.stats.prefiltered += songs.length - filtered.length;
            return filtered;
        }
        
        // Для обычных запросов возвращаем все песни
        return songs;
    }
    
    /**
     * Очистка текста песни для поиска (из script.js)
     */
    cleanLyricsForSearch(text) {
        if (!text) return '';
        
        return text
            .replace(/\[.*?\]/g, '') // убираем аккорды
            .replace(/\n\s*\n/g, '\n') // убираем пустые строки
            .replace(/[^\w\sа-яё]/gi, ' ') // только буквы и пробелы
            .replace(/\s+/g, ' ') // нормализуем пробелы
            .trim();
    }
    
    /**
     * Разбивает массив на батчи
     */
    createBatches(items, size = this.batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += size) {
            batches.push(items.slice(i, i + size));
        }
        return batches;
    }
    
    /**
     * Обрабатывает один батч
     */
    async processBatch(batch, searchFunction, query, options = {}) {
        const startTime = performance.now();
        
        try {
            const results = [];
            
            for (const item of batch) {
                const result = await searchFunction(query, [item], options);
                if (result && result.length > 0) {
                    results.push(...result);
                }
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.updateStats(batch.length, duration);
            
            return results;
        } catch (error) {
            console.error('❌ Ошибка в batch обработке:', error);
            return [];
        }
    }
    
    /**
     * Основная функция batch поиска
     */
    async batchSearch(songs, searchFunction, query, options = {}) {
        if (!songs || songs.length === 0) return [];
        
        const startTime = performance.now();
        
        // Умная предварительная фильтрация
        const prefiltered = this.smartPrefilter(songs, query);
        
        // Создаем батчи
        const batches = this.createBatches(prefiltered);
        
        console.log(`🔍 Batch поиск: ${prefiltered.length} песен в ${batches.length} батчах`);
        
        const allResults = [];
        
        // Обрабатываем батчи параллельно (но ограниченно)
        const concurrency = options.concurrency || 3;
        for (let i = 0; i < batches.length; i += concurrency) {
            const currentBatches = batches.slice(i, i + concurrency);
            
            const batchPromises = currentBatches.map(batch => 
                this.processBatch(batch, searchFunction, query, options)
            );
            
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(results => allResults.push(...results));
            
            // Небольшая пауза между группами батчей для UI responsiveness
            if (i + concurrency < batches.length) {
                await this.sleep(1);
            }
        }
        
        const endTime = performance.now();
        console.log(`⚡ Batch поиск завершен: ${endTime - startTime}ms, найдено ${allResults.length} результатов`);
        
        return allResults;
    }
    
    /**
     * Асинхронная пауза
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Обновление статистики
     */
    updateStats(processed, duration) {
        this.stats.totalProcessed += processed;
        this.stats.batchesProcessed++;
        
        // Обновляем среднее время
        const totalTime = this.stats.averageTime * (this.stats.batchesProcessed - 1) + duration;
        this.stats.averageTime = totalTime / this.stats.batchesProcessed;
    }
    
    /**
     * Получить статистику обработки
     */
    getStats() {
        return {
            ...this.stats,
            efficiency: this.stats.prefiltered > 0 
                ? ((this.stats.prefiltered / this.stats.totalProcessed) * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }
    
    /**
     * Сбросить статистику
     */
    resetStats() {
        this.stats = {
            totalProcessed: 0,
            batchesProcessed: 0,
            averageTime: 0,
            filtered: 0,
            prefiltered: 0
        };
    }
    
    /**
     * Оптимизированный поиск для конкретной категории
     */
    searchByCategory(songs, query, category) {
        if (!category) return songs;
        
        const filtered = songs.filter(song => {
            const songCategory = (song.sheet || '').toLowerCase();
            return songCategory.includes(category.toLowerCase());
        });
        
        console.log(`📂 Фильтр по категории "${category}": ${filtered.length} из ${songs.length}`);
        return filtered;
    }
    
    /**
     * Поиск популярных/избранных песен (priority search)
     */
    prioritySearch(songs, query) {
        // Приоритетные слова для песен прославления
        const priorityWords = [
            'иисус', 'бог', 'господь', 'слава', 'святой', 'прекрасен', 
            'достоин', 'царь', 'любовь', 'благодать'
        ];
        
        const queryLower = query.toLowerCase();
        const hasPriorityWord = priorityWords.some(word => queryLower.includes(word));
        
        if (hasPriorityWord) {
            // Для приоритетных запросов ищем в самых популярных песнях
            const prioritySongs = songs.filter(song => {
                const title = (song.name || '').toLowerCase();
                return priorityWords.some(word => title.includes(word));
            });
            
            console.log(`⭐ Priority поиск: ${prioritySongs.length} приоритетных песен`);
            return prioritySongs;
        }
        
        return songs;
    }
}

// Глобальный экземпляр batch-процессора
const globalBatchProcessor = new BatchProcessor(30); // Меньший размер для отзывчивости

/**
 * Публичный API для batch поиска
 */
async function performBatchSearch(songs, searchFunction, query, options = {}) {
    return await globalBatchProcessor.batchSearch(songs, searchFunction, query, options);
}

/**
 * Получить статистику batch обработки
 */
function getBatchStats() {
    return globalBatchProcessor.getStats();
}

/**
 * Очистить статистику batch обработки
 */
function clearBatchStats() {
    globalBatchProcessor.resetStats();
}

/**
 * Поиск по категории
 */
function searchByCategory(songs, query, category) {
    return globalBatchProcessor.searchByCategory(songs, query, category);
}

/**
 * Приоритетный поиск
 */
function prioritySearch(songs, query) {
    return globalBatchProcessor.prioritySearch(songs, query);
}

// Экспорт
export {
    BatchProcessor,
    performBatchSearch,
    getBatchStats,
    clearBatchStats,
    searchByCategory,
    prioritySearch,
    WORSHIP_KEYWORDS,
    WORSHIP_DICTIONARY
};
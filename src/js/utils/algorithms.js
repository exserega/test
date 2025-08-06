/**
 * Оптимизированные алгоритмы для поиска
 * Фокус на производительности и экономии памяти
 */

/**
 * ОПТИМИЗИРОВАННЫЙ алгоритм Левенштейна с экономией памяти O(min(m,n))
 * Использует только две строки вместо полной матрицы
 * @param {string} str1 - Первая строка
 * @param {string} str2 - Вторая строка
 * @returns {number} Расстояние Левенштейна
 */
function optimizedLevenshteinDistance(str1, str2) {
    if (!str1 || !str2) {
        return Math.max(str1?.length || 0, str2?.length || 0);
    }
    
    // Оптимизация: делаем str1 более короткой строкой
    if (str1.length > str2.length) {
        [str1, str2] = [str2, str1];
    }
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Быстрые проверки
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    if (str1 === str2) return 0;
    
    // Используем только две строки вместо полной матрицы
    // Экономия памяти: O(n²) → O(min(m,n))
    let previousRow = new Array(len1 + 1);
    let currentRow = new Array(len1 + 1);
    
    // Инициализация первой строки
    for (let i = 0; i <= len1; i++) {
        previousRow[i] = i;
    }
    
    // Вычисление расстояния по строкам
    for (let j = 1; j <= len2; j++) {
        currentRow[0] = j;
        
        for (let i = 1; i <= len1; i++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            
            currentRow[i] = Math.min(
                previousRow[i] + 1,        // удаление
                currentRow[i - 1] + 1,     // вставка
                previousRow[i - 1] + cost  // замена
            );
        }
        
        // Меняем строки местами (без копирования массивов)
        [previousRow, currentRow] = [currentRow, previousRow];
    }
    
    return previousRow[len1];
}

/**
 * БЫСТРЫЙ алгоритм схожести с ранним прерыванием
 * Оптимизирован для случаев, когда нужен только факт схожести
 * @param {string} str1 - Первая строка
 * @param {string} str2 - Вторая строка
 * @param {number} threshold - Порог схожести (0-1)
 * @returns {number} Схожесть (0-1) или -1 если ниже порога
 */
function fastSimilarityCheck(str1, str2, threshold = 0.7) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const maxLen = Math.max(str1.length, str2.length);
    const minLen = Math.min(str1.length, str2.length);
    
    // Быстрая проверка: если разница в длине слишком большая
    const lengthSimilarity = minLen / maxLen;
    if (lengthSimilarity < threshold * 0.5) {
        return -1; // Точно ниже порога
    }
    
    // Быстрая проверка: общие символы
    const commonChars = countCommonCharacters(str1, str2);
    const charSimilarity = (commonChars * 2) / (str1.length + str2.length);
    
    if (charSimilarity < threshold * 0.7) {
        return -1; // Вероятно ниже порога
    }
    
    // Полное вычисление только если есть шанс
    const distance = optimizedLevenshteinDistance(str1, str2);
    const similarity = 1 - (distance / maxLen);
    
    return similarity >= threshold ? similarity : -1;
}

/**
 * Подсчет общих символов между строками (быстро)
 * @param {string} str1 - Первая строка
 * @param {string} str2 - Вторая строка
 * @returns {number} Количество общих символов
 */
function countCommonCharacters(str1, str2) {
    const chars1 = new Map();
    const chars2 = new Map();
    
    // Подсчет символов в первой строке
    for (const char of str1) {
        chars1.set(char, (chars1.get(char) || 0) + 1);
    }
    
    // Подсчет символов во второй строке
    for (const char of str2) {
        chars2.set(char, (chars2.get(char) || 0) + 1);
    }
    
    // Подсчет общих символов
    let common = 0;
    for (const [char, count1] of chars1) {
        const count2 = chars2.get(char) || 0;
        common += Math.min(count1, count2);
    }
    
    return common;
}

/**
 * КЭШИРОВАННЫЙ вычислитель схожести
 * Кэширует результаты для избежания повторных вычислений
 */
class SimilarityCache {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
    }
    
    /**
     * Получить схожесть с кэшированием
     */
    getSimilarity(str1, str2, threshold = 0.7) {
        // Создаем ключ кэша (порядок не важен)
        const key = str1.length <= str2.length 
            ? `${str1}|${str2}|${threshold}` 
            : `${str2}|${str1}|${threshold}`;
        
        if (this.cache.has(key)) {
            this.hits++;
            return this.cache.get(key);
        }
        
        this.misses++;
        const result = fastSimilarityCheck(str1, str2, threshold);
        
        // Управление размером кэша
        if (this.cache.size >= this.maxSize) {
            // Удаляем 20% самых старых записей
            const toDelete = Math.floor(this.maxSize * 0.2);
            const entries = Array.from(this.cache.keys());
            for (let i = 0; i < toDelete; i++) {
                this.cache.delete(entries[i]);
            }
        }
        
        this.cache.set(key, result);
        return result;
    }
    
    /**
     * Получить статистику кэша
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%',
            cacheSize: this.cache.size,
            maxSize: this.maxSize
        };
    }
    
    /**
     * Очистить кэш
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
}

// Глобальный экземпляр кэша
const globalSimilarityCache = new SimilarityCache(2000);

/**
 * Публичный API для кэшированного вычисления схожести
 */
function cachedSimilarity(str1, str2, threshold = 0.7) {
    return globalSimilarityCache.getSimilarity(str1, str2, threshold);
}

/**
 * Получить статистику производительности
 */
function getPerformanceStats() {
    return globalSimilarityCache.getStats();
}

/**
 * Очистить кэш схожести
 */
function clearSimilarityCache() {
    globalSimilarityCache.clear();
}

// Экспорт оптимизированных функций
export {
    optimizedLevenshteinDistance,
    fastSimilarityCheck,
    countCommonCharacters,
    cachedSimilarity,
    getPerformanceStats,
    clearSimilarityCache,
    SimilarityCache
};
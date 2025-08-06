/**
 * Модуль для нечеткого (фаззи) поиска
 * Позволяет находить текст с опечатками и неточными совпадениями
 */

import { 
    optimizedLevenshteinDistance, 
    cachedSimilarity,
    getPerformanceStats 
} from './algorithms.js';

/**
 * Вычисляет расстояние Левенштейна между двумя строками
 * ОПТИМИЗИРОВАННАЯ версия с экономией памяти
 * @param {string} str1 - Первая строка
 * @param {string} str2 - Вторая строка
 * @returns {number} Расстояние Левенштейна
 */
function levenshteinDistance(str1, str2) {
    // Используем оптимизированный алгоритм
    return optimizedLevenshteinDistance(str1, str2);
}

/**
 * Вычисляет процент схожести между двумя строками
 * ОПТИМИЗИРОВАННАЯ версия с кэшированием
 * @param {string} str1 - Первая строка
 * @param {string} str2 - Вторая строка
 * @param {number} threshold - Порог схожести для оптимизации (по умолчанию 0.0)
 * @returns {number} Процент схожести (0-1)
 */
function calculateSimilarity(str1, str2, threshold = 0.0) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    // Используем кэшированную версию с ранним прерыванием
    const result = cachedSimilarity(str1, str2, threshold);
    
    // Если результат отрицательный, значит ниже порога
    if (result < 0) {
        // Для обратной совместимости все равно вычисляем точное значение
        const maxLength = Math.max(str1.length, str2.length);
        const distance = optimizedLevenshteinDistance(str1, str2);
        return (maxLength - distance) / maxLength;
    }
    
    return result;
}

/**
 * Проверяет нечеткое совпадение между запросом и текстом
 * @param {string} query - Поисковый запрос
 * @param {string} text - Текст для проверки
 * @param {number} threshold - Порог схожести (0-1)
 * @returns {boolean} true если найдено нечеткое совпадение
 */
function fuzzyMatch(query, text, threshold = 0.7) {
    const result = fuzzyMatchWithScore(query, text, threshold);
    return result.isMatch;
}

/**
 * Проверяет нечеткое совпадение И возвращает оценку схожести
 * Оптимизированная функция без двойных вычислений
 * @param {string} query - Поисковый запрос
 * @param {string} text - Текст для проверки
 * @param {number} threshold - Порог схожести (0-1)
 * @returns {Object} {isMatch: boolean, similarity: number, matchType: string}
 */
function fuzzyMatchWithScore(query, text, threshold = 0.7) {
    if (!query || !text) {
        return { isMatch: false, similarity: 0, matchType: 'none' };
    }
    
    query = query.toLowerCase().trim();
    text = text.toLowerCase().trim();
    
    // Точное совпадение - максимальный приоритет
    if (text.includes(query)) {
        return { isMatch: true, similarity: 1.0, matchType: 'exact' };
    }
    
    // Проверяем нечеткое совпадение по словам
    const queryWords = query.split(/\s+/).filter(w => w.length >= 3); // Увеличил до 3 символов
    const textWords = text.split(/\s+/);
    
    if (queryWords.length === 0) {
        return { isMatch: false, similarity: 0, matchType: 'none' };
    }
    
    let totalSimilarity = 0;
    let matchedWords = 0;
    let maxWordSimilarity = 0;
    
    for (const queryWord of queryWords) {
        let bestWordMatch = 0;
        
        for (const textWord of textWords) {
            const similarity = calculateSimilarity(queryWord, textWord);
            bestWordMatch = Math.max(bestWordMatch, similarity);
        }
        
        if (bestWordMatch >= 0.5) { // Порог для учета слова
            totalSimilarity += bestWordMatch;
            matchedWords++;
            maxWordSimilarity = Math.max(maxWordSimilarity, bestWordMatch);
        }
    }
    
    // Вычисляем общую схожесть
    const overallSimilarity = matchedWords > 0 
        ? (totalSimilarity / queryWords.length) 
        : 0;
    
    // Определяем тип совпадения
    let matchType = 'none';
    if (overallSimilarity >= 0.9) {
        matchType = 'high-fuzzy';
    } else if (overallSimilarity >= 0.75) {
        matchType = 'medium-fuzzy';
    } else if (overallSimilarity >= threshold) {
        matchType = 'low-fuzzy';
    }
    
    return {
        isMatch: overallSimilarity >= threshold,
        similarity: overallSimilarity,
        matchType: matchType,
        matchedWords: matchedWords,
        totalWords: queryWords.length
    };
}

/**
 * Находит нечеткие совпадения в массиве текстов
 * @param {string} query - Поисковый запрос
 * @param {Array<string>} texts - Массив текстов для поиска
 * @param {number} threshold - Порог схожести (0-1)
 * @returns {Array<{text: string, similarity: number, index: number}>} Найденные совпадения
 */
function findFuzzyMatches(query, texts, threshold = 0.7) {
    if (!query || !texts || !Array.isArray(texts)) return [];
    
    const matches = [];
    
    texts.forEach((text, index) => {
        if (fuzzyMatch(query, text, threshold)) {
            // Вычисляем точную схожесть для сортировки
            const similarity = calculateTextSimilarity(query, text);
            matches.push({ text, similarity, index });
        }
    });
    
    // Сортируем по убыванию схожести
    return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Вычисляет общую схожесть между запросом и текстом
 * @param {string} query - Поисковый запрос
 * @param {string} text - Текст для сравнения
 * @returns {number} Оценка схожести (0-1)
 */
function calculateTextSimilarity(query, text) {
    if (!query || !text) return 0;
    
    query = query.toLowerCase().trim();
    text = text.toLowerCase().trim();
    
    // Бонус за точное вхождение
    if (text.includes(query)) return 1;
    
    // Анализ по словам
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const textWords = text.split(/\s+/);
    
    let totalSimilarity = 0;
    let matchedWords = 0;
    
    for (const queryWord of queryWords) {
        let bestWordMatch = 0;
        
        for (const textWord of textWords) {
            const similarity = calculateSimilarity(queryWord, textWord);
            bestWordMatch = Math.max(bestWordMatch, similarity);
        }
        
        if (bestWordMatch > 0.5) {
            totalSimilarity += bestWordMatch;
            matchedWords++;
        }
    }
    
    return matchedWords > 0 ? totalSimilarity / queryWords.length : 0;
}

/**
 * Создает предложения для исправления запроса
 * @param {string} query - Исходный запрос
 * @param {Array<string>} dictionary - Словарь возможных слов
 * @param {number} maxSuggestions - Максимальное количество предложений
 * @returns {Array<string>} Предложения для исправления
 */
function generateSuggestions(query, dictionary, maxSuggestions = 3) {
    if (!query || !dictionary || !Array.isArray(dictionary)) return [];
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const suggestions = new Set();
    
    queryWords.forEach(queryWord => {
        if (queryWord.length < 3) return;
        
        const wordMatches = dictionary
            .filter(word => word.length >= 3)
            .map(word => ({
                word: word.toLowerCase(),
                similarity: calculateSimilarity(queryWord, word.toLowerCase())
            }))
            .filter(match => match.similarity >= 0.6)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxSuggestions);
            
        wordMatches.forEach(match => suggestions.add(match.word));
    });
    
    return Array.from(suggestions).slice(0, maxSuggestions);
}

/**
 * Получить статистику производительности алгоритмов
 * @returns {Object} Статистика кэша и производительности
 */
function getAlgorithmStats() {
    return {
        similarity: getPerformanceStats(),
        timestamp: new Date().toISOString()
    };
}

// Экспорт функций
export {
    levenshteinDistance,
    calculateSimilarity,
    fuzzyMatch,
    fuzzyMatchWithScore,
    findFuzzyMatches,
    calculateTextSimilarity,
    generateSuggestions,
    getAlgorithmStats
};
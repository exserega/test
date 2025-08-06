/**
 * Web Worker для фонового поиска
 * Обрабатывает поиск в отдельном потоке для максимальной отзывчивости UI
 * Поддерживает оба поиска: главная страница + overlay добавления песен
 */

// Импортируем модули поиска в worker
// Используем importScripts для загрузки зависимостей
let searchEngine = null;
let isInitialized = false;
let songsDatabase = null;
let searchRequests = new Map(); // Отслеживание активных запросов

/**
 * Инициализация worker при первом запуске
 */
async function initializeWorker() {
    if (isInitialized) return;
    
    try {
        // Динамически импортируем модули (в worker нужен особый подход)
        const { default: engine } = await import('../search/searchEngine.js');
        searchEngine = engine;
        
        console.log('🧵 Search Worker инициализирован');
        isInitialized = true;
        
        // Сообщаем главному потоку о готовности
        self.postMessage({
            type: 'worker-ready',
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Search Worker:', error);
        self.postMessage({
            type: 'worker-error',
            error: error.message,
            timestamp: Date.now()
        });
    }
}

/**
 * Обработка поискового запроса
 */
async function handleSearchRequest(data) {
    const { requestId, query, songs, options = {}, searchType } = data;
    
    try {
        // Отмечаем начало обработки
        searchRequests.set(requestId, {
            query,
            startTime: Date.now(),
            searchType
        });
        
        // Сообщаем о начале поиска
        self.postMessage({
            type: 'search-started',
            requestId,
            query,
            searchType,
            timestamp: Date.now()
        });
        
        // Проверяем готовность
        if (!isInitialized || !searchEngine) {
            throw new Error('Search engine не инициализирован');
        }
        
        // Выполняем поиск
        const startTime = performance.now();
        const results = await searchEngine.search(query, songs, options);
        const duration = performance.now() - startTime;
        
        // Отправляем результаты
        self.postMessage({
            type: 'search-results',
            requestId,
            query,
            searchType,
            results,
            duration,
            timestamp: Date.now()
        });
        
        // Очищаем запрос из активных
        searchRequests.delete(requestId);
        
    } catch (error) {
        console.error(`❌ Ошибка поиска (${requestId}):`, error);
        
        self.postMessage({
            type: 'search-error',
            requestId,
            query,
            searchType,
            error: error.message,
            timestamp: Date.now()
        });
        
        searchRequests.delete(requestId);
    }
}

/**
 * Отмена поискового запроса
 */
function cancelSearchRequest(requestId) {
    if (searchRequests.has(requestId)) {
        const request = searchRequests.get(requestId);
        searchRequests.delete(requestId);
        
        self.postMessage({
            type: 'search-cancelled',
            requestId,
            query: request.query,
            searchType: request.searchType,
            timestamp: Date.now()
        });
        
        console.log(`🚫 Поиск отменен: ${requestId}`);
    }
}

/**
 * Обновление базы данных песен
 */
function updateSongsDatabase(songs) {
    songsDatabase = songs;
    
    // Инициализируем словарь в search engine
    if (searchEngine && searchEngine.initializeDictionary) {
        searchEngine.initializeDictionary(songs);
    }
    
    self.postMessage({
        type: 'database-updated',
        songsCount: songs.length,
        timestamp: Date.now()
    });
    
    console.log(`📊 База песен обновлена: ${songs.length} песен`);
}

/**
 * Получение статистики производительности
 */
function getPerformanceStats() {
    const stats = {
        isInitialized,
        songsCount: songsDatabase ? songsDatabase.length : 0,
        activeRequests: searchRequests.size,
        activeRequestsList: Array.from(searchRequests.entries()).map(([id, req]) => ({
            requestId: id,
            query: req.query,
            searchType: req.searchType,
            duration: Date.now() - req.startTime
        }))
    };
    
    // Добавляем статистику search engine если доступна
    if (searchEngine && searchEngine.getPerformanceStats) {
        stats.engine = searchEngine.getPerformanceStats();
    }
    
    return stats;
}

/**
 * Очистка кэшей и сброс состояния
 */
function resetWorkerState() {
    // Отменяем все активные запросы
    for (const requestId of searchRequests.keys()) {
        cancelSearchRequest(requestId);
    }
    
    // Очищаем кэши если доступно
    if (typeof clearSimilarityCache === 'function') {
        clearSimilarityCache();
    }
    
    self.postMessage({
        type: 'worker-reset',
        timestamp: Date.now()
    });
    
    console.log('🧹 Worker состояние сброшено');
}

/**
 * Основной обработчик сообщений
 */
self.addEventListener('message', async function(event) {
    const { type, data } = event.data;
    
    try {
        switch (type) {
            case 'init':
                await initializeWorker();
                break;
                
            case 'search':
                await handleSearchRequest(data);
                break;
                
            case 'cancel-search':
                cancelSearchRequest(data.requestId);
                break;
                
            case 'update-songs':
                updateSongsDatabase(data.songs);
                break;
                
            case 'get-stats':
                const stats = getPerformanceStats();
                self.postMessage({
                    type: 'stats-response',
                    requestId: data.requestId,
                    stats,
                    timestamp: Date.now()
                });
                break;
                
            case 'reset':
                resetWorkerState();
                break;
                
            default:
                console.warn(`⚠️ Неизвестный тип сообщения: ${type}`);
        }
    } catch (error) {
        console.error(`❌ Ошибка обработки сообщения ${type}:`, error);
        self.postMessage({
            type: 'worker-error',
            error: error.message,
            originalType: type,
            timestamp: Date.now()
        });
    }
});

/**
 * Обработка ошибок worker
 */
self.addEventListener('error', function(error) {
    console.error('❌ Worker error:', error);
    self.postMessage({
        type: 'worker-error',
        error: error.message,
        filename: error.filename,
        lineno: error.lineno,
        timestamp: Date.now()
    });
});

/**
 * Обработка необработанных промисов
 */
self.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Worker unhandled rejection:', event.reason);
    self.postMessage({
        type: 'worker-error',
        error: `Unhandled promise rejection: ${event.reason}`,
        timestamp: Date.now()
    });
});

// Автоинициализация при загрузке worker
initializeWorker();
/**
 * Менеджер Web Workers для фонового поиска
 * Обеспечивает работу двух независимых поисков: главная + overlay
 */

/**
 * Менеджер Web Worker для поиска
 */
class SearchWorkerManager {
    constructor() {
        this.worker = null;
        this.isWorkerSupported = typeof Worker !== 'undefined';
        this.isWorkerReady = false;
        this.requestCounter = 0;
        this.pendingRequests = new Map();
        this.fallbackMode = false;
        
        // Отдельные очереди для каждого типа поиска
        this.mainSearchQueue = [];
        this.overlaySearchQueue = [];
        
        this.initWorker();
    }
    
    /**
     * Инициализация Web Worker
     */
    async initWorker() {
        if (!this.isWorkerSupported) {
            console.warn('⚠️ Web Workers не поддерживаются, используем fallback');
            this.fallbackMode = true;
            return;
        }
        
        try {
            // Создаем Web Worker
            this.worker = new Worker('/src/js/workers/searchWorker.js', { 
                type: 'module',
                name: 'SearchWorker'
            });
            
            // Обработчик сообщений от worker
            this.worker.addEventListener('message', (event) => {
                this.handleWorkerMessage(event.data);
            });
            
            // Обработчик ошибок worker
            this.worker.addEventListener('error', (error) => {
                console.error('❌ Worker error:', error);
                this.fallbackToMainThread();
            });
            
            // Инициализируем worker
            this.worker.postMessage({ type: 'init' });
            
            console.log('🧵 SearchWorkerManager инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка создания Worker:', error);
            this.fallbackToMainThread();
        }
    }
    
    /**
     * Переключение на основной поток при проблемах с worker
     */
    async fallbackToMainThread() {
        console.warn('🔄 Переключение на основной поток');
        this.fallbackMode = true;
        this.isWorkerReady = false;
        
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        // Импортируем search engine для fallback
        if (!window.searchEngine) {
            try {
                const { default: engine } = await import('../search/searchEngine.js');
                window.fallbackSearchEngine = engine;
            } catch (error) {
                console.error('❌ Ошибка импорта fallback search engine:', error);
            }
        }
    }
    
    /**
     * Обработка сообщений от Web Worker
     */
    handleWorkerMessage(message) {
        const { type, requestId } = message;
        
        switch (type) {
            case 'worker-ready':
                this.isWorkerReady = true;
                console.log('✅ Search Worker готов к работе');
                this.processQueuedRequests();
                break;
                
            case 'search-results':
                this.handleSearchResults(message);
                break;
                
            case 'search-error':
                this.handleSearchError(message);
                break;
                
            case 'search-started':
                this.handleSearchStarted(message);
                break;
                
            case 'search-cancelled':
                this.handleSearchCancelled(message);
                break;
                
            case 'database-updated':
                console.log(`📊 Worker: база обновлена (${message.songsCount} песен)`);
                break;
                
            case 'worker-error':
                console.error('❌ Worker error:', message.error);
                this.fallbackToMainThread();
                break;
                
            case 'stats-response':
                this.handleStatsResponse(message);
                break;
                
            default:
                console.log(`ℹ️ Worker message: ${type}`, message);
        }
    }
    
    /**
     * Обработка результатов поиска
     */
    handleSearchResults(message) {
        const { requestId, results, duration, searchType, query } = message;
        
        if (this.pendingRequests.has(requestId)) {
            const request = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);
            
            // Вызываем callback с результатами
            if (request.callback) {
                request.callback(null, results, { duration, searchType, query });
            }
            
            console.log(`✅ Поиск завершен (${searchType}): "${query}" за ${duration.toFixed(2)}ms`);
        }
    }
    
    /**
     * Обработка ошибок поиска
     */
    handleSearchError(message) {
        const { requestId, error, searchType, query } = message;
        
        if (this.pendingRequests.has(requestId)) {
            const request = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);
            
            // Вызываем callback с ошибкой
            if (request.callback) {
                request.callback(new Error(error), null, { searchType, query });
            }
            
            console.error(`❌ Ошибка поиска (${searchType}): "${query}" - ${error}`);
        }
    }
    
    /**
     * Обработка начала поиска
     */
    handleSearchStarted(message) {
        const { requestId, query, searchType } = message;
        console.log(`🔍 Поиск начат (${searchType}): "${query}"`);
    }
    
    /**
     * Обработка отмены поиска
     */
    handleSearchCancelled(message) {
        const { requestId, query, searchType } = message;
        
        if (this.pendingRequests.has(requestId)) {
            const request = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);
            
            console.log(`🚫 Поиск отменен (${searchType}): "${query}"`);
        }
    }
    
    /**
     * Обработка ответа статистики
     */
    handleStatsResponse(message) {
        const { requestId, stats } = message;
        
        if (this.pendingRequests.has(requestId)) {
            const request = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);
            
            if (request.callback) {
                request.callback(null, stats);
            }
        }
    }
    
    /**
     * Основной метод поиска
     */
    async search(query, songs, options = {}, searchType = 'main') {
        return new Promise((resolve, reject) => {
            const requestId = this.generateRequestId();
            const callback = (error, results, metadata) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ results, metadata });
                }
            };
            
            const searchRequest = {
                requestId,
                query,
                songs,
                options: { ...options, searchType },
                searchType,
                callback,
                timestamp: Date.now()
            };
            
            // Сохраняем запрос
            this.pendingRequests.set(requestId, searchRequest);
            
            if (this.fallbackMode) {
                // Выполняем в основном потоке
                this.performFallbackSearch(searchRequest);
            } else if (this.isWorkerReady) {
                // Отправляем в Web Worker
                this.sendSearchToWorker(searchRequest);
            } else {
                // Добавляем в очередь
                this.queueSearchRequest(searchRequest);
            }
        });
    }
    
    /**
     * Поиск для главной страницы
     */
    async mainSearch(query, songs, options = {}) {
        return this.search(query, songs, options, 'main');
    }
    
    /**
     * Поиск для overlay добавления песен
     */
    async overlaySearch(query, songs, options = {}) {
        return this.search(query, songs, options, 'overlay');
    }
    
    /**
     * Отправка запроса в Web Worker
     */
    sendSearchToWorker(searchRequest) {
        const { requestId, query, songs, options, searchType } = searchRequest;
        
        this.worker.postMessage({
            type: 'search',
            data: {
                requestId,
                query,
                songs,
                options,
                searchType
            }
        });
    }
    
    /**
     * Fallback поиск в основном потоке
     */
    async performFallbackSearch(searchRequest) {
        const { requestId, query, songs, options, searchType, callback } = searchRequest;
        
        try {
            const startTime = performance.now();
            
            // Используем fallback search engine или window.searchEngine
            const engine = window.fallbackSearchEngine || window.searchEngine;
            if (!engine) {
                throw new Error('Search engine недоступен');
            }
            
            const results = await engine.search(query, songs, options);
            const duration = performance.now() - startTime;
            
            callback(null, results, { duration, searchType, query });
            
        } catch (error) {
            callback(error, null, { searchType, query });
        }
    }
    
    /**
     * Добавление запроса в очередь
     */
    queueSearchRequest(searchRequest) {
        const { searchType } = searchRequest;
        
        if (searchType === 'overlay') {
            this.overlaySearchQueue.push(searchRequest);
        } else {
            this.mainSearchQueue.push(searchRequest);
        }
        
        console.log(`📋 Запрос добавлен в очередь (${searchType}): ${searchRequest.query}`);
    }
    
    /**
     * Обработка очереди запросов после готовности worker
     */
    processQueuedRequests() {
        // Обрабатываем основные запросы
        while (this.mainSearchQueue.length > 0) {
            const request = this.mainSearchQueue.shift();
            this.sendSearchToWorker(request);
        }
        
        // Обрабатываем overlay запросы
        while (this.overlaySearchQueue.length > 0) {
            const request = this.overlaySearchQueue.shift();
            this.sendSearchToWorker(request);
        }
    }
    
    /**
     * Отмена поиска
     */
    cancelSearch(requestId) {
        if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            
            if (!this.fallbackMode && this.worker) {
                this.worker.postMessage({
                    type: 'cancel-search',
                    data: { requestId }
                });
            }
        }
    }
    
    /**
     * Отмена всех поисков определенного типа
     */
    cancelSearchesByType(searchType) {
        const toCancel = [];
        
        for (const [requestId, request] of this.pendingRequests) {
            if (request.searchType === searchType) {
                toCancel.push(requestId);
            }
        }
        
        toCancel.forEach(requestId => this.cancelSearch(requestId));
        console.log(`🚫 Отменено ${toCancel.length} поисков типа: ${searchType}`);
    }
    
    /**
     * Обновление базы данных песен
     */
    updateSongsDatabase(songs) {
        if (!this.fallbackMode && this.worker) {
            this.worker.postMessage({
                type: 'update-songs',
                data: { songs }
            });
        }
        
        // Также обновляем fallback engine
        if (window.fallbackSearchEngine && window.fallbackSearchEngine.initializeDictionary) {
            window.fallbackSearchEngine.initializeDictionary(songs);
        }
    }
    
    /**
     * Получение статистики
     */
    async getStats() {
        return new Promise((resolve, reject) => {
            const requestId = this.generateRequestId();
            
            this.pendingRequests.set(requestId, {
                callback: (error, stats) => {
                    if (error) reject(error);
                    else resolve(stats);
                }
            });
            
            if (!this.fallbackMode && this.worker) {
                this.worker.postMessage({
                    type: 'get-stats',
                    data: { requestId }
                });
            } else {
                // Fallback статистика
                resolve({
                    fallbackMode: true,
                    pendingRequests: this.pendingRequests.size,
                    isWorkerReady: this.isWorkerReady
                });
            }
        });
    }
    
    /**
     * Генерация уникального ID запроса
     */
    generateRequestId() {
        return `search_${Date.now()}_${++this.requestCounter}`;
    }
    
    /**
     * Cleanup при уничтожении
     */
    destroy() {
        // Отменяем все активные запросы
        for (const requestId of this.pendingRequests.keys()) {
            this.cancelSearch(requestId);
        }
        
        // Завершаем worker
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.isWorkerReady = false;
        console.log('🗑️ SearchWorkerManager уничтожен');
    }
}

// Создаем глобальный экземпляр менеджера
const searchWorkerManager = new SearchWorkerManager();

// Экспорт
export default searchWorkerManager;
export { SearchWorkerManager };
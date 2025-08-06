/**
 * Модуль мониторинга производительности поиска
 * Предоставляет инструменты для анализа и оптимизации
 */

/**
 * Менеджер производительности поиска
 */
class PerformanceMonitor {
    constructor() {
        this.measurements = [];
        this.isEnabled = false;
    }
    
    /**
     * Включить мониторинг производительности
     */
    enable() {
        this.isEnabled = true;
        console.log('🔍 Performance Monitor ВКЛЮЧЕН');
    }
    
    /**
     * Выключить мониторинг производительности
     */
    disable() {
        this.isEnabled = false;
        console.log('🔍 Performance Monitor ВЫКЛЮЧЕН');
    }
    
    /**
     * Измерить время выполнения функции
     */
    async measure(name, fn) {
        if (!this.isEnabled) {
            return await fn();
        }
        
        const startTime = performance.now();
        const startMemory = this.getMemoryUsage();
        
        try {
            const result = await fn();
            const endTime = performance.now();
            const endMemory = this.getMemoryUsage();
            
            const measurement = {
                name,
                duration: endTime - startTime,
                memoryDelta: endMemory - startMemory,
                timestamp: new Date().toISOString()
            };
            
            this.measurements.push(measurement);
            this.logMeasurement(measurement);
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            console.error(`❌ Error in ${name}: ${error.message} (${endTime - startTime}ms)`);
            throw error;
        }
    }
    
    /**
     * Получить использование памяти (если доступно)
     */
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }
    
    /**
     * Записать измерение в консоль
     */
    logMeasurement(measurement) {
        const { name, duration, memoryDelta } = measurement;
        const durationColor = duration < 10 ? '🟢' : duration < 50 ? '🟡' : '🔴';
        const memoryColor = memoryDelta < 1000 ? '🟢' : memoryDelta < 10000 ? '🟡' : '🔴';
        
        console.log(
            `⚡ ${name}: ${durationColor} ${duration.toFixed(2)}ms ${memoryColor} ${this.formatMemory(memoryDelta)}`
        );
    }
    
    /**
     * Форматировать размер памяти
     */
    formatMemory(bytes) {
        if (bytes === 0) return '0B';
        if (Math.abs(bytes) < 1024) return `${bytes}B`;
        if (Math.abs(bytes) < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
    
    /**
     * Получить статистику производительности
     */
    getStats() {
        if (this.measurements.length === 0) {
            return { message: 'Измерений не проводилось' };
        }
        
        const durations = this.measurements.map(m => m.duration);
        const memoryDeltas = this.measurements.map(m => m.memoryDelta);
        
        return {
            totalMeasurements: this.measurements.length,
            avgDuration: this.average(durations),
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            avgMemoryDelta: this.average(memoryDeltas),
            lastMeasurements: this.measurements.slice(-5)
        };
    }
    
    /**
     * Вычислить среднее значение
     */
    average(arr) {
        return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }
    
    /**
     * Очистить измерения
     */
    clear() {
        this.measurements = [];
        console.log('🧹 Измерения производительности очищены');
    }
    
    /**
     * Показать подробную статистику
     */
    showDetailedStats() {
        console.group('📊 ДЕТАЛЬНАЯ СТАТИСТИКА ПРОИЗВОДИТЕЛЬНОСТИ');
        
        const stats = this.getStats();
        if (stats.message) {
            console.log(stats.message);
        } else {
            console.log(`📈 Всего измерений: ${stats.totalMeasurements}`);
            console.log(`⏱️ Среднее время: ${stats.avgDuration.toFixed(2)}ms`);
            console.log(`🚀 Минимальное время: ${stats.minDuration.toFixed(2)}ms`);
            console.log(`🐌 Максимальное время: ${stats.maxDuration.toFixed(2)}ms`);
            console.log(`💾 Среднее изменение памяти: ${this.formatMemory(stats.avgMemoryDelta)}`);
            
            if (window.searchEngine && typeof window.searchEngine.getPerformanceStats === 'function') {
                console.log('🔍 Статистика поискового движка:');
                console.table(window.searchEngine.getPerformanceStats());
            }
        }
        
        console.groupEnd();
    }
}

// Глобальный экземпляр монитора
const performanceMonitor = new PerformanceMonitor();

// Включаем в development режиме
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    performanceMonitor.enable();
}

/**
 * Обертка для измерения производительности поиска
 */
function measureSearchPerformance(searchFn) {
    return async (query, ...args) => {
        return await performanceMonitor.measure(
            `Search: "${query}"`,
            () => searchFn(query, ...args)
        );
    };
}

/**
 * Публичные функции для управления производительностью
 */
function enablePerformanceMonitoring() {
    performanceMonitor.enable();
}

function disablePerformanceMonitoring() {
    performanceMonitor.disable();
}

function getPerformanceStats() {
    return performanceMonitor.getStats();
}

function showPerformanceStats() {
    performanceMonitor.showDetailedStats();
}

function clearPerformanceStats() {
    performanceMonitor.clear();
}

// Делаем доступными глобально для отладки
if (typeof window !== 'undefined') {
    window.searchPerformance = {
        enable: enablePerformanceMonitoring,
        disable: disablePerformanceMonitoring,
        stats: getPerformanceStats,
        show: showPerformanceStats,
        clear: clearPerformanceStats
    };
    
    // Добавляем функции для batch статистики
    window.searchBatch = {
        stats: () => {
            try {
                const { getBatchStats } = require('./search/batchProcessor.js');
                return getBatchStats();
            } catch (e) {
                return { error: 'Batch processor не загружен' };
            }
        },
        worship: () => {
            try {
                const { WORSHIP_KEYWORDS } = require('./search/batchProcessor.js');
                return WORSHIP_KEYWORDS;
            } catch (e) {
                return { error: 'Worship keywords не загружены' };
            }
        }
    };
}

export {
    performanceMonitor,
    measureSearchPerformance,
    enablePerformanceMonitoring,
    disablePerformanceMonitoring,
    getPerformanceStats,
    showPerformanceStats,
    clearPerformanceStats
};
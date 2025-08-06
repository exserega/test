// ====================================
// 📝 LOGGER MODULE
// ====================================
// Условное логирование - отключено на продакшене
// Логи показываются только на localhost
// ====================================

/**
 * Проверяет, находимся ли мы в режиме разработки
 * @returns {boolean}
 */
const isDevelopment = () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('test');
};

/**
 * Условный console.log
 * @param {...any} args - Аргументы для логирования
 */
export const log = (...args) => {
    if (isDevelopment()) {
        console.log(...args);
    }
};

/**
 * Условный console.error
 * @param {...any} args - Аргументы для логирования
 */
export const error = (...args) => {
    // Ошибки логируем всегда
    console.error(...args);
};

/**
 * Условный console.warn
 * @param {...any} args - Аргументы для логирования
 */
export const warn = (...args) => {
    if (isDevelopment()) {
        console.warn(...args);
    }
};

/**
 * Условный console.info
 * @param {...any} args - Аргументы для логирования
 */
export const info = (...args) => {
    if (isDevelopment()) {
        console.info(...args);
    }
};

/**
 * Условный console.debug
 * @param {...any} args - Аргументы для логирования
 */
export const debug = (...args) => {
    if (isDevelopment()) {
        console.debug(...args);
    }
};

// Экспортируем объект logger для удобства
export default {
    log,
    error,
    warn,
    info,
    debug
};
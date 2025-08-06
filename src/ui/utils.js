/**
 * @fileoverview UI Utils Module - Утилитарные функции для интерфейса
 * @module UIUtils
 * @version 1.0.0
 * @author Agape Worship Team
 * @since 2024
 */

// ====================================
// LOADING INDICATORS
// ====================================

/**
 * Показывает индикатор загрузки
 * @param {HTMLElement|string} element - Элемент или селектор
 * @param {string} message - Сообщение загрузки
 */
export function showLoadingIndicator(element, message = 'Загрузка...') {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  el.innerHTML = `
    <div class="loading-indicator">
      <div class="loading-spinner"></div>
      <span class="loading-message">${message}</span>
    </div>
  `;
  el.classList.add('loading');
}

/**
 * Скрывает индикатор загрузки
 * @param {HTMLElement|string} element - Элемент или селектор
 */
export function hideLoadingIndicator(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  el.classList.remove('loading');
}

// ====================================
// MODAL MANAGEMENT
// ====================================

/**
 * Показывает модальное окно
 * @param {HTMLElement|string} modal - Модальное окно или селектор
 * @param {Object} options - Опции отображения
 * @param {boolean} options.closeOnBackdrop - Закрывать при клике на фон
 * @param {Function} options.onShow - Callback при показе
 * @param {Function} options.onHide - Callback при скрытии
 */
export function showModal(modal, options = {}) {
  const {
    closeOnBackdrop = true,
    onShow,
    onHide
  } = options;

  const modalEl = typeof modal === 'string' ? document.querySelector(modal) : modal;
  if (!modalEl) return;

  // Показываем модальное окно
  modalEl.classList.add('show');
  document.body.classList.add('modal-open');

  // Обработчик закрытия на фон
  if (closeOnBackdrop) {
    const backdropHandler = (e) => {
      if (e.target === modalEl) {
        hideModal(modalEl, { onHide });
        modalEl.removeEventListener('click', backdropHandler);
      }
    };
    modalEl.addEventListener('click', backdropHandler);
  }

  // Обработчик Escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      hideModal(modalEl, { onHide });
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // Callback при показе
  if (typeof onShow === 'function') {
    onShow(modalEl);
  }
}

/**
 * Скрывает модальное окно
 * @param {HTMLElement|string} modal - Модальное окно или селектор
 * @param {Object} options - Опции скрытия
 * @param {Function} options.onHide - Callback при скрытии
 */
export function hideModal(modal, options = {}) {
  const { onHide } = options;

  const modalEl = typeof modal === 'string' ? document.querySelector(modal) : modal;
  if (!modalEl) return;

  // Скрываем модальное окно
  modalEl.classList.remove('show');
  document.body.classList.remove('modal-open');

  // Callback при скрытии
  if (typeof onHide === 'function') {
    onHide(modalEl);
  }
}

// ====================================
// NOTIFICATION SYSTEM
// ====================================

/**
 * Показывает уведомление
 * @param {string} message - Текст уведомления
 * @param {Object} options - Опции уведомления
 * @param {string} options.type - Тип: 'success', 'error', 'warning', 'info'
 * @param {number} options.duration - Длительность в мс (0 = не скрывать)
 * @param {string} options.position - Позиция: 'top', 'bottom'
 */
export function showNotification(message, options = {}) {
  const {
    type = 'info',
    duration = 3000,
    position = 'top'
  } = options;

  // Создаем контейнер уведомлений если его нет
  let container = document.querySelector('.notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.className = `notifications-container notifications-${position}`;
    document.body.appendChild(container);
  }

  // Создаем уведомление
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  // Иконки для разных типов
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${icons[type] || icons.info}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" title="Закрыть">×</button>
    </div>
  `;

  // Добавляем в контейнер
  if (position === 'top') {
    container.appendChild(notification);
  } else {
    container.insertBefore(notification, container.firstChild);
  }

  // Анимация появления
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Обработчик закрытия
  const closeBtn = notification.querySelector('.notification-close');
  const closeNotification = () => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  };

  closeBtn.addEventListener('click', closeNotification);

  // Автоматическое закрытие
  if (duration > 0) {
    setTimeout(closeNotification, duration);
  }

  return notification;
}

/**
 * Показывает уведомление об успехе
 * @param {string} message - Текст сообщения
 * @param {number} duration - Длительность в мс
 */
export function showSuccessNotification(message, duration = 3000) {
  return showNotification(message, { type: 'success', duration });
}

/**
 * Показывает уведомление об ошибке
 * @param {string} message - Текст сообщения
 * @param {number} duration - Длительность в мс
 */
export function showErrorNotification(message, duration = 5000) {
  return showNotification(message, { type: 'error', duration });
}

/**
 * Показывает предупреждение
 * @param {string} message - Текст сообщения
 * @param {number} duration - Длительность в мс
 */
export function showWarningNotification(message, duration = 4000) {
  return showNotification(message, { type: 'warning', duration });
}

// ====================================
// FORM UTILITIES
// ====================================

/**
 * Валидирует форму
 * @param {HTMLFormElement} form - Форма для валидации
 * @returns {Object} Результат валидации
 */
export function validateForm(form) {
  if (!form || !(form instanceof HTMLFormElement)) {
    return { valid: false, errors: ['Форма не найдена'] };
  }

  const errors = [];
  const formData = new FormData(form);
  const data = {};

  // Собираем данные и проверяем обязательные поля
  for (const [key, value] of formData.entries()) {
    data[key] = value;
    
    const field = form.querySelector(`[name="${key}"]`);
    if (field && field.hasAttribute('required') && !value.trim()) {
      errors.push(`Поле "${field.getAttribute('data-label') || key}" обязательно для заполнения`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data
  };
}

/**
 * Очищает форму
 * @param {HTMLFormElement} form - Форма для очистки
 */
export function clearForm(form) {
  if (!form || !(form instanceof HTMLFormElement)) return;

  form.reset();
  
  // Убираем классы ошибок
  const errorFields = form.querySelectorAll('.field-error');
  errorFields.forEach(field => field.classList.remove('field-error'));
  
  // Убираем сообщения об ошибках
  const errorMessages = form.querySelectorAll('.error-message');
  errorMessages.forEach(msg => msg.remove());
}

// ====================================
// SCROLL UTILITIES
// ====================================

/**
 * Плавно прокручивает к элементу
 * @param {HTMLElement|string} element - Элемент или селектор
 * @param {Object} options - Опции прокрутки
 * @param {string} options.behavior - 'smooth' или 'auto'
 * @param {string} options.block - 'start', 'center', 'end'
 * @param {number} options.offset - Смещение в пикселях
 */
export function scrollToElement(element, options = {}) {
  const {
    behavior = 'smooth',
    block = 'start',
    offset = 0
  } = options;

  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  const elementTop = el.offsetTop + offset;
  
  window.scrollTo({
    top: elementTop,
    behavior
  });
}

/**
 * Проверяет, виден ли элемент в области просмотра
 * @param {HTMLElement} element - Элемент для проверки
 * @param {number} threshold - Порог видимости (0-1)
 * @returns {boolean} True если элемент виден
 */
export function isElementInViewport(element, threshold = 0) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertInView = (rect.top <= windowHeight * (1 - threshold)) && ((rect.top + rect.height) >= windowHeight * threshold);
  const horInView = (rect.left <= windowWidth * (1 - threshold)) && ((rect.left + rect.width) >= windowWidth * threshold);

  return vertInView && horInView;
}

// ====================================
// DEBOUNCE & THROTTLE
// ====================================

/**
 * Создает debounced версию функции
 * @param {Function} func - Функция для debounce
 * @param {number} delay - Задержка в мс
 * @returns {Function} Debounced функция
 */
export function debounce(func, delay) {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Создает throttled версию функции
 * @param {Function} func - Функция для throttle
 * @param {number} delay - Задержка в мс
 * @returns {Function} Throttled функция
 */
export function throttle(func, delay) {
  let lastCall = 0;
  
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

// ====================================
// MODULE METADATA
// ====================================

/**
 * UI Utils module metadata
 * @readonly
 */
export const metadata = {
  name: 'UIUtils',
  version: '1.0.0',
  description: 'Utility functions for UI management',
  functions: [
    'showLoadingIndicator',
    'hideLoadingIndicator',
    'showModal',
    'hideModal',
    'showNotification',
    'showSuccessNotification',
    'showErrorNotification',
    'showWarningNotification',
    'validateForm',
    'clearForm',
    'scrollToElement',
    'isElementInViewport',
    'debounce',
    'throttle'
  ],
  features: [
    'Loading indicators',
    'Modal management',
    'Notification system',
    'Form validation',
    'Scroll utilities',
    'Performance helpers'
  ]
};
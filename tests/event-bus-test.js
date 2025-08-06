/**
 * @fileoverview Event Bus Tests - Проверка функциональности Event Bus
 */

// Импорт для тестирования в Node.js окружении
import { EventBus } from '../src/core/event-bus.js';

/**
 * Тесты Event Bus
 */
class EventBusTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Запуск всех тестов
   */
  async runAll() {
    console.log('🧪 Running Event Bus Tests...');
    console.log('==============================');

    const tests = [
      () => this.testEventBusCreation(),
      () => this.testEventSubscription(),
      () => this.testEventEmission(),
      () => this.testEventUnsubscription(),
      () => this.testOnceEvents(),
      () => this.testStateManagement(),
      () => this.testStateChangeEvents(),
      () => this.testErrorHandling(),
      () => this.testUtilityMethods()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        this.logError(test.name, error);
      }
    }

    this.printResults();
    return this.results.failed === 0;
  }

  /**
   * Тест создания Event Bus
   */
  testEventBusCreation() {
    const bus = new EventBus();
    
    this.assert(bus instanceof EventBus, 'EventBus should be created');
    this.assert(typeof bus.on === 'function', 'Should have on method');
    this.assert(typeof bus.emit === 'function', 'Should have emit method');
    this.assert(typeof bus.setState === 'function', 'Should have setState method');
    this.assert(typeof bus.getState === 'function', 'Should have getState method');
    
    this.logPass('Event Bus Creation');
  }

  /**
   * Тест подписки на события
   */
  testEventSubscription() {
    const bus = new EventBus();
    let callCount = 0;
    
    const listenerId = bus.on('test-event', () => {
      callCount++;
    });
    
    this.assert(typeof listenerId === 'string', 'Should return listener ID');
    this.assert(listenerId.startsWith('listener_'), 'ID should have correct format');
    
    // Проверяем что событие зарегистрировано
    const eventNames = bus.getEventNames();
    this.assert(eventNames.includes('test-event'), 'Event should be registered');
    
    this.logPass('Event Subscription');
  }

  /**
   * Тест эмиссии событий
   */
  testEventEmission() {
    const bus = new EventBus();
    let receivedData = null;
    let callCount = 0;
    
    bus.on('test-event', (data) => {
      receivedData = data;
      callCount++;
    });
    
    const listenerCount = bus.emit('test-event', 'test-data');
    
    this.assert(listenerCount === 1, 'Should return correct listener count');
    this.assert(receivedData === 'test-data', 'Should pass data to listener');
    this.assert(callCount === 1, 'Should call listener once');
    
    this.logPass('Event Emission');
  }

  /**
   * Тест отписки от событий
   */
  testEventUnsubscription() {
    const bus = new EventBus();
    let callCount = 0;
    
    const listenerId = bus.on('test-event', () => {
      callCount++;
    });
    
    // Эмитим событие - должно сработать
    bus.emit('test-event');
    this.assert(callCount === 1, 'Should call listener before unsubscribe');
    
    // Отписываемся
    const success = bus.off(listenerId);
    this.assert(success === true, 'Should successfully unsubscribe');
    
    // Эмитим снова - не должно сработать
    bus.emit('test-event');
    this.assert(callCount === 1, 'Should not call listener after unsubscribe');
    
    this.logPass('Event Unsubscription');
  }

  /**
   * Тест одноразовых событий
   */
  testOnceEvents() {
    const bus = new EventBus();
    let callCount = 0;
    
    bus.once('test-event', () => {
      callCount++;
    });
    
    // Первый вызов - должен сработать
    bus.emit('test-event');
    this.assert(callCount === 1, 'Should call once listener first time');
    
    // Второй вызов - не должен сработать
    bus.emit('test-event');
    this.assert(callCount === 1, 'Should not call once listener second time');
    
    this.logPass('Once Events');
  }

  /**
   * Тест управления состоянием
   */
  testStateManagement() {
    const bus = new EventBus();
    
    // Установка состояния
    bus.setState('testKey', 'testValue');
    const value = bus.getState('testKey');
    this.assert(value === 'testValue', 'Should store and retrieve state');
    
    // Значение по умолчанию
    const defaultValue = bus.getState('nonExistentKey', 'default');
    this.assert(defaultValue === 'default', 'Should return default value');
    
    // Проверка существования
    this.assert(bus.hasState('testKey') === true, 'Should detect existing key');
    this.assert(bus.hasState('nonExistentKey') === false, 'Should detect non-existing key');
    
    // Удаление состояния
    const deleted = bus.deleteState('testKey');
    this.assert(deleted === true, 'Should delete existing key');
    this.assert(bus.hasState('testKey') === false, 'Key should be deleted');
    
    this.logPass('State Management');
  }

  /**
   * Тест событий изменения состояния
   */
  testStateChangeEvents() {
    const bus = new EventBus();
    let changeEvent = null;
    let specificChangeEvent = null;
    
    // Подписываемся на события изменения
    bus.on('state:change', (event) => {
      changeEvent = event;
    });
    
    bus.on('state:change:testKey', (event) => {
      specificChangeEvent = event;
    });
    
    // Изменяем состояние
    bus.setState('testKey', 'newValue');
    
    // Проверяем общее событие
    this.assert(changeEvent !== null, 'Should emit general state change event');
    this.assert(changeEvent.key === 'testKey', 'Should include correct key');
    this.assert(changeEvent.newValue === 'newValue', 'Should include new value');
    
    // Проверяем специфичное событие
    this.assert(specificChangeEvent !== null, 'Should emit specific state change event');
    this.assert(specificChangeEvent.newValue === 'newValue', 'Should include new value in specific event');
    
    this.logPass('State Change Events');
  }

  /**
   * Тест обработки ошибок
   */
  testErrorHandling() {
    const bus = new EventBus();
    
    // Тест неверных параметров
    try {
      bus.on(123, () => {});
      this.assert(false, 'Should throw error for invalid eventName');
    } catch (error) {
      this.assert(error.message.includes('eventName must be string'), 'Should throw correct error');
    }
    
    try {
      bus.setState(123, 'value');
      this.assert(false, 'Should throw error for invalid state key');
    } catch (error) {
      this.assert(error.message.includes('key must be string'), 'Should throw correct error for state');
    }
    
    this.logPass('Error Handling');
  }

  /**
   * Тест утилитарных методов
   */
  testUtilityMethods() {
    const bus = new EventBus();
    
    // Добавляем данные
    bus.on('event1', () => {});
    bus.on('event2', () => {});
    bus.setState('key1', 'value1');
    bus.setState('key2', 'value2');
    
    // Проверяем статистику
    const stats = bus.getStats();
    this.assert(stats.eventCount === 2, 'Should count events correctly');
    this.assert(stats.stateCount === 2, 'Should count state keys correctly');
    
    // Проверяем списки
    const eventNames = bus.getEventNames();
    const stateKeys = bus.getStateKeys();
    
    this.assert(eventNames.length === 2, 'Should return correct event names count');
    this.assert(stateKeys.length === 2, 'Should return correct state keys count');
    this.assert(eventNames.includes('event1'), 'Should include event1');
    this.assert(stateKeys.includes('key1'), 'Should include key1');
    
    // Тест очистки
    bus.clear();
    const statsAfterClear = bus.getStats();
    this.assert(statsAfterClear.eventCount === 0, 'Should clear events');
    this.assert(statsAfterClear.stateCount === 0, 'Should clear state');
    
    this.logPass('Utility Methods');
  }

  // ====================================
  // HELPER METHODS
  // ====================================

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  logPass(testName) {
    console.log(`✅ ${testName}`);
    this.results.passed++;
  }

  logError(testName, error) {
    console.log(`❌ ${testName}: ${error.message}`);
    this.results.failed++;
    this.results.errors.push({ test: testName, error: error.message });
  }

  printResults() {
    console.log('==============================');
    console.log(`📊 Results: ${this.results.passed} passed, ${this.results.failed} failed`);
    
    if (this.results.failed > 0) {
      console.log('❌ Failures:');
      this.results.errors.forEach(err => {
        console.log(`  - ${err.test}: ${err.error}`);
      });
    } else {
      console.log('🎉 All Event Bus tests passed!');
    }
  }
}

// Экспорт для использования
export default EventBusTest;

// Автоматический запуск в Node.js окружении
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // Этот код выполнится только в Node.js
}
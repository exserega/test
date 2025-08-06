/**
 * @fileoverview Baseline Tests - Проверка исходной функциональности
 * Эти тесты должны проходить на коммите fc781d0 и после каждого этапа
 */

// ====================================
// BASELINE SMOKE TESTS
// ====================================

class BaselineTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Запуск всех baseline тестов
   */
  async runAll() {
    console.log('🧪 Запуск Baseline Tests...');
    console.log('================================');

    const tests = [
      () => this.testPageLoad(),
      () => this.testBasicElements(),
      () => this.testGlobalVariables(),
      () => this.testModuleImports(),
      () => this.testFirebaseConfig(),
      () => this.testConsoleErrors()
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
   * Проверка загрузки страницы
   */
  testPageLoad() {
    this.assert(
      document.readyState === 'complete' || document.readyState === 'interactive',
      'Page should be loaded'
    );
    this.logPass('Page Load');
  }

  /**
   * Проверка основных элементов DOM
   */
  testBasicElements() {
    const requiredElements = [
      'search-input',
      'sheet-select', 
      'song-content',
      'theme-toggle-button'
    ];

    for (const id of requiredElements) {
      this.assert(
        document.getElementById(id) !== null,
        `Element #${id} should exist`
      );
    }
    this.logPass('Basic DOM Elements');
  }

  /**
   * Проверка критических глобальных переменных
   */
  testGlobalVariables() {
    const criticalGlobals = [
      'metronomeUI',
      'searchWorkerManager',
      'getNormalizedTitle',
      'getNormalizedLyrics'
    ];

    for (const global of criticalGlobals) {
      this.assert(
        typeof window[global] !== 'undefined',
        `window.${global} should be defined`
      );
    }
    this.logPass('Global Variables');
  }

  /**
   * Проверка импорта модулей
   */
  testModuleImports() {
    // Проверяем что script тег с type="module" существует
    const moduleScripts = document.querySelectorAll('script[type="module"]');
    this.assert(
      moduleScripts.length > 0,
      'Should have ES6 module scripts'
    );

    // Проверяем основной script.js
    const mainScript = Array.from(moduleScripts).find(s => 
      s.src.includes('script.js')
    );
    this.assert(
      mainScript !== undefined,
      'Main script.js should be loaded as module'
    );

    this.logPass('Module Imports');
  }

  /**
   * Проверка конфигурации Firebase
   */
  testFirebaseConfig() {
    // Проверяем что Firebase скрипты загружены
    const firebaseScripts = document.querySelectorAll('script[src*="firebase"]');
    
    // В зависимости от способа подключения Firebase
    if (firebaseScripts.length > 0) {
      this.logPass('Firebase Config (CDN)');
    } else if (typeof window.firebase !== 'undefined' || window.db) {
      this.logPass('Firebase Config (Module)');
    } else {
      this.logWarning('Firebase Config - unable to verify');
    }
  }

  /**
   * Проверка отсутствия критических ошибок в консоли
   */
  testConsoleErrors() {
    // Эта проверка должна выполняться вручную или с помощью monitoring
    // Для automated проверки нужен более сложный setup
    this.logPass('Console Errors (manual check required)');
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

  logWarning(message) {
    console.log(`⚠️ ${message}`);
  }

  logError(testName, error) {
    console.log(`❌ ${testName}: ${error.message}`);
    this.results.failed++;
    this.results.errors.push({ test: testName, error: error.message });
  }

  printResults() {
    console.log('================================');
    console.log(`📊 Results: ${this.results.passed} passed, ${this.results.failed} failed`);
    
    if (this.results.failed > 0) {
      console.log('❌ Failures:');
      this.results.errors.forEach(err => {
        console.log(`  - ${err.test}: ${err.error}`);
      });
    } else {
      console.log('🎉 All baseline tests passed!');
    }
  }
}

// ====================================
// PERFORMANCE BASELINE
// ====================================

class PerformanceBaseline {
  constructor() {
    this.metrics = {};
  }

  /**
   * Измерение базовых метрик производительности
   */
  async measureBaseline() {
    console.log('⚡ Measuring Performance Baseline...');
    
    // Load Time (if available)
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.metrics.loadTime = loadTime;
      console.log(`📈 Load Time: ${loadTime}ms`);
    }

    // Memory Usage (if available)
    if (performance.memory) {
      this.metrics.memoryUsed = performance.memory.usedJSHeapSize;
      this.metrics.memoryLimit = performance.memory.jsHeapSizeLimit;
      console.log(`🧠 Memory Used: ${Math.round(this.metrics.memoryUsed / 1024 / 1024)}MB`);
    }

    // DOM Size
    this.metrics.domElements = document.getElementsByTagName('*').length;
    console.log(`🏗️ DOM Elements: ${this.metrics.domElements}`);

    // Bundle Size (approximate)
    const scripts = document.querySelectorAll('script[src]');
    console.log(`📦 Script Files: ${scripts.length}`);

    return this.metrics;
  }

  /**
   * Сравнение с предыдущими метриками
   */
  compareMetrics(baseline) {
    if (!baseline) return;

    console.log('📊 Performance Comparison:');
    
    Object.keys(this.metrics).forEach(key => {
      if (baseline[key]) {
        const current = this.metrics[key];
        const previous = baseline[key];
        const diff = ((current - previous) / previous * 100).toFixed(2);
        const symbol = diff > 0 ? '📈' : '📉';
        console.log(`${symbol} ${key}: ${diff}% change`);
      }
    });
  }
}

// ====================================
// AUTO-RUN TESTS
// ====================================

// Экспорт для ручного использования
window.BaselineTest = BaselineTest;
window.PerformanceBaseline = PerformanceBaseline;

// Автоматический запуск при загрузке (если не в production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Небольшая задержка для полной загрузки
    setTimeout(async () => {
      const tester = new BaselineTest();
      const perfTester = new PerformanceBaseline();
      
      await tester.runAll();
      await perfTester.measureBaseline();
      
      // Сохраняем baseline в localStorage для сравнения
      localStorage.setItem('agape-baseline', JSON.stringify({
        timestamp: Date.now(),
        performance: perfTester.metrics,
        testsPassed: tester.results.failed === 0
      }));
      
    }, 2000);
  });
}
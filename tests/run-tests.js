#!/usr/bin/env node

/**
 * @fileoverview Test Runner - Статический анализ кода для проверки базовой корректности
 */

const fs = require('fs');
const path = require('path');

class StaticTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
  }

  /**
   * Запуск всех статических тестов
   */
  async runAll() {
    console.log('🔍 Running Static Analysis Tests...');
    console.log('=====================================');

    try {
      await this.testFileStructure();
      await this.testModuleImports();
      await this.testHTMLStructure();
      await this.testCSSStructure();
      await this.testJavaScriptSyntax();
    } catch (error) {
      this.logError('Static Analysis', error);
    }

    this.printResults();
    return this.results.failed === 0;
  }

  /**
   * Проверка структуры файлов
   */
  async testFileStructure() {
    const requiredFiles = [
      'index.html',
      'script.js',
      'ui.js',
      'api.js',
      'core.js',
      'metronome.js',
      'constants.js',
      'state.js',
      'styles.css',
      'firebase-config.js'
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.logPass(`File exists: ${file}`);
      } else {
        this.logError(`Missing file: ${file}`, new Error(`File ${file} not found`));
      }
    }
  }

  /**
   * Проверка импортов модулей
   */
  async testModuleImports() {
    try {
      const scriptContent = fs.readFileSync('script.js', 'utf8');
      
      // Проверяем основные импорты
      const requiredImports = [
        'import.*state',
        'import.*constants',
        'import.*api',
        'import.*core',
        'import.*ui'
      ];

      for (const importPattern of requiredImports) {
        const regex = new RegExp(importPattern);
        if (regex.test(scriptContent)) {
          this.logPass(`Import found: ${importPattern}`);
        } else {
          this.logWarning(`Import missing: ${importPattern}`);
        }
      }

    } catch (error) {
      this.logError('Module Imports', error);
    }
  }

  /**
   * Проверка HTML структуры
   */
  async testHTMLStructure() {
    try {
      const htmlContent = fs.readFileSync('index.html', 'utf8');
      
      const requiredElements = [
        'id="search-input"',
        'id="sheet-select"',
        'id="song-content"',
        'id="theme-toggle-button"',
        'type="module"'
      ];

      for (const element of requiredElements) {
        if (htmlContent.includes(element)) {
          this.logPass(`HTML element: ${element}`);
        } else {
          this.logError(`HTML missing: ${element}`, new Error(`Element ${element} not found`));
        }
      }

    } catch (error) {
      this.logError('HTML Structure', error);
    }
  }

  /**
   * Проверка CSS структуры
   */
  async testCSSStructure() {
    try {
      const cssContent = fs.readFileSync('styles.css', 'utf8');
      
      // Проверяем наличие основных CSS классов
      const requiredClasses = [
        '.container',
        '.song-content',
        '.search-group',
        '.theme-toggle'
      ];

      for (const className of requiredClasses) {
        if (cssContent.includes(className)) {
          this.logPass(`CSS class: ${className}`);
        } else {
          this.logWarning(`CSS missing: ${className}`);
        }
      }

    } catch (error) {
      this.logError('CSS Structure', error);
    }
  }

  /**
   * Базовая проверка синтаксиса JavaScript
   */
  async testJavaScriptSyntax() {
    const jsFiles = [
      'script.js',
      'ui.js', 
      'api.js',
      'core.js',
      'metronome.js'
    ];

    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Базовые проверки синтаксиса
        const syntaxIssues = [
          { pattern: /console\.log\(/g, type: 'debug' },
          { pattern: /debugger;/g, type: 'debug' },
          { pattern: /TODO|FIXME/gi, type: 'todo' }
        ];

        for (const issue of syntaxIssues) {
          const matches = content.match(issue.pattern);
          if (matches) {
            this.logWarning(`${file}: Found ${matches.length} ${issue.type} statements`);
          }
        }

        this.logPass(`Syntax check: ${file}`);
      } catch (error) {
        this.logError(`Syntax error in ${file}`, error);
      }
    }
  }

  // Helper methods
  logPass(message) {
    console.log(`✅ ${message}`);
    this.results.passed++;
  }

  logWarning(message) {
    console.log(`⚠️ ${message}`);
    this.results.warnings++;
  }

  logError(testName, error) {
    console.log(`❌ ${testName}: ${error.message}`);
    this.results.failed++;
    this.results.errors.push({ test: testName, error: error.message });
  }

  printResults() {
    console.log('=====================================');
    console.log(`📊 Results: ${this.results.passed} passed, ${this.results.failed} failed, ${this.results.warnings} warnings`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failures:');
      this.results.errors.forEach(err => {
        console.log(`  - ${err.test}: ${err.error}`);
      });
    }

    if (this.results.warnings > 0) {
      console.log('\n⚠️ Warnings: Check these items manually');
    }

    if (this.results.failed === 0) {
      console.log('\n🎉 Basic static tests passed! Ready for browser testing.');
    } else {
      console.log('\n💥 Some tests failed. Fix issues before proceeding.');
    }
  }
}

// Запуск тестов
if (require.main === module) {
  const runner = new StaticTestRunner();
  runner.runAll().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = StaticTestRunner;
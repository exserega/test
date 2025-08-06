# 🗺️ Карта зависимостей проекта Agape Worship

## 📊 Главные точки входа

### index.html
```
index.html
├── firebase-init.js (module)
├── script.js (module)
├── styles.css
├── sw.js (регистрация)
└── manifest.json
```

### script.js (главный контроллер)
```javascript
import * as state from './js/state.js';
import * as api from './js/api.js';
import * as ui from './ui.js';
import { initializeApp, onDOMContentLoaded } from './src/main/initialization.js';
```

### ui.js (legacy UI)
```javascript
import { SONG_CATEGORIES_ORDER, MIN_FONT_SIZE, chords } from './js/constants.js';
import * as state from './js/state.js';
import * as api from './js/api.js';
```

## 🔥 Firebase зависимости

### firebase-init.js
- Использует: `window.firebase` (из CDN)
- Экспортирует: `firebase`, `auth`, `db`, `storage`
- Импортируется в:
  - `index.html`
  - `js/firebase-config.js`

### js/firebase-config.js
```javascript
import { db, storage, auth, firebase } from '../firebase-init.js';
```
- Импортируется в:
  - `src/utils/firebase-v8-adapter.js`

### src/utils/firebase-v8-adapter.js
```javascript
import { db as firebaseDb } from '../../js/firebase-config.js';
```
- Импортируется в:
  - `src/api/index.js`
  - `src/js/api/*.js` (songs, setlists, favorites, repertoire, songEditing)

## 📁 Модули в /js/

### js/state.js
```javascript
export * from '../src/js/state/index.js';
```
- Импортируется в: `script.js`, `ui.js`, `src/api/index.js`, и др.

### js/api.js
```javascript
import * as api from '../src/api/index.js';
```
- Импортируется в: `script.js`, `ui.js`

### js/core.js
```javascript
export * from '../src/js/core/index.js';
```
- Импортируется в: `js/metronome.js`, `src/ui/overlay-manager.js`

### js/constants.js
- Импортируется в: `ui.js`, `js/core.js`, `src/main/initialization.js`

### js/metronome.js
```javascript
import * as core from './core.js';
```
- Импортируется в: `src/main/initialization.js`

## 🏗️ Основные модули /src/

### src/main/initialization.js
- Главный инициализатор приложения
- Импортирует: event-handlers, api, ui, metronome, constants, auth, workers

### src/main/controller.js
- Основная бизнес-логика
- Импортирует: core, api, state, ui

### src/main/event-handlers.js
- Все обработчики событий
- Импортирует: controller, core, ui, state

## 🔐 Модули аутентификации

### src/modules/auth/authCheck.js
- Центральный модуль проверки прав
- Используется во всех модулях требующих авторизации

### src/modules/auth/login.js
- Обработка входа через email/Google
- Создание профилей пользователей

### src/modules/auth/branchSelectionModal.js
- Выбор филиала при первом входе
- Создание заявок на вступление

## 👨‍💼 Админ модули

### src/modules/admin/adminCore.js
- Инициализация админ панели
- Импортирует все админ модули

### src/modules/admin/userManagement.js
- Управление пользователями
- Работа с ролями и статусами

## 🌿 Модули филиалов

### src/modules/branches/branchManager.js
- Управление филиалами
- CRUD операции

### src/modules/branches/transferRequests.js
- Заявки на перевод между филиалами

## 🎵 API модули

### src/api/index.js
- Центральный API модуль
- Использует firebase-v8-adapter

### src/js/api/songs.js
- Работа с песнями
- Импортирует state

### src/js/api/setlists.js
- Работа с сет-листами
- Транзакции Firebase

## 📱 PWA зависимости

### sw.js (Service Worker)
- Кэширует все критические файлы
- Версия: v22

### manifest.json
- Конфигурация PWA
- Иконки из /assets/images/

## ⚠️ Критические связи

1. **Firebase инициализация**:
   - `index.html` → `firebase-init.js` → `window.firebase`
   - Все Firebase операции зависят от этой цепочки

2. **Главный поток инициализации**:
   - `index.html` → `script.js` → `src/main/initialization.js`

3. **Legacy зависимости**:
   - `ui.js` импортируется в 10+ местах
   - Изменения в `ui.js` высокорискованны

4. **Реэкспорты в /js/**:
   - Обеспечивают обратную совместимость
   - Позволяют постепенную миграцию

## 🔄 Циклические зависимости
- Не обнаружены (хорошая архитектура)

## 📝 Примечания
- Проект в переходном состоянии между legacy и модульной архитектурой
- Двойная система импортов работает корректно
- Service Worker требует обновления версии при любых изменениях путей
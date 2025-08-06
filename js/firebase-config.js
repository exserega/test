// ====================================
// FIREBASE CONFIG - v8 API
// Экспорт Firebase сервисов для обратной совместимости
// ====================================

// Импортируем из единого файла инициализации
import { db, storage, auth, firebase } from '../firebase-init.js';

// Экспортируем для модулей, которые используют этот файл
export { db, storage, auth, firebase };

// Для обратной совместимости со старым кодом
export default { db, storage, auth, firebase }; 
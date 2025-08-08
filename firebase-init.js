// ====================================
// FIREBASE INITIALIZATION v8
// Единая точка инициализации Firebase для всего проекта
// ====================================

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBlkjVQFtFpMRFexAi6nBqEkIfjFlU5cDo",
    authDomain: "song-archive-389a6.firebaseapp.com",
    projectId: "song-archive-389a6",
    storageBucket: "song-archive-389a6.appspot.com",
    messagingSenderId: "619735277668",
    appId: "1:619735277668:web:51d2684bd8d4444eaf3f71",
    measurementId: "G-Z6QYH5YD2E"
};

// Проверяем, не инициализирован ли уже Firebase
if (!window.firebase) {
    console.error('Firebase SDK не загружен! Убедитесь, что скрипты Firebase подключены в HTML.');
} else if (!window.firebase.apps.length) {
    // Инициализируем Firebase только если еще не инициализирован
    window.firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase инициализирован');
} else {
    console.log('✅ Firebase уже был инициализирован');
}

// Создаем локальные переменные из глобального объекта
const firebase = window.firebase;
const auth = firebase?.auth?.();
const db = firebase?.firestore?.();
const storage = firebase?.storage?.();

// Делаем доступными глобально для обратной совместимости
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;

// Экспорт для модулей
export { firebase, auth, db, storage, firebaseConfig };
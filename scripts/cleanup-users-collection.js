/**
 * Скрипт для удаления песен, которые были неправильно добавлены в коллекцию users
 * ВНИМАНИЕ: Используйте с осторожностью!
 */

// Список ID документов, которые нужно удалить из коллекции users
const SONGS_TO_DELETE = [
    'Бог за нас в сражении',
    'В каждом вдохе (Ярче миллионов звезд...)'
];

// Инструкция:
// 1. Откройте Firebase Console
// 2. Перейдите в Firestore Database
// 3. Откройте коллекцию "users"
// 4. Найдите документы с ID из списка SONGS_TO_DELETE
// 5. Удалите их вручную
//
// ИЛИ используйте Firebase Admin SDK:
/*
const admin = require('firebase-admin');

async function cleanupUsersCollection() {
    const db = admin.firestore();
    
    for (const songId of SONGS_TO_DELETE) {
        try {
            await db.collection('users').doc(songId).delete();
            console.log(`Удален документ: ${songId}`);
        } catch (error) {
            console.error(`Ошибка удаления ${songId}:`, error);
        }
    }
}

cleanupUsersCollection();
*/
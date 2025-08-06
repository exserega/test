/**
 * Firebase Admin Helper для Cursor Agent
 * Позволяет работать с Firebase без MCP
 */

// Используем глобальный Firebase из CDN
const firebase = window.firebase;
const db = window.firebase?.firestore?.();
const auth = window.firebase?.auth?.();

// Вспомогательные функции
const FirebaseHelper = {
  // Получить всех пользователей
  async getAllUsers() {
    try {
      const usersSnapshot = await db.collection('users').get();
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      return [];
    }
  },

  // Получить пользователей по роли
  async getUsersByRole(role) {
    try {
      const usersSnapshot = await db.collection('users')
        .where('role', '==', role)
        .get();
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error('Ошибка получения пользователей по роли:', error);
      return [];
    }
  },

  // Получить песни
  async getSongs(category = null) {
    try {
      let query = db.collection('songs');
      if (category) {
        query = query.where('category', '==', category);
      }
      const songsSnapshot = await query.get();
      const songs = [];
      songsSnapshot.forEach(doc => {
        songs.push({ id: doc.id, ...doc.data() });
      });
      return songs;
    } catch (error) {
      console.error('Ошибка получения песен:', error);
      return [];
    }
  },

  // Получить филиалы
  async getBranches() {
    try {
      const branchesSnapshot = await db.collection('branches').get();
      const branches = [];
      branchesSnapshot.forEach(doc => {
        branches.push({ id: doc.id, ...doc.data() });
      });
      return branches;
    } catch (error) {
      console.error('Ошибка получения филиалов:', error);
      return [];
    }
  },

  // Создать заявку
  async createRequest(type, data) {
    try {
      const request = {
        type,
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      };
      const docRef = await db.collection('requests').add(request);
      return { id: docRef.id, ...request };
    } catch (error) {
      console.error('Ошибка создания заявки:', error);
      return null;
    }
  }
};

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseHelper;
}

// Делаем доступным глобально
window.FirebaseHelper = FirebaseHelper;
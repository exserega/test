/**
 * Офлайн хранилище для мобильного приложения
 * Использует IndexedDB для веб и Capacitor Storage для мобильных
 */

import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

class OfflineStorage {
  constructor() {
    this.dbName = 'AgapeOfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.isCapacitor = this.checkCapacitor();
    
    if (!this.isCapacitor) {
      this.initIndexedDB();
    }
  }

  checkCapacitor() {
    return window.Capacitor && window.Capacitor.isNativePlatform();
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Создаем хранилища
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('repertoire')) {
          db.createObjectStore('repertoire', { keyPath: 'songId' });
        }
        if (!db.objectStoreNames.contains('setlists')) {
          db.createObjectStore('setlists', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Универсальный метод сохранения
  async save(storeName, data) {
    if (this.isCapacitor) {
      await Preferences.set({
        key: storeName,
        value: JSON.stringify(data)
      });
    } else {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      if (Array.isArray(data)) {
        data.forEach(item => store.put(item));
      } else {
        store.put(data);
      }
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  // Универсальный метод загрузки
  async load(storeName, key = null) {
    if (this.isCapacitor) {
      const { value } = await Preferences.get({ key: storeName });
      return value ? JSON.parse(value) : null;
    } else {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        let request;
        
        if (key) {
          request = store.get(key);
        } else {
          request = store.getAll();
        }
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Сохранение всех песен
  async saveSongs(songs) {
    await this.save('songs', songs);
    await this.save('settings', {
      key: 'lastSongsSync',
      value: new Date().toISOString()
    });
  }

  // Загрузка песен
  async loadSongs() {
    return await this.load('songs');
  }

  // Проверка соединения
  async isOnline() {
    if (this.isCapacitor) {
      const status = await Network.getStatus();
      return status.connected;
    } else {
      return navigator.onLine;
    }
  }

  // Синхронизация с Firebase
  async syncWithFirebase() {
    const online = await this.isOnline();
    
    if (!online) {
      console.log('Офлайн режим - используем локальные данные');
      return false;
    }

    try {
      // Загружаем песни из Firebase
      const snapshot = await window.firebaseDb.collection('songs').get();
      const songs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Сохраняем локально
      await this.saveSongs(songs);
      
      console.log(`Синхронизировано ${songs.length} песен`);
      return true;
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      return false;
    }
  }
}

// Экспорт singleton
export const offlineStorage = new OfflineStorage();

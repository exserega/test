/**
 * Менеджер синхронизации данных
 */

import { offlineStorage } from './offlineStorage.js';
import { Network } from '@capacitor/network';

class SyncManager {
  constructor() {
    this.syncInterval = null;
    this.lastSync = null;
    this.init();
  }

  async init() {
    // Слушаем изменения сети
    if (window.Capacitor) {
      Network.addListener('networkStatusChange', status => {
        if (status.connected) {
          console.log('Сеть восстановлена - начинаем синхронизацию');
          this.performSync();
        }
      });
    } else {
      window.addEventListener('online', () => {
        console.log('Онлайн - синхронизация');
        this.performSync();
      });
    }

    // Первичная синхронизация
    await this.performSync();
    
    // Периодическая синхронизация каждые 5 минут
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 5 * 60 * 1000);
  }

  async performSync() {
    const online = await offlineStorage.isOnline();
    
    if (!online) {
      console.log('Офлайн - пропускаем синхронизацию');
      return;
    }

    try {
      // Синхронизируем песни
      await this.syncSongs();
      
      // Синхронизируем репертуар пользователя
      await this.syncRepertoire();
      
      // Синхронизируем настройки
      await this.syncSettings();
      
      this.lastSync = new Date();
      console.log('Синхронизация завершена:', this.lastSync);
      
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
    }
  }

  async syncSongs() {
    await offlineStorage.syncWithFirebase();
  }

  async syncRepertoire() {
    // Синхронизация репертуара пользователя
    if (!window.firebaseAuth?.currentUser) return;
    
    const userId = window.firebaseAuth.currentUser.uid;
    const snapshot = await window.firebaseDb
      .collection('users')
      .doc(userId)
      .collection('repertoire')
      .get();
    
    const repertoire = snapshot.docs.map(doc => ({
      songId: doc.id,
      ...doc.data()
    }));
    
    await offlineStorage.save('repertoire', repertoire);
  }

  async syncSettings() {
    // Синхронизация настроек пользователя
    const settings = {
      theme: localStorage.getItem('theme') || 'dark',
      fontSize: localStorage.getItem('songFontSize') || '14'
    };
    
    await offlineStorage.save('settings', {
      key: 'userSettings',
      value: settings
    });
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncManager = new SyncManager();

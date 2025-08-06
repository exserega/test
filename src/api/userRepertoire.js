/**
 * @fileoverview API для работы с репертуаром пользователя
 * @module UserRepertoireAPI
 */

import logger from '../utils/logger.js';
import { 
    db, 
    collection, 
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp 
} from '../utils/firebase-v8-adapter.js';
import { auth } from '../../firebase-init.js';

/**
 * Добавляет песню в репертуар пользователя
 * @param {Object} song - Объект песни
 * @param {string} preferredKey - Выбранная тональность
 * @returns {Promise<Object>} Результат операции
 */
export async function addToUserRepertoire(song, preferredKey) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }
        
        // В Firebase v8 нужно сначала получить документ пользователя, потом его коллекцию
        const userDocRef = doc(db, 'users', user.uid);
        const repertoireRef = userDocRef.collection('repertoire');
        const songDoc = repertoireRef.doc(song.id);
        
        // Проверяем, есть ли уже эта песня
        const existingDoc = await getDoc(songDoc);
        const bpmValue = song.BPM || song.bpm || song['Оригинальный BPM'] || null;
        
        if (existingDoc.exists) {
            const existingData = existingDoc.data();
            const existingKey = existingData.preferredKey;
            
            // Если песня уже есть в той же тональности
            if (existingKey === preferredKey) {
                logger.log(`ℹ️ Песня "${song.name}" уже есть в репертуаре в тональности ${preferredKey}`);
                return { 
                    status: 'exists', 
                    key: existingKey,
                    message: `Песня уже есть в репертуаре в тональности ${preferredKey}` 
                };
            }
            
            // Если песня есть в другой тональности
            logger.log(`⚠️ Песня "${song.name}" уже есть в репертуаре в тональности ${existingKey}`);
            return { 
                status: 'different_key', 
                key: existingKey,
                message: `Песня уже добавлена в репертуар в тональности ${existingKey}`
            };
        } else {
            // Добавляем новую песню
            logger.log(`🎵 Добавляем песню с BPM: ${bpmValue}, данные песни:`, song);
            
            await setDoc(songDoc, {
                name: song.name,
                category: song.sheet || song.category,
                preferredKey: preferredKey,
                BPM: bpmValue,
                addedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            logger.log(`✅ Песня "${song.name}" добавлена в репертуар с тональностью ${preferredKey} и BPM ${bpmValue}`);
            return { status: 'added', key: preferredKey };
        }
    } catch (error) {
        logger.error('❌ Ошибка добавления песни в репертуар:', error);
        throw error;
    }
}

/**
 * Заменяет тональность песни в репертуаре
 * @param {string} songId - ID песни  
 * @param {string} newKey - Новая тональность
 * @returns {Promise<Object>} Результат операции
 */
export async function replaceKeyInRepertoire(songId, newKey) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }
        
        const userDocRef = doc(db, 'users', user.uid);
        const songDoc = userDocRef.collection('repertoire').doc(songId);
        const existingDoc = await getDoc(songDoc);
        
        if (!existingDoc.exists) {
            throw new Error('Песня не найдена в репертуаре');
        }
        
        await setDoc(songDoc, {
            preferredKey: newKey,
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        logger.log(`✅ Тональность обновлена на ${newKey}`);
        return { status: 'replaced', key: newKey };
    } catch (error) {
        logger.error('❌ Ошибка замены тональности:', error);
        throw error;
    }
}

/**
 * Удаляет песню из репертуара пользователя
 * @param {string} songId - ID песни
 * @returns {Promise<void>}
 */
export async function removeFromUserRepertoire(songId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }
        
        // В Firebase v8 правильный путь к документу в подколлекции
        const userDocRef = doc(db, 'users', user.uid);
        const songDoc = userDocRef.collection('repertoire').doc(songId);
        await deleteDoc(songDoc);
        
        logger.log(`✅ Песня удалена из репертуара`);
    } catch (error) {
        logger.error('❌ Ошибка удаления песни из репертуара:', error);
        throw error;
    }
}

/**
 * Проверяет, есть ли песня в репертуаре пользователя
 * @param {string} songId - ID песни
 * @returns {Promise<Object|null>} Данные песни или null
 */
export async function checkSongInUserRepertoire(songId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return null;
        }
        
        // В Firebase v8 правильный путь к документу в подколлекции
        const userDocRef = doc(db, 'users', user.uid);
        const songDoc = userDocRef.collection('repertoire').doc(songId);
        const docSnap = await getDoc(songDoc);
        
        if (docSnap.exists) {
            return docSnap.data();
        }
        
        return null;
    } catch (error) {
        logger.error('❌ Ошибка проверки песни в репертуаре:', error);
        return null;
    }
}

/**
 * Получает весь репертуар пользователя
 * @returns {Promise<Array>} Массив песен
 */
export async function getUserRepertoire() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return [];
        }
        
        // В Firebase v8 правильный путь к подколлекции
        const userDocRef = doc(db, 'users', user.uid);
        const repertoireRef = userDocRef.collection('repertoire');
        const snapshot = await repertoireRef.get();
        
        const songs = [];
        snapshot.forEach(doc => {
            songs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return songs;
    } catch (error) {
        logger.error('❌ Ошибка получения репертуара:', error);
        return [];
    }
}
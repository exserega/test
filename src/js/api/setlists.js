// Agape Worship App - API: Setlists

import {
    db,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    runTransaction,
    serverTimestamp,
    onSnapshot
} from '../../utils/firebase-v8-adapter.js';

// Auth из глобального firebase v8
const auth = window.firebase?.auth?.() || null;

/**
 * Загружает все сетлисты из Firestore.
 * @returns {Promise<Array>} Массив объектов сетлистов.
 */
async function loadSetlists() {
    const setlistsCol = collection(db, "worship_setlists");
    const q = query(setlistsCol, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        console.log("No setlists found.");
        return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Создает новый сетлист в Firestore.
 * @param {string} name - Название нового сетлиста.
 * @returns {Promise<DocumentReference>} Ссылка на созданный документ.
 */
async function createSetlist(name) {
    if (!name || name.trim() === '') {
        throw new Error("Setlist name cannot be empty.");
    }
    const setlistsCol = collection(db, "worship_setlists");
    return await addDoc(setlistsCol, {
        name: name.trim(),
        createdAt: serverTimestamp(),
        songs: [] // Инициализируем пустым массивом песен
    });
}

/**
 * Удаляет сетлист из Firestore.
 * @param {string} setlistId - ID удаляемого сетлиста.
 */
async function deleteSetlist(setlistId) {
    if (!setlistId) return;
    const docRef = doc(db, 'worship_setlists', setlistId);
    await deleteDoc(docRef);
}

/**
 * Обновляет название сетлиста.
 * @param {string} setlistId - ID сетлиста.
 * @param {string} newName - Новое название.
 */
async function updateSetlistName(setlistId, newName) {
    if (!setlistId || !newName || newName.trim() === '') {
        throw new Error("Setlist ID and name cannot be empty.");
    }
    const setlistRef = doc(db, 'worship_setlists', setlistId);
    return await updateDoc(setlistRef, { name: newName.trim() });
}

/**
 * Добавляет песню в массив `songs` документа сетлиста или предлагает обновить ключ.
 * @param {string} setlistId
 * @param {string} songId
 * @param {string} preferredKey
 * @returns {Promise<{status: string, existingKey?: string, message?: string}>}
 */
async function addSongToSetlist(setlistId, songId, preferredKey) {
    console.log('=== API addSongToSetlist START ===');
    console.log('setlistId:', setlistId);
    console.log('songId:', songId);
    console.log('preferredKey:', preferredKey);
    
    const setlistRef = doc(db, "worship_setlists", setlistId);
    let result = {};
    
    try {
        await runTransaction(db, async (transaction) => {
            console.log('Getting setlist document...');
            const setlistDoc = await transaction.get(setlistRef);
            if (!setlistDoc.exists) {
                console.error('Setlist does not exist!');
                throw new Error("Setlist does not exist!");
            }

            const songs = setlistDoc.data().songs || [];
            console.log('Current songs in setlist:', songs);
            
            const existingSongIndex = songs.findIndex(s => s.songId === songId);
            console.log('Existing song index:', existingSongIndex);

            if (existingSongIndex > -1) {
                const existingSong = songs[existingSongIndex];
                console.log('Found existing song:', existingSong);
                if (existingSong.preferredKey !== preferredKey) {
                    result = { status: 'duplicate_key', existingKey: existingSong.preferredKey };
                    console.log('Song exists with different key');
                } else {
                    result = { status: 'duplicate_same' };
                    console.log('Song exists with same key');
                }
            } else {
                console.log('Adding new song to setlist...');
                songs.push({ songId, preferredKey, order: songs.length });
                console.log('Updated songs array:', songs);
                transaction.update(setlistRef, { songs });
                result = { status: 'added' };
                console.log('Song added successfully');
            }
        });
    } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
    }
    
    console.log('=== API addSongToSetlist END ===');
    console.log('Final result:', result);
    return result;
}

/**
 * Обновляет тональность существующей песни в сетлисте.
 * @param {string} setlistId
 * @param {string} songId
 * @param {string} newKey
 */
async function updateSongKeyInSetlist(setlistId, songId, newKey) {
    const setlistRef = doc(db, "worship_setlists", setlistId);
     return await updateDoc(setlistRef, {
        songs: (await getDocs(query(collection(db, "worship_setlists"), where("id", "==", setlistId)))).docs[0].data().songs.map(s => s.songId === songId ? { ...s, preferredKey: newKey } : s)
    });
}

/**
 * Удаляет песню из массива `songs` в документе сетлиста.
 * @param {string} setlistId
 * @param {string} songIdToRemove
 */
async function removeSongFromSetlist(setlistId, songIdToRemove) {
    const setlistRef = doc(db, "worship_setlists", setlistId);
    return await updateDoc(setlistRef, {
        songs: (await getDocs(query(collection(db, "worship_setlists"), where("id", "==", setlistId)))).docs[0].data().songs.filter(song => song.songId !== songIdToRemove)
    });
}

export {
    loadSetlists,
    createSetlist,
    deleteSetlist,
    updateSetlistName,
    addSongToSetlist,
    updateSongKeyInSetlist,
    removeSongFromSetlist
}; 
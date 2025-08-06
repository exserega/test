// Agape Worship App - API: Favorites (My List)

import {
    db,
    doc,
    updateDoc,
    deleteField
} from '../../utils/firebase-v8-adapter.js';

// Auth из глобального firebase v8
const auth = window.firebase?.auth?.() || null;

/** Добавляет или обновляет песню в "Моем списке" */
async function addToFavorites(songId, preferredKey) {
    const favoritesDocRef = doc(db, "favorites", "main_list");
    let result = { status: 'no-change' };

    await updateDoc(favoritesDocRef, {
        [`songs.${songId}.preferredKey`]: preferredKey
    });

    return result;
}

/** Удаление песни из избранного */
async function removeFromFavorites(songIdToRemove) {
    const favoritesDocRef = doc(db, "favorites", "main_list");
    await updateDoc(favoritesDocRef, {
        [`songs.${songIdToRemove}`]: deleteField()
    });
}

export {
    addToFavorites,
    removeFromFavorites
}; 
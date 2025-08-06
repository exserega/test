// ====================================
// API.JS - Legacy compatibility layer
// Реэкспорт всех API функций для обратной совместимости
// ====================================

// Import from new centralized API structure
import * as api from '../src/api/index.js';

// Re-export all functions for backward compatibility
export const loadAllSongsFromFirestore = api.loadAllSongsFromFirestore;
export const loadVocalists = api.loadVocalists;
export const loadRepertoire = api.loadRepertoire;
export const toggleFavorite = api.toggleFavorite;
export const updateFavoritesCounter = api.updateFavoritesCounter;
export const loadSetlists = api.loadSetlists;
export const createSetlist = api.createSetlist;
export const deleteSetlist = api.deleteSetlist;
export const renameSetlist = api.renameSetlist;
export const updateSongInRepertoire = api.updateSongInRepertoire;
export const updateNotesForSong = api.updateNotesForSong;
export const saveSongEdit = api.saveSongEdit;
export const addSongToSetlist = api.addSongToSetlist;
export const removeSongFromSetlist = api.removeSongFromSetlist;
export const toggleRepertoireEntry = api.toggleRepertoireEntry;

// Export the entire api object for those who import it as a namespace
export default api; 
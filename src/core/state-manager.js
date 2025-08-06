/**
 * @fileoverview State Manager - Централизованное управление состоянием приложения
 * @module StateManager
 * @version 1.0.0
 * @author Agape Worship Team
 * @since 2024
 */

import eventBus from './event-bus.js';

// ====================================
// TYPES & INTERFACES (JSDoc)
// ====================================

/**
 * @typedef {Object} Song
 * @property {string} id - Song ID
 * @property {string} name - Song name
 * @property {string} [sheet] - Song category
 * @property {string} [BPM] - Beats per minute
 * @property {string} ['Оригинальная тональность'] - Original key
 * @property {string} ['Текст и аккорды'] - Lyrics with chords
 */

/**
 * @typedef {Object} Setlist
 * @property {string} id - Setlist ID
 * @property {string} name - Setlist name
 * @property {Song[]} songs - Array of songs
 * @property {Date} createdAt - Creation date
 */

/**
 * @typedef {Object} AppState
 * @property {Song[]} allSongs - All available songs
 * @property {Song|null} currentSong - Currently selected song
 * @property {string} currentKey - Current transposition key
 * @property {Setlist[]} setlists - All setlists
 * @property {string|null} activeSetlistId - Currently active setlist
 * @property {string} searchQuery - Current search query
 * @property {string} selectedCategory - Selected song category
 */

// ====================================
// STATE MANAGER CLASS
// ====================================

/**
 * Централизованный менеджер состояния приложения
 * @class
 */
export class StateManager {
  /**
   * Constructor
   * @param {Object} eventBus - Event bus instance
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.debug = false;
    
    // Инициализация состояния
    this._initializeState();
    this._bindMethods();
    
    if (this.debug) {
      console.log('🗃️ StateManager initialized');
    }
  }

  /**
   * Инициализация базового состояния
   * @private
   */
  _initializeState() {
    const initialState = {
      // Пользователь
      currentUser: null,
      
      // Песни
      allSongs: [],
      currentSong: null,
      currentKey: null,
      
      // Сет-листы
      setlists: [],
      activeSetlistId: null,
      activeSetlistName: null,
      
      // UI состояние  
      searchQuery: '',
      selectedCategory: '',
      activeOverlayMode: null,
      
      // Метроном
      metronomeActive: false,
      metronomeBPM: null,
      
      // Презентация
      presentationMode: false,
      presentationSong: null,
      
      // Мобильный overlay
      mobileSong: null,
      mobileOverlayActive: false
    };

    // Устанавливаем начальное состояние
    Object.entries(initialState).forEach(([key, value]) => {
      this.eventBus.setState(key, value, true); // silent = true
    });
  }

  /**
   * Bind methods to maintain context
   * @private
   */
  _bindMethods() {
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
    this.getAllSongs = this.getAllSongs.bind(this);
    this.setAllSongs = this.setAllSongs.bind(this);
    this.getCurrentSong = this.getCurrentSong.bind(this);
    this.setCurrentSong = this.setCurrentSong.bind(this);
  }

  // ====================================
  // GENERAL STATE METHODS
  // ====================================

  /**
   * Get state value
   * @param {string} key - State key
   * @param {*} defaultValue - Default value
   * @returns {*} State value
   */
  getState(key, defaultValue = undefined) {
    return this.eventBus.getState(key, defaultValue);
  }

  /**
   * Set state value
   * @param {string} key - State key
   * @param {*} value - State value
   * @param {boolean} silent - Don't emit events
   * @returns {boolean} Success status
   */
  setState(key, value, silent = false) {
    return this.eventBus.setState(key, value, silent);
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Change callback
   * @returns {string} Listener ID
   */
  onStateChange(key, callback) {
    return this.eventBus.on(`state:change:${key}`, callback);
  }

  /**
   * Unsubscribe from state changes
   * @param {string} listenerId - Listener ID
   * @returns {boolean} Success status
   */
  offStateChange(listenerId) {
    return this.eventBus.off(listenerId);
  }

  // ====================================
  // SONGS MANAGEMENT
  // ====================================

  /**
   * Get all songs
   * @returns {Song[]} Array of all songs
   */
  getAllSongs() {
    return this.getState('allSongs', []);
  }

  /**
   * Set all songs
   * @param {Song[]} songs - Array of songs
   * @returns {boolean} Success status
   */
  setAllSongs(songs) {
    if (!Array.isArray(songs)) {
      console.error('StateManager.setAllSongs: songs must be array');
      return false;
    }

    this.setState('allSongs', songs);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Set ${songs.length} songs`);
    }
    
    return true;
  }

  /**
   * Get song by ID
   * @param {string} songId - Song ID
   * @returns {Song|null} Song object or null
   */
  getSongById(songId) {
    const allSongs = this.getAllSongs();
    return allSongs.find(song => song.id === songId) || null;
  }

  /**
   * Get current song
   * @returns {Song|null} Current song
   */
  getCurrentSong() {
    return this.getState('currentSong', null);
  }

  /**
   * Set current song
   * @param {Song|null} song - Song to set as current
   * @returns {boolean} Success status
   */
  setCurrentSong(song) {
    if (song && typeof song !== 'object') {
      console.error('StateManager.setCurrentSong: song must be object or null');
      return false;
    }

    this.setState('currentSong', song);
    
    // Автоматически устанавливаем оригинальную тональность
    if (song) {
      const originalKey = song['Оригинальная тональность'] || song.originalKey || 'C';
      this.setState('currentKey', originalKey);
      
      if (this.debug) {
        console.log(`🗃️ StateManager: Set current song: ${song.name} (${originalKey})`);
      }
    } else {
      this.setState('currentKey', null);
      
      if (this.debug) {
        console.log('🗃️ StateManager: Cleared current song');
      }
    }
    
    return true;
  }
  
  /**
   * Set current user
   * @param {Object|null} user - User object or null
   * @returns {boolean} Success status
   */
  setCurrentUser(user) {
    if (user && typeof user !== 'object') {
      console.error('StateManager.setCurrentUser: user must be object or null');
      return false;
    }
    
    this.setState('currentUser', user);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Set current user: ${user?.email || user?.phone || 'null'}`);
    }
    
    // Emit user change event
    this.eventBus.emit('userChanged', user);
    
    return true;
  }
  
  /**
   * Get current user
   * @returns {Object|null} Current user
   */
  getCurrentUser() {
    return this.getState('currentUser', null);
  }

  /**
   * Get current transposition key
   * @returns {string|null} Current key
   */
  getCurrentKey() {
    return this.getState('currentKey', null);
  }

  /**
   * Set current transposition key
   * @param {string|null} key - Key to set
   * @returns {boolean} Success status
   */
  setCurrentKey(key) {
    if (key && typeof key !== 'string') {
      console.error('StateManager.setCurrentKey: key must be string or null');
      return false;
    }

    this.setState('currentKey', key);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Set current key: ${key}`);
    }
    
    return true;
  }

  // ====================================
  // SETLISTS MANAGEMENT
  // ====================================

  /**
   * Get all setlists
   * @returns {Setlist[]} Array of setlists
   */
  getAllSetlists() {
    return this.getState('setlists', []);
  }

  /**
   * Set all setlists
   * @param {Setlist[]} setlists - Array of setlists
   * @returns {boolean} Success status
   */
  setAllSetlists(setlists) {
    if (!Array.isArray(setlists)) {
      console.error('StateManager.setAllSetlists: setlists must be array');
      return false;
    }

    this.setState('setlists', setlists);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Set ${setlists.length} setlists`);
    }
    
    return true;
  }

  /**
   * Get setlist by ID
   * @param {string} setlistId - Setlist ID
   * @returns {Setlist|null} Setlist or null
   */
  getSetlistById(setlistId) {
    const setlists = this.getAllSetlists();
    return setlists.find(setlist => setlist.id === setlistId) || null;
  }

  /**
   * Get active setlist
   * @returns {Setlist|null} Active setlist
   */
  getActiveSetlist() {
    const activeId = this.getState('activeSetlistId');
    return activeId ? this.getSetlistById(activeId) : null;
  }

  /**
   * Set active setlist
   * @param {string|null} setlistId - Setlist ID to set as active
   * @returns {boolean} Success status
   */
  setActiveSetlist(setlistId) {
    if (setlistId && typeof setlistId !== 'string') {
      console.error('StateManager.setActiveSetlist: setlistId must be string or null');
      return false;
    }

    const setlist = setlistId ? this.getSetlistById(setlistId) : null;
    
    this.setState('activeSetlistId', setlistId);
    this.setState('activeSetlistName', setlist ? setlist.name : null);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Set active setlist: ${setlist ? setlist.name : 'none'}`);
    }
    
    return true;
  }

  // ====================================
  // SEARCH & UI STATE
  // ====================================

  /**
   * Get search query
   * @returns {string} Current search query
   */
  getSearchQuery() {
    return this.getState('searchQuery', '');
  }

  /**
   * Set search query
   * @param {string} query - Search query
   * @returns {boolean} Success status
   */
  setSearchQuery(query) {
    if (typeof query !== 'string') {
      console.error('StateManager.setSearchQuery: query must be string');
      return false;
    }

    this.setState('searchQuery', query);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Set search query: "${query}"`);
    }
    
    return true;
  }

  /**
   * Get selected category
   * @returns {string} Selected category
   */
  getSelectedCategory() {
    return this.getState('selectedCategory', '');
  }

  /**
   * Set selected category
   * @param {string} category - Category to select
   * @returns {boolean} Success status
   */
  setSelectedCategory(category) {
    if (typeof category !== 'string') {
      console.error('StateManager.setSelectedCategory: category must be string');
      return false;
    }

    this.setState('selectedCategory', category);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Set selected category: "${category}"`);
    }
    
    return true;
  }

  // ====================================
  // PRESENTATION MODE
  // ====================================

  /**
   * Check if presentation mode is active
   * @returns {boolean} Whether presentation mode is active
   */
  isPresentationMode() {
    return this.getState('presentationMode', false);
  }

  /**
   * Set presentation mode
   * @param {boolean} active - Whether to activate presentation mode
   * @param {Song|null} song - Song for presentation
   * @returns {boolean} Success status
   */
  setPresentationMode(active, song = null) {
    this.setState('presentationMode', !!active);
    this.setState('presentationSong', active ? song : null);
    
    if (this.debug) {
      console.log(`🗃️ StateManager: Presentation mode ${active ? 'activated' : 'deactivated'}`);
    }
    
    return true;
  }

  // ====================================
  // UTILITY METHODS
  // ====================================

  /**
   * Get full state snapshot
   * @returns {Object} Complete state object
   */
  getFullState() {
    const stateKeys = this.eventBus.getStateKeys();
    const state = {};
    
    stateKeys.forEach(key => {
      state[key] = this.eventBus.getState(key);
    });
    
    return state;
  }

  /**
   * Clear all state
   * @returns {boolean} Success status
   */
  clearState() {
    this.eventBus.clear();
    this._initializeState();
    
    if (this.debug) {
      console.log('🗃️ StateManager: State cleared and reinitialized');
    }
    
    return true;
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Whether to enable debug
   */
  setDebug(enabled) {
    this.debug = !!enabled;
    this.eventBus.setDebug(enabled);
    console.log(`🐛 StateManager: Debug ${this.debug ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get state statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const eventBusStats = this.eventBus.getStats();
    const allSongs = this.getAllSongs();
    const setlists = this.getAllSetlists();
    
    return {
      ...eventBusStats,
      songsCount: allSongs.length,
      setlistsCount: setlists.length,
      currentSong: this.getCurrentSong()?.name || 'none',
      activeSetlist: this.getActiveSetlist()?.name || 'none'
    };
  }
}

// ====================================
// GLOBAL INSTANCE
// ====================================

/**
 * Global StateManager instance
 * @type {StateManager}
 */
export const stateManager = new StateManager(eventBus);

/**
 * Default export - global instance
 */
export default stateManager;
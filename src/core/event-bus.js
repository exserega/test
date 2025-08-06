/**
 * @fileoverview Event Bus - Централизованная система событий и состояния
 * @module EventBus
 * @version 1.0.0
 * @author Agape Worship Team
 * @since 2024
 */

// ====================================
// TYPES & INTERFACES (JSDoc)
// ====================================

/**
 * @typedef {Object} EventListener
 * @property {string} id - Unique listener ID
 * @property {Function} callback - Event callback function
 * @property {boolean} once - Whether to call only once
 */

/**
 * @typedef {Object} StateChangeEvent
 * @property {string} key - State key that changed
 * @property {*} newValue - New value
 * @property {*} oldValue - Previous value
 * @property {Date} timestamp - Change timestamp
 */

// ====================================
// EVENT BUS CLASS
// ====================================

/**
 * Централизованная система событий и состояния
 * Заменяет глобальные window.* переменные
 * @class
 */
export class EventBus {
  /**
   * Constructor
   */
  constructor() {
    this.events = new Map();
    this.state = new Map();
    this.listeners = new Map();
    this.listenerIdCounter = 0;
    
    // Логирование для отладки
    this.debug = false;
    
    this._bindMethods();
    
    if (this.debug) {
      console.log('🚌 EventBus initialized');
    }
  }

  /**
   * Bind methods to maintain context
   * @private
   */
  _bindMethods() {
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.once = this.once.bind(this);
    this.setState = this.setState.bind(this);
    this.getState = this.getState.bind(this);
  }

  // ====================================
  // EVENT METHODS
  // ====================================

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   * @returns {string} Listener ID for unsubscribing
   */
  on(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') {
      throw new Error('EventBus.on: eventName must be string, callback must be function');
    }

    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listenerId = `listener_${++this.listenerIdCounter}`;
    const listener = {
      id: listenerId,
      callback,
      once: false
    };

    this.events.get(eventName).push(listener);
    this.listeners.set(listenerId, { eventName, listener });

    if (this.debug) {
      console.log(`📡 EventBus: Subscribed to '${eventName}' (ID: ${listenerId})`);
    }

    return listenerId;
  }

  /**
   * Subscribe to an event (one-time only)
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   * @returns {string} Listener ID
   */
  once(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') {
      throw new Error('EventBus.once: eventName must be string, callback must be function');
    }

    const listenerId = this.on(eventName, (...args) => {
      callback(...args);
      this.off(listenerId);
    });

    // Mark as once listener
    const listenerData = this.listeners.get(listenerId);
    if (listenerData) {
      listenerData.listener.once = true;
    }

    return listenerId;
  }

  /**
   * Unsubscribe from an event
   * @param {string} listenerId - Listener ID returned by on() or once()
   * @returns {boolean} Success status
   */
  off(listenerId) {
    const listenerData = this.listeners.get(listenerId);
    if (!listenerData) {
      if (this.debug) {
        console.warn(`⚠️ EventBus: Listener ${listenerId} not found`);
      }
      return false;
    }

    const { eventName, listener } = listenerData;
    const eventListeners = this.events.get(eventName);
    
    if (eventListeners) {
      const index = eventListeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        eventListeners.splice(index, 1);
        
        // Clean up empty event arrays
        if (eventListeners.length === 0) {
          this.events.delete(eventName);
        }
      }
    }

    this.listeners.delete(listenerId);

    if (this.debug) {
      console.log(`🗑️ EventBus: Unsubscribed from '${eventName}' (ID: ${listenerId})`);
    }

    return true;
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {...*} args - Event arguments
   * @returns {number} Number of listeners called
   */
  emit(eventName, ...args) {
    if (typeof eventName !== 'string') {
      throw new Error('EventBus.emit: eventName must be string');
    }

    const eventListeners = this.events.get(eventName);
    if (!eventListeners || eventListeners.length === 0) {
      if (this.debug) {
        console.log(`📢 EventBus: No listeners for '${eventName}'`);
      }
      return 0;
    }

    let callCount = 0;
    const listenersToRemove = [];

    for (const listener of eventListeners) {
      try {
        listener.callback(...args);
        callCount++;

        if (listener.once) {
          listenersToRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`❌ EventBus: Error in listener for '${eventName}':`, error);
      }
    }

    // Remove one-time listeners
    listenersToRemove.forEach(id => this.off(id));

    if (this.debug) {
      console.log(`📢 EventBus: Emitted '${eventName}' to ${callCount} listeners`);
    }

    return callCount;
  }

  // ====================================
  // STATE METHODS
  // ====================================

  /**
   * Set state value
   * @param {string} key - State key
   * @param {*} value - State value
   * @param {boolean} silent - Don't emit change event
   * @returns {boolean} Success status
   */
  setState(key, value, silent = false) {
    if (typeof key !== 'string') {
      throw new Error('EventBus.setState: key must be string');
    }

    const oldValue = this.state.get(key);
    this.state.set(key, value);

    if (!silent && oldValue !== value) {
      this.emit('state:change', {
        key,
        newValue: value,
        oldValue,
        timestamp: new Date()
      });

      this.emit(`state:change:${key}`, {
        newValue: value,
        oldValue,
        timestamp: new Date()
      });
    }

    if (this.debug) {
      console.log(`💾 EventBus: State '${key}' =`, value);
    }

    return true;
  }

  /**
   * Get state value
   * @param {string} key - State key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} State value
   */
  getState(key, defaultValue = undefined) {
    if (typeof key !== 'string') {
      throw new Error('EventBus.getState: key must be string');
    }

    return this.state.has(key) ? this.state.get(key) : defaultValue;
  }

  /**
   * Check if state key exists
   * @param {string} key - State key
   * @returns {boolean} Whether key exists
   */
  hasState(key) {
    return this.state.has(key);
  }

  /**
   * Delete state key
   * @param {string} key - State key
   * @returns {boolean} Success status
   */
  deleteState(key) {
    const existed = this.state.has(key);
    const oldValue = this.state.get(key);
    
    this.state.delete(key);

    if (existed) {
      this.emit('state:delete', {
        key,
        oldValue,
        timestamp: new Date()
      });

      this.emit(`state:delete:${key}`, {
        oldValue,
        timestamp: new Date()
      });
    }

    if (this.debug) {
      console.log(`🗑️ EventBus: Deleted state '${key}'`);
    }

    return existed;
  }

  // ====================================
  // UTILITY METHODS
  // ====================================

  /**
   * Get all event names
   * @returns {string[]} Array of event names
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get all state keys
   * @returns {string[]} Array of state keys
   */
  getStateKeys() {
    return Array.from(this.state.keys());
  }

  /**
   * Clear all events and state
   */
  clear() {
    this.events.clear();
    this.state.clear();
    this.listeners.clear();
    this.listenerIdCounter = 0;

    if (this.debug) {
      console.log('🧹 EventBus: Cleared all events and state');
    }
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Whether to enable debug
   */
  setDebug(enabled) {
    this.debug = !!enabled;
    console.log(`🐛 EventBus: Debug ${this.debug ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      eventCount: this.events.size,
      stateCount: this.state.size,
      listenerCount: this.listeners.size,
      totalListeners: Array.from(this.events.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

// ====================================
// GLOBAL INSTANCE
// ====================================

/**
 * Global EventBus instance
 * @type {EventBus}
 */
export const eventBus = new EventBus();

/**
 * Default export - global instance
 */
export default eventBus;
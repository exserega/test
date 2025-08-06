// =====================================================================
// New Metronome Module - v4.0 - Correct Implementation
// =====================================================================

import * as core from './core.js';

class MetronomeController {
    constructor() {
        this.currentBPM = 120;
        this.originalBPM = null;
        this.isActive = false;
        this.isDragging = false;
        this.currentSongBPM = null;
        this.audioInitialized = false;
        
        // DOM elements
        this.elements = {
            // Control bar elements (under song)
            controlBar: document.querySelector('.metronome-control-bar'),
            openBtn: document.getElementById('open-metronome-overlay'),
            currentBpmValue: document.getElementById('current-bpm-value'),
            playToggle: document.getElementById('metronome-play-toggle'),
            playToggleIcon: document.querySelector('#metronome-play-toggle i'),
            playToggleText: document.querySelector('#metronome-play-toggle .play-text'),
            
            // Overlay elements
            overlay: document.getElementById('metronome-overlay'),
            closeBtn: document.getElementById('close-metronome-overlay'),
            bpmInput: document.getElementById('metronome-bpm-input'),
            timeSignature: document.getElementById('metronome-time-signature'),
            decreaseBtn: document.getElementById('metronome-bpm-decrease'),
            increaseBtn: document.getElementById('metronome-bpm-increase'),
            playButton: document.getElementById('metronome-play-button'),
            playIcon: document.querySelector('#metronome-play-button i'),
            
            // Slider elements
            sliderTrack: document.querySelector('.bpm-slider-track'),
            sliderProgress: document.getElementById('bpm-slider-progress'),
            sliderHandle: document.getElementById('bpm-slider-handle'),
            
            // Visual indicator elements
            beatDotsContainer: document.getElementById('beat-dots-container'),
            
            // Settings elements
            accentCheckbox: document.getElementById('metronome-accent-enabled')
        };
        
        // Visual indicator state
        this.currentVisualBeat = 0;
        this.visualUpdateInterval = null;
        
        // Settings state
        this.accentEnabled = localStorage.getItem('metronome-accent-enabled') !== 'false';
        
        this.init();
    }

    init() {
        console.log('Initializing new metronome v4.0...');
        
        // Check if all required elements exist
        const missingElements = [];
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                missingElements.push(key);
            }
        }
        
        if (missingElements.length > 0) {
            console.error('Missing metronome elements:', missingElements);
            return;
        }
        
        try {
            this.setupEventListeners();
            this.updateDisplay();
            this.updateSliderVisuals();
            this.setupVisualIndicator();
            this.setupAccentToggle();
            console.log('Metronome initialized successfully');
        } catch (error) {
            console.error('Error initializing metronome:', error);
        }
    }

    setupEventListeners() {
        // Control bar events
        if (this.elements.openBtn) {
            this.elements.openBtn.addEventListener('click', () => this.openOverlay());
        }
        
        if (this.elements.playToggle) {
            this.elements.playToggle.addEventListener('click', () => this.toggleMetronome());
        }
        
        // Overlay controls
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.closeOverlay());
        }
        
        // Close overlay on background click
        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', (e) => {
                if (e.target === this.elements.overlay) {
                    this.closeOverlay();
                }
            });
        }
        
        // BPM Input
        if (this.elements.bpmInput) {
            this.elements.bpmInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 40 && value <= 200) {
                    this.setBPM(value, false, true, true);
                }
            });
            
            // Allow manual input by clicking on the field
            this.elements.bpmInput.addEventListener('focus', () => {
                this.elements.bpmInput.select();
            });
        }

        // Control buttons
        if (this.elements.decreaseBtn) {
            this.elements.decreaseBtn.addEventListener('click', () => {
                this.adjustBPM(-1);
            });
        }

        if (this.elements.increaseBtn) {
            this.elements.increaseBtn.addEventListener('click', () => {
                this.adjustBPM(1);
            });
        }

        // Overlay play button
        if (this.elements.playButton) {
            this.elements.playButton.addEventListener('click', () => {
                this.toggleMetronome();
            });
        }

        // Time signature change
        if (this.elements.timeSignature) {
            this.elements.timeSignature.addEventListener('change', () => {
                if (this.isActive) {
                    // Перезапускаем метроном с новым размером
                    this.toggleMetronome(); // Остановить
                    setTimeout(() => {
                        this.toggleMetronome(); // Запустить снова
                    }, 50);
                }
            });
        }

        // Slider events
        this.setupSliderEvents();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.elements.overlay && this.elements.overlay.style.display === 'flex') {
                if (e.key === 'Escape') {
                    this.closeOverlay();
                } else if (e.key === ' ') {
                    e.preventDefault();
                    this.toggleMetronome();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.adjustBPM(1);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.adjustBPM(-1);
                }
            }
        });
    }

    setupSliderEvents() {
        if (!this.elements.sliderTrack || !this.elements.sliderHandle) return;

        // Mouse events
        this.elements.sliderHandle.addEventListener('mousedown', this.startDrag.bind(this));
        this.elements.sliderTrack.addEventListener('mousedown', this.handleTrackClick.bind(this));
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));

        // Touch events
        this.elements.sliderHandle.addEventListener('touchstart', this.startDrag.bind(this));
        this.elements.sliderTrack.addEventListener('touchstart', this.handleTrackClick.bind(this));
        document.addEventListener('touchmove', this.handleDrag.bind(this));
        document.addEventListener('touchend', this.endDrag.bind(this));
        
        // Prevent context menu
        this.elements.sliderHandle.addEventListener('contextmenu', (e) => e.preventDefault());
        this.elements.sliderTrack.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    startDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
        this.startBPM = this.currentBPM;
        
        const rect = this.elements.sliderTrack.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        this.startX = clientX - rect.left;
        
        // Visual feedback
        this.elements.sliderHandle.style.transform = 'translateY(-50%) scale(1.1)';
        document.body.style.cursor = 'grabbing';
        
        console.log('Started dragging slider at BPM:', this.startBPM);
    }

    handleTrackClick(e) {
        if (e.target === this.elements.sliderHandle) return;
        
        const rect = this.elements.sliderTrack.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clickX = clientX - rect.left;
        const trackWidth = rect.width;
        
        // Calculate BPM based on click position
        const percentage = Math.max(0, Math.min(1, clickX / trackWidth));
        const newBPM = Math.round(40 + (160 * percentage));
        
        this.setBPM(newBPM, true, true, true);
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        
        const rect = this.elements.sliderTrack.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const currentX = clientX - rect.left;
        const trackWidth = rect.width;
        
        // Calculate percentage and new BPM
        const percentage = Math.max(0, Math.min(1, currentX / trackWidth));
        const newBPM = Math.round(40 + (160 * percentage));
        
        // Update BPM immediately during drag - this is the key fix
        this.currentBPM = newBPM;
        
        // Update all displays in real-time
        if (this.elements.bpmInput) {
            this.elements.bpmInput.value = this.currentBPM;
        }
        this.updateControlBarDisplay();
        this.updateSliderVisuals();
    }

    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Reset visual feedback
        this.elements.sliderHandle.style.transform = 'translateY(-50%) scale(1)';
        document.body.style.cursor = '';
        
        // Final BPM update
        this.setBPM(this.currentBPM, true, false, true);
        
        console.log('Finished dragging slider at BPM:', this.currentBPM);
    }

    openOverlay() {
        if (this.elements.overlay) {
            this.elements.overlay.style.display = 'flex';
            // Force reflow and add animation class
            this.elements.overlay.offsetHeight;
            this.elements.overlay.classList.add('active');
            
            // Don't auto-focus on BPM input to prevent keyboard popup on mobile
            // User can manually tap if they want to edit
        }
    }

    closeOverlay() {
        if (this.elements.overlay) {
            this.elements.overlay.classList.remove('active');
            setTimeout(() => {
                this.elements.overlay.style.display = 'none';
            }, 300);
        }
    }

    setBPM(bpm, updateInput = true, updateSlider = true, updateControlBar = true) {
        this.currentBPM = Math.max(40, Math.min(200, bpm));
        
        if (updateInput && this.elements.bpmInput) {
            this.elements.bpmInput.value = this.currentBPM;
        }
        
        if (updateSlider) {
            this.updateSliderVisuals();
        }
        
        if (updateControlBar) {
            this.updateControlBarDisplay();
        }

        if (this.isActive) {
            this.restartMetronome();
        }
    }

    adjustBPM(increment) {
        this.setBPM(this.currentBPM + increment, true, true, true);
    }

    async toggleMetronome() {
        try {
            // Инициализируем аудио контекст при первом клике (важно для мобильных)
            if (!this.audioInitialized) {
                await core.initAudioOnUserGesture();
                this.audioInitialized = true;
            }
            
            const beats = parseInt(this.elements.timeSignature?.value || '4', 10);
            const result = await core.toggleMetronome(this.currentBPM, beats);
            
            if (result.error) {
                console.error('Ошибка метронома:', result.error);
                // Не показываем alert для лучшего UX
                return;
            }
            
            this.isActive = result.isActive;
            this.updatePlayButtons();
            
            // Управление визуальным индикатором
            if (this.isActive) {
                this.startVisualIndicator();
            } else {
                this.stopVisualIndicator();
            }
            
        } catch (error) {
            console.error('Metronome toggle error:', error);
            // Не показываем alert для лучшего UX
        }
    }

    async restartMetronome() {
        if (this.isActive) {
            await core.toggleMetronome(0, 4);
            const beats = parseInt(this.elements.timeSignature?.value || '4', 10);
            const result = await core.toggleMetronome(this.currentBPM, beats);
            this.isActive = result.isActive;
            
            // Перезапуск визуального индикатора с новым BPM
            if (this.isActive) {
                this.stopVisualIndicator();
                this.startVisualIndicator();
            }
        }
    }

    updatePlayButtons() {
        // Update overlay play button
        if (this.elements.playButton && this.elements.playIcon) {
            if (this.isActive) {
                this.elements.playButton.classList.add('active');
                this.elements.playIcon.className = 'fas fa-stop';
            } else {
                this.elements.playButton.classList.remove('active');
                this.elements.playIcon.className = 'fas fa-play';
            }
        }
        
        // Update control bar play button
        if (this.elements.playToggle && this.elements.playToggleIcon && this.elements.playToggleText) {
            if (this.isActive) {
                this.elements.playToggle.classList.add('active');
                this.elements.playToggleIcon.className = 'fas fa-stop';
                this.elements.playToggleText.textContent = 'Stop';
            } else {
                this.elements.playToggle.classList.remove('active');
                this.elements.playToggleIcon.className = 'fas fa-play';
                this.elements.playToggleText.textContent = 'Play';
            }
        }
    }

    updateSliderVisuals() {
        if (!this.elements.sliderProgress || !this.elements.sliderHandle) return;
        
        // Calculate percentage (0-1) based on BPM range 40-200
        const percentage = (this.currentBPM - 40) / 160;
        const percentageStr = `${percentage * 100}%`;
        
        // Update progress bar
        this.elements.sliderProgress.style.width = percentageStr;
        
        // Update handle position
        this.elements.sliderHandle.style.left = percentageStr;
    }

    updateControlBarDisplay() {
        if (this.elements.currentBpmValue) {
            if (this.currentSongBPM !== null) {
                this.elements.currentBpmValue.textContent = this.currentBPM.toString();
            } else {
                this.elements.currentBpmValue.textContent = 'NA';
            }
        }
    }

    updateDisplay() {
        this.setBPM(this.currentBPM, true, true, true);
        this.updatePlayButtons();
    }

    // Update only BPM display without restarting metronome (for live drag updates)
    updateBPMDisplay(bpm, updateControlBar = true) {
        this.currentBPM = Math.max(40, Math.min(200, bpm));
        
        if (this.elements.bpmInput && document.activeElement !== this.elements.bpmInput) {
            this.elements.bpmInput.value = this.currentBPM;
        }
        
        if (updateControlBar) {
            this.updateControlBarDisplay();
        }
    }

    // CRITICAL: This method is called when a song is selected
    updateBPMFromSong(bpm) {
        console.log('Updating BPM from song:', bpm);
        
        if (bpm && !isNaN(bpm) && bpm > 0) {
            this.originalBPM = bpm;
            this.currentSongBPM = bpm;
            this.setBPM(bpm, true, true, true);
            console.log('BPM set from song:', bpm);
        } else {
            this.originalBPM = null;
            this.currentSongBPM = null;
            // Don't change current BPM, just update display
            this.updateControlBarDisplay();
            console.log('No BPM from song, showing NA');
        }
    }

    getCurrentBPM() {
        return this.currentBPM;
    }

    stopMetronome() {
        if (this.isActive) {
            this.toggleMetronome();
        }
    }

    // Visual indicator methods
    setupVisualIndicator() {
        this.updateVisualBeats();
        
        // Listen for time signature changes
        if (this.elements.timeSignature) {
            this.elements.timeSignature.addEventListener('change', () => {
                this.updateVisualBeats();
            });
        }
    }

    updateVisualBeats() {
        if (!this.elements.beatDotsContainer) return;
        
        const beats = parseInt(this.elements.timeSignature?.value || '4', 10);
        
        // Clear existing dots
        this.elements.beatDotsContainer.innerHTML = '';
        
        // Create new dots
        for (let i = 0; i < beats; i++) {
            const dot = document.createElement('div');
            dot.className = 'beat-dot';
            if (i === 0) {
                dot.classList.add('accent'); // First beat is accented
            }
            dot.dataset.beat = i;
            this.elements.beatDotsContainer.appendChild(dot);
        }
    }

    updateVisualBeat(beatNumber) {
        if (!this.elements.beatDotsContainer) return;
        
        const dots = this.elements.beatDotsContainer.querySelectorAll('.beat-dot');
        
        // Remove active class from all dots
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Add active class to current beat
        if (dots[beatNumber]) {
            dots[beatNumber].classList.add('active');
        }
    }

    startVisualIndicator() {
        if (!this.elements.beatDotsContainer) return;
        
        // Reset to first beat
        this.currentVisualBeat = 0;
        this.updateVisualBeat(0);
        
        // Remove any existing listener
        if (this.beatEventListener) {
            window.removeEventListener('metronome-beat', this.beatEventListener);
        }
        
        // Create event listener for beat events
        this.beatEventListener = (event) => {
            const beatNumber = event.detail.beat;
            this.updateVisualBeat(beatNumber);
        };
        
        // Listen for beat events from the core metronome
        window.addEventListener('metronome-beat', this.beatEventListener);
    }

    stopVisualIndicator() {
        // Remove event listener
        if (this.beatEventListener) {
            window.removeEventListener('metronome-beat', this.beatEventListener);
            this.beatEventListener = null;
        }
        
        // Clear all active states
        if (this.elements.beatDotsContainer) {
            const dots = this.elements.beatDotsContainer.querySelectorAll('.beat-dot');
            dots.forEach(dot => dot.classList.remove('active'));
        }
        
        this.currentVisualBeat = 0;
    }

    setupAccentToggle() {
        if (!this.elements.accentCheckbox) return;
        
        // Set initial state
        this.elements.accentCheckbox.checked = this.accentEnabled;
        
        // Listen for changes
        this.elements.accentCheckbox.addEventListener('change', (e) => {
            this.accentEnabled = e.target.checked;
            localStorage.setItem('metronome-accent-enabled', this.accentEnabled);
            
            // Update accent mode in core
            core.setAccentEnabled(this.accentEnabled);
            
            // If metronome is running, restart it to apply changes
            if (this.isActive) {
                this.restartMetronome();
            }
        });
        
        // Set initial accent mode in core
        core.setAccentEnabled(this.accentEnabled);
    }
}

// Create singleton
const metronome = new MetronomeController();

// Export API
export function initMetronomeUI() {
    return Promise.resolve();
}

export function updateBPMFromSong(bpm) {
    metronome.updateBPMFromSong(bpm);
}

export function getCurrentBPM() {
    return metronome.getCurrentBPM();
}

export function stopMetronome() {
    metronome.stopMetronome();
}

export function updateBPM(newBPM) {
    metronome.updateBPMFromSong(newBPM);
}

export function updateMetronomeButtonState(isActive) {
    metronome.isActive = isActive;
    metronome.updatePlayButtons();
}

export function resetBPMToOriginal() {
    if (metronome.originalBPM) {
        metronome.setBPM(metronome.originalBPM, true, true, true);
    }
}
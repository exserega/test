// Agape Worship App - metronome.js
// Модуль для работы с метрономом и аудио
// Версия 2.2 - Более яркий звук и поддержка размера

// --- AUDIO CONTEXT & METRONOME ---

let audioContext = null;
let isMetronomeActive = false;
let metronomeInterval = null;
let nextNoteTime = 0.0;
let currentBeat = 0;
let lookahead = 25.0; // Интервал планирования в миллисекундах
let scheduleAheadTime = 0.1; // Насколько вперед планировать аудио (в секундах)
let timerWorker = null;
let currentBeatsPerMeasure = 4; // Текущий размер
let accentEnabled = true; // Включен ли акцент на первой доле

// Настройки звука - более яркий метроном
const SOUND_CONFIG = {
    // Используем средние частоты для баланса между приятностью и яркостью
    frequencies: {
        high: 800,    // Повышена для яркости (было 440)
        low: 400      // Повышена для яркости (было 220)
    },
    
    // Настройки для разных типов звука
    woodblock: {
        high: 1200,   // Яркий деревянный блок
        low: 600      
    },
    
    click: {
        high: 1000,   // Яркий клик
        low: 500      
    },
    
    // Параметры огибающей для четкого звука
    envelope: {
        attackTime: 0.001,    // Очень быстрая атака (1мс)
        decayTime: 0.008,     // Быстрое затухание (8мс)
        sustainLevel: 0.4,    // Уровень поддержки
        releaseTime: 0.02     // Общее время звучания (20мс)
    },
    
    // Громкость
    volume: {
        accent: 1.0,          // Громкость акцентированной доли
        normal: 0.6,          // Громкость обычной доли
        master: 0.7           // Общая громкость (повышена для яркости)
    }
};

// Текущий тип звука
let currentSoundType = 'click'; // 'click', 'woodblock', или 'classic'

/**
 * Настройка AudioContext с учетом всех браузеров
 */
function setupAudioContext() {
    if (audioContext) return true;
    
    try {
        // Создаем AudioContext с учетом префиксов браузеров
        const AudioContextClass = window.AudioContext || 
                                  window.webkitAudioContext || 
                                  window.mozAudioContext || 
                                  window.oAudioContext || 
                                  window.msAudioContext;
        
        if (!AudioContextClass) {
            console.error("Web Audio API не поддерживается в этом браузере");
            return false;
        }
        
        audioContext = new AudioContextClass();
        console.log("AudioContext создан. State:", audioContext.state);
        
        // Для Safari и iOS требуется resume после взаимодействия пользователя
        if (audioContext.state === 'suspended') {
            resumeAudioContext();
        }
        
        return true;
    } catch (e) {
        console.error("Не удалось создать AudioContext:", e);
        return false;
    }
}

/**
 * Возобновление AudioContext (требуется для Safari/iOS)
 */
async function resumeAudioContext() {
    if (!audioContext) return false;
    
    if (audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
            console.log('AudioContext возобновлен');
            return true;
        } catch (error) {
            console.error('Ошибка возобновления AudioContext:', error);
            return false;
        }
    }
    return true;
}

/**
 * Создание одного клика метронома с более ярким звуком
 */
function createClick(isAccent, time) {
    if (!audioContext || audioContext.state !== 'running') return;
    
    try {
        // Выбираем частоты в зависимости от типа звука
        const frequencies = SOUND_CONFIG[currentSoundType] || SOUND_CONFIG.click;
        // Если акцент отключен, используем низкую частоту для всех долей
        const frequency = (isAccent && accentEnabled) ? frequencies.high : frequencies.low;
        const volume = (isAccent && accentEnabled) ? SOUND_CONFIG.volume.accent : SOUND_CONFIG.volume.normal;
        
        // Создаем осциллятор
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Добавляем фильтр для формирования звука
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass'; // Изменено на highpass для яркости
        filter.frequency.value = 200; // Срезаем низкие частоты для четкости
        filter.Q.value = 0.7;
        
        // Настройка осциллятора
        oscillator.frequency.value = frequency;
        
        // Используем разные типы волн для разных звуков
        if (currentSoundType === 'woodblock') {
            oscillator.type = 'square'; // Более резкий звук
        } else if (currentSoundType === 'classic') {
            oscillator.type = 'sine'; // Чистый тон
        } else {
            oscillator.type = 'triangle'; // Мягкий клик
        }
        
        // Настройка огибающей громкости (ADSR) для четкого звука
        const env = SOUND_CONFIG.envelope;
        const finalVolume = volume * SOUND_CONFIG.volume.master;
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(finalVolume, time + env.attackTime);
        gainNode.gain.exponentialRampToValueAtTime(
            finalVolume * env.sustainLevel, 
            time + env.attackTime + env.decayTime
        );
        gainNode.gain.exponentialRampToValueAtTime(
            0.001, 
            time + env.attackTime + env.decayTime + env.releaseTime
        );
        
        // Подключение узлов
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Запуск и остановка
        oscillator.start(time);
        oscillator.stop(time + env.attackTime + env.decayTime + env.releaseTime);
        
        // Добавляем яркий "щелчок" для четкости
        const clickOsc = audioContext.createOscillator();
        const clickGain = audioContext.createGain();
        const clickFilter = audioContext.createBiquadFilter();
        
        clickOsc.type = 'sawtooth'; // Более яркий щелчок
        clickOsc.frequency.value = (isAccent && accentEnabled) ? 150 : 100;
        
        clickFilter.type = 'bandpass';
        clickFilter.frequency.value = 2000; // Высокочастотный щелчок
        clickFilter.Q.value = 2;
        
        clickGain.gain.setValueAtTime(finalVolume * 0.3, time);
        clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.003);
        
        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(audioContext.destination);
        
        clickOsc.start(time);
        clickOsc.stop(time + 0.003);
        
    } catch (error) {
        console.error("Ошибка создания клика:", error);
    }
}

/**
 * Планировщик нот метронома
 */
function scheduler() {
    if (!audioContext || !isMetronomeActive) return;
    
    // Планируем все ноты, которые должны прозвучать до следующего вызова
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote(nextNoteTime);
        nextNote();
    }
}

/**
 * Планирование одной ноты
 */
function scheduleNote(time) {
    const isAccent = currentBeat === 0; // Акцент только на первой доле
    const beatNumber = currentBeat; // Сохраняем текущее значение beat
    
    createClick(isAccent, time);
    
    // Отправляем событие для визуального индикатора
    // Используем setTimeout для синхронизации с аудио
    const delay = (time - audioContext.currentTime) * 1000;
    if (delay >= 0) {
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('metronome-beat', { 
                detail: { beat: beatNumber, isAccent: isAccent }
            }));
        }, delay);
    }
}

/**
 * Переход к следующей ноте
 */
function nextNote() {
    const secondsPerBeat = 60.0 / currentTempo;
    nextNoteTime += secondsPerBeat;
    currentBeat = (currentBeat + 1) % currentBeatsPerMeasure;
}

let currentTempo = 120; // BPM по умолчанию

/**
 * Включение/выключение метронома
 */
async function toggleMetronome(bpm = 120, beatsPerMeasure = 4) {
    if (!setupAudioContext()) {
        return { 
            isActive: false, 
            error: "Web Audio API не поддерживается в вашем браузере" 
        };
    }
    
    // Обязательно пытаемся возобновить контекст при каждом клике
    await resumeAudioContext();
    
    if (isMetronomeActive) {
        // Останавливаем метроном
        isMetronomeActive = false;
        
        if (metronomeInterval) {
            clearInterval(metronomeInterval);
            metronomeInterval = null;
        }
        
        if (timerWorker) {
            timerWorker.postMessage("stop");
        }
        
        currentBeat = 0;
        console.log("Метроном остановлен");
        return { isActive: false };
        
    } else {
        // Запускаем метроном
        if (audioContext.state !== 'running') {
            await resumeAudioContext();
            if (audioContext.state !== 'running') {
                return { 
                    isActive: false, 
                    error: "Не удалось запустить аудио контекст. Попробуйте еще раз." 
                };
            }
        }
        
        currentTempo = bpm;
        currentBeatsPerMeasure = beatsPerMeasure;
        currentBeat = 0;
        nextNoteTime = audioContext.currentTime;
        isMetronomeActive = true;
        
        // Отправляем событие для первого beat сразу
        window.dispatchEvent(new CustomEvent('metronome-beat', { 
            detail: { beat: 0, isAccent: true }
        }));
        
        // Используем setInterval как основной метод
        // Web Workers не всегда доступны и могут создавать проблемы
        metronomeInterval = setInterval(scheduler, lookahead);
        
        console.log(`Метроном запущен: ${bpm} BPM, размер: ${beatsPerMeasure}/4, тип звука: ${currentSoundType}`);
        return { isActive: true };
    }
}

/**
 * Изменение типа звука метронома
 */
function setSoundType(type) {
    if (['click', 'woodblock', 'classic'].includes(type)) {
        currentSoundType = type;
        console.log(`Тип звука метронома изменен на: ${type}`);
    }
}

/**
 * Включение/выключение акцента на первой доле
 */
function setAccentEnabled(enabled) {
    accentEnabled = enabled;
    console.log(`Акцент метронома ${enabled ? 'включен' : 'выключен'}`);
}

/**
 * Получение состояния метронома
 */
function getMetronomeState() {
    return {
        isActive: isMetronomeActive,
        audioContext: audioContext,
        currentTempo: currentTempo,
        soundType: currentSoundType,
        beatsPerMeasure: currentBeatsPerMeasure,
        supported: !!(window.AudioContext || window.webkitAudioContext)
    };
}

/**
 * Инициализация при первом взаимодействии пользователя
 * Важно для Safari/iOS
 */
async function initAudioOnUserGesture() {
    if (!audioContext) {
        setupAudioContext();
    }
    if (audioContext) {
        await resumeAudioContext();
    }
}

// Не используется в новой версии, но оставляем для совместимости
async function loadAudioFile() {
    console.log("loadAudioFile: Больше не требуется в новой версии");
    return true;
}

function playClick(beatsPerMeasure = 4) {
    console.log("playClick: Используйте toggleMetronome для управления метрономом");
}

export {
    setupAudioContext,
    resumeAudioContext,
    loadAudioFile,
    playClick,
    toggleMetronome,
    getMetronomeState,
    initAudioOnUserGesture,
    setSoundType,
    setAccentEnabled
};

// Экспортируем переменные состояния для совместимости
export { audioContext, isMetronomeActive, currentBeat };
export const audioBuffer = null; // Больше не используется 
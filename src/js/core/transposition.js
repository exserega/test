// Agape Worship App - transposition.js
// Модуль для транспонирования аккордов

import { chords } from '../utils/constants.js';

// --- REGEX & DERIVED CONSTANTS ---
const chordRegex = /([A-H][#b]?(?:maj7|maj9|m7|m9|m11|7sus4|sus4|sus2|add9|dim7|dim|aug7|aug|7|m|6|9|11|13|sus)?(?:\s*\/\s*[A-H][#b]?)?)/g;

// Расширенная карта аккордов с поддержкой диезов и бемолей
const CHROMATIC_NOTES = [
    { note: 'C', enharmonic: null },
    { note: 'C#', enharmonic: 'Db' },
    { note: 'D', enharmonic: null },
    { note: 'D#', enharmonic: 'Eb' },
    { note: 'E', enharmonic: null },
    { note: 'F', enharmonic: null },
    { note: 'F#', enharmonic: 'Gb' },
    { note: 'G', enharmonic: null },
    { note: 'G#', enharmonic: 'Ab' },
    { note: 'A', enharmonic: null },
    { note: 'A#', enharmonic: 'Bb' },
    { note: 'B', enharmonic: 'H' } // B и H - это одна и та же нота (си)
];

// Тональности, которые предпочитают бемоли
const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

// Тональности, которые предпочитают диезы
const SHARP_KEYS = ['G', 'D', 'A', 'E', 'H', 'F#', 'C#'];

// Функция для нормализации аккорда (приведение H к B для внутренних вычислений)
function normalizeChord(chord) {
    if (chord === 'H') return 'B';
    if (chord === 'Hb') return 'Bb'; // Hb = Bb
    return chord;
}

// Функция для получения индекса ноты с учетом эквивалентности H/B
function getNoteIndex(note) {
    const normalized = normalizeChord(note);
    return CHROMATIC_NOTES.findIndex(item => 
        item.note === normalized || 
        item.enharmonic === normalized
    );
}

// Функция для определения, нужно ли использовать бемоли
function shouldUseFlats(targetKey) {
    if (!targetKey) return false;
    
    // Если целевая тональность содержит бемоль, используем бемоли
    if (targetKey.includes('b')) return true;
    
    // Если целевая тональность в списке бемольных тональностей
    const baseKey = targetKey.replace(/[#b]/g, '');
    return FLAT_KEYS.includes(baseKey) || FLAT_KEYS.includes(targetKey);
}

// Функция для получения предпочтительного названия ноты
function getPreferredNoteName(noteIndex, useFlats, originalChord, targetKey) {
    const noteInfo = CHROMATIC_NOTES[noteIndex];
    
    // Для B/H учитываем целевую тональность - проверяем это ПЕРВЫМ
    if (noteInfo.note === 'B') {
        // Если целевая тональность использует H, используем H
        if (targetKey === 'H' || (targetKey && targetKey.startsWith('H'))) {
            return 'H';
        }
        // Если целевая тональность использует B, используем B
        if (targetKey === 'B' || (targetKey && targetKey.startsWith('B'))) {
            return 'B';
        }
        // Если оригинальный аккорд использовал H, используем H (только если целевая тональность не задана явно)
        if (originalChord && originalChord.startsWith('H')) {
            return 'H';
        }
        return 'B';
    }
    
    // Если есть энгармонический эквивалент (кроме B/H случая)
    if (noteInfo.enharmonic) {
        if (useFlats) {
            return noteInfo.enharmonic;
        } else {
            return noteInfo.note;
        }
    }
    
    return noteInfo.note;
}

// --- TEXT PROCESSING & TRANSPOSITION ---

/** Расчет смещения для транспонирования */
export function getTransposition(originalKey, newKey) {
    if (!originalKey || !newKey) {
        return 0;
    }
    
    const originalIndex = getNoteIndex(originalKey);
    const newIndex = getNoteIndex(newKey);
    
    if (originalIndex === -1 || newIndex === -1) {
        console.warn(`Invalid key(s) for transposition: ${originalKey} -> ${newKey}. Using 0 shift.`);
        return 0;
    }
    
    return newIndex - originalIndex;
}

/** Транспонирование одного аккорда */
function transposeChord(chord, transposition, targetKey) {
    if (!chord) return chord;

    let chordType = '';
    let baseChord = chord;
    let bassNote = '';
    const suffixes = ['maj7', 'maj9', 'm7', 'm9', 'm11', '7sus4', 'sus4', 'sus2', 'add9', 'dim7', 'dim', 'aug7', 'aug', '7', 'm', '6', '9', '11', '13', 'sus'];

    // Обработка аккордов со слешем (басовая нота)
    if (chord.includes('/')) {
        const parts = chord.split('/');
        if (parts.length === 2) {
             baseChord = parts[0];
             bassNote = parts[1];
        } else {
            console.warn("Malformed chord with '/':", chord);
            return chord;
        }
    }

    // Извлекаем суффикс аккорда
    for (let suffix of suffixes) {
        if (baseChord.endsWith(suffix)) {
            baseChord = baseChord.slice(0, -suffix.length);
            chordType = suffix;
            break;
        }
    }

    // Определяем, использовать ли бемоли
    const useFlats = shouldUseFlats(targetKey);

    // Транспонируем основной аккорд
    const baseChordIndex = getNoteIndex(baseChord);
    if (baseChordIndex === -1) {
        return chord;
    }
    
    const newBaseChordIndex = (baseChordIndex + transposition + CHROMATIC_NOTES.length) % CHROMATIC_NOTES.length;
    const transposedBaseChord = getPreferredNoteName(newBaseChordIndex, useFlats, baseChord, targetKey) + chordType;

    // Транспонируем басовую ноту если есть
    if (bassNote) {
        const bassNoteIndex = getNoteIndex(bassNote);
        if (bassNoteIndex !== -1) {
            const newBassNoteIndex = (bassNoteIndex + transposition + CHROMATIC_NOTES.length) % CHROMATIC_NOTES.length;
            const transposedBassNote = getPreferredNoteName(newBassNoteIndex, useFlats, bassNote, targetKey);
            return `${transposedBaseChord}/${transposedBassNote}`;
        } else {
            return `${transposedBaseChord}/${bassNote}`;
        }
    }

    return transposedBaseChord;
}

/** Транспонирование всего текста с аккордами */
export function transposeLyrics(lyrics, transposition, targetKey) {
    if (!lyrics) return lyrics;
    
    // Специальная обработка для энгармонических эквивалентов
    // Даже если transposition = 0, может потребоваться смена нотации
    const needsNotationChange = shouldChangeNotation(lyrics, targetKey);
    
    if (transposition === 0 && !needsNotationChange) return lyrics;
    
    try {
        return lyrics.replace(chordRegex, (match) => {
            const cleanedMatch = match.replace(/\s*\/\s*/, '/');
            return transposeChord(cleanedMatch, transposition, targetKey);
        });
    } catch (error) {
        console.error("Ошибка при транспонировании текста:", error, "Текст:", lyrics.substring(0, 100) + "...");
        return lyrics;
    }
}

/** Проверка, нужна ли смена нотации */
function shouldChangeNotation(lyrics, targetKey) {
    if (!targetKey) return false;
    
    const useFlats = shouldUseFlats(targetKey);
    
    // Проверяем есть ли в тексте диезы когда нужны бемоли, или наоборот
    if (useFlats && lyrics.includes('#')) {
        return true;
    }
    if (!useFlats && lyrics.includes('b')) {
        return true;
    }
    
    // Проверяем H/B конфликт с помощью регулярного выражения
    const hasBChord = /\bB[#b]?(?:maj|m|dim|aug|sus|add|\d)?(?:\s|$|\/)/g.test(lyrics);
    const hasHChord = /\bH[#b]?(?:maj|m|dim|aug|sus|add|\d)?(?:\s|$|\/)/g.test(lyrics);
    
    if (targetKey === 'H' && hasBChord) {
        return true;
    }
    if (targetKey === 'B' && hasHChord) {
        return true;
    }
    
    return false;
}

/** Обработка строк текста - сокращаем пробелы в строках с аккордами в 2 раза */
export function processLyrics(lyrics) {
    if (!lyrics) return '';
    
    // СОКРАЩАЕМ ПРОБЕЛЫ В СТРОКАХ С АККОРДАМИ В 2 РАЗА
    // Ищем строки которые содержат аккорды (много пробелов + латинские буквы + символы аккордов)
    return lyrics.split('\n').map(line => {
        // Если строка содержит аккорды (много пробелов и характерные символы аккордов)
        if (line.includes('  ') && /[A-H][#b]?/.test(line) && !/[а-яё]/i.test(line)) {
            // Сокращаем ВСЕ пробелы в 2 раза в строках с аккордами
            return line.replace(/ {2,}/g, match => ' '.repeat(Math.max(1, Math.ceil(match.length / 2))));
        }
        return line; // Оставляем строки текста без изменений
    }).join('\n');
}

/** Выделение аккордов тегами span для стилизации */
export function highlightChords(lyrics) {
    if (!lyrics) return '';
    try {
        const result = lyrics.replace(chordRegex, '<span class="chord">$1</span>');
        return result;
    } catch (error) {
        console.error("Ошибка при выделении аккордов:", error, "Текст:", lyrics.substring(0, 100) + "...");
        return lyrics;
    }
}

// ====================================
// FIREBASE V8 TO V9 ADAPTER
// Адаптер для использования v8 API с v9-подобным синтаксисом
// ====================================

import { db as firebaseDb } from '../../js/firebase-config.js';

// ====================================
// FIRESTORE ADAPTERS
// ====================================

/**
 * Эмуляция collection() из v9
 */
export function collection(db, path) {
    return db.collection(path);
}

/**
 * Эмуляция doc() из v9
 */
export function doc(db, path, ...pathSegments) {
    if (pathSegments.length === 0) {
        return db.doc(path);
    }
    const fullPath = [path, ...pathSegments].join('/');
    return db.doc(fullPath);
}

/**
 * Эмуляция getDocs() из v9
 */
export async function getDocs(query) {
    const snapshot = await query.get();
    return snapshot;
}

/**
 * Эмуляция getDoc() из v9
 */
export async function getDoc(docRef) {
    const snapshot = await docRef.get();
    return snapshot;
}

/**
 * Эмуляция addDoc() из v9
 */
export async function addDoc(collectionRef, data) {
    const docRef = await collectionRef.add(data);
    return docRef;
}

/**
 * Эмуляция setDoc() из v9
 */
export async function setDoc(docRef, data, options = {}) {
    if (options.merge) {
        await docRef.set(data, { merge: true });
    } else {
        await docRef.set(data);
    }
}

/**
 * Эмуляция updateDoc() из v9
 */
export async function updateDoc(docRef, data) {
    await docRef.update(data);
}

/**
 * Эмуляция deleteDoc() из v9
 */
export async function deleteDoc(docRef) {
    await docRef.delete();
}

/**
 * Эмуляция query() из v9
 */
export function query(collectionRef, ...queryConstraints) {
    let q = collectionRef;
    
    for (const constraint of queryConstraints) {
        if (constraint.type === 'where') {
            q = q.where(constraint.field, constraint.op, constraint.value);
        } else if (constraint.type === 'orderBy') {
            q = q.orderBy(constraint.field, constraint.direction);
        } else if (constraint.type === 'limit') {
            q = q.limit(constraint.value);
        }
    }
    
    return q;
}

/**
 * Эмуляция where() из v9
 */
export function where(field, op, value) {
    return { type: 'where', field, op, value };
}

/**
 * Эмуляция orderBy() из v9
 */
export function orderBy(field, direction = 'asc') {
    return { type: 'orderBy', field, direction };
}

/**
 * Эмуляция onSnapshot() из v9
 */
export function onSnapshot(query, callback, errorCallback) {
    return query.onSnapshot(callback, errorCallback);
}

/**
 * Эмуляция runTransaction() из v9
 */
export async function runTransaction(db, updateFunction) {
    return db.runTransaction(updateFunction);
}

/**
 * Эмуляция serverTimestamp() из v9
 */
export function serverTimestamp() {
    return window.firebase.firestore.FieldValue.serverTimestamp();
}

/**
 * Эмуляция deleteField() из v9
 */
export function deleteField() {
    return window.firebase.firestore.FieldValue.delete();
}

/**
 * Эмуляция arrayUnion() из v9
 */
export function arrayUnion(...elements) {
    return window.firebase.firestore.FieldValue.arrayUnion(...elements);
}

/**
 * Эмуляция arrayRemove() из v9
 */
export function arrayRemove(...elements) {
    return window.firebase.firestore.FieldValue.arrayRemove(...elements);
}

// Экспорт базы данных
export { firebaseDb as db };
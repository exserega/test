/**
 * Branch Selection Module
 * Модуль выбора филиала для новых пользователей
 */

const db = firebase.firestore();
const auth = firebase.auth();

// DOM элементы
let branchSelectionModal = null;
let branchesList = null;
let selectedBranchId = null;

/**
 * Инициализация модуля
 */
export function initBranchSelection() {
    branchSelectionModal = document.getElementById('branch-selection-modal');
    branchesList = document.getElementById('branches-list');
    
    if (!branchSelectionModal || !branchesList) {
        console.error('Branch selection elements not found', {
            modal: branchSelectionModal,
            list: branchesList
        });
        return;
    }
    console.log('✅ Branch selection initialized');
}

/**
 * Показать модальное окно выбора филиала
 */
export async function showBranchSelection() {
    if (!branchSelectionModal) {
        console.error('❌ Branch selection modal not initialized');
        return;
    }
    
    console.log('🏢 Showing branch selection modal');
    branchSelectionModal.classList.add('visible');
    
    // Загружаем список филиалов
    await loadBranches();
}

/**
 * Скрыть модальное окно выбора филиала
 */
export function hideBranchSelection() {
    if (!branchSelectionModal) return;
    
    branchSelectionModal.classList.remove('visible');
}

/**
 * Загрузить список филиалов
 */
async function loadBranches() {
    try {
        branchesList.innerHTML = `
            <div class="loading-branches">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Загрузка филиалов...</span>
            </div>
        `;
        
        const snapshot = await db.collection('branches')
            .orderBy('name', 'asc')
            .get();
            
        if (snapshot.empty) {
            branchesList.innerHTML = `
                <div class="no-branches">
                    <i class="fas fa-building"></i>
                    <p>Нет доступных филиалов</p>
                </div>
            `;
            return;
        }
        
        // Очищаем загрузку
        branchesList.innerHTML = '';
        
        // Рендерим карточки филиалов с актуальным количеством участников
        const branches = [];
        snapshot.forEach(doc => {
            branches.push({ id: doc.id, ...doc.data() });
        });
        
        // Подсчитываем актуальное количество участников для каждого филиала
        for (const branch of branches) {
            const usersSnapshot = await db.collection('users')
                .where('branchId', '==', branch.id)
                .where('status', 'in', ['active', 'pending'])  // Считаем только активных и ожидающих
                .get();
            
            branch.actualMemberCount = usersSnapshot.size;
            renderBranchCard(branch);
        }
        
        // Добавляем кнопку подтверждения
        addConfirmButton();
        
    } catch (error) {
        console.error('Error loading branches:', error);
        branchesList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Ошибка загрузки филиалов</p>
            </div>
        `;
    }
}

/**
 * Отрисовать карточку филиала
 */
function renderBranchCard(branch) {
    const card = document.createElement('div');
    card.className = 'branch-card';
    card.dataset.branchId = branch.id;
    
    card.innerHTML = `
        <h3>${branch.name || 'Без названия'}</h3>
        <p><i class="fas fa-map-marker-alt"></i> ${branch.address || 'Адрес не указан'}</p>
        <p class="member-count"><i class="fas fa-users"></i> ${branch.actualMemberCount !== undefined ? branch.actualMemberCount : (branch.memberCount || 0)} участников</p>
    `;
    
    // Обработчик клика
    card.addEventListener('click', () => selectBranch(branch.id, card));
    
    branchesList.appendChild(card);
}

/**
 * Выбрать филиал
 */
function selectBranch(branchId, cardElement) {
    // Убираем выделение с других карточек
    document.querySelectorAll('.branch-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Выделяем текущую карточку
    cardElement.classList.add('selected');
    selectedBranchId = branchId;
    
    // Сразу подтверждаем выбор при клике
    confirmBranchSelection();
}

/**
 * Добавить кнопку подтверждения
 */
function addConfirmButton() {
    // Проверяем, не добавлена ли уже кнопка
    if (document.querySelector('.branch-selection-actions')) return;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'branch-selection-actions';
    
    actionsDiv.innerHTML = `
        <div class="branch-selection-help">
            <p>Не нашли свой филиал?</p>
            <button class="contact-admin-button">
                <i class="fab fa-telegram"></i>
                <span>Отправить заявку</span>
            </button>
        </div>
    `;
    
    const modalContent = branchSelectionModal.querySelector('.modal-content');
    modalContent.appendChild(actionsDiv);
    
    // Обработчик кнопки связи с администратором
    const contactButton = actionsDiv.querySelector('.contact-admin-button');
    contactButton.addEventListener('click', () => {
        window.open('https://t.me/Sha1oom', '_blank');
    });
}

/**
 * Подтвердить выбор филиала
 */
async function confirmBranchSelection() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Проверяем, является ли пользователь гостем
    if (user.isAnonymous) {
        alert('Для выбора филиала необходимо зарегистрироваться');
        hideBranchSelection();
        return;
    }
    
    // Проверяем, выбран ли филиал
    if (!selectedBranchId) {
        alert('Пожалуйста, выберите филиал');
        return;
    }
    
    // Показываем индикатор загрузки на выбранной карточке
    const selectedCard = document.querySelector('.branch-card.selected');
    if (selectedCard) {
        selectedCard.style.opacity = '0.6';
        selectedCard.style.pointerEvents = 'none';
        const title = selectedCard.querySelector('h3');
        if (title) {
            title.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + title.textContent;
        }
    }
    
    try {
        // Обновляем профиль пользователя
        await db.collection('users').doc(auth.currentUser.uid).update({
            branchId: selectedBranchId,
            status: 'pending', // Устанавливаем статус pending
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Обновляем счетчик участников филиала
        await db.collection('branches').doc(selectedBranchId).update({
            memberCount: firebase.firestore.FieldValue.increment(1)
        });
        
        console.log('✅ Branch selected successfully');
        
        // Скрываем модальное окно
        hideBranchSelection();
        
        // Перезагружаем страницу для применения изменений
        window.location.reload();
        
    } catch (error) {
        console.error('Error selecting branch:', error);
        
        // Восстанавливаем выбранную карточку
        if (selectedCard) {
            selectedCard.style.opacity = '1';
            selectedCard.style.pointerEvents = 'auto';
            const title = selectedCard.querySelector('h3');
            if (title) {
                title.innerHTML = title.textContent.replace(/^.*? /, ''); // Убираем иконку загрузки
            }
        }
        
        alert('Ошибка при выборе филиала. Попробуйте еще раз.');
    }
}

/**
 * Проверить нужно ли показать выбор филиала
 */
export async function checkAndShowBranchSelection() {
    const user = auth.currentUser;
    if (!user) return false;
    
    // Проверяем, является ли пользователь гостем
    if (user.isAnonymous) {
        console.log('👤 Guest user - skipping branch selection');
        return false;
    }
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('🔍 Checking user branch:', {
                userId: user.uid,
                branchId: userData.branchId,
                status: userData.status
            });
            
            // Если у пользователя нет филиала, показываем выбор
            if (!userData.branchId) {
                console.log('📋 User has no branch, showing selection');
                await showBranchSelection();
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('Error checking user branch:', error);
        return false;
    }
}

// Экспортируем функции
export default {
    initBranchSelection,
    showBranchSelection,
    hideBranchSelection,
    checkAndShowBranchSelection
};
// ====================================
// ⚙️ SETTINGS MODULE
// ====================================
// Управление страницей настроек пользователя

const auth = firebase.auth();
const db = firebase.firestore();

// ====================================
// STATE
// ====================================

let currentUser = null;

// ====================================
// INITIALIZATION
// ====================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚙️ Settings page loading...');
    
    // Применяем сохраненную тему
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Проверка авторизации
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log('❌ Not authenticated, redirecting...');
            window.location.href = '/public/login.html';
            return;
        }
        
        // Загружаем профиль пользователя
        await loadUserProfile(user.uid);
    });
});

// ====================================
// LOAD USER PROFILE
// ====================================

async function loadUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            console.error('User profile not found');
            return;
        }
        
        currentUser = {
            id: userId,
            ...userDoc.data()
        };
        
        console.log('✅ User profile loaded:', currentUser);
        updateUI();
        loadAdditionalBranches();
        loadBranchRequests();
        
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// ====================================
// UPDATE UI
// ====================================

function updateUI() {
    if (!currentUser) return;
    
    // User Info
    document.getElementById('user-name').textContent = currentUser.name || 'Пользователь';
    document.getElementById('user-email').textContent = currentUser.email || currentUser.phone || '';
    document.getElementById('display-name').textContent = currentUser.name || '-';
    
    // Badges
    const roleEl = document.getElementById('user-role');
    const statusEl = document.getElementById('user-status');
    const branchEl = document.getElementById('user-branch');
    
    // Role badge
    const isAdmin = currentUser.role === 'admin';
    
    if (isAdmin) {
        roleEl.textContent = 'Администратор';
        roleEl.className = 'badge admin';
        // Показываем админ секцию
        document.getElementById('admin-section').style.display = 'block';
        
        // Убираем старую логику с токеном - Firebase Auth сохраняет сессию автоматически
    } else {
        roleEl.textContent = 'Пользователь';
        roleEl.className = 'badge';
    }
    
    // Status badge
    if (currentUser.status === 'pending') {
        statusEl.textContent = 'Ожидает подтверждения';
        statusEl.className = 'badge pending';
    } else if (currentUser.status === 'active') {
        statusEl.textContent = 'Активен';
        statusEl.className = 'badge';
    }
    
    // Branch badge
    if (currentUser.branchId) {
        loadBranchName(currentUser.branchId);
    } else {
        branchEl.style.display = 'none';
        document.getElementById('current-branch').textContent = 'Не назначен';
    }
}

// ====================================
// LOAD BRANCH NAME
// ====================================

async function loadBranchName(branchId) {
    try {
        const branchDoc = await db.collection('branches').doc(branchId).get();
        if (branchDoc.exists) {
            const branchData = branchDoc.data();
            document.getElementById('user-branch').textContent = branchData.name;
            document.getElementById('current-branch').textContent = branchData.name;
        }
    } catch (error) {
        console.error('Error loading branch:', error);
    }
}

// ====================================
// EDIT NAME
// ====================================

window.editName = function() {
    const newName = prompt('Введите новое имя:', currentUser.name || '');
    
    if (newName && newName !== currentUser.name) {
        updateUserProfile({ name: newName });
    }
};

// ====================================
// UPDATE PROFILE
// ====================================

async function updateUserProfile(updates) {
    try {
        await db.collection('users').doc(currentUser.id).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Обновляем локальные данные
        currentUser = { ...currentUser, ...updates };
        updateUI();
        
        alert('Профиль обновлен!');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Ошибка при обновлении профиля');
    }
}

// ====================================
// REQUEST TRANSFER
// ====================================

window.requestTransfer = async function() {
    alert('Функция переводов будет доступна позже');
    // TODO: Implement transfer request
};

// ====================================
// LOGOUT
// ====================================

window.handleLogout = async function() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        try {
            await auth.signOut();
            window.location.href = '/public/login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
};

// ====================================
// BRANCH MANAGEMENT
// ====================================

async function loadAdditionalBranches() {
    if (!currentUser.additionalBranchIds || currentUser.additionalBranchIds.length === 0) {
        document.getElementById('additional-branches-section').style.display = 'none';
        return;
    }
    
    document.getElementById('additional-branches-section').style.display = 'block';
    const container = document.getElementById('additional-branches-list');
    container.innerHTML = '';
    
    for (const branchId of currentUser.additionalBranchIds) {
        try {
            const branchDoc = await db.collection('branches').doc(branchId).get();
            if (branchDoc.exists) {
                const badge = document.createElement('span');
                badge.className = 'additional-branch-badge';
                badge.innerHTML = `<i class="fas fa-building"></i> ${branchDoc.data().name}`;
                container.appendChild(badge);
            }
        } catch (error) {
            console.error('Error loading branch:', error);
        }
    }
}

async function loadBranchRequests() {
    try {
        const requests = await db.collection('branchRequests')
            .where('userId', '==', currentUser.id)
            .get();
            
        // Фильтруем только pending запросы
        const pendingRequests = [];
        requests.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') {
                pendingRequests.push({ id: doc.id, ...data });
            }
        });
        
        // Сортируем по дате создания
        pendingRequests.sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return dateB - dateA;
        });
        
        if (pendingRequests.length === 0) {
            document.getElementById('branch-requests-section').style.display = 'none';
            return;
        }
        
        document.getElementById('branch-requests-section').style.display = 'block';
        const container = document.getElementById('branch-requests-list');
        container.innerHTML = '';
        
        const branches = {};
        
        for (const request of pendingRequests) {
            
            // Загружаем информацию о филиале
            if (!branches[request.requestedBranchId]) {
                const branchDoc = await db.collection('branches').doc(request.requestedBranchId).get();
                branches[request.requestedBranchId] = branchDoc.exists ? branchDoc.data().name : 'Неизвестный филиал';
            }
            
            const item = document.createElement('div');
            item.className = 'branch-request-item';
            item.innerHTML = `
                <div class="branch-request-info">
                    <div class="branch-request-type">
                        ${request.type === 'changeMain' ? 'Смена основного филиала' : 'Присоединение к филиалу'}
                    </div>
                    <div class="branch-request-name">${branches[request.requestedBranchId]}</div>
                </div>
                <div class="branch-request-actions">
                    <span class="branch-request-status pending">Ожидает</span>
                    <button class="branch-request-cancel" onclick="cancelRequest('${request.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        }
    } catch (error) {
        console.error('Error loading branch requests:', error);
    }
}

window.showChangeBranchModal = async function() {
    const modal = document.getElementById('change-branch-modal');
    const select = document.getElementById('new-main-branch');
    
    // Загружаем список филиалов
    select.innerHTML = '<option value="">Загрузка...</option>';
    
    try {
        const branches = await db.collection('branches').orderBy('name').get();
        select.innerHTML = '<option value="">Выберите филиал</option>';
        
        branches.forEach(doc => {
            if (doc.id !== currentUser.branchId) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading branches:', error);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
    
    modal.classList.add('show');
};

window.showAddBranchModal = async function() {
    const modal = document.getElementById('add-branch-modal');
    const select = document.getElementById('additional-branch');
    
    // Загружаем список филиалов
    select.innerHTML = '<option value="">Загрузка...</option>';
    
    try {
        const branches = await db.collection('branches').orderBy('name').get();
        select.innerHTML = '<option value="">Выберите филиал</option>';
        
        // Получаем все филиалы пользователя
        const userBranches = [currentUser.branchId, ...(currentUser.additionalBranchIds || [])];
        
        branches.forEach(doc => {
            if (!userBranches.includes(doc.id)) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading branches:', error);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
    
    modal.classList.add('show');
};

window.submitMainBranchChange = async function() {
    const branchId = document.getElementById('new-main-branch').value;
    const reason = ''; // Поле причины убрано из UI
    
    if (!branchId) {
        alert('Выберите филиал');
        return;
    }
    
    try {
        await db.collection('branchRequests').add({
            userId: currentUser.id,
            userName: currentUser.name || currentUser.email,
            userEmail: currentUser.email,
            type: 'changeMain',
            currentBranchId: currentUser.branchId,
            requestedBranchId: branchId,
            reason: reason,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Запрос на смену основного филиала отправлен');
        closeModal('change-branch-modal');
        loadBranchRequests();
    } catch (error) {
        console.error('Error submitting request:', error);
        alert('Ошибка при отправке запроса');
    }
};

window.submitAdditionalBranchRequest = async function() {
    const branchId = document.getElementById('additional-branch').value;
    const reason = ''; // Поле причины убрано из UI
    
    if (!branchId) {
        alert('Выберите филиал');
        return;
    }
    
    try {
        await db.collection('branchRequests').add({
            userId: currentUser.id,
            userName: currentUser.name || currentUser.email,
            userEmail: currentUser.email,
            type: 'addAdditional',
            currentBranchId: currentUser.branchId,
            requestedBranchId: branchId,
            reason: reason,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Запрос на присоединение к филиалу отправлен');
        closeModal('add-branch-modal');
        loadBranchRequests();
    } catch (error) {
        console.error('Error submitting request:', error);
        alert('Ошибка при отправке запроса');
    }
};

window.cancelRequest = async function(requestId) {
    if (!confirm('Отменить запрос?')) return;
    
    try {
        await db.collection('branchRequests').doc(requestId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        loadBranchRequests();
    } catch (error) {
        console.error('Error cancelling request:', error);
        alert('Ошибка при отмене запроса');
    }
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
};

console.log('⚙️ Settings module loaded');
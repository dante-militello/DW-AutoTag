/**
 * Popup Script - UI de la extensión
 */

document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
  try {
    const isFirstExecution = await ConfigManager.isFirstExecution();

    if (isFirstExecution) {
      showOnboarding();
    } else {
      showMainScreen();
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError('Error al inicializar: ' + error.message);
  }
}

/**
 * Muestra pantalla de onboarding
 */
async function showOnboarding() {
  toggleScreen('onboarding', true);

  try {
    const users = await ConfigManager.getUsers();

    if (!users || users.length === 0) {
      throw new Error('No users available in configuration');
    }

    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    users.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'user-card';
      userCard.innerHTML = `
        <img src="${user.avatar}" alt="${user.name}" class="user-card-avatar">
        <p class="user-card-name">${user.name}</p>
        <small class="user-card-tag">${user.tag}</small>
      `;
      userCard.onclick = () => selectUser(user);
      usersList.appendChild(userCard);
    });

    document.getElementById('loadingOnboarding').style.display = 'none';
  } catch (error) {
    document.getElementById('loadingOnboarding').style.display = 'none';
    showError('Error al cargar usuarios: ' + error.message, 'errorOnboarding');
  }
}

/**
 * Selecciona un usuario y guarda la selección
 */
async function selectUser(user) {
  try {
    await ConfigManager.setUserSelection(user.id, {
      tag: user.tag,
      avatar: user.avatar
    });

    // Mostrar pantalla principal
    showMainScreen();
  } catch (error) {
    showError('Error al guardar selección: ' + error.message);
  }
}

/**
 * Muestra pantalla principal
 */
async function showMainScreen() {
  toggleScreen('main', true);

  try {
    const selection = await ConfigManager.getUserSelection();

    if (!selection) {
      throw new Error('No user selected');
    }

    // Mostrar información del usuario actual
    document.getElementById('currentTag').textContent = selection.tag;
    document.getElementById('currentUserId').textContent = 'Usuario seleccionado';

    const avatarDiv = document.getElementById('currentAvatar');
    avatarDiv.innerHTML = `<img src="${selection.avatar}" alt="Avatar">`;

    // Configurar botones
    document.getElementById('reloadConfigBtn').onclick = reloadConfig;
    document.getElementById('changeUserBtn').onclick = changeUser;
    document.getElementById('forceRenderBtn').onclick = forceRender;

  } catch (error) {
    showError('Error al mostrar pantalla principal: ' + error.message);
  }
}

/**
 * Recarga la configuración desde URL
 */
async function reloadConfig() {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = 'Recargando...';
  statusEl.className = 'loading';

  try {
    // Limpiar caché
    await chrome.storage.local.remove('autoTagConfig');

    // Cargar nueva config
    await ConfigManager.loadConfig();

    statusEl.textContent = 'Configuración recargada ✓';
    statusEl.className = 'success';

    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = '';
    }, 2000);
  } catch (error) {
    statusEl.textContent = 'Error: ' + error.message;
    statusEl.className = 'error';
  }
}

/**
 * Cambia el usuario actual
 */
async function changeUser() {
  await ConfigManager.clearSelection();
  location.reload();
}

/**
 * Fuerza la actualización visual en la página actual
 */
async function forceRender() {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = 'Renderizando...';
  statusEl.className = 'loading';

  try {
    // Enviar mensaje al content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, { action: 'forceRender' });

    statusEl.textContent = 'Página renderizada ✓';
    statusEl.className = 'success';

    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = '';
    }, 2000);
  } catch (error) {
    statusEl.textContent = 'Error: ' + error.message;
    statusEl.className = 'error';
  }
}

/**
 * Alterna entre pantallas
 */
function toggleScreen(screenId, show) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.add('hidden'));

  if (show) {
    document.getElementById(screenId).classList.remove('hidden');
  }
}

/**
 * Muestra error
 */
function showError(message, containerId = 'errorOnboarding') {
  const errorEl = document.getElementById(containerId);
  const errorMsg = errorEl.querySelector('#errorMessage') || errorEl;

  if (errorMsg === errorEl) {
    errorEl.innerHTML = message;
  } else {
    errorMsg.textContent = message;
  }

  errorEl.style.display = 'block';
}

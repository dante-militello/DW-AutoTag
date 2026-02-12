/**
 * Popup Script - UI de la extensión
 */

console.log('[AutoTag Popup] Script cargado');

document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
  try {
    console.log('[AutoTag Popup] Inicializando popup');
    
    const isFirstExecution = await ConfigManager.isFirstExecution();
    console.log('[AutoTag Popup] ¿Primera ejecución?', isFirstExecution);

    if (isFirstExecution) {
      console.log('[AutoTag Popup] Mostrando onboarding');
      showOnboarding();
    } else {
      console.log('[AutoTag Popup] Mostrando pantalla principal');
      showMainScreen();
    }
  } catch (error) {
    console.error('[AutoTag Popup] Error inicializando popup:', error);
    showError('Error al inicializar: ' + error.message);
  }
}

/**
 * Muestra pantalla de onboarding
 */
async function showOnboarding() {
  console.log('[AutoTag Popup] showOnboarding() ejecutado');
  toggleScreen('onboarding', true);

  try {
    const users = await ConfigManager.getUsers();
    console.log('[AutoTag Popup] Usuarios obtenidos:', users);

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
    console.error('[AutoTag Popup] Error en showOnboarding:', error);
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
    // Obtener usuario seleccionado
    const selection = await ConfigManager.getUserSelection();
    if (!selection || !selection.tag) throw new Error('No hay usuario seleccionado');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Ejecutar script en la pestaña activa para forzar relleno del campo #summary
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (tag) => {
        try {
          const input = document.getElementById('summary');
          if (!input) return { ok: false, reason: 'no-input' };
          input.value = tag + ' ';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true };
        } catch (e) {
          return { ok: false, reason: e.message };
        }
      },
      args: [selection.tag]
    });

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

/**
 * Background Service Worker
 * Maneja eventos globales y sincronización de configuración
 */

// Importar ConfigManager (requerirá cargar config.js antes)
let ConfigManager;

// Cargar el script de config
chrome.runtime.getURL('src/config.js');

/**
 * Al instalar/actualizar la extensión
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Primera instalación - abrir onboarding
    chrome.action.openPopup();
  } else if (details.reason === 'update') {
    // Actualización - puede ser útil en el futuro
    console.log('Extension updated');
  }
});

/**
 * Listener para mensajes desde content scripts y popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getUserSelection') {
    // Enviar selección actual al content script
    chrome.storage.local.get('autoTagUserSelection', (data) => {
      sendResponse(data['autoTagUserSelection'] || null);
    });
    return true;
  }

  if (request.action === 'getConfig') {
    // Enviar configuración al popup
    chrome.storage.local.get('autoTagConfig', (data) => {
      sendResponse(data['autoTagConfig']?.config || null);
    });
    return true;
  }

  if (request.action === 'clearSelection') {
    // Limpiar selección del usuario
    chrome.storage.local.remove('autoTagUserSelection', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Sincronizar configuración periódicamente
 */
function syncConfig() {
  chrome.storage.local.get('autoTagConfig', (data) => {
    const cacheEntry = data['autoTagConfig'];
    
    if (!cacheEntry) {
      // No hay caché, cargar ahora
      loadConfigFromURL();
      return;
    }

    const { timestamp } = cacheEntry;
    const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 horas

    if (isExpired) {
      loadConfigFromURL();
    }
  });
}

/**
 * Carga configuración desde URL centralizada
 */
async function loadConfigFromURL() {
  try {
    const CONFIG_URL = 'https://repo.com/config.json'; // Cambiar a URL real
    const response = await fetch(CONFIG_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const config = await response.json();

    // Guardar en caché
    chrome.storage.local.set({
      autoTagConfig: {
        config,
        timestamp: Date.now()
      }
    });

    console.log('Config synced successfully');
  } catch (error) {
    console.error('Error syncing config:', error);
  }
}

// Sincronizar configuración cada 2 horas
chrome.alarms.create('syncConfig', { periodInMinutes: 120 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncConfig') {
    syncConfig();
  }
});

// Sincronizar al iniciar
syncConfig();

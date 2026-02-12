/**
 * Background Service Worker
 * Maneja eventos globales y sincronización de configuración
 */

console.log('[AutoTag Background] Service Worker iniciado');

/**
 * Al instalar/actualizar la extensión
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AutoTag Background] onInstalled:', details.reason);
  
  if (details.reason === 'install') {
    // Primera instalación - cargar config y abrir onboarding
    console.log('[AutoTag Background] Primera instalación, cargando config...');
    loadConfigFromURL().then(() => {
      chrome.action.openPopup();
    });
  } else if (details.reason === 'update') {
    console.log('[AutoTag Background] Extensión actualizada, sincronizando config');
    loadConfigFromURL();
  }
});

/**
 * Listener para mensajes desde content scripts y popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[AutoTag Background] Mensaje recibido:', request.action, 'desde:', sender.url);
  
  if (request.action === 'getUserSelection') {
    chrome.storage.local.get('autoTagUserSelection', (data) => {
      console.log('[AutoTag Background] getUserSelection:', data['autoTagUserSelection']);
      sendResponse(data['autoTagUserSelection'] || null);
    });
    return true;
  }

  if (request.action === 'getConfig') {
    chrome.storage.local.get('autoTagConfig', (data) => {
      console.log('[AutoTag Background] getConfig:', data['autoTagConfig']?.config);
      sendResponse(data['autoTagConfig']?.config || null);
    });
    return true;
  }

  if (request.action === 'clearSelection') {
    chrome.storage.local.remove('autoTagUserSelection', () => {
      console.log('[AutoTag Background] clearSelection ejecutado');
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Sincronizar configuración periódicamente
 */
function syncConfig() {
  console.log('[AutoTag Background] syncConfig() llamado');
  
  chrome.storage.local.get('autoTagConfig', (data) => {
    const cacheEntry = data['autoTagConfig'];
    
    if (!cacheEntry) {
      console.log('[AutoTag Background] No hay caché, cargando config desde URL');
      loadConfigFromURL();
      return;
    }

    const { timestamp } = cacheEntry;
    const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 horas

    if (isExpired) {
      console.log('[AutoTag Background] Caché expirado, recargando config');
      loadConfigFromURL();
    } else {
      console.log('[AutoTag Background] Caché válido, no es necesario recargar');
    }
  });
}

/**
 * Carga configuración desde URL centralizada
 */
async function loadConfigFromURL() {
  try {
    const CONFIG_URL = 'https://raw.githubusercontent.com/dante-militello/DW-AutoTag/main/config.json';
    console.log('[AutoTag Background] Descargando config desde:', CONFIG_URL);
    
    const response = await fetch(CONFIG_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const config = await response.json();
    console.log('[AutoTag Background] Config descargada exitosamente:', config);

    // Guardar en caché
    chrome.storage.local.set({
      autoTagConfig: {
        config,
        timestamp: Date.now()
      }
    }, () => {
      console.log('[AutoTag Background] Config guardada en caché');
    });

  } catch (error) {
    console.error('[AutoTag Background] Error descargando config:', error);
  }
}

// Sincronizar al iniciar el service worker
console.log('[AutoTag Background] Ejecutando syncConfig() al iniciar');
syncConfig();

// Sincronizar configuración cada 2 horas
chrome.alarms.create('syncConfig', { periodInMinutes: 120 });
console.log('[AutoTag Background] Alarma de sincronización configurada (cada 2 horas)');

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[AutoTag Background] Alarma disparada:', alarm.name);
  if (alarm.name === 'syncConfig') {
    syncConfig();
  }
});

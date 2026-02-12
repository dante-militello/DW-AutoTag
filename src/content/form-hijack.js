/**
 * Form Hijack Content Script - Approach Simple
 * Espera a que #summary aparezca en el DOM y lo rellena 4 veces
 */

let userSelection = null;

// Cargar selección de usuario
chrome.storage.local.get('autoTagUserSelection', (data) => {
  userSelection = data['autoTagUserSelection'] || null;
  console.log('[AutoTag FormHijack] Selección cargada:', userSelection);
  
  if (userSelection && userSelection.tag) {
    startWatching();
  }
});

/**
 * Inicia el monitoreo para detectar el input #summary
 */
function startWatching() {
  console.log('[AutoTag FormHijack] Iniciando observador');
  
  const observer = new MutationObserver(() => {
    const summaryInput = document.getElementById('summary');
    
    if (summaryInput && !summaryInput.dataset.autoTagProcessed) {
      console.log('[AutoTag FormHijack] Input #summary detectado!');
      summaryInput.dataset.autoTagProcessed = 'true';
      fillSummaryField(summaryInput);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[AutoTag FormHijack] Observador iniciado');
  
  // Búsqueda inicial por si el campo ya existe
  const existingInput = document.getElementById('summary');
  if (existingInput && !existingInput.dataset.autoTagProcessed) {
    console.log('[AutoTag FormHijack] Input #summary encontrado en búsqueda inicial');
    existingInput.dataset.autoTagProcessed = 'true';
    fillSummaryField(existingInput);
  }
}

/**
 * Intenta rellenar el campo #summary 4 veces
 */
function fillSummaryField(input) {
  const tag = userSelection.tag + ' ';
  let attempts = 0;
  const maxAttempts = 4;
  const delayMs = 300;

  function attempt() {
    attempts++;
    console.log(`[AutoTag FormHijack] Intento ${attempts}/${maxAttempts}`);
    
    if (input.value.trim() === '') {
      input.value = tag;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[AutoTag FormHijack] Intento ${attempts}: Valor insertado: "${tag}"`);
    } else {
      console.log(`[AutoTag FormHijack] Intento ${attempts}: Input ya tiene valor: "${input.value}"`);
    }

    if (attempts < maxAttempts) {
      setTimeout(attempt, delayMs);
    } else {
      console.log('[AutoTag FormHijack] Completados 4 intentos');
    }
  }

  attempt();
}

/**
 * Escuchar cambios en storage (si se cambia de usuario)
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.autoTagUserSelection) {
    userSelection = changes.autoTagUserSelection.newValue || null;
    console.log('[AutoTag FormHijack] Selección de usuario actualizada:', userSelection);
  }
});

/**
 * Escuchar mensajes desde popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'forceRender') {
    console.log('[AutoTag FormHijack] Recibida acción forceRender');
    chrome.storage.local.get('autoTagUserSelection', (data) => {
      userSelection = data['autoTagUserSelection'] || null;
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Form Hijack Content Script
 * Inserta automáticamente el TAG al crear un ticket
 */

// Cargar la selección del usuario al iniciar
loadUserSelection();

/**
 * Carga la selección del usuario desde storage
 */
function loadUserSelection() {
  console.log('[AutoTag FormHijack] loadUserSelection() llamado');
  
  chrome.storage.local.get('autoTagUserSelection', (data) => {
    userSelection = data['autoTagUserSelection'] || null;
    console.log('[AutoTag FormHijack] Selección de usuario cargada:', userSelection);
    
    if (userSelection) {
      observeFormChanges();
      
      // Búsqueda periódica adicional por si MutationObserver falla
      setInterval(scanForInputs, 500);
    }
  });
}

/**
 * Escanea el DOM buscando inputs que no hayan sido hijacked
 */
function scanForInputs() {
  const inputs = document.querySelectorAll(
    'input#summary,' +
    'input[name="summary"],' +
    'input[placeholder*="Summary"]'
  );

  inputs.forEach(input => {
    if (!input.dataset.autoTagHijacked) {
      console.log('[AutoTag FormHijack] Input encontrado en scanForInputs:', input.id || input.name);
      hijackInput(input);
    }
  });
}

/**
 * Observa cambios en el DOM para detectar formularios de creación
 */
function observeFormChanges() {
  console.log('[AutoTag FormHijack] Iniciando observador de cambios en DOM');
  
  // Observer para detectar cuando se abre el modal de creación
  const observer = new MutationObserver((mutations) => {
    // Buscar campo de título en modalDialog
    const titleInputs = document.querySelectorAll(
      'input#summary,' +
      'input[name="summary"],' +
      'input[placeholder*="title"],' +
      'input[placeholder*="Summary"],' +
      'textarea[name="summary"],' +
      '[data-testid="issue.views.issue-base.foundation.summary.input"]'
    );

    titleInputs.forEach(input => {
      if (!input.dataset.autoTagHijacked) {
        console.log('[AutoTag FormHijack] Input detectado, hijacking:', input.id || input.name);
        hijackInput(input);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['value', 'type', 'id', 'name']
  });

  console.log('[AutoTag FormHijack] Observer instalado en document.body');

  // Búsqueda inicial
  const initialInputs = document.querySelectorAll(
    'input#summary,' +
    'input[name="summary"],' +
    'input[placeholder*="title"],' +
    'input[placeholder*="Summary"],' +
    'textarea[name="summary"],' +
    '[data-testid="issue.views.issue-base.foundation.summary.input"]'
  );

  console.log('[AutoTag FormHijack] Búsqueda inicial encontró', initialInputs.length, 'inputs');
    }
  });
}

/**
 * Hijackea un input de título para auto-insertar TAG
 */
function hijackInput(inputElement) {
  if (!userSelection || !userSelection.tag) {
    console.log('[AutoTag FormHijack] No hay selección de usuario, saltando hijack');
    return;
  }

  console.log('[AutoTag FormHijack] Hijacking input:', {
    id: inputElement.id,
    name: inputElement.name,
    value: inputElement.value,
    tag: userSelection.tag
  });

  inputElement.dataset.autoTagHijacked = 'true';

  // Función auxiliar para insertar el TAG
  function insertTag() {
    console.log('[AutoTag FormHijack] Intentando insertar TAG en input');
    if (inputElement.value.trim() === '') {
      inputElement.value = userSelection.tag + ' ';
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      inputElement.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      console.log('[AutoTag FormHijack] TAG insertado:', inputElement.value);
    } else {
      console.log('[AutoTag FormHijack] Input ya tiene valor:', inputElement.value);
    }
  }

  // Insertar inmediatamente si el campo está vacío
  try {
    insertTag();

    // Reintento más agresivo: cada 200ms durante 1.5 segundos
    let attempts = 0;
    const maxAttempts = 7;
    const retryInterval = setInterval(() => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(retryInterval);
        console.log('[AutoTag FormHijack] Reintentos completados');
        return;
      }

      if (!inputElement.value || inputElement.value.trim() === '') {
        console.log('[AutoTag FormHijack] Campo vacío nuevamente, reinsertando en intento', attempts);
        insertTag();
      }
    }, 200);
  } catch (err) {
    console.error('[AutoTag FormHijack] Error en hijackInput:', err);
  }

  // Listener para cuando el usuario hace focus
  inputElement.addEventListener('focus', (e) => {
    console.log('[AutoTag FormHijack] Focus event en input');
    if (e.target.value.trim() === '') {
      console.log('[AutoTag FormHijack] Insertando TAG en focus');
      e.target.value = userSelection.tag + ' ';
      e.target.dispatchEvent(new Event('input', { bubbles: true }));
      e.target.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { once: false });

  // Prevenir que se elimine el TAG accidentalmente
  inputElement.addEventListener('keydown', (e) => {
    const currentValue = e.target.value;
    const isRemovingTag = (
      currentValue.startsWith(userSelection.tag) && 
      (e.key === 'Backspace' || e.key === 'Delete')
    );

    if (isRemovingTag && currentValue === userSelection.tag + ' ') {
      console.log('[AutoTag FormHijack] Previniendo eliminación de TAG');
      e.preventDefault();
    }
  });
}

/**
 * Escuchar mensajes desde el popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'forceRender') {
    // Recargar selección
    loadUserSelection();
    sendResponse({ success: true });
  }
});

/**
 * Escuchar cambios en storage para actualizar cuando se cambio de usuario
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.autoTagUserSelection) {
    userSelection = changes.autoTagUserSelection.newValue || null;
  }
});

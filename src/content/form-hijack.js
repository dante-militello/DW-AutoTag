/**
 * Form Hijack Content Script
 * Inserta automáticamente el TAG al crear un ticket
 */

let userSelection = null;

// Cargar la selección del usuario al iniciar
loadUserSelection();

/**
 * Carga la selección del usuario desde storage
 */
function loadUserSelection() {
  chrome.storage.local.get('autoTagUserSelection', (data) => {
    userSelection = data['autoTagUserSelection'] || null;
    observeFormChanges();
  });
}

/**
 * Observa cambios en el DOM para detectar formularios de creación
 */
function observeFormChanges() {
  // Observer para detectar cuando se abre el modal de creación
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
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
          hijackInput(input);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });

  // Búsqueda inicial
  const initialInputs = document.querySelectorAll(
    'input#summary,' +
    'input[name="summary"],' +
    'input[placeholder*="title"],' +
    'input[placeholder*="Summary"],' +
    'textarea[name="summary"],' +
    '[data-testid="issue.views.issue-base.foundation.summary.input"]'
  );

  initialInputs.forEach(input => {
    if (!input.dataset.autoTagHijacked) {
      hijackInput(input);
    }
  });
}

/**
 * Hijackea un input de título para auto-insertar TAG
 */
function hijackInput(inputElement) {
  if (!userSelection || !userSelection.tag) return;

  inputElement.dataset.autoTagHijacked = 'true';

  // Insertar TAG inmediatamente si el campo está vacío (al abrir formulario)
  try {
    if (inputElement.value.trim() === '') {
      inputElement.value = userSelection.tag + ' ';
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

      // Reintento corto por si JIRA sobrescribe el valor después de renderizar
      setTimeout(() => {
        if (!inputElement.value || inputElement.value.trim() === '') {
          inputElement.value = userSelection.tag + ' ';
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 250);
    }
  } catch (err) {
    // Silenciar errores en páginas donde input no permita value
    console.warn('[AutoTag] error inserting tag immediately', err);
  }

  // Listener para cuando el usuario empieza a escribir
  inputElement.addEventListener('focus', (e) => {
    // No hacer nada si ya tiene contenido
    if (e.target.value.trim() === '') {
      // Insertar TAG automáticamente
      e.target.value = userSelection.tag + ' ';
      e.target.dispatchEvent(new Event('input', { bubbles: true }));
      e.target.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Prevenir que se elimine el TAG accidentalmente
  inputElement.addEventListener('keydown', (e) => {
    const currentValue = e.target.value;
    const isRemovingTag = (
      currentValue.startsWith(userSelection.tag) && 
      (e.key === 'Backspace' || e.key === 'Delete')
    );

    if (isRemovingTag && currentValue === userSelection.tag + ' ') {
      // Prevenir eliminar el TAG
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

/**
 * Form Hijack Content Script - Approach Simple
 * Rellena automáticamente el campo #summary con el TAG cuando aparece
 */

// LOG INMEDIATO para verificar que el script se ejecuta
console.error('██ [AutoTag FormHijack] SCRIPT LOADED ██');

let userSelection = null;

console.log('[AutoTag FormHijack] Script iniciado');

// Cargar selección de usuario
chrome.storage.local.get('autoTagUserSelection', (data) => {
  userSelection = data['autoTagUserSelection'] || null;
  console.log('[AutoTag FormHijack] Selección cargada:', userSelection?.tag || 'NINGUNA');
  
  if (userSelection && userSelection.tag) {
    // Buscar e intentar rellenar inmediatamente
    fillIfExists();
    
    // Luego instalar observer para cuando se abra el formulario nuevamente
    installObserver();
  }
});

/**
 * Intenta rellenar el campo si existe ahora
 */
function fillIfExists() {
  const input = document.getElementById('summary');
  if (input) {
    console.log('[AutoTag FormHijack] Campo #summary encontrado al cargar');
    fillSummaryField(input);
  } else {
    console.log('[AutoTag FormHijack] Campo #summary no encontrado al cargar');
  }
}

/**
 * Instala observer para detectar cuando se abre el formulario
 */
function installObserver() {
  console.log('[AutoTag FormHijack] Instalando observer para cambios en DOM');
  
  const observer = new MutationObserver(() => {
    const input = document.getElementById('summary');
    
    // Si el input existe y no lo hemos procesado aún
    if (input && !input.dataset.autoTagFilled) {
      console.log('[AutoTag FormHijack] Campo #summary detectado en observer');
      fillSummaryField(input);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Rellena el campo #summary 4 veces (por si JIRA lo limpia)
 */
function fillSummaryField(input) {
  const tag = userSelection.tag + ' ';
  input.dataset.autoTagFilled = 'true';
  
  let attempts = 0;
  const maxAttempts = 4;
  const delayMs = 300;

  function attempt() {
    attempts++;
    console.log(`[AutoTag FormHijack] Intento ${attempts}/${maxAttempts} - Value: "${input.value}"`);
    
    if (input.value.trim() === '') {
      input.value = tag;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[AutoTag FormHijack] Intento ${attempts}: TAG insertado ✓`);
    } else {
      console.log(`[AutoTag FormHijack] Intento ${attempts}: Campo ya tiene valor`);
    }

    if (attempts < maxAttempts) {
      setTimeout(attempt, delayMs);
    }
  }

  attempt();
}

/**
 * Escuchar cambios en storage
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.autoTagUserSelection) {
    userSelection = changes.autoTagUserSelection.newValue || null;
    console.log('[AutoTag FormHijack] Selección actualizada:', userSelection?.tag || 'NINGUNA');
  }
});

/**
 * Wait for #summary to appear (polling) and fill it.
 */
function waitForSummaryAndFill() {
  if (!userSelection || !userSelection.tag) return;
  let checks = 0;
  const maxChecks = 10;
  const interval = setInterval(() => {
    checks++;
    const input = document.getElementById('summary');
    if (input && (!input.dataset.autoTagFilled)) {
      console.log('[AutoTag FormHijack] waitForSummaryAndFill: summary encontrado, llenando');
      fillSummaryField(input);
      clearInterval(interval);
      return;
    }
    if (checks >= maxChecks) {
      clearInterval(interval);
      console.log('[AutoTag FormHijack] waitForSummaryAndFill: no se encontró #summary tras', checks, 'intentos');
    }
  }, 200);
}

// Escuchar clicks en el botón Create o su enlace
document.addEventListener('click', (e) => {
  const target = e.target;
  if (!target) return;
  // detectar enlace o botón de crear issue
  const createBtn = target.closest && target.closest('#create_link, a.create-issue, li#create-menu');
  if (createBtn) {
    console.log('[AutoTag FormHijack] Click en Create detectado, esperando summary...');
    // dar un pequeño delay y luego comenzar a buscar
    setTimeout(waitForSummaryAndFill, 50);
  }
});

// Escuchar tecla 'c' (accesskey) para crear
document.addEventListener('keydown', (e) => {
  if (e.key && e.key.toLowerCase() === 'c') {
    // evitar cuando el usuario está escribiendo en un input
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    console.log('[AutoTag FormHijack] Tecla C detectada, esperando summary...');
    setTimeout(waitForSummaryAndFill, 50);
  }
});

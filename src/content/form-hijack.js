/**
 * Form Hijack Content Script - Approach Simple
 * Rellena automáticamente el campo #summary con el TAG cuando aparece
 */

// LOG INMEDIATO para verificar que el script se ejecuta
console.error('██ [AutoTag FormHijack] SCRIPT LOADED ██');

let userSelection = null;

console.log('[AutoTag FormHijack] Script iniciado');
// Cargar selección de usuario (si existe)
chrome.storage.local.get(['autoTagUserSelection','autoTagConfig'], (data) => {
  userSelection = data['autoTagUserSelection'] || null;
  console.log('[AutoTag FormHijack] Selección cargada:', userSelection?.tag || 'NINGUNA');
});

// Helper: obtener lista de usuarios desde storage o pedir al background
function getUsers() {
  return new Promise((resolve) => {
    chrome.storage.local.get('autoTagConfig', (data) => {
      const conf = data['autoTagConfig']?.config;
      if (conf && conf.users && conf.users.length) return resolve(conf.users);

      // fallback: pedir al background
      chrome.runtime.sendMessage({ action: 'getConfig' }, (resp) => {
        if (resp && resp.users) return resolve(resp.users);
        return resolve([]);
      });
    });
  });
}

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

/* ------------------ New UI: dropdown selector ------------------ */

// Inject minimal styles for the dropdown
function ensureStyles() {
  if (document.getElementById('autotag-styles')) return;
  const style = document.createElement('style');
  style.id = 'autotag-styles';
  style.textContent = `
    .autotag-dropdown { position: absolute; z-index: 999999; background: white; border: 1px solid #e6e6e6; box-shadow: 0 6px 18px rgba(0,0,0,0.12); border-radius:6px; width:280px; font-family: Arial, sans-serif; }
    .autotag-list { list-style:none; margin:0; padding:6px; max-height:240px; overflow:auto; }
    .autotag-item { display:flex; gap:8px; align-items:center; padding:6px; cursor:pointer; border-radius:4px; }
    .autotag-item:hover { background:#FFF5F0; }
    .autotag-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; }
    .autotag-name { font-size:13px; color:#333; font-weight:600; }
    .autotag-tag { font-size:12px; color: #FF6B35; margin-top:2px; }
    .autotag-item.selected { background:#FFF0E8; outline: 2px solid rgba(255,107,53,0.12); }
    .autotag-chips { display:flex; gap:6px; padding:8px; flex-wrap:wrap; border-bottom:1px solid #f1f1f1; }
    .autotag-chip { background:#FFF5F0; color: #FF6B35; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600; }
    .autotag-apply { display:block; width:100%; border:none; background:#FF6B35; color:white; padding:8px; font-weight:600; border-radius:0 0 6px 6px; cursor:pointer; }
  `;
  document.head.appendChild(style);
}

// Create dropdown element
function createDropdown() {
  ensureStyles();
  const container = document.createElement('div');
  container.className = 'autotag-dropdown';
  container.style.display = 'none';

  const chips = document.createElement('div');
  chips.className = 'autotag-chips';
  container.appendChild(chips);

  const list = document.createElement('ul');
  list.className = 'autotag-list';
  container.appendChild(list);

  const apply = document.createElement('button');
  apply.className = 'autotag-apply';
  apply.textContent = 'Apply';
  apply.onclick = () => { container.style.display = 'none'; };
  container.appendChild(apply);

  document.body.appendChild(container);
  return { container, list };
}

const DROPDOWN = createDropdown();

function positionDropdown(input, container) {
  const rect = input.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 6;
  const left = rect.left + window.scrollX;
  container.style.top = top + 'px';
  container.style.left = left + 'px';
}

async function showUserDropdown(input) {
  const users = await getUsers();
  const list = DROPDOWN.list;
  list.innerHTML = '';

  let selectedUsers = [];

  function updateChips() {
    DROPDOWN.list.previousSibling && (DROPDOWN.list.previousSibling.innerHTML = '');
    const chipContainer = DROPDOWN.list.previousSibling;
    selectedUsers.forEach(u => {
      const chip = document.createElement('span');
      chip.className = 'autotag-chip';
      chip.textContent = u.tag.replace(/\[|\]/g,'');
      chipContainer.appendChild(chip);
    });
  }

  function updateInputFromSelection(inputEl) {
    if (!selectedUsers.length) {
      // clear any previously inserted tag
      // only clear if the current value matches a bracketed tag pattern
      if (/^\[[^\]]+\]\s*/.test(inputEl.value)) {
        inputEl.value = '';
      }
      inputEl.dispatchEvent(new Event('input',{bubbles:true}));
      inputEl.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }
    const tags = selectedUsers.map(u => u.tag.replace(/\[|\]/g,''));
    const combined = '[' + tags.join('/') + ']';
    inputEl.value = combined + ' ';
    inputEl.dispatchEvent(new Event('input',{bubbles:true}));
    inputEl.dispatchEvent(new Event('change',{bubbles:true}));
  }

  if (!users || users.length === 0) {
    const li = document.createElement('li');
    li.className = 'autotag-item';
    li.textContent = 'No users available';
    list.appendChild(li);
  } else {
    users.forEach(user => {
      const li = document.createElement('li');
      li.className = 'autotag-item';
      li.dataset.userid = user.id;
      li.innerHTML = `<img class="autotag-avatar" src="${user.avatar}" alt="${user.name}"><div><div class="autotag-name">${user.name}</div><div class="autotag-tag">${user.tag}</div></div>`;
      li.onclick = (e) => {
        e.stopPropagation();
        // toggle selection
        const idx = selectedUsers.findIndex(u => u.id === user.id);
        if (idx === -1) {
          selectedUsers.push(user);
          li.classList.add('selected');
        } else {
          selectedUsers.splice(idx,1);
          li.classList.remove('selected');
        }
        updateChips();
        updateInputFromSelection(input);
      };
      list.appendChild(li);
    });
  }

  positionDropdown(input, DROPDOWN.container);
  DROPDOWN.container.style.display = 'block';
}

function hideDropdown() {
  DROPDOWN.container.style.display = 'none';
}

// Attach click/focus handler to input#summary to show dropdown
function attachSummarySelector() {
  function handler(e) {
    const input = e.target;
    if (!input || input.id !== 'summary') return;
    console.log('[AutoTag FormHijack] summary clicked — opening user dropdown');
    showUserDropdown(input);
  }

  // Use event delegation on document
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    if (target.id === 'summary' || target.closest && target.closest('#summary')) {
      handler({ target: document.getElementById('summary') });
      return;
    }
    // click outside -> hide
    if (DROPDOWN.container && !DROPDOWN.container.contains(target)) {
      hideDropdown();
    }
  }, true);

  // Also handle focus via keyboard
  document.addEventListener('focusin', (e) => {
    if (e.target && e.target.id === 'summary') {
      handler(e);
    }
  });
}

// initialize selector attachment
attachSummarySelector();


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

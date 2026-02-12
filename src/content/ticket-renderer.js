/**
 * Ticket Renderer Content Script
 * Reemplaza TAGs visuales en listados de tickets con avatares
 */

let userSelection = null;
let allUsers = [];
const tagToUserMap = new Map();

// Cargar configuración al iniciar
loadConfiguration();

/**
 * Carga la configuración inicial
 */
async function loadConfiguration() {
  // Obtener selección del usuario actual
  chrome.storage.local.get('autoTagUserSelection', (data) => {
    userSelection = data['autoTagUserSelection'] || null;
  });

  // Obtener configuración de usuarios
  chrome.storage.local.get('autoTagConfig', (data) => {
    const config = data['autoTagConfig'];
    if (config && config.config && config.config.users) {
      allUsers = config.config.users;
      buildTagToUserMap();
      startMonitoringTickets();
    }
  });
}

/**
 * Construye un mapa de TAG -> Usuario para búsqueda rápida
 */
function buildTagToUserMap() {
  tagToUserMap.clear();
  allUsers.forEach(user => {
    tagToUserMap.set(user.tag, user);
  });
}

/**
 * Inicia el monitoreo continuo de tickets en la página
 */
function startMonitoringTickets() {
  // Observer para detectar cuando se agregan nuevos tickets
  const observer = new MutationObserver((mutations) => {
    renderTicketTags();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Búsqueda inicial
  renderTicketTags();
}

/**
 * Renderiza todos los TAGs en los tickets visibles
 */
function renderTicketTags() {
  if (tagToUserMap.size === 0) return;

  // Buscar en múltiples contextos donde pueden aparecer TAGs
  const textNodes = findTextNodesWithTags();

  textNodes.forEach(({ node, tag, user }) => {
    replaceTagWithAvatar(node, tag, user);
  });
}

/**
 * Encuentra todos los nodos de texto que contienen TAGs
 */
function findTextNodesWithTags() {
  const results = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    // Skip script, style y otros nodos problemáticos
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement?.tagName)) {
      continue;
    }

    // Buscar TAGs en el texto
    for (const [tag, user] of tagToUserMap) {
      if (node.textContent.includes(tag)) {
        results.push({ node, tag, user });
        break; // Solo procesar una vez por nodo
      }
    }
  }

  return results;
}

/**
 * Reemplaza un TAG en un nodo de texto con un avatar
 */
function replaceTagWithAvatar(textNode, tag, user) {
  const text = textNode.textContent;
  
  // Buscar el TAG exacto (entre espacios o al inicio/final)
  const regex = new RegExp(`\\b${escapeRegex(tag)}\\b`, 'g');
  
  if (!regex.test(text)) return;

  // Crear span con avatar
  const avatarSpan = document.createElement('span');
  avatarSpan.className = 'auto-tag-avatar';
  avatarSpan.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin: 0 2px;
    vertical-align: middle;
  `;

  const img = document.createElement('img');
  img.src = user.avatar;
  img.alt = user.name;
  img.style.cssText = `
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
  `;
  img.title = user.name;

  avatarSpan.appendChild(img);

  // Reemplazar en el DOM
  const parent = textNode.parentNode;
  const newContent = text.replace(
    regex,
    avatarSpan.outerHTML
  );

  // Usar innerHTML solo en nodos que no contengan elementos importantes
  if (!hasImportantChildren(parent)) {
    parent.innerHTML = newContent;
  } else {
    // Alternativa: crear nodos nuevos con replaceChild
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newContent;
    
    while (tempDiv.firstChild) {
      parent.insertBefore(tempDiv.firstChild, textNode);
    }
    parent.removeChild(textNode);
  }
}

/**
 * Verifica si un elemento tiene hijos que no sean texto
 */
function hasImportantChildren(element) {
  return element.children?.length > 0;
}

/**
 * Escapa caracteres especiales en regex
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escuchar mensajes desde el popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'forceRender') {
    // Recargar configuración y renderizar
    loadConfiguration();
    setTimeout(renderTicketTags, 500);
    sendResponse({ success: true });
  }
});

/**
 * Escuchar cambios en storage
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.autoTagConfig) {
      const newConfig = changes.autoTagConfig.newValue;
      if (newConfig && newConfig.config && newConfig.config.users) {
        allUsers = newConfig.config.users;
        buildTagToUserMap();
        renderTicketTags();
      }
    }

    if (changes.autoTagUserSelection) {
      userSelection = changes.autoTagUserSelection.newValue || null;
    }
  }
});

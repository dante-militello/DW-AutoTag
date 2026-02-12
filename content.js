(function () {
  "use strict";

  // ========================================================================
  // DW AutoTag - Content Script
  // Todos los logs van a la consola del navegador con prefijo [DW-AutoTag]
  // ========================================================================

  const CONFIG_URL =
    "https://raw.githubusercontent.com/dante-militello/DW-AutoTag/main/config.json";
  const REFRESH_INTERVAL = 5 * 60 * 1000; // Refresca config cada 5 minutos

  let users = [];
  let selectedUsers = [];
  let dropdownElement = null;
  let currentAnchor = null;

  // ---------------------------------------------------------------------------
  // Logging helpers (todo va a la consola de la web)
  // ---------------------------------------------------------------------------
  const PREFIX = "%c[DW-AutoTag]";
  const STYLE = "color:#FF6B35;font-weight:bold";

  function log(...args) {
    console.log(PREFIX, STYLE, ...args);
  }
  function warn(...args) {
    console.warn(PREFIX, STYLE, ...args);
  }
  function error(...args) {
    console.error(PREFIX, STYLE, ...args);
  }

  // ---------------------------------------------------------------------------
  // Cargar configuración remota
  // ---------------------------------------------------------------------------
  async function loadConfig() {
    try {
      log("Cargando configuración desde:", CONFIG_URL);
      const response = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = await response.json();
      users = config.users || [];
      log(
        `${users.length} usuario(s) cargados:`,
        users.map((u) => u.name).join(", ")
      );
    } catch (e) {
      error("Error al cargar configuración:", e.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Parsear tags ya existentes en el campo summary
  // ---------------------------------------------------------------------------
  function parseSelectedFromValue(value) {
    // Busca un patrón tipo [Tag1/Tag2/Tag3] al inicio del string
    const match = value.match(/^\[([\w/]+)\]\s*/);
    if (!match) return [];

    const tagNames = match[1].split("/");
    return users.filter((u) => {
      const inner = u.tag.replace(/[\[\]]/g, "");
      return tagNames.includes(inner);
    });
  }

  // ---------------------------------------------------------------------------
  // Construir string de tag a partir de la selección
  // Ejemplo 1 usuario:  [DMilitello]
  // Ejemplo 2 usuarios: [Zamora/DMilitello]
  // ---------------------------------------------------------------------------
  function buildTagString(selected) {
    if (selected.length === 0) return "";
    const innerTags = selected.map((u) => u.tag.replace(/[\[\]]/g, ""));
    return `[${innerTags.join("/")}]`;
  }

  // ---------------------------------------------------------------------------
  // Actualizar el campo #summary con los tags seleccionados
  // ---------------------------------------------------------------------------
  function updateSummaryField(inputElement) {
    const tagString = buildTagString(selectedUsers);

    // Quitar tag existente al principio (si lo hay)
    let currentValue = inputElement.value.replace(/^\[[\w/]+\]\s*/, "");

    const newValue = tagString
      ? `${tagString} ${currentValue}`
      : currentValue;

    inputElement.value = newValue;

    // Disparar eventos para que Jira detecte el cambio
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));

    log("Campo summary actualizado:", newValue);
  }

  // ---------------------------------------------------------------------------
  // Toggle selección de usuario
  // ---------------------------------------------------------------------------
  function toggleUser(user, inputElement) {
    const index = selectedUsers.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      selectedUsers.splice(index, 1);
      log("Usuario deseleccionado:", user.name);
    } else {
      selectedUsers.push(user);
      log("Usuario seleccionado:", user.name);
    }

    updateSummaryField(inputElement);
    // Re-renderizar el dropdown para reflejar el cambio
    renderDropdown(inputElement);
  }

  // ---------------------------------------------------------------------------
  // Crear / renderizar el dropdown
  // ---------------------------------------------------------------------------
  function renderDropdown(anchorElement) {
    removeDropdown();

    const dropdown = document.createElement("div");
    dropdown.id = "dw-autotag-dropdown";
    dropdown.className = "dw-autotag-dropdown";

    // --- Header ---
    const header = document.createElement("div");
    header.className = "dw-autotag-header";

    const title = document.createElement("span");
    title.textContent = "Seleccionar usuarios";

    const clearBtn = document.createElement("span");
    clearBtn.className = "dw-autotag-clear";
    clearBtn.textContent = "Limpiar";
    clearBtn.title = "Deseleccionar todos";
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedUsers = [];
      updateSummaryField(anchorElement);
      renderDropdown(anchorElement);
      log("Selección limpiada");
    });

    header.appendChild(title);
    header.appendChild(clearBtn);
    dropdown.appendChild(header);

    // --- Lista de usuarios ---
    const list = document.createElement("div");
    list.className = "dw-autotag-list";

    users.forEach((user) => {
      const isSelected = selectedUsers.some((u) => u.id === user.id);

      const item = document.createElement("div");
      item.className = "dw-autotag-item" + (isSelected ? " selected" : "");

      // Avatar
      const avatar = document.createElement("img");
      avatar.className = "dw-autotag-avatar";
      avatar.src = user.avatar;
      avatar.alt = user.name;
      avatar.loading = "lazy";
      avatar.onerror = function () {
        // Fallback: mostrar iniciales
        this.style.display = "none";
        const initials = document.createElement("div");
        initials.className = "dw-autotag-avatar-fallback";
        initials.textContent = user.name
          .split(" ")
          .map((n) => n[0])
          .join("");
        item.insertBefore(initials, item.firstChild);
      };

      // Info (nombre + tag)
      const info = document.createElement("div");
      info.className = "dw-autotag-info";

      const nameEl = document.createElement("span");
      nameEl.className = "dw-autotag-name";
      nameEl.textContent = user.name;

      const tagEl = document.createElement("span");
      tagEl.className = "dw-autotag-tag";
      tagEl.textContent = user.tag;

      info.appendChild(nameEl);
      info.appendChild(tagEl);

      // Checkbox visual
      const checkbox = document.createElement("div");
      checkbox.className =
        "dw-autotag-checkbox" + (isSelected ? " checked" : "");
      checkbox.textContent = isSelected ? "✓" : "";

      item.appendChild(avatar);
      item.appendChild(info);
      item.appendChild(checkbox);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleUser(user, anchorElement);
      });

      list.appendChild(item);
    });

    dropdown.appendChild(list);

    // --- Footer con preview del tag ---
    const footer = document.createElement("div");
    footer.className = "dw-autotag-footer";
    const preview = buildTagString(selectedUsers);
    footer.textContent = preview
      ? `Tag: ${preview}`
      : "Ningún usuario seleccionado";
    dropdown.appendChild(footer);

    // --- Posicionamiento ---
    const rect = anchorElement.getBoundingClientRect();
    dropdown.style.position = "absolute";
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.zIndex = "999999";

    document.body.appendChild(dropdown);
    dropdownElement = dropdown;
    currentAnchor = anchorElement;

    log("Dropdown desplegado");
  }

  function removeDropdown() {
    if (dropdownElement) {
      dropdownElement.remove();
      dropdownElement = null;
      currentAnchor = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Inicialización
  // ---------------------------------------------------------------------------
  function init() {
    log("Inicializando DW-AutoTag v1.0.0…");

    // Carga inicial de configuración
    loadConfig();

    // Refrescar config periódicamente
    setInterval(loadConfig, REFRESH_INTERVAL);

    // Listener global de clicks
    document.addEventListener("click", (e) => {
      const target = e.target;

      // ¿Se hizo click en el campo #summary?
      if (
        target.id === "summary" &&
        target.tagName === "INPUT" &&
        target.type === "text"
      ) {
        log('Click detectado en campo #summary');

        if (users.length === 0) {
          warn("No hay usuarios cargados todavía. Reintentando carga…");
          loadConfig().then(() => {
            if (users.length > 0) {
              selectedUsers = parseSelectedFromValue(target.value);
              renderDropdown(target);
            }
          });
          return;
        }

        // Parsear selección actual del campo
        selectedUsers = parseSelectedFromValue(target.value);
        renderDropdown(target);
        return;
      }

      // Cerrar dropdown si se hizo click fuera
      if (
        dropdownElement &&
        !dropdownElement.contains(target)
      ) {
        removeDropdown();
        log("Dropdown cerrado (click fuera)");
      }
    });

    log("DW-AutoTag listo ✔");
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

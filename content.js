(function () {
  "use strict";

  // ========================================================================
  // DW AutoTag v1.1.0 - Content Script
  // Inyecta un campo "Asignación" encima de #summary con selector de usuarios.
  // Todos los logs van a la consola del navegador con prefijo [DW-AutoTag].
  // ========================================================================

  const CONFIG_URL =
    "https://raw.githubusercontent.com/dante-militello/DW-AutoTag/main/config.json";
  const REFRESH_INTERVAL = 5 * 60 * 1000; // Refresca config cada 5 min

  let users = [];
  let selectedUsers = [];
  let dropdownOpen = false;
  let widgetInjected = false; // Evita inyectar dos veces
  let summaryField = null;

  // Referencia a los elementos inyectados
  let widgetContainer = null;
  let chipsArea = null;
  let dropdownEl = null;

  // ---------------------------------------------------------------------------
  // Logging helpers – todo a la consola de la web
  // ---------------------------------------------------------------------------
  const PREFIX = "%c[DW-AutoTag]";
  const STYLE = "color:#FF6B35;font-weight:bold";
  function log(...a) { console.log(PREFIX, STYLE, ...a); }
  function warn(...a) { console.warn(PREFIX, STYLE, ...a); }
  function error(...a) { console.error(PREFIX, STYLE, ...a); }

  // ---------------------------------------------------------------------------
  // Cargar configuración remota
  // ---------------------------------------------------------------------------
  async function loadConfig() {
    try {
      log("Cargando configuración desde:", CONFIG_URL);
      const r = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const config = await r.json();
      users = config.users || [];
      log(`${users.length} usuario(s) cargados:`, users.map((u) => u.name).join(", "));
    } catch (e) {
      error("Error al cargar configuración:", e.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Tag helpers
  // ---------------------------------------------------------------------------
  function buildTagString(selected) {
    if (selected.length === 0) return "";
    const inner = selected.map((u) => u.tag.replace(/[\[\]]/g, ""));
    return `[${inner.join("/")}]`;
  }

  function parseSelectedFromValue(value) {
    const match = value.match(/^\[([\w/]+)\]\s*/);
    if (!match) return [];
    const tags = match[1].split("/");
    return users.filter((u) => {
      const inner = u.tag.replace(/[\[\]]/g, "");
      return tags.includes(inner);
    });
  }

  // ---------------------------------------------------------------------------
  // Actualizar el campo #summary
  // ---------------------------------------------------------------------------
  function updateSummaryField() {
    if (!summaryField) return;
    const tagString = buildTagString(selectedUsers);

    // Quitar tag existente al principio
    let text = summaryField.value.replace(/^\[[\w/]+\]\s*/, "");
    const newValue = tagString ? `${tagString} ${text}` : text;

    summaryField.value = newValue;
    summaryField.dispatchEvent(new Event("input", { bubbles: true }));
    summaryField.dispatchEvent(new Event("change", { bubbles: true }));
    log("Summary actualizado:", newValue);
  }

  // ---------------------------------------------------------------------------
  // Toggle selección de un usuario
  // ---------------------------------------------------------------------------
  function toggleUser(user) {
    const idx = selectedUsers.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      selectedUsers.splice(idx, 1);
      log("Deseleccionado:", user.name);
    } else {
      selectedUsers.push(user);
      log("Seleccionado:", user.name);
    }
    updateSummaryField();
    renderChips();
    renderDropdownList();
  }

  function clearSelection() {
    selectedUsers = [];
    updateSummaryField();
    renderChips();
    renderDropdownList();
    log("Selección limpiada");
  }

  // ---------------------------------------------------------------------------
  // Render: Chips (usuarios seleccionados dentro del selector)
  // ---------------------------------------------------------------------------
  function renderChips() {
    if (!chipsArea) return;

    // Limpiar todo menos el placeholder
    chipsArea.innerHTML = "";

    if (selectedUsers.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "dwat-chips-placeholder";
      placeholder.textContent = "Click para asignar usuarios…";
      chipsArea.appendChild(placeholder);
    } else {
      selectedUsers.forEach((user) => {
        const chip = document.createElement("div");
        chip.className = "dwat-chip";

        const img = document.createElement("img");
        img.className = "dwat-chip-avatar";
        img.src = user.avatar;
        img.alt = user.name;
        img.onerror = function () {
          this.style.display = "none";
          const fb = document.createElement("span");
          fb.className = "dwat-chip-avatar-fb";
          fb.textContent = user.name.split(" ").map((n) => n[0]).join("");
          chip.insertBefore(fb, chip.firstChild);
        };

        const name = document.createElement("span");
        name.className = "dwat-chip-name";
        name.textContent = user.name;

        const remove = document.createElement("span");
        remove.className = "dwat-chip-remove";
        remove.textContent = "×";
        remove.title = `Quitar ${user.name}`;
        remove.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleUser(user);
        });

        chip.appendChild(img);
        chip.appendChild(name);
        chip.appendChild(remove);
        chipsArea.appendChild(chip);
      });
    }

    // Tag preview
    let preview = chipsArea.querySelector(".dwat-chips-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "dwat-chips-preview";
      chipsArea.appendChild(preview);
    }
    const tag = buildTagString(selectedUsers);
    preview.textContent = tag || "";
    preview.style.display = tag ? "" : "none";
  }

  // ---------------------------------------------------------------------------
  // Render: Dropdown lista de usuarios
  // ---------------------------------------------------------------------------
  function renderDropdownList() {
    if (!dropdownEl) return;

    // Limpiar lista actual
    const existingList = dropdownEl.querySelector(".dwat-dd-list");
    if (existingList) existingList.remove();

    const list = document.createElement("div");
    list.className = "dwat-dd-list";

    users.forEach((user) => {
      const isSelected = selectedUsers.some((u) => u.id === user.id);

      const item = document.createElement("div");
      item.className = "dwat-dd-item" + (isSelected ? " selected" : "");

      // Avatar
      const avatar = document.createElement("img");
      avatar.className = "dwat-dd-avatar";
      avatar.src = user.avatar;
      avatar.alt = user.name;
      avatar.loading = "lazy";
      avatar.onerror = function () {
        this.style.display = "none";
        const fb = document.createElement("div");
        fb.className = "dwat-dd-avatar-fb";
        fb.textContent = user.name.split(" ").map((n) => n[0]).join("");
        item.insertBefore(fb, item.firstChild);
      };

      // Info
      const info = document.createElement("div");
      info.className = "dwat-dd-info";

      const nameEl = document.createElement("span");
      nameEl.className = "dwat-dd-name";
      nameEl.textContent = user.name;

      const tagEl = document.createElement("span");
      tagEl.className = "dwat-dd-tag";
      tagEl.textContent = user.tag;

      info.appendChild(nameEl);
      info.appendChild(tagEl);

      // Checkbox
      const chk = document.createElement("div");
      chk.className = "dwat-dd-chk" + (isSelected ? " checked" : "");
      chk.textContent = isSelected ? "✓" : "";

      item.appendChild(avatar);
      item.appendChild(info);
      item.appendChild(chk);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleUser(user);
      });

      list.appendChild(item);
    });

    // Insertar después del header
    const header = dropdownEl.querySelector(".dwat-dd-header");
    if (header && header.nextSibling) {
      dropdownEl.insertBefore(list, header.nextSibling);
    } else {
      dropdownEl.appendChild(list);
    }
  }

  // ---------------------------------------------------------------------------
  // Abrir / cerrar dropdown
  // ---------------------------------------------------------------------------
  function openDropdown() {
    if (!dropdownEl || dropdownOpen) return;
    dropdownEl.style.display = "block";
    dropdownOpen = true;
    renderDropdownList();
    log("Dropdown abierto");
  }

  function closeDropdown() {
    if (!dropdownEl || !dropdownOpen) return;
    dropdownEl.style.display = "none";
    dropdownOpen = false;
    log("Dropdown cerrado");
  }

  // ---------------------------------------------------------------------------
  // Construir el widget completo "Asignación"
  // ---------------------------------------------------------------------------
  function buildWidget() {
    // --- Contenedor principal ---
    widgetContainer = document.createElement("div");
    widgetContainer.id = "dwat-widget";
    widgetContainer.className = "dwat-widget";

    // --- Label ---
    const label = document.createElement("label");
    label.className = "dwat-label";
    label.textContent = "Asignación";
    widgetContainer.appendChild(label);

    // --- Selector con chips ---
    const selectorWrap = document.createElement("div");
    selectorWrap.className = "dwat-selector-wrap";

    chipsArea = document.createElement("div");
    chipsArea.className = "dwat-chips-area";
    chipsArea.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dropdownOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    selectorWrap.appendChild(chipsArea);

    // --- Dropdown ---
    dropdownEl = document.createElement("div");
    dropdownEl.className = "dwat-dropdown";
    dropdownEl.style.display = "none";

    // Header del dropdown
    const ddHeader = document.createElement("div");
    ddHeader.className = "dwat-dd-header";

    const ddTitle = document.createElement("span");
    ddTitle.textContent = "Seleccionar usuarios";

    const ddClear = document.createElement("span");
    ddClear.className = "dwat-dd-clear";
    ddClear.textContent = "Limpiar";
    ddClear.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelection();
    });

    ddHeader.appendChild(ddTitle);
    ddHeader.appendChild(ddClear);
    dropdownEl.appendChild(ddHeader);

    selectorWrap.appendChild(dropdownEl);
    widgetContainer.appendChild(selectorWrap);

    // Render inicial de chips
    renderChips();

    return widgetContainer;
  }

  // ---------------------------------------------------------------------------
  // Inyectar el widget encima de #summary
  // ---------------------------------------------------------------------------
  function injectWidget(summaryEl) {
    if (widgetInjected) return;

    summaryField = summaryEl;

    // Buscar el contenedor padre del summary para inyectar antes
    // En Jira suele ser un .field-group, o un div wrapper
    const parentGroup =
      summaryEl.closest(".field-group") ||
      summaryEl.closest("[class*='field']") ||
      summaryEl.parentElement;

    const widget = buildWidget();

    parentGroup.parentNode.insertBefore(widget, parentGroup);
    widgetInjected = true;

    // Si el summary ya tiene tags, parsearlos
    if (summaryEl.value) {
      selectedUsers = parseSelectedFromValue(summaryEl.value);
      if (selectedUsers.length > 0) {
        renderChips();
        log("Tags existentes detectados:", buildTagString(selectedUsers));
      }
    }

    log("Widget 'Asignación' inyectado encima de #summary");
  }

  // ---------------------------------------------------------------------------
  // Remover el widget (cuando #summary desaparece)
  // ---------------------------------------------------------------------------
  function removeWidget() {
    if (widgetContainer) {
      widgetContainer.remove();
      widgetContainer = null;
      chipsArea = null;
      dropdownEl = null;
    }
    widgetInjected = false;
    summaryField = null;
    selectedUsers = [];
    dropdownOpen = false;
    log("Widget removido (summary ya no existe)");
  }

  // ---------------------------------------------------------------------------
  // Observer: detectar cuándo aparece/desaparece #summary en el DOM
  // ---------------------------------------------------------------------------
  function startObserver() {
    // Chequeo inmediato
    const existing = document.querySelector('input#summary[type="text"]');
    if (existing) {
      injectWidget(existing);
    }

    const observer = new MutationObserver(() => {
      const summaryEl = document.querySelector('input#summary[type="text"]');

      if (summaryEl && !widgetInjected) {
        injectWidget(summaryEl);
      } else if (!summaryEl && widgetInjected) {
        removeWidget();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    log("MutationObserver activo – esperando campo #summary");
  }

  // ---------------------------------------------------------------------------
  // Click fuera: cerrar dropdown
  // ---------------------------------------------------------------------------
  function setupOutsideClick() {
    document.addEventListener("click", (e) => {
      if (!dropdownOpen) return;
      // Si el click fue dentro del widget, no cerrar
      if (widgetContainer && widgetContainer.contains(e.target)) return;
      closeDropdown();
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    log("Inicializando DW-AutoTag v1.1.0…");

    loadConfig().then(() => {
      startObserver();
    });

    // Refrescar config periódicamente
    setInterval(loadConfig, REFRESH_INTERVAL);

    setupOutsideClick();

    log("DW-AutoTag listo ✔");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

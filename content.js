(function () {
  "use strict";

  // ========================================================================
  // DW AutoTag v1.2.0 - Content Script
  // Inyecta un campo "Asignación" encima de #summary usando la estructura
  // nativa de Jira AUI (div.field-group > label + .text.long-field).
  // Todos los logs van a la consola del navegador con prefijo [DW-AutoTag].
  // ========================================================================

  const CONFIG_URL =
    "https://raw.githubusercontent.com/dante-militello/DW-AutoTag/main/config.json";
  const REFRESH_INTERVAL = 5 * 60 * 1000;

  let users = [];
  let selectedUsers = [];
  let dropdownOpen = false;
  let widgetInjected = false;
  let summaryField = null;

  // Refs a los elementos inyectados
  let widgetContainer = null;
  let chipsArea = null;
  let dropdownEl = null;

  // ---------------------------------------------------------------------------
  // Logging – todo a la consola de la web
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
    let text = summaryField.value.replace(/^\[[\w/]+\]\s*/, "");
    const newValue = tagString ? `${tagString} ${text}` : text;
    summaryField.value = newValue;
    summaryField.dispatchEvent(new Event("input", { bubbles: true }));
    summaryField.dispatchEvent(new Event("change", { bubbles: true }));
    log("Summary actualizado:", newValue);
  }

  // ---------------------------------------------------------------------------
  // Toggle usuario
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
  // Render: Chips
  // ---------------------------------------------------------------------------
  function renderChips() {
    if (!chipsArea) return;
    chipsArea.innerHTML = "";

    if (selectedUsers.length === 0) {
      const ph = document.createElement("span");
      ph.className = "dwat-placeholder";
      ph.textContent = "Click para asignar usuarios…";
      chipsArea.appendChild(ph);
      return;
    }

    selectedUsers.forEach((user) => {
      const chip = document.createElement("span");
      chip.className = "dwat-chip";

      const img = document.createElement("img");
      img.className = "dwat-chip-avatar";
      img.src = user.avatar;
      img.alt = user.name;
      img.onerror = function () {
        this.style.display = "none";
        const fb = document.createElement("span");
        fb.className = "dwat-chip-initials";
        fb.textContent = user.name.split(" ").map((n) => n[0]).join("");
        chip.insertBefore(fb, chip.firstChild);
      };

      const name = document.createElement("span");
      name.className = "dwat-chip-name";
      name.textContent = user.name;

      const rm = document.createElement("span");
      rm.className = "dwat-chip-rm";
      rm.textContent = "×";
      rm.title = `Quitar ${user.name}`;
      rm.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleUser(user);
      });

      chip.appendChild(img);
      chip.appendChild(name);
      chip.appendChild(rm);
      chipsArea.appendChild(chip);
    });

    // Tag preview al final
    const preview = document.createElement("span");
    preview.className = "dwat-tag-preview";
    preview.textContent = buildTagString(selectedUsers);
    chipsArea.appendChild(preview);
  }

  // ---------------------------------------------------------------------------
  // Render: Dropdown lista de usuarios
  // ---------------------------------------------------------------------------
  function renderDropdownList() {
    if (!dropdownEl) return;

    const existing = dropdownEl.querySelector(".dwat-dd-list");
    if (existing) existing.remove();

    const list = document.createElement("ul");
    list.className = "dwat-dd-list";

    users.forEach((user) => {
      const isSel = selectedUsers.some((u) => u.id === user.id);

      const li = document.createElement("li");
      li.className = "dwat-dd-item" + (isSel ? " active" : "");

      // Avatar
      const avatar = document.createElement("img");
      avatar.className = "dwat-dd-avatar";
      avatar.src = user.avatar;
      avatar.alt = user.name;
      avatar.loading = "lazy";
      avatar.onerror = function () {
        this.style.display = "none";
        const fb = document.createElement("span");
        fb.className = "dwat-dd-initials";
        fb.textContent = user.name.split(" ").map((n) => n[0]).join("");
        li.insertBefore(fb, li.firstChild);
      };

      // Texto
      const info = document.createElement("span");
      info.className = "dwat-dd-info";

      const nameEl = document.createElement("span");
      nameEl.className = "dwat-dd-name";
      nameEl.textContent = user.name;

      const tagEl = document.createElement("span");
      tagEl.className = "dwat-dd-tag";
      tagEl.textContent = user.tag;

      info.appendChild(nameEl);
      info.appendChild(tagEl);

      // Check icon
      const chk = document.createElement("span");
      chk.className = "dwat-dd-chk";
      chk.textContent = isSel ? "✓" : "";

      li.appendChild(avatar);
      li.appendChild(info);
      li.appendChild(chk);

      li.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleUser(user);
      });

      list.appendChild(li);
    });

    dropdownEl.appendChild(list);
  }

  // ---------------------------------------------------------------------------
  // Abrir / cerrar dropdown
  // ---------------------------------------------------------------------------
  function openDropdown() {
    if (!dropdownEl || dropdownOpen) return;
    dropdownEl.style.display = "block";
    dropdownOpen = true;
    chipsArea.classList.add("dwat-active");
    renderDropdownList();
    log("Dropdown abierto");
  }

  function closeDropdown() {
    if (!dropdownEl || !dropdownOpen) return;
    dropdownEl.style.display = "none";
    dropdownOpen = false;
    chipsArea.classList.remove("dwat-active");
    log("Dropdown cerrado");
  }

  // ---------------------------------------------------------------------------
  // Construir el widget – replica la estructura AUI de Jira:
  //   <div class="field-group">
  //     <label>Asignación</label>
  //     <div class="text long-field dwat-chips-area">…chips…</div>
  //     <div class="dwat-dropdown">…</div>
  //   </div>
  // ---------------------------------------------------------------------------
  function buildWidget() {
    // Wrapper: misma clase que los demás campos de Jira
    widgetContainer = document.createElement("div");
    widgetContainer.className = "field-group";
    widgetContainer.id = "dwat-field-group";

    // Label: idéntico al de Jira (sin for porque no es un input real)
    const label = document.createElement("label");
    label.setAttribute("for", "dwat-selector");
    label.innerHTML = 'Asignación <span class="aui-icon icon-dwat" aria-hidden="true"></span>';
    widgetContainer.appendChild(label);

    // Contenedor relativo para posicionar el dropdown
    const wrap = document.createElement("div");
    wrap.className = "dwat-selector-wrap";

    // Chips area: usa las clases de Jira + nuestra clase
    chipsArea = document.createElement("div");
    chipsArea.id = "dwat-selector";
    chipsArea.className = "text long-field dwat-chips-area";
    chipsArea.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownOpen ? closeDropdown() : openDropdown();
    });

    // Flecha dropdown (como el reporter de Jira)
    const arrow = document.createElement("span");
    arrow.className = "dwat-arrow";
    arrow.innerHTML = "▾";
    chipsArea.appendChild(arrow);

    wrap.appendChild(chipsArea);

    // Dropdown
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

    wrap.appendChild(dropdownEl);
    widgetContainer.appendChild(wrap);

    // Descripción (como la del reporter)
    const desc = document.createElement("div");
    desc.className = "description";
    desc.textContent = "Seleccioná uno o más usuarios para agregar el tag al título.";
    widgetContainer.appendChild(desc);

    renderChips();
    return widgetContainer;
  }

  // ---------------------------------------------------------------------------
  // Inyectar encima del field-group de #summary
  // ---------------------------------------------------------------------------
  function injectWidget(summaryEl) {
    if (widgetInjected) return;
    summaryField = summaryEl;

    const summaryGroup = summaryEl.closest(".field-group");
    if (!summaryGroup) {
      warn("#summary encontrado pero no está dentro de .field-group, insertando antes del padre");
      summaryEl.parentElement.insertBefore(buildWidget(), summaryEl);
    } else {
      summaryGroup.parentNode.insertBefore(buildWidget(), summaryGroup);
    }

    widgetInjected = true;

    // Parsear tags existentes
    if (summaryEl.value) {
      selectedUsers = parseSelectedFromValue(summaryEl.value);
      if (selectedUsers.length > 0) {
        renderChips();
        log("Tags existentes detectados:", buildTagString(selectedUsers));
      }
    }

    log("Widget 'Asignación' inyectado (field-group nativo)");
  }

  // ---------------------------------------------------------------------------
  // Remover widget
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
    log("Widget removido");
  }

  // ---------------------------------------------------------------------------
  // MutationObserver: detectar #summary en el DOM
  // ---------------------------------------------------------------------------
  function startObserver() {
    const existing = document.querySelector('input#summary[type="text"]');
    if (existing) injectWidget(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector('input#summary[type="text"]');
      if (el && !widgetInjected) injectWidget(el);
      else if (!el && widgetInjected) removeWidget();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    log("MutationObserver activo – esperando campo #summary");
  }

  // ---------------------------------------------------------------------------
  // Click fuera: cerrar dropdown
  // ---------------------------------------------------------------------------
  function setupOutsideClick() {
    document.addEventListener("click", (e) => {
      if (!dropdownOpen) return;
      if (widgetContainer && widgetContainer.contains(e.target)) return;
      closeDropdown();
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    log("Inicializando DW-AutoTag v1.2.0…");
    loadConfig().then(() => startObserver());
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

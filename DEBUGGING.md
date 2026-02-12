# Debugging Guide - JIRA Auto-Tag

Si la extensión no está cargando la config, sigue estos pasos:

## 1. Verificar que la extensión está cargada

1. Abre `chrome://extensions/`
2. Activa "Modo de desarrollador" (esquina superior derecha)
3. Consulta que ves **JIRA Auto-Tag** en la lista

## 2. Ver logs de la extensión

### Ver logs del Background Service Worker:
1. Ve a `chrome://extensions/`
2. Busca **JIRA Auto-Tag**
3. Clickea en **"Detalles"**
4. Busca la sección **"Inspeccionar vistas"**
5. Click en **"service worker"** (Si no ves esto, mira el paso 3 de abajo)
6. Se abrirá DevTools con la consola del background
7. Deberías ver logs como:
   - `[AutoTag Background] Service Worker iniciado`
   - `[AutoTag Background] onInstalled: install`
   - `[AutoTag Background] Descargando config desde: https://raw.githubusercontent.com/...`

### Ver logs del Popup:
1. Click en el icono de la extensión (icono naranja)
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Deberías ver logs como:
   - `[AutoTag Popup] Script cargado`
   - `[AutoTag Popup] Inicializando popup`

### Ver logs del Content Script:
1. Ve a `https://jira-iti.dat`
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Busca logs que empiecen con `[AutoTag Popup]` o `[AutoTag ConfigManager]`

## 3. Si no ves "service worker" en inspeccionar vistas

La extensión podría tener errores. En ese caso:
1. Ve a `chrome://extensions/`
2. Busca **JIRA Auto-Tag**
3. Debajo del nombre deberías ver un link **"Errores"** (si hay alguno)
4. Click en **"Errores"** para ver qué está fallando

## 4. Verificar que el archivo config.json es accesible

1. Abre en una pestaña: `https://raw.githubusercontent.com/dante-militello/DW-AutoTag/main/config.json`
2. Deberías ver el JSON con los usuarios
3. Si ves un 404 o error, el archivo no está subido a GitHub

## 5. Verificar que los avatares son accesibles

1. Abre F12 en `https://jira-iti.dat`
2. Ve a la pestaña **Network**
3. Busca requests que empiecen con `campus.donweb.com`
4. Verifica que no tengan status 404 o 403

## 6. Limpiar caché y recargar

1. Ve a `chrome://extensions/`
2. Busca **JIRA Auto-Tag**
3. Desactívala y vuelve a activarla
4. O simplemente: presiona **Ctrl+Shift+R** en JIRA

## Comandos de consola útiles

Abre la consola (F12 → Console) en la página del popup o en jira-iti.dat:

```javascript
// Ver config cacheada
chrome.storage.local.get('autoTagConfig', console.log);

// Ver selección de usuario
chrome.storage.local.get('autoTagUserSelection', console.log);

// Limpiar todo el storage
chrome.storage.local.clear();

// Ver si es primera ejecución
chrome.storage.local.get('autoTagUserSelection', (data) => {
  console.log('Primera ejecución:', !data.autoTagUserSelection);
});
```

## Errores comunes y soluciones

### Error: "No configuration available"
- El config.json no se descargó correctamente
- Verifica que la URL en config.js es correcta
- Verifica que el archivo existe en GitHub

### Error: "CORS error" en Network tab
- Problemas de CORS con GitHub (muy raro)
- Problemas con imágenes de avatares

### Avatares no cargan
- URLs incorrectas en config.json
- Imágenes no son públicas en campus.donweb.com
- Problemas de CORS en campus.donweb.com

### Popup no muestra usuarios
- Config.json no tiene usuarios
- ConfigManager.getUsers() retorna array vacío
- Error en la descarga de config

---

**Tip:** Todos los logs se filtran por `[AutoTag` para identificarlos fácilmente en la consola.

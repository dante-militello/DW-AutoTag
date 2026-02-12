# JIRA Auto-Tag Extension

Extensión de navegador para automatizar tagging en JIRA cuando múltiples usuarios comparten la misma cuenta.

## Características

- 🏷️ **Auto-inserción de TAGs**: Inserta automáticamente tu TAG al crear tickets
- 🎨 **Avatares personalizados**: Reemplaza TAGs de otros usuarios con avatares visuales en listados
- ⚙️ **Configuración centralizada**: Toda la configuración se guarda en un JSON online
- 🎯 **Onboarding simple**: Primera ejecución permite elegir tu usuario
- 🔄 **Sincronización automática**: Cacheado inteligente con fallback offline

## Instalación

### 1. Clonar o descargar el proyecto

```bash
git clone https://github.com/tu-repo/DW-AutoTag.git
cd DW-AutoTag
```

### 2. Configurar URL de configuración

Las URLs de configuración ya están configuradas para:

```javascript
const CONFIG_URL = 'https://raw.githubusercontent.com/dante-militello/DW-AutoTag/main/config.json';
```

Se encuentran en:
- `src/config.js`
- `src/background/background.js`

No es necesario cambiar estas URLs si mantienes el archivo `config.json` en la raíz del repositorio.

### 3. Preparar el JSON de configuración

Crear archivo `config.json` en la **raíz del repositorio** (mismo nivel que `README.md`).

Usar `config.example.json` como referencia. Estructura esperada:

```json
{
  "version": "1.0.0",
  "users": [
    {
      "id": "user_001",
      "name": "Nombre Usuario",
      "tag": "[TAG]",
      "avatar": "https://campus.donweb.com/path/a/imagen"
    }
  ]
}
```

⚠️ **Importante**: 
- Alojar `config.json` en la raíz del repositorio
- Los avatares deben estar en `https://campus.donweb.com/`
- Las imágenes deben ser públicas y accesibles
- Formatos recomendados: JPG, PNG
- Tamaño recomendado: 200x200px o superior (se mostrarán a 20x20px)

### 4. Instalar en Chrome/Edge

**Chrome:**
1. Ir a `chrome://extensions/`
2. Activar "Modo de desarrollador" (esquina superior derecha)
3. Click en "Cargar extensión sin empaquetar"
4. Seleccionar la carpeta del proyecto

**Edge:**
1. Ir a `edge://extensions/`
2. Activar "Modo de desarrollador"
3. Click en "Cargar extensión sin empaquetar"
4. Seleccionar la carpeta del proyecto

### 5. Usar la extensión

1. Ir a `https://jira-iti.dat`
2. La extensión mostrará un popup de onboarding
3. Elegir tu usuario de la lista
4. ¡Listo! La extensión está configurada

## Uso

### Auto-inserción de TAG
- Al crear un ticket, el TAG se inserta automáticamente en el título
- El campo recibe foco automáticamente el TAG

### Reemplazo visual de avatares
- En listados de tickets, los TAGs de otros usuarios se reemplazan con avatares
- Funciona en:
  - Listas de búsqueda
  - Quick filters
  - Posts/comentarios (iterativo)

### Panel de control
- Click en el icono de la extensión para:
  - Ver tu usuario actual
  - Recargar configuración
  - Cambiar de usuario
  - Forzar renderizado en página

## Estructura del proyecto

```
DW-AutoTag/
├── manifest.json                 # Configuración de extensión
├── config.example.json          # Ejemplo de config centralizada
├── src/
│   ├── config.js                # Gestor de configuración
│   ├── styles/
│   │   └── orange-theme.css     # Estilos globales (color naranja)
│   ├── popup/
│   │   ├── popup.html           # UI del popup
│   │   ├── popup.js             # Lógica del popup
│   │   └── popup.css            # Estilos del popup
│   ├── content/
│   │   ├── form-hijack.js       # Auto-inserción de TAGs
│   │   └── ticket-renderer.js   # Reemplazo visual de TAGs
│   └── background/
│       └── background.js        # Service worker de fondo
└── assets/                      # Iconos (16px, 48px, 128px)
```

## Configuración JSON centralizada

Archivo de configuración que se alojar en servidor:

```json
{
  "version": "1.0.0",
  "users": [
    {
      "id": "user_001",
      "name": "Nombre del usuario",
      "tag": "[TAG]",
      "avatar": "https://ejemplo.com/avatar.jpg"
    }
  ]
}
```

### Headers CORS

**GitHub** (raw.githubusercontent.com): ✓ CORS habilitado automáticamente

No se requiere configuración si alojas en GitHub Raw Content. La extensión puede acceder sin problemas.

**Para imágenes de campus.donweb.com:** Asegurar que sean accesibles públicamente.

## Caché y sincronización

- **Primera carga**: Descarga config desde URL
- **Caché local**: 24 horas
- **Sincronización**: Cada 2 horas en background
- **Fallback**: Si falla, usa caché aunque esté expirado
- **Offline**: Funciona con caché existente

## Troubleshooting

### La extensión no inserta TAGs
- Verificar que el TAGs está correctamente configurado en JSON
- Revisar que el usuario está seleccionado en el popup
- Verificar consola (F12 → Console) para errores

### Los avatares no aparecen
- Verificar que URLs de avatares son públicas
- Revisar permisos CORS del servidor
- Probar "Forzar renderizado" en panel de control

### Cambiar de usuario
- Click en panel → "Cambiar usuario"
- Seleccionar nuevo usuario de la lista
- Los cambios aplican inmediatamente

## Desarrollo

### Para modificar estilos
- Editar `src/styles/orange-theme.css` para tema global
- Editar `src/popup/popup.css` para UI del popup

### Para agregar más selectors JIRA
- Editar `src/content/form-hijack.js` en la función `hijackInput`
- Agregar más selectores en el `querySelectorAll`

### Para debuggear
- F12 en los tabs de JIRA → Console/Sources
- Revisar logs en `chrome://extensions/` → Details → "Errores"

## Licencia

Uso interno en Donweb.

## Contacto

Para reportar bugs o sugerencias, contactar al equipo.

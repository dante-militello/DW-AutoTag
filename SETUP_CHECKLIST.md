# ✅ Setup Checklist

Seguir estos pasos para instalar y configurar la extensión JIRA Auto-Tag.

## Paso 1: Preparar servidor de configuración
- [ ] Crear archivo JSON con estructura de usuarios (ver `config.example.json`)
- [ ] Subir JSON a un servidor web accesible
- [ ] Verificar que tiene CORS habilitado (headers `Access-Control-Allow-Origin: *`)
- [ ] Probar URL en navegador: `curl https://tu-url/config.json`

## Paso 2: Actualizar URLs de configuración
- [ ] Actualizar `CONFIG_URL` en `src/config.js`
- [ ] Actualizar `CONFIG_URL` en `src/background/background.js`
- [ ] Verificar que ambas URLs son idénticas

## Paso 3: Crear/Preparar iconos
- [ ] Crear icono 128x128 px (PNG, preferentemente naranja)
- [ ] Guardar como `assets/icon-128.png`
- [ ] Crear versión 48x48 px → `assets/icon-48.png`
- [ ] Crear versión 16x16 px → `assets/icon-16.png`
- [ ] **Temporal**: Puede saltarse este paso, icons son opcionales

## Paso 4: Instalar extensión en navegador

### Chrome:
- [ ] Ir a `chrome://extensions/`
- [ ] Activar "Modo de desarrollador" (esquina superior derecha)
- [ ] Click en "Cargar extensión sin empaquetar"
- [ ] Seleccionar carpeta `d:\Proyectos\DW-AutoTag`

### Edge:
- [ ] Ir a `edge://extensions/`
- [ ] Activar "Modo de desarrollador"
- [ ] Click en "Cargar extensión sin empaquetar"
- [ ] Seleccionar carpeta `d:\Proyectos\DW-AutoTag`

## Paso 5: Verificar instalación
- [ ] Ver extensión en lista de extensiones
- [ ] Ver icono de extensión en barra de herramientas

## Paso 6: Prueba inicial
- [ ] Ir a `https://jira-iti.dat`
- [ ] Debe aparecer popup de onboarding con lista de usuarios
- [ ] **Si no aparece**: Revisar `chrome://extensions/` → DetallesPrograma → "Errores"

## Paso 7: Configurar usuario
- [ ] Seleccionar tu usuario de la lista
- [ ] Avatar debe aparecer en popup de control
- [ ] TAG debe mostrarse correctamente

## Paso 8: Prueba de funcionalidad

### Auto-inserción:
- [ ] Ir a crear un nuevo ticket en JIRA
- [ ] Hacer click en campo de "Título/Sumario"
- [ ] El TAG debe aparecer automáticamente

### Reemplazo de avatares:
- [ ] Ir a un listado de tickets (búsqueda, board, etc)
- [ ] Buscar tickets con TAGs de otros usuarios
- [ ] Los TAGs deben ser reemplazados por avatares
- [ ] Avatares deben ser clickeables (mostrar nombre en tooltip)

## Paso 9: Test de popup
- [ ] Click en icono de extensión
- [ ] Debe mostrar información del usuario actual
- [ ] Botones deben funcionar:
  - [ ] "Recargar Configuración" → debe sincronizar
  - [ ] "Cambiar Usuario" → debe volver a onboarding
  - [ ] "Renderizar Página" → debe actualizar avatares

## Paso 10: Troubleshooting

Si algo no funciona:

### Popup no aparece en onboarding:
- [ ] Revisar consola (F12 → Console)
- [ ] Verificar que `CONFIG_URL` es accesible
- [ ] Comprobar CORS en servidor

### TAG no se inserta automáticamente:
- [ ] Verificar que el usuario está seleccionado (popup)
- [ ] Revisar que el TAG está en la configuración JSON
- [ ] Comprobar que DOM selector es correcto (F12 → inspect)

### Avatares no aparecen:
- [ ] Verificar URLs de avatares en JSON
- [ ] Comprobar que son imágenes públicas
- [ ] Revisar CORS del servidor de imágenes
- [ ] Usar botón "Renderizar Página" del popup

### CORS errors:
- [ ] Verificar headers en servidor de config.json:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET
  Content-Type: application/json
  ```

## Paso 11: Deployment (Opcional)

Una vez todo funciona:
- [ ] Crear `.crx` para distribución (Chrome Web Store)
- [ ] O crear ZIP para distribución manual
- [ ] Documentar instrucciones para usuarios

## Notas adicionales

- **Cache**: Config se cacheea 24 horas localmente
- **Sincronización**: Background sync cada 2 horas
- **Offline**: Funciona con caché aunque esté expirado
- **Desarrollo**: En `chrome://extensions/` activar "Modo de desarrollador" para ver errores en tiempo real

---

**Estado**: Ready for Development ✓
**Última actualización**: 2026-02-12

/**
 * Config Manager - Gestiona la configuración centralizada
 * Carga usuarios y avatares desde JSON online
 */

console.log('[AutoTag ConfigManager] Script cargado');

const CONFIG_URL = 'https://raw.githubusercontent.com/dante-militello/DW-AutoTag/main/config.json';
const CACHE_KEY = 'autoTagConfig';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
const USER_SELECTION_KEY = 'autoTagUserSelection';

class ConfigManager {
  /**
   * Carga la configuración centralizada desde URL o caché
   */
  static async loadConfig() {
    console.log('[AutoTag ConfigManager] loadConfig() llamado');
    try {
      // Intenta cargar desde caché primero
      const cached = await this.getCachedConfig();
      if (cached) {
        console.log('[AutoTag ConfigManager] Config cargada desde caché');
        return cached;
      }

      // Si no hay caché o expiró, carga desde URL
      console.log('[AutoTag ConfigManager] No hay caché válido, descargando desde URL');
      const response = await fetch(CONFIG_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const config = await response.json();
      console.log('[AutoTag ConfigManager] Config descargada desde URL:', config);
      
      // Guarda en caché
      await this.setCachedConfig(config);
      
      return config;
    } catch (error) {
      console.error('[AutoTag ConfigManager] Error en loadConfig:', error);
      
      // Retorna caché aunque esté expirado en caso de error
      const data = await chrome.storage.local.get(CACHE_KEY);
      if (data[CACHE_KEY]) {
        console.log('[AutoTag ConfigManager] Usando caché expirado como fallback');
        return data[CACHE_KEY].config;
      }
      
      throw new Error('No configuration available');
    }
  }

  /**
   * Obtiene la configuración cacheada si no expiró
   */
  static async getCachedConfig() {
    const data = await chrome.storage.local.get(CACHE_KEY);
    if (!data[CACHE_KEY]) {
      console.log('[AutoTag ConfigManager] No hay entrada de caché');
      return null;
    }

    const { config, timestamp } = data[CACHE_KEY];
    const isExpired = Date.now() - timestamp > CACHE_DURATION;

    if (isExpired) {
      console.log('[AutoTag ConfigManager] Caché expirado');
      return null;
    }
    console.log('[AutoTag ConfigManager] Caché válido');
    return config;
  }

  /**
   * Guarda la configuración en caché local
   */
  static async setCachedConfig(config) {
    console.log('[AutoTag ConfigManager] Guardando config en caché');
    await chrome.storage.local.set({
      [CACHE_KEY]: {
        config,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Obtiene la selección actual del usuario
   */
  static async getUserSelection() {
    const data = await chrome.storage.local.get(USER_SELECTION_KEY);
    const selection = data[USER_SELECTION_KEY] || null;
    console.log('[AutoTag ConfigManager] getUserSelection:', selection);
    return selection;
  }

  /**
   * Guarda la selección del usuario y su información asociada
   * @param {string} userId - ID del usuario
   * @param {object} userInfo - Información del usuario (tag, avatar, etc)
   */
  static async setUserSelection(userId, userInfo) {
    console.log('[AutoTag ConfigManager] setUserSelection:', { userId, ...userInfo });
    await chrome.storage.local.set({
      [USER_SELECTION_KEY]: {
        userId,
        tag: userInfo.tag,
        avatar: userInfo.avatar,
        selectedAt: Date.now()
      }
    });
  }

  /**
   * Obtiene información de usuario específico de la configuración
   */
  static async getUserInfo(userId) {
    const config = await this.loadConfig();
    return config.users?.find(u => u.id === userId);
  }

  /**
   * Obtiene lista de usuarios disponibles
   */
  static async getUsers() {
    console.log('[AutoTag ConfigManager] getUsers() llamado');
    const config = await this.loadConfig();
    const users = config.users || [];
    console.log('[AutoTag ConfigManager] Usuarios disponibles:', users.length);
    return users;
  }

  /**
   * Limpia todo el almacenamiento local (para resetear)
   */
  static async clearSelection() {
    console.log('[AutoTag ConfigManager] clearSelection ejecutado');
    await chrome.storage.local.remove(USER_SELECTION_KEY);
  }

  /**
   * Verifica si es primera ejecución
   */
  static async isFirstExecution() {
    const selection = await this.getUserSelection();
    const isFirst = !selection;
    console.log('[AutoTag ConfigManager] ¿Primera ejecución?', isFirst);
    return isFirst;
  }
}

// Exportar para uso en otros scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigManager;
}

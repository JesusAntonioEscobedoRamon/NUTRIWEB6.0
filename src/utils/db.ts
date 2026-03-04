// src/utils/db.ts
// IndexedDB para guardar acciones pendientes cuando no hay conexión

const DB_NAME = 'NutriUOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingActions';

let dbPromise: Promise<IDBDatabase> | null = null;

// Inicializa o abre la base de datos
export function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error al abrir IndexedDB', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });

  return dbPromise;
}

// Guardar una acción pendiente (ej: { type: 'addAlimento', data: {...}, timestamp: Date.now() })
export async function savePendingAction(action: any): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(action);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

// Obtener todas las acciones pendientes
export async function getPendingActions(): Promise<any[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Eliminar una acción después de sincronizarla
export async function deletePendingAction(id: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sincronizar todas las pendientes (llamar cuando vuelva la conexión)
export async function syncPendingActions() {
  const actions = await getPendingActions();
  if (actions.length === 0) return;

  console.log(`Sincronizando ${actions.length} acciones pendientes...`);

  for (const action of actions) {
    try {
      // Aquí va la lógica REAL de sincronización según el tipo
      // Ejemplo para 'addAlimento'
      if (action.type === 'addAlimento') {
        const { error } = await supabase.from('registro_alimentos').insert(action.data);
        if (error) throw error;
      }
      // Añade más casos según necesites (addCita, updatePerfil, etc.)

      // Si se sincronizó bien → borrar
      await deletePendingAction(action.id);
      console.log(`Acción sincronizada y eliminada: ${action.id}`);
    } catch (err) {
      console.error('Fallo al sincronizar acción', action.id, err);
      // Puedes decidir reintentar después o marcar como fallida
    }
  }
}

export async function clearAllPending() {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
export interface SessionRecord {
  id: string;
  expiresAt: number;
}

export interface SessionStore {
  create: (id: string, expiresAt: number) => SessionRecord;
  /** Devuelve la sesión si existe y no venció; si venció, la elimina y devuelve `null`. */
  get: (id: string, now: number) => SessionRecord | null;
  destroy: (id: string) => void;
}

/**
 * Sesiones en memoria (ver design.md, decisión 7): permite revocar de verdad,
 * a costa de perderlas si el proceso se reinicia. Cada instancia tiene su
 * propio mapa; la app usa una única instancia (ver `index.ts`), los tests
 * crean la suya para no compartir estado entre casos.
 */
export function createSessionStore(): SessionStore {
  const sessions = new Map<string, SessionRecord>();

  return {
    create(id, expiresAt) {
      const record: SessionRecord = { id, expiresAt };
      sessions.set(id, record);
      return record;
    },
    get(id, now) {
      const record = sessions.get(id);
      if (!record) return null;
      if (record.expiresAt <= now) {
        sessions.delete(id);
        return null;
      }
      return record;
    },
    destroy(id) {
      sessions.delete(id);
    },
  };
}

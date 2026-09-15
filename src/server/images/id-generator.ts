import { ulid } from 'ulid';

/** Identificador único de imagen, generado por el servidor. Nunca deriva del cliente. */
export function generateImageId(): string {
  return ulid();
}

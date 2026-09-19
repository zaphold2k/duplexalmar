import { verifyPassword } from './password';

export interface AdminCredentials {
  username: string;
  passwordHash: string;
}

/**
 * Verifica usuario y contraseña. Siempre corre `verifyPassword` (costosa)
 * aunque el usuario ya no coincida, para no delatar por tiempo de respuesta
 * cuál de los dos campos falló (ver spec admin-imagenes, "Credenciales
 * incorrectas").
 */
export async function verifyCredentials(
  username: string,
  password: string,
  credentials: AdminCredentials,
): Promise<boolean> {
  const passwordMatches = await verifyPassword(password, credentials.passwordHash);
  const usernameMatches = username === credentials.username;
  return usernameMatches && passwordMatches;
}

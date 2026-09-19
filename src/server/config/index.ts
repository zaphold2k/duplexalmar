export { ConfigError, loadConfig } from './load-config';
export type { AppConfig } from './load-config';
export { envSchema } from './schema';
export type { Env } from './schema';

import { loadConfig } from './load-config';

export const config = loadConfig(process.env);

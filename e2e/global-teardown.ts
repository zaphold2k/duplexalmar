import { rm } from 'node:fs/promises';
import path from 'node:path';

export default async function globalTeardown(): Promise<void> {
  await rm(path.join(process.cwd(), 'data'), { recursive: true, force: true });
}

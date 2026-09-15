import { hashPassword } from '../src/server/auth/password';

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run hash-password -- "la-contraseña"');
  process.exit(1);
}

const hash = await hashPassword(password);
console.log(hash);

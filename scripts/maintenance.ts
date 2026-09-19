import { config } from '../src/server/config';
import { deleteOrphans, findOrphans } from '../src/server/maintenance/orphans';

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const shouldDelete = process.argv.includes('--delete');

const report = await findOrphans(config.dataDir);

if (report.orphans.length === 0) {
  console.log('No se encontraron archivos huérfanos.');
  process.exit(0);
}

console.log(
  `Se encontraron ${String(report.orphans.length)} archivos huérfanos (${formatSize(report.totalSizeBytes)}):`,
);
for (const orphan of report.orphans) {
  console.log(`  - ${orphan.house}/${orphan.fileName} (${formatSize(orphan.sizeBytes)})`);
}

if (shouldDelete) {
  await deleteOrphans(report.orphans);
  console.log('\nArchivos eliminados.');
} else {
  console.log('\nNo se borró nada. Para eliminarlos, volver a correr con --delete.');
}

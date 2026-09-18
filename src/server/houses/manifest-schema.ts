import { z } from 'zod';
import { ValidationError } from '../../lib/errors';

const imageIdSchema = z.string().min(1);

export const houseImageSchema = z.object({
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  originalExt: z.string().min(1),
  uploadedAt: z.iso.datetime(),
});

export const houseManifestSchema = z
  .object({
    version: z.literal(1),
    cover: imageIdSchema.nullable(),
    gallery: z.array(imageIdSchema),
    images: z.record(imageIdSchema, houseImageSchema),
  })
  .check((ctx) => {
    const manifest = ctx.value;
    for (const id of manifest.gallery) {
      if (!(id in manifest.images)) {
        ctx.issues.push({
          code: 'custom',
          message: `gallery referencia el id "${id}", que no existe en images`,
          input: manifest,
        });
      }
    }
    if (manifest.cover !== null && !(manifest.cover in manifest.images)) {
      ctx.issues.push({
        code: 'custom',
        message: `cover referencia el id "${manifest.cover}", que no existe en images`,
        input: manifest,
      });
    }
  });

export type HouseImage = z.infer<typeof houseImageSchema>;
export type HouseManifest = z.infer<typeof houseManifestSchema>;

export const EMPTY_MANIFEST: HouseManifest = {
  version: 1,
  cover: null,
  gallery: [],
  images: {},
};

export function parseManifest(raw: unknown): HouseManifest {
  const result = houseManifestSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`,
    );
    throw new ValidationError(
      `Manifest de casa inválido:\n${details.map((d) => `  - ${d}`).join('\n')}`,
    );
  }
  return result.data;
}

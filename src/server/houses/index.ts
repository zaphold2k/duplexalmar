export {
  EMPTY_MANIFEST,
  houseImageSchema,
  houseManifestSchema,
  parseManifest,
} from './manifest-schema';
export type { HouseImage, HouseManifest } from './manifest-schema';

export { readManifest, writeManifest } from './manifest-store';

export {
  addImage,
  getEffectiveCoverId,
  moveImage,
  removeImage,
  setAltText,
  setCover,
} from './manifest-operations';
export type { MoveDirection, NewHouseImage } from './manifest-operations';

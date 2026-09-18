export { detectImageFormat } from './detect-format';
export type { ImageFormat } from './detect-format';

export { decodeHeic } from './heic-decoder';
export type { DecodedPixels } from './heic-decoder';

export { applicableVariantWidths, processImage, VARIANT_WIDTHS } from './process-image';
export type { ImageVariant, ProcessedImage, VariantWidth } from './process-image';

export { generateImageId } from './id-generator';

export { deleteImageFiles, saveProcessedImage } from './storage';

export { originalFileName, variantFileName } from './filenames';

export { imageVariantUrl } from './urls';

export { serveImageFile } from './serve-file';

export { processUploadBatch } from './batch';
export type { BatchItemFailure, BatchItemResult, BatchItemSuccess, UploadedFile } from './batch';

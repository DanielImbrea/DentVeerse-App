import {
  MESSAGE_ATTACHMENT_MAX_BYTES,
  MESSAGE_ATTACHMENT_MAX_EDGE_PX,
  MESSAGE_ATTACHMENT_TARGET_BYTES,
  formatBytes,
} from '@dental/utils';
import { base64ToArrayBuffer, readUriAsArrayBuffer } from './uploadMedia';

export type PreparedMessageImage = {
  bytes: ArrayBuffer;
  mimeType: string;
  ext: string;
};

/** Resize + compress before upload; enforces platform max size. */
export async function prepareMessageImageForUpload(pickerUri: string, base64?: string | null): Promise<PreparedMessageImage> {
  let uri = pickerUri;
  let mimeType = 'image/jpeg';
  let ext = 'jpg';

  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const manipulated = await ImageManipulator.manipulateAsync(
      pickerUri,
      [{ resize: { width: MESSAGE_ATTACHMENT_MAX_EDGE_PX } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    uri = manipulated.uri;
    mimeType = 'image/jpeg';
    ext = 'jpg';
    base64 = null;
  } catch {
    // Manipulator unavailable — fall back to picker output.
  }

  const bytes = base64 ? base64ToArrayBuffer(base64) : await readUriAsArrayBuffer(uri);

  if (bytes.byteLength === 0) {
    throw new Error('Fișierul imaginii este gol.');
  }
  if (bytes.byteLength > MESSAGE_ATTACHMENT_MAX_BYTES) {
    throw new Error(`Imaginea depășește ${formatBytes(MESSAGE_ATTACHMENT_MAX_BYTES)}. Alege o poză mai mică.`);
  }
  if (bytes.byteLength > MESSAGE_ATTACHMENT_TARGET_BYTES && __DEV__) {
    console.warn(`[chat] Image ${formatBytes(bytes.byteLength)} exceeds target ${formatBytes(MESSAGE_ATTACHMENT_TARGET_BYTES)}`);
  }

  return { bytes, mimeType, ext };
}

export { MESSAGE_ATTACHMENT_MAX_BYTES, formatBytes };

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const normalized = base64.replace(/^data:[^;]+;base64,/, '');
  const binary = globalThis.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** XHR reads local gallery URIs reliably on iOS where fetch().arrayBuffer() can return 0 bytes. */
function readUriViaXHR(uri: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.response instanceof ArrayBuffer && xhr.response.byteLength > 0) {
        resolve(xhr.response);
        return;
      }
      reject(new Error('Fișierul imaginii este gol'));
    };
    xhr.onerror = () => reject(new Error('Nu s-a putut citi fișierul'));
    xhr.responseType = 'arraybuffer';
    xhr.open('GET', uri);
    xhr.send();
  });
}

/** Read a local gallery/camera URI into bytes for Supabase Storage upload. */
export async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(uri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) return buffer;
    }
  } catch {
    // fall through to XHR
  }

  return readUriViaXHR(uri);
}

export function mimeTypeToExtension(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic') || mimeType.includes('heif')) return 'heic';
  return 'jpg';
}

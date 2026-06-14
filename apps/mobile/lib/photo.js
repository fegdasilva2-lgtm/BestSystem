// Compressao de fotos no client para o PWA PredialOps.
// - Redimensiona para maxDim (padrao 1600px) preservando aspect ratio
// - Converte para JPEG com qualidade controlada (padrao 0.8)
// - Extrai GPS do EXIF quando disponivel
// - Tudo offline; sem dependencia de Servico de terceiro

const DEFAULT_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.8;
const MAX_INPUT_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Comprime uma imagem (File/Blob) para JPEG.
 * @param {File|Blob} file
 * @param {object} [opts]
 * @param {number} [opts.maxDim=1600] dimensao maxima do maior lado
 * @param {number} [opts.quality=0.8] qualidade JPEG 0..1
 * @returns {Promise<{ blob: Blob, width: number, height: number, bytes: number, geo: {lat:number,lng:number}|null, exif: object|null }>}
 */
export async function compressImage(file, opts = {}) {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`Arquivo muito grande (${formatBytes(file.size)}). Max ${formatBytes(MAX_INPUT_BYTES)}.`);
  }

  const { bitmap, exif } = await decode(file);
  const { width, height } = fit(bitmap.width, bitmap.height, maxDim);
  const canvas = drawToCanvas(bitmap, width, height);
  bitmap.close?.();

  const blob = await canvasToBlob(canvas, "image/jpeg", quality);

  return {
    blob,
    width,
    height,
    bytes: blob.size,
    geo: exif?.geo ?? null,
    exif: exif?.raw ?? null,
    originalBytes: file.size,
    originalName: file.name ?? "photo.jpg",
    capturedAt: exif?.dateTimeOriginal ?? new Date().toISOString()
  };
}

/**
 * Converte Blob em data URL (para preview).
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Converte data URL em Blob.
 */
export function dataURLToBlob(dataURL) {
  const [meta, b64] = dataURL.split(",");
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// =====================================================================
// Decodificacao (ImageBitmap + EXIF minimo via PNG/JPEG markers)
// =====================================================================

async function decode(file) {
  // 1) Tenta ImageBitmap (mais rapido, nao expoe EXIF)
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    throw new Error("Formato de imagem nao suportado.");
  }

  // 2) Extrai EXIF minimo so para JPEG (PNG nao tem EXIF)
  let exif = null;
  if (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name ?? "")) {
    try {
      const buf = await file.arrayBuffer();
      exif = parseExif(buf);
    } catch { /* EXIF parsing e best-effort */ }
  }

  return { bitmap, exif };
}

function fit(w, h, maxDim) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w >= h ? maxDim / w : maxDim / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function drawToCanvas(bitmap, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Falha ao comprimir")), type, quality);
  });
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// =====================================================================
// EXIF minimo: le marker APP1 (FFE1) -> TIFF -> GPS IFD e DateTime
// =====================================================================

function parseExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 4) return null;
  if (view.getUint16(0) !== 0xFFD8) return null; // nao e JPEG

  let offset = 2;
  let exifOffset = -1;
  while (offset < view.byteLength - 1) {
    const marker = view.getUint16(offset);
    if (marker === 0xFFE1) { exifOffset = offset + 2; break; }
    if ((marker & 0xFF00) !== 0xFF00) break;
    const size = view.getUint16(offset + 2);
    offset += 2 + size;
  }
  if (exifOffset < 0) return null;

  // "Exif\0\0" + TIFF header
  if (view.getUint32(exifOffset) !== 0x45786966) return null;
  const tiffStart = exifOffset + 6;
  if (view.getUint16(tiffStart) !== 0x002A) return null;

  const little = view.getUint16(tiffStart + 2) === 0x4949;
  const get16 = (o) => view.getUint16(o, little);
  const get32 = (o) => view.getUint32(o, little);
  const ifd0Offset = tiffStart + get32(tiffStart + 4);

  const exifData = {
    geo: null,
    dateTimeOriginal: null,
    raw: {}
  };

  readIfdEntries(view, tiffStart, ifd0Offset, little, (tag, type, count, valueOffset) => {
    if (tag === 0x0112) { // Orientation
      exifData.orientation = get16(valueOffset);
    }
    if (tag === 0x8825) { // GPSInfo IFD
      exifData.geo = readGps(view, tiffStart, valueOffset, little);
    }
  });

  // ExifIFD (subIFD de IFD0, tag 0x8769)
  let exifSubIfdOffset = null;
  readIfdEntries(view, tiffStart, ifd0Offset, little, (tag, type, count, valueOffset) => {
    if (tag === 0x8769) exifSubIfdOffset = tiffStart + get32(valueOffset);
  });

  if (exifSubIfdOffset) {
    readIfdEntries(view, tiffStart, exifSubIfdOffset, little, (tag, type, count, valueOffset) => {
      if (tag === 0x9003) { // DateTimeOriginal
        exifData.dateTimeOriginal = readAscii(view, valueOffset, count).trim();
      }
    });
  }

  return exifData;
}

function readIfdEntries(view, tiffStart, ifdOffset, little, visit) {
  if (ifdOffset + 2 > view.byteLength) return;
  const numEntries = (little ? view.getUint16(ifdOffset) : view.getUint16(ifdOffset));
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;
    const tag = view.getUint16(entryOffset, little);
    const type = view.getUint16(entryOffset + 2, little);
    const count = view.getUint32(entryOffset + 4, little);
    const valueFieldOffset = entryOffset + 8;
    // Para valores maiores que 4 bytes, offset relativo a tiffStart
    const valueOffset = (count * sizeOfType(type) > 4)
      ? tiffStart + view.getUint32(valueFieldOffset, little)
      : valueFieldOffset;
    visit(tag, type, count, valueOffset);
  }
}

function sizeOfType(t) {
  return [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][t] ?? 0;
}

function readAscii(view, offset, count) {
  let s = "";
  for (let i = 0; i < count - 1 && offset + i < view.byteLength; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

function readRational(view, offset, little) {
  const num = view.getUint32(offset, little);
  const den = view.getUint32(offset + 4, little);
  return den === 0 ? 0 : num / den;
}

function readGps(view, tiffStart, gpsIfdOffset, little) {
  const get16 = (o) => view.getUint16(o, little);
  const get32 = (o) => view.getUint32(o, little);
  let lat = null, lng = null, latRef = null, lngRef = null;

  readIfdEntries(view, tiffStart, gpsIfdOffset, little, (tag, type, count, valueOffset) => {
    if (tag === 2 && count === 3) {
      const d = readRational(view, valueOffset, little);
      const m = readRational(view, valueOffset + 8, little);
      const s = readRational(view, valueOffset + 16, little);
      lat = d + m / 60 + s / 3600;
    }
    if (tag === 4 && count === 3) {
      const d = readRational(view, valueOffset, little);
      const m = readRational(view, valueOffset + 8, little);
      const s = readRational(view, valueOffset + 16, little);
      lng = d + m / 60 + s / 3600;
    }
    if (tag === 1) latRef = String.fromCharCode(view.getUint8(valueOffset));
    if (tag === 3) lngRef = String.fromCharCode(view.getUint8(valueOffset));
  });

  if (lat == null || lng == null) return null;
  if (latRef === "S") lat = -lat;
  if (lngRef === "W") lng = -lng;
  return { lat, lng };
}

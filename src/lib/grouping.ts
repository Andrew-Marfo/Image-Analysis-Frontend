/**
 * Group uploaded image files into products.
 *
 * Sample dataset filenames look like `S221234199_550719011.jpg`, where the part
 * before the first underscore identifies the product and the rest is the image.
 * We group by that prefix so a product's 3–4 angles land in one IMDB row. Files
 * without an underscore become their own single-image product.
 */
export function groupKeyForFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  const sep = base.search(/[_-]/);
  return sep > 0 ? base.slice(0, sep) : base;
}

/**
 * Derive a human-friendly angle label from the filename suffix.
 * "S123_front.jpg" → "Front",  "S123_2.jpg" → "2",  "S123.jpg" → ""
 */
export function angleForFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  const sep = base.search(/[_-]/);
  if (sep <= 0) return '';
  const suffix = base.slice(sep + 1).replace(/[_-]+/g, ' ').trim();
  return suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

/** Split an array of files into ordered [groupKey, files] buckets. */
export function groupFiles(files: File[]): Array<[string, File[]]> {
  const buckets = new Map<string, File[]>();
  for (const file of files) {
    const key = groupKeyForFile(file.name);
    const existing = buckets.get(key);
    if (existing) existing.push(file);
    else buckets.set(key, [file]);
  }
  return [...buckets.entries()];
}

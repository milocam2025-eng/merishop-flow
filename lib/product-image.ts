const MAX_UPLOAD_BYTES = 9 * 1024 * 1024;
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2400;

export async function prepareProductImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen válida.");
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("La fotografía supera el límite de 40 MB.");
  }

  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("No se pudo preparar la fotografía.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86)
  );

  if (!blob || blob.size > 10 * 1024 * 1024) {
    throw new Error("No se pudo reducir la fotografía a menos de 10 MB.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "producto";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

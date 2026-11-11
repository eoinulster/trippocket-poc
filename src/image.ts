import jsQR from "jsqr";
export async function readImage(
  file: File,
): Promise<{ image: string; qr: string }> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type))
    throw new Error("Choose a JPG, PNG, WebP or GIF photo.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Please choose a photo smaller than 15 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(pixels.data, pixels.width, pixels.height, {
    inversionAttempts: "attemptBoth",
  });
  let image = canvas.toDataURL("image/jpeg", 0.75);
  if (image.length > 350000) image = canvas.toDataURL("image/jpeg", 0.45);
  if (image.length > 600000)
    throw new Error(
      "This photo is too detailed. Please crop or resize it and try again.",
    );
  return { image, qr: code?.data || "" };
}

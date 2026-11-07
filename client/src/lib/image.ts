/**
 * Reduz uma imagem escolhida no aparelho para um quadrado (recorte central),
 * pronta para enviar ao servidor. Fotos viram JPG; PNG mantém transparência.
 */
export async function squareImage(
  file: File,
  { size, format = "auto", maxBytes = 280_000 }: { size: number; format?: "auto" | "jpeg"; maxBytes?: number },
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem (PNG ou JPG).");
  if (file.size > 20 * 1024 * 1024) throw new Error("Imagem muito grande. Use uma de até 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não foi possível ler esta imagem."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);

    if (format === "auto") {
      const png = canvas.toDataURL("image/png");
      if (png.length < maxBytes) return png;
    }
    for (const quality of [0.85, 0.7, 0.55]) {
      const jpg = canvas.toDataURL("image/jpeg", quality);
      if (jpg.length < maxBytes) return jpg;
    }
    throw new Error("Não foi possível reduzir a imagem. Tente outra foto.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

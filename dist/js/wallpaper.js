// Free digital rewards, generated locally. No visitor data or remote requests.
export async function downloadWallpaper(design = "orbit") {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no permite crear el fondo.");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#09070e");
  gradient.addColorStop(0.5, "#1c102c");
  gradient.addColorStop(1, "#09070e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = "#60328a";
  ctx.lineWidth = 2;
  if (design === "grid") {
    for (let x = -180; x < 1260; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 360, 1920);
      ctx.stroke();
    }
    for (let y = 0; y < 1920; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }
  } else if (design === "wave") {
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      for (let x = 0; x <= 1080; x += 8) {
        const y = 440 + i * 45 + Math.sin(x / 160 + i / 5) * 130;
        if (!x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(540, 1040, 400, 180 + i * 22, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "#a679ca";
    ctx.beginPath();
    ctx.ellipse(540, 1040, 500, 160, -Math.PI / 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () =>
      reject(new Error("No se pudo cargar el logo. Intenta de nuevo."));
    image.src = "/images/boleta-logo.webp";
  });
  const width = 820,
    height = (image.height / image.width) * width;
  ctx.drawImage(image, 130, 400, width, height);
  ctx.fillStyle = "#f4f2ef";
  ctx.textAlign = "center";
  ctx.font = "900 74px Arial";
  ctx.fillText("FUERA DE", 540, 1490);
  ctx.fillText("LO COMÚN.", 540, 1580);
  ctx.font = "24px monospace";
  ctx.fillStyle = "#c9b4e3";
  ctx.fillText("BOLETA / BARQUISIMETO / EST. 2022", 540, 1775);
  ctx.strokeStyle = "#a679ca";
  ctx.strokeRect(60, 60, 960, 1800);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("No se pudo crear la descarga.");
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = "BOLETA-" + design + "-1080x1920.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function generateReceiptImage(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#FAF6EE",
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal membuat gambar"));
      },
      "image/png",
      1
    );
  });
}

export async function downloadReceiptPDF(element: HTMLElement, filename: string, storeName?: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#FAF6EE",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png", 1);
  const pdfHeight = (canvas.height * 80) / canvas.width;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, pdfHeight],
  });

  pdf.addImage(imgData, "PNG", 0, 0, 80, pdfHeight);

  if (storeName) {
    const watermarkText = storeName.toUpperCase();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(200, 190, 170);

    const textWidth = pdf.getTextWidth(watermarkText);
    const spacingX = textWidth + 20;
    const spacingY = 25;

    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.12 }));

    for (let y = -pdfHeight; y < pdfHeight * 2; y += spacingY) {
      for (let x = -20; x < 100; x += spacingX) {
        pdf.text(watermarkText, x, y, { angle: 45 });
      }
    }

    pdf.restoreGraphicsState();
  }

  pdf.save(filename);
}

export async function downloadReceiptImage(element: HTMLElement, filename: string) {
  const blob = await generateReceiptImage(element);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareReceiptWhatsApp(element: HTMLElement, storeName: string, transactionId: number | bigint, memberPhone?: string) {
  const blob = await generateReceiptImage(element);
  const file = new File([blob], `nota-${storeName}-${transactionId}.png`, { type: "image/png" });

  const caption = `Terima kasih telah berbelanja di *${storeName.toUpperCase()}*\nBerikut nota belanja Anda #${String(transactionId).padStart(6, "0")}`;

  const phone = memberPhone?.replace(/[^0-9]/g, '');

  // Try native share API first (sends image + text on mobile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: `Nota ${storeName}`,
        text: caption,
        files: [file],
      });
      return;
    } catch {
      // User cancelled or error — fall through to wa.me
    }
  }

  // Fallback: open WhatsApp with image blob as data URL in new tab
  const url = URL.createObjectURL(blob);
  const text = encodeURIComponent(caption);
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;

  // Download image for user to manually attach
  const a = document.createElement("a");
  a.href = url;
  a.download = `nota-${storeName}-${transactionId}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  window.open(waUrl, "_blank");
  URL.revokeObjectURL(url);
}

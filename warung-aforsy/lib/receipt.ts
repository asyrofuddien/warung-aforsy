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
    pdf.setFontSize(14);
    pdf.setTextColor(200, 190, 170);

    const centerX = 80 / 2;
    const centerY = pdfHeight / 2;

    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.15 }));
    pdf.text(watermarkText, centerX, centerY, {
      align: "center",
      angle: 45,
    });
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

export async function shareReceiptWhatsApp(element: HTMLElement, storeName: string, transactionId: number | bigint) {
  const blob = await generateReceiptImage(element);
  const file = new File([blob], `nota-${storeName}-${transactionId}.png`, { type: "image/png" });

  const caption = `Terima kasih telah berbelanja di *${storeName.toUpperCase()}*\nBerikut nota belanja Anda #${String(transactionId).padStart(6, "0")}`;

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `Nota ${storeName}`,
      text: caption,
      files: [file],
    });
  } else {
    const url = URL.createObjectURL(blob);
    const text = encodeURIComponent(caption);
    window.open(`https://wa.me/?text=${text}&media=${url}`, "_blank");
    URL.revokeObjectURL(url);
  }
}

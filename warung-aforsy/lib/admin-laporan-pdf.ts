import jsPDF from 'jspdf';

interface StoreProfitSummary {
  store_id: number;
  store_name: string;
  total_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

interface StoreMonthlyRow {
  store_id: number;
  store_name: string;
  period: string;
  total_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

// Colors matching web theme
const PAPER = [250, 246, 238] as const;    // #FAF6EE
const INK = [30, 27, 22] as const;         // #1E1B16
const GREEN = [15, 122, 92] as const;      // #0F7A5C
const MARIGOLD = [232, 163, 61] as const;  // #E8A33D
const MUTED = [117, 111, 98] as const;     // #756F62
const LINE = [220, 212, 194] as const;     // #DCD4C2

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatMonthLabel(periodStr: string): string {
  try {
    const [year, month] = periodStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  } catch {
    return periodStr;
  }
}

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number) {
  doc.roundedRect(x, y, w, h, r, r);
}

export function generateLaporanPDF(
  summaries: StoreProfitSummary[],
  monthlyData: StoreMonthlyRow[],
  selectedMonth: string,
  selectedStoreNames: string[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // --- Page 1: Cover + Summary ---
  // Background
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Top accent bar
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 6, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text('LAPORAN KEUNTUNGAN', margin, 24);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const filterLabel = selectedMonth === 'all' ? 'Semua Periode' : formatMonthLabel(selectedMonth);
  const storeLabel = selectedStoreNames.length === 0 ? 'Semua Warung' : selectedStoreNames.join(', ');
  doc.text(`Periode: ${filterLabel}`, margin, 32);
  doc.text(`Warung: ${storeLabel}`, margin, 38);

  // Timestamp
  const now = new Date();
  const ts = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Dicetak: ${ts}`, margin, 44);

  // Divider line
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(margin, 48, pageW - margin, 48);

  // Summary cards
  const totals = summaries.reduce(
    (acc, s) => ({
      total_transactions: acc.total_transactions + s.total_transactions,
      total_revenue: acc.total_revenue + s.total_revenue,
      total_cost: acc.total_cost + s.total_cost,
      total_profit: acc.total_profit + s.total_profit,
    }),
    { total_transactions: 0, total_revenue: 0, total_cost: 0, total_profit: 0 }
  );

  const cardW = (contentW - 12) / 2;
  const cardH = 22;
  const cardY1 = 54;
  const cardY2 = cardY1 + cardH + 6;

  // Card 1: Total Pendapatan
  drawRoundedRect(doc, margin, cardY1, cardW, cardH, 3);
  doc.setFillColor(255, 255, 255);
  doc.fill();
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.stroke();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Total Pendapatan', margin + 6, cardY1 + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(formatCurrency(totals.total_revenue), margin + 6, cardY1 + 16);

  // Card 2: Total Modal
  drawRoundedRect(doc, margin + cardW + 12, cardY1, cardW, cardH, 3);
  doc.setFillColor(255, 255, 255);
  doc.fill();
  doc.setDrawColor(...LINE);
  doc.stroke();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Total Modal (Harga Beli × Qty)', margin + cardW + 18, cardY1 + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(formatCurrency(totals.total_cost), margin + cardW + 18, cardY1 + 16);

  // Card 3: Total Keuntungan
  drawRoundedRect(doc, margin, cardY2, cardW, cardH, 3);
  doc.setFillColor(255, 255, 255);
  doc.fill();
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.stroke();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('Total Keuntungan Bersih', margin + 6, cardY2 + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...GREEN);
  doc.text(formatCurrency(totals.total_profit), margin + 6, cardY2 + 16);

  // Card 4: Total Transaksi
  drawRoundedRect(doc, margin + cardW + 12, cardY2, cardW, cardH, 3);
  doc.setFillColor(255, 255, 255);
  doc.fill();
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.stroke();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Total Transaksi', margin + cardW + 18, cardY2 + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(String(totals.total_transactions), margin + cardW + 18, cardY2 + 16);

  // Note about calculation
  const noteY = cardY2 + cardH + 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Catatan: Modal = Σ (harga beli modal × jumlah per item). Keuntungan = Pendapatan - Modal.', margin, noteY);

  // --- Summary Table ---
  let tableY = noteY + 10;

  // Table header
  doc.setFillColor(...GREEN);
  doc.roundedRect(margin, tableY, contentW, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const colX = [margin + 4, margin + 55, margin + 85, margin + 120, margin + 150];
  doc.text('Warung', colX[0], tableY + 7);
  doc.text('Transaksi', colX[1], tableY + 7);
  doc.text('Pendapatan', colX[2], tableY + 7);
  doc.text('Modal', colX[3], tableY + 7);
  doc.text('Keuntungan', colX[4], tableY + 7);

  tableY += 12;

  // Table rows
  summaries.forEach((s, idx) => {
    if (tableY > pageH - 30) {
      // New page
      doc.addPage();
      const newPageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...PAPER);
      doc.rect(0, 0, pageW, newPageH, 'F');
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, pageW, 6, 'F');
      tableY = 20;
    }

    // Alternating row bg
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, tableY, contentW, 10, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(s.store_name, colX[0], tableY + 7);
    doc.text(String(s.total_transactions), colX[1], tableY + 7);
    doc.text(formatCurrency(s.total_revenue), colX[2], tableY + 7);
    doc.text(formatCurrency(s.total_cost), colX[3], tableY + 7);

    // Profit colored
    doc.setTextColor(s.total_profit >= 0 ? GREEN[0] : 220, s.total_profit >= 0 ? GREEN[1] : 50, s.total_profit >= 0 ? GREEN[2] : 50);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(s.total_profit), colX[4], tableY + 7);

    // Separator line
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.15);
    doc.line(margin, tableY + 10, pageW - margin, tableY + 10);

    tableY += 11;
  });

  // Totals row
  tableY += 2;
  doc.setFillColor(...INK);
  doc.roundedRect(margin, tableY, contentW, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', colX[0], tableY + 7);
  doc.text(String(totals.total_transactions), colX[1], tableY + 7);
  doc.text(formatCurrency(totals.total_revenue), colX[2], tableY + 7);
  doc.text(formatCurrency(totals.total_cost), colX[3], tableY + 7);
  doc.setTextColor(...GREEN);
  doc.text(formatCurrency(totals.total_profit), colX[4], tableY + 7);

  tableY += 18;

  // --- Monthly Breakdown (if any) ---
  if (monthlyData.length > 0) {
    if (tableY > pageH - 60) {
      doc.addPage();
      const newPageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...PAPER);
      doc.rect(0, 0, pageW, newPageH, 'F');
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, pageW, 6, 'F');
      tableY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text('Rincian Bulanan', margin, tableY);
    tableY += 8;

    // Monthly table header
    doc.setFillColor(...MARIGOLD);
    doc.roundedRect(margin, tableY, contentW, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    const mColX = [margin + 4, margin + 50, margin + 85, margin + 110, margin + 140, margin + 165];
    doc.text('Warung', mColX[0], tableY + 7);
    doc.text('Periode', mColX[1], tableY + 7);
    doc.text('Transaksi', mColX[2], tableY + 7);
    doc.text('Pendapatan', mColX[3], tableY + 7);
    doc.text('Modal', mColX[4], tableY + 7);
    doc.text('Keuntungan', mColX[5], tableY + 7);

    tableY += 12;

    monthlyData.forEach((m, idx) => {
      if (tableY > pageH - 30) {
        doc.addPage();
        const newPageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(...PAPER);
        doc.rect(0, 0, pageW, newPageH, 'F');
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, pageW, 6, 'F');
        tableY = 20;

        // Repeat header on new page
        doc.setFillColor(...MARIGOLD);
        doc.roundedRect(margin, tableY, contentW, 10, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...INK);
        doc.text('Warung', mColX[0], tableY + 7);
        doc.text('Periode', mColX[1], tableY + 7);
        doc.text('Transaksi', mColX[2], tableY + 7);
        doc.text('Pendapatan', mColX[3], tableY + 7);
        doc.text('Modal', mColX[4], tableY + 7);
        doc.text('Keuntungan', mColX[5], tableY + 7);
        tableY += 12;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, tableY, contentW, 10, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...INK);
      doc.text(m.store_name, mColX[0], tableY + 7);
      doc.text(formatMonthLabel(m.period), mColX[1], tableY + 7);
      doc.text(String(m.total_transactions), mColX[2], tableY + 7);
      doc.text(formatCurrency(m.total_revenue), mColX[3], tableY + 7);
      doc.text(formatCurrency(m.total_cost), mColX[4], tableY + 7);

      doc.setTextColor(m.total_profit >= 0 ? GREEN[0] : 220, m.total_profit >= 0 ? GREEN[1] : 50, m.total_profit >= 0 ? GREEN[2] : 50);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(m.total_profit), mColX[5], tableY + 7);

      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.15);
      doc.line(margin, tableY + 10, pageW - margin, tableY + 10);

      tableY += 11;
    });
  }

  // Footer on last page
  const lastPageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...GREEN);
  doc.rect(0, lastPageH - 6, pageW, 6, 'F');

  // Save
  const filename = `laporan-keuntungan${selectedMonth !== 'all' ? '-' + selectedMonth : ''}.pdf`;
  doc.save(filename);
}

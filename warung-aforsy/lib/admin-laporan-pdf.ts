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

const PAPER: [number, number, number] = [250, 246, 238];
const INK: [number, number, number] = [30, 27, 22];
const GREEN: [number, number, number] = [15, 122, 92];
const MARIGOLD: [number, number, number] = [232, 163, 61];
const MUTED: [number, number, number] = [117, 111, 98];
const LINE: [number, number, number] = [220, 212, 194];

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

function newPage(doc: jsPDF, pageW: number) {
  doc.addPage();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, pageW, h, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 6, 'F');
  return 20;
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
  const margin = 15;
  const contentW = pageW - margin * 2; // 180mm

  // Background
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Top accent bar
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 6, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text('LAPORAN KEUNTUNGAN', margin, 22);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const filterLabel = selectedMonth === 'all' ? 'Semua Periode' : formatMonthLabel(selectedMonth);
  const storeLabel = selectedStoreNames.length === 0 ? 'Semua Warung' : selectedStoreNames.join(', ');
  doc.text(`Periode: ${filterLabel}`, margin, 30);

  // Wrap store label if too long
  const storeLabelWidth = doc.getTextWidth(`Warung: ${storeLabel}`);
  if (storeLabelWidth > contentW) {
    doc.text('Warung: ' + storeLabel.substring(0, 40) + '...', margin, 36);
  } else {
    doc.text(`Warung: ${storeLabel}`, margin, 36);
  }

  // Timestamp
  const now = new Date();
  const ts = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Dicetak: ${ts}`, margin, 42);

  // Divider
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(margin, 46, pageW - margin, 46);

  // Totals
  const totals = summaries.reduce(
    (acc, s) => ({
      total_transactions: acc.total_transactions + s.total_transactions,
      total_revenue: acc.total_revenue + s.total_revenue,
      total_cost: acc.total_cost + s.total_cost,
      total_profit: acc.total_profit + s.total_profit,
    }),
    { total_transactions: 0, total_revenue: 0, total_cost: 0, total_profit: 0 }
  );

  // Summary cards - 2x2 grid
  const gap = 8;
  const cardW = (contentW - gap) / 2;
  const cardH = 20;
  const cardY1 = 52;
  const cardY2 = cardY1 + cardH + 6;

  const cards = [
    { label: 'Total Pendapatan', value: formatCurrency(totals.total_revenue), x: margin, y: cardY1, color: INK, border: LINE },
    { label: 'Total Modal (Beli × Qty)', value: formatCurrency(totals.total_cost), x: margin + cardW + gap, y: cardY1, color: INK, border: LINE },
    { label: 'Total Keuntungan Bersih', value: formatCurrency(totals.total_profit), x: margin, y: cardY2, color: GREEN, border: GREEN },
    { label: 'Total Transaksi', value: String(totals.total_transactions), x: margin + cardW + gap, y: cardY2, color: INK, border: LINE },
  ];

  cards.forEach((c) => {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(c.x, c.y, cardW, cardH, 3, 3, 'F');
    doc.setDrawColor(...c.border);
    doc.setLineWidth(c.border === GREEN ? 0.4 : 0.2);
    doc.stroke();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(c.label, c.x + 5, c.y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...c.color);
    doc.text(c.value, c.x + 5, c.y + 15);
  });

  // Note
  const noteY = cardY2 + cardH + 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Catatan: Modal = (harga beli × jumlah per item). Keuntungan = Pendapatan - Modal.', margin, noteY);

  // --- Summary Table ---
  // Column layout: Warung | Transaksi | Pendapatan | Modal | Keuntungan
  // Numeric columns right-aligned
  const rightEdge = margin + contentW; // right edge of content area
  const numW = 30; // width for currency columns
  const numSmall = 18; // width for transaction count

  const c5 = rightEdge - 2;            // Keuntungan right edge
  const c4 = c5 - numW;                // Modal right edge
  const c3 = c4 - numW;                // Pendapatan right edge
  const c2 = c3 - numSmall;            // Transaksi right edge
  // c1 = Warung left-aligned from margin + 2

  let tableY = noteY + 8;

  // Table header
  doc.setFillColor(...GREEN);
  doc.roundedRect(margin, tableY, contentW, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Warung', margin + 3, tableY + 6.5);
  doc.text('Transaksi', c2, tableY + 6.5, { align: 'right' });
  doc.text('Pendapatan', c3, tableY + 6.5, { align: 'right' });
  doc.text('Modal', c4, tableY + 6.5, { align: 'right' });
  doc.text('Keuntungan', c5, tableY + 6.5, { align: 'right' });

  tableY += 11;

  // Table rows
  summaries.forEach((s, idx) => {
    if (tableY > pageH - 25) {
      tableY = newPage(doc, pageW);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, tableY, contentW, 9, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK);

    // Truncate store name if too long
    let name = s.store_name;
    while (doc.getTextWidth(name) > c2 - margin - 8 && name.length > 3) {
      name = name.slice(0, -1);
    }
    if (name !== s.store_name) name += '..';
    doc.text(name, margin + 3, tableY + 6.5);

    doc.text(String(s.total_transactions), c2, tableY + 6.5, { align: 'right' });
    doc.text(formatCurrency(s.total_revenue), c3, tableY + 6.5, { align: 'right' });
    doc.text(formatCurrency(s.total_cost), c4, tableY + 6.5, { align: 'right' });

    doc.setTextColor(s.total_profit >= 0 ? GREEN[0] : 220, s.total_profit >= 0 ? GREEN[1] : 50, s.total_profit >= 0 ? GREEN[2] : 50);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(s.total_profit), c5, tableY + 6.5, { align: 'right' });

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.1);
    doc.line(margin, tableY + 9, margin + contentW, tableY + 9);

    tableY += 10;
  });

  // Totals row
  tableY += 1;
  doc.setFillColor(...INK);
  doc.roundedRect(margin, tableY, contentW, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', margin + 3, tableY + 6.5);
  doc.text(String(totals.total_transactions), c2, tableY + 6.5, { align: 'right' });
  doc.text(formatCurrency(totals.total_revenue), c3, tableY + 6.5, { align: 'right' });
  doc.text(formatCurrency(totals.total_cost), c4, tableY + 6.5, { align: 'right' });
  doc.setTextColor(...GREEN);
  doc.text(formatCurrency(totals.total_profit), c5, tableY + 6.5, { align: 'right' });

  tableY += 16;

  // --- Monthly Breakdown ---
  if (monthlyData.length > 0) {
    if (tableY > pageH - 50) {
      tableY = newPage(doc, pageW);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text('Rincian Bulanan', margin, tableY);
    tableY += 8;

    // Monthly columns: Warung | Periode | Transaksi | Pendapatan | Modal | Keuntungan
    const mc6 = rightEdge - 2;
    const mc5 = mc6 - numW;
    const mc4 = mc5 - numW;
    const mc3 = mc4 - numSmall;
    const mc2 = mc3 - 28; // Periode
    // mc1 = Warung

    // Header
    doc.setFillColor(...MARIGOLD);
    doc.roundedRect(margin, tableY, contentW, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...INK);
    doc.text('Warung', margin + 3, tableY + 6.5);
    doc.text('Periode', mc2, tableY + 6.5, { align: 'right' });
    doc.text('Transaksi', mc3, tableY + 6.5, { align: 'right' });
    doc.text('Pendapatan', mc4, tableY + 6.5, { align: 'right' });
    doc.text('Modal', mc5, tableY + 6.5, { align: 'right' });
    doc.text('Keuntungan', mc6, tableY + 6.5, { align: 'right' });

    tableY += 11;

    const drawMonthlyRow = (m: StoreMonthlyRow, idx: number) => {
      if (tableY > pageH - 25) {
        tableY = newPage(doc, pageW);
        // Repeat header
        doc.setFillColor(...MARIGOLD);
        doc.roundedRect(margin, tableY, contentW, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...INK);
        doc.text('Warung', margin + 3, tableY + 6.5);
        doc.text('Periode', mc2, tableY + 6.5, { align: 'right' });
        doc.text('Transaksi', mc3, tableY + 6.5, { align: 'right' });
        doc.text('Pendapatan', mc4, tableY + 6.5, { align: 'right' });
        doc.text('Modal', mc5, tableY + 6.5, { align: 'right' });
        doc.text('Keuntungan', mc6, tableY + 6.5, { align: 'right' });
        tableY += 11;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, tableY, contentW, 9, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...INK);

      let name = m.store_name;
      while (doc.getTextWidth(name) > mc2 - margin - 6 && name.length > 3) {
        name = name.slice(0, -1);
      }
      if (name !== m.store_name) name += '..';
      doc.text(name, margin + 3, tableY + 6.5);

      doc.text(formatMonthLabel(m.period), mc2, tableY + 6.5, { align: 'right' });
      doc.text(String(m.total_transactions), mc3, tableY + 6.5, { align: 'right' });
      doc.text(formatCurrency(m.total_revenue), mc4, tableY + 6.5, { align: 'right' });
      doc.text(formatCurrency(m.total_cost), mc5, tableY + 6.5, { align: 'right' });

      doc.setTextColor(m.total_profit >= 0 ? GREEN[0] : 220, m.total_profit >= 0 ? GREEN[1] : 50, m.total_profit >= 0 ? GREEN[2] : 50);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(m.total_profit), mc6, tableY + 6.5, { align: 'right' });

      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.1);
      doc.line(margin, tableY + 9, margin + contentW, tableY + 9);

      tableY += 10;
    };

    monthlyData.forEach((m, idx) => drawMonthlyRow(m, idx));
  }

  // Footer
  const lastPageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...GREEN);
  doc.rect(0, lastPageH - 5, pageW, 5, 'F');

  const filename = `laporan-keuntungan${selectedMonth !== 'all' ? '-' + selectedMonth : ''}.pdf`;
  doc.save(filename);
}

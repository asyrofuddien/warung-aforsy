interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptDocumentProps {
  storeName: string;
  transactionId: number | bigint;
  timestamp: string;
  cashierName: string;
  paymentMethod: string;
  items: ReceiptItem[];
  total: number;
}

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(/\//g, "-");
  } catch {
    return isoStr;
  }
}

export default function ReceiptDocument({
  storeName,
  transactionId,
  timestamp,
  cashierName,
  paymentMethod,
  items,
  total,
}: ReceiptDocumentProps) {
  const paymentLabel = paymentMethod === "qr" ? "QRIS (Gopay)" : "Tunai (Cash)";

  return (
    <div
      id="receipt-document"
      style={{
        width: "320px",
        background: "#FAF6EE",
        fontFamily: "'IBM Plex Mono', monospace",
        color: "#1E1B16",
        overflow: "hidden",
      }}
    >
      {/* Top green accent bar */}
      <div style={{ height: "4px", background: "#0F7A5C" }} />

      {/* Content wrapper */}
      <div style={{ padding: "24px 20px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "700",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: "0.5px",
              marginBottom: "2px",
            }}
          >
            {storeName.toUpperCase()}
          </div>
          <div style={{ fontSize: "11px", color: "#756F62", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Nota Belanja
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ borderTop: "1px dashed #DCD4C2" }} />

        {/* Transaction Info */}
        <div style={{ padding: "12px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", lineHeight: "2" }}>
            <span style={{ color: "#756F62" }}>No. Nota</span>
            <span>#{String(transactionId).padStart(6, "0")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", lineHeight: "2" }}>
            <span style={{ color: "#756F62" }}>Tanggal</span>
            <span>{formatDate(timestamp)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", lineHeight: "2" }}>
            <span style={{ color: "#756F62" }}>Kasir</span>
            <span>{cashierName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", lineHeight: "2" }}>
            <span style={{ color: "#756F62" }}>Pembayaran</span>
            <span>{paymentLabel}</span>
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ borderTop: "1px dashed #DCD4C2" }} />

        {/* Items */}
        <div style={{ padding: "12px 0" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color: "#756F62",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: "0.05em",
              marginBottom: "10px",
              textTransform: "uppercase",
            }}
          >
            Item
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "10px" }}>
              {/* Row: qty x name | subtotal */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: "600" }}>
                  {item.quantity}x {item.name}
                </span>
                <span style={{ fontWeight: "500" }}>
                  {formatCurrency(item.quantity * item.price)}
                </span>
              </div>
              {/* Row: unit price */}
              <div style={{ fontSize: "10px", color: "#756F62", marginTop: "1px" }}>
                @ {formatCurrency(item.price)}
              </div>
            </div>
          ))}
        </div>

        {/* Solid divider */}
        <div style={{ borderTop: "2px solid #1E1B16" }} />

        {/* Total */}
        <div style={{ padding: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              TOTAL
            </span>
            <span
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#0F7A5C",
              }}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ borderTop: "1px dashed #DCD4C2" }} />

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "14px" }}>
          <div style={{ fontSize: "10px", color: "#756F62", fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: "1.6" }}>
            Terima kasih atas kunjungan Anda
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              marginTop: "2px",
            }}
          >
            {storeName}
          </div>
        </div>

      </div>

      {/* Bottom green accent bar */}
      <div style={{ height: "4px", background: "#0F7A5C" }} />
    </div>
  );
}

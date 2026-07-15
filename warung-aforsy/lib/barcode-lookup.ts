export interface BarcodeLookupResult {
  name: string;
  brand: string;
  category: string;
}

async function fetchIndoProducts(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(
      `https://api-products.alpha-projects.cloud/api/v1/products-barcode?barcode=${barcode}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.product_name) {
      return {
        name: data.product_name,
        brand: data.brand || "",
        category: data.category || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchOpenFacts(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${barcode}?product_type=all`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 1 && data.product) {
      return {
        name: data.product.product_name || "",
        brand: data.product.brands || "",
        category: data.product.categories || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  const trimmed = barcode.trim();
  if (!trimmed) return null;

  const indoResult = await fetchIndoProducts(trimmed);
  if (indoResult) return indoResult;

  const offResult = await fetchOpenFacts(trimmed);
  if (offResult) return offResult;

  return null;
}

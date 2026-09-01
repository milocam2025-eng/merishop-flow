export const CART_STORAGE_KEY = "merishop_cart";
export const CART_UPDATED_EVENT = "merishop:cart-updated";

export type StoreCartItem = {
  id: string;
  product: string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  price: number;
  image?: string;
  stock: number;
  quantity: number;
};

export function normalizeCart(value: unknown): StoreCartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<StoreCartItem>;
    const id = String(candidate.id ?? "").trim();
    const product = String(candidate.product ?? "").trim();
    const price = Number(candidate.price);
    const stock = Math.max(0, Math.floor(Number(candidate.stock ?? 0)));
    const quantity = Math.max(1, Math.floor(Number(candidate.quantity ?? 1)));

    if (!id || !product || !Number.isFinite(price) || price <= 0) return [];

    return [{
      id,
      product,
      brand: candidate.brand ?? null,
      size: candidate.size ?? null,
      color: candidate.color ?? null,
      price,
      image: String(candidate.image ?? ""),
      stock,
      quantity: stock > 0 ? Math.min(quantity, stock) : quantity,
    }];
  });
}

export function parseStoredCart(raw: string | null) {
  if (!raw) return [];
  try {
    return normalizeCart(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function cartItemCount(items: StoreCartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function addCartItem(items: StoreCartItem[], product: StoreCartItem) {
  const current = normalizeCart(items);
  const incoming = normalizeCart([product])[0];
  if (!incoming) return { items: current, added: false, reason: "Producto inválido." };
  if (incoming.stock <= 0) return { items: current, added: false, reason: "Producto agotado." };

  const index = current.findIndex((item) => item.id === incoming.id);
  if (index < 0) return { items: [...current, { ...incoming, quantity: 1 }], added: true };
  if (current[index].quantity >= incoming.stock) {
    return { items: current, added: false, reason: `Solo hay ${incoming.stock} unidades disponibles.` };
  }

  return {
    items: current.map((item, itemIndex) => itemIndex === index
      ? { ...item, stock: incoming.stock, quantity: item.quantity + 1 }
      : item),
    added: true,
  };
}

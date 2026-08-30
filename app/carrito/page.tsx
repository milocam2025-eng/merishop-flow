"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  parseStoredCart,
  type StoreCartItem,
} from "@/lib/store-cart";

type CartItem = StoreCartItem;

type CheckoutItem = {
  inventory_id: string;
  product: string;
  brand: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  price: number;
  subtotal: number;
};

type CheckoutResult = {
  order_number: string;
  total_mxn: number;
  items: CheckoutItem[];
};

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    setCart(parseStoredCart(localStorage.getItem(CART_STORAGE_KEY)));
  }, []);

  function saveCart(items: CartItem[]) {
    setCart(items);

    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(items)
    );
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }

  function increaseQuantity(id: string) {
  const updated = cart.map((item) => {
    if (item.id !== id) {
      return item;
    }

    const currentQuantity =
      Number(item.quantity ?? 1);

    const maxStock =
      Number(item.stock ?? 0);

    if (
      maxStock > 0 &&
      currentQuantity >= maxStock
    ) {
      alert(
        `Solo hay ${maxStock} ${
          maxStock === 1
            ? "unidad disponible"
            : "unidades disponibles"
        } de ${item.product}.`
      );

      return item;
    }

    return {
      ...item,
      quantity: currentQuantity + 1,
    };
  });

  saveCart(updated);
}

  function decreaseQuantity(id: string) {
    const updated = cart
      .map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(
                1,
                Number(item.quantity ?? 1) - 1
              ),
            }
          : item
      );

    saveCart(updated);
  }

  function removeItem(id: string) {
    const updated = cart.filter(
      (item) => item.id !== id
    );

    saveCart(updated);
  }

  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price ?? 0) *
          Number(item.quantity ?? 1),
      0
    );
  }, [cart]);

  function money(value: number) {
    return new Intl.NumberFormat(
      "es-MX",
      {
        style: "currency",
        currency: "MXN",
      }
    ).format(value);
  }

async function sendWhatsAppOrder() {
  if (cart.length === 0 || submitting) return;

  setCheckoutMessage("");

  if (!customerName.trim()) {
    setCheckoutMessage("Escribe tu nombre antes de enviar el pedido.");
    return;
  }

  const normalizedPhone = customerPhone.replace(/\D/g, "");
  if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    setCheckoutMessage("Escribe un número de WhatsApp válido de 10 a 15 dígitos.");
    return;
  }

  setSubmitting(true);
  setCheckoutMessage("Registrando tu pedido...");

  const requestedItems = cart.map((item) => ({
    inventory_id: item.id,
    quantity: Number(item.quantity),
  }));

  const supabase = createClient();
  const { data, error: orderError } = await supabase.rpc(
    "create_store_order",
    {
      p_customer_name: customerName.trim(),
      p_customer_phone: normalizedPhone,
      p_items: requestedItems,
    }
  );

  if (orderError) {
    console.error(
      "Error guardando pedido:",
      orderError
    );

    setSubmitting(false);
    setCheckoutMessage("No se pudo registrar el pedido. Revisa las existencias e intenta nuevamente.");

    return;
  }

  const checkout = data as CheckoutResult | null;

  if (!checkout?.order_number || !Array.isArray(checkout.items)) {
    setSubmitting(false);
    setCheckoutMessage("El pedido se registró, pero la respuesta no fue válida. Contacta a MeriShop.");
    return;
  }

  const orderNumber = checkout.order_number;
  const confirmedTotal = Number(checkout.total_mxn || 0);
  const confirmedItems = checkout.items;

  const whatsappNumber =
    "18402792847";

  const productLines = confirmedItems.flatMap(
    (item, index) => {
      const lines = [
        `${index + 1}. ${item.product}`,
        item.brand
          ? `Marca: ${item.brand}`
          : "",
        item.size
          ? `Talla: ${item.size}`
          : "",
        item.color
          ? `Color: ${item.color}`
          : "",
        `Cantidad: ${item.quantity}`,
        `Precio: ${money(item.price)} MXN`,
        `Subtotal: ${money(
          item.price * item.quantity
        )} MXN`,
      ].filter(Boolean);

      return [...lines, ""];
    }
  );

const message = [
  "Hola MeriShop",
  "",
  `Pedido: ${orderNumber}`,
  `Cliente: ${customerName}`,
  `WhatsApp: ${normalizedPhone}`,
  "",
  "Quiero realizar este pedido:",
    "",
    ...productLines,
    `TOTAL DEL PEDIDO: ${money(confirmedTotal)} MXN`,
    "",
    "¿Me pueden confirmar disponibilidad, forma de pago y entrega?",
  ].join("\n");

  const url =
    `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(
      message
    )}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

  saveCart([]);
  setSubmitting(false);
}

  if (cart.length === 0) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Link
            href="/tienda"
            style={styles.back}
          >
            ← Volver a MeriShop
          </Link>

          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              🛒
            </div>

            <h1 style={styles.emptyTitle}>
              Tu carrito está vacío
            </h1>

            <p style={styles.emptyText}>
              Agrega productos desde la tienda
              para comenzar tu pedido.
            </p>

            <Link
              href="/tienda"
              style={styles.shopButton}
            >
              Ver productos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Link
          href="/tienda"
          style={styles.back}
        >
          ← Seguir comprando
        </Link>

        <h1 style={styles.title}>
          🛒 Mi carrito
        </h1>

        <div
  className="cart-layout"
  style={styles.layout}
>
          <div style={styles.items}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={styles.itemCard}
              >
                <div style={styles.imageBox}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.product}
                      style={styles.image}
                    />
                  ) : (
                    <div
                      style={
                        styles.imagePlaceholder
                      }
                    >
                      Sin foto
                    </div>
                  )}
                </div>

                <div style={styles.itemInfo}>
                  <h2 style={styles.productName}>
                    {item.product}
                  </h2>

                  {item.brand && (
                    <div style={styles.meta}>
                      Marca: {item.brand}
                    </div>
                  )}

                  {item.size && (
                    <div style={styles.meta}>
                      Talla: {item.size}
                    </div>
                  )}

                  {item.color && (
                    <div style={styles.meta}>
                      Color: {item.color}
                    </div>
                  )}

                  <div style={styles.price}>
                    {money(item.price)}
                  </div>

                  <div style={styles.controls}>
                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                      style={styles.qtyButton}
                    >
                     -
                    </button>

                    <div style={styles.qty}>
                      {item.quantity}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                      style={styles.qtyButton}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(item.id)
                    }
                    style={styles.removeButton}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

         <div style={styles.summary}>
  <div style={styles.customerBox}>
    <h2 style={styles.customerTitle}>
      Datos del cliente
    </h2>

    <label style={styles.customerLabel}>
      Nombre
      <input
        type="text"
        autoComplete="name"
        value={customerName}
        onChange={(e) =>
          setCustomerName(e.target.value)
        }
        placeholder="Tu nombre completo"
        style={styles.customerInput}
      />
    </label>

    <label style={styles.customerLabel}>
      WhatsApp
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={customerPhone}
        onChange={(e) =>
          setCustomerPhone(e.target.value)
        }
        placeholder="Ej. 9991234567"
        style={styles.customerInput}
      />
    </label>
  </div>

  <h2 style={styles.summaryTitle}>
    Resumen del pedido
  </h2>

            <div style={styles.summaryRow}>
              <span>Productos</span>

              <strong>
                {cart.reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item.quantity ?? 1
                    ),
                  0
                )}
              </strong>
            </div>

            <div style={styles.totalRow}>
              <span>Total</span>

              <strong>
                {money(total)}
              </strong>
            </div>

            <button
              type="button"
              onClick={sendWhatsAppOrder}
              disabled={submitting}
              style={styles.whatsappButton}
            >
              {submitting ? "Registrando pedido..." : "Enviar pedido por WhatsApp"}
            </button>

            {checkoutMessage && (
              <p role="status" style={styles.checkoutMessage}>{checkoutMessage}</p>
            )}

            <div style={styles.note}>
              Tu pedido se enviará a MeriShop
              para confirmar disponibilidad,
              pago y entrega.
            </div>
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 768px) {
            .cart-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "32px 18px",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  back: {
    display: "inline-block",
    marginBottom: 24,
    color: "#12385d",
    textDecoration: "none",
    fontWeight: 700,
  },

  title: {
    color: "#172b4d",
    fontSize: 36,
    margin: "0 0 28px",
  },

  layout: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.6fr) minmax(280px, 0.7fr)",
    gap: 24,
    alignItems: "start",
  },

  items: {
    display: "grid",
    gap: 18,
  },

  itemCard: {
    display: "grid",
    gridTemplateColumns: "150px 1fr",
    gap: 20,
    padding: 18,
    background: "#ffffff",
    borderRadius: 18,
    boxShadow:
      "0 8px 24px rgba(0,0,0,0.06)",
  },

  imageBox: {
    width: "150px",
    height: "150px",
    borderRadius: 14,
    overflow: "hidden",
    background: "#f1f5f9",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  imagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
  },

  itemInfo: {
    minWidth: 0,
  },

  productName: {
    margin: "0 0 8px",
    color: "#172b4d",
    fontSize: 22,
  },

  meta: {
    color: "#64748b",
    marginBottom: 4,
  },

  price: {
    color: "#172b4d",
    fontSize: 22,
    fontWeight: 800,
    marginTop: 12,
    marginBottom: 14,
  },

  controls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },

  qtyButton: {
  width: 42,
  height: 42,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#172b4d",
  fontSize: 24,
  fontWeight: 800,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
},

  qty: {
    minWidth: 30,
    textAlign: "center",
    fontWeight: 700,
  },

 removeButton: {
  border: "none",
  background: "transparent",
  color: "#dc2626",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
},

customerBox: {
  marginBottom: 26,
  paddingBottom: 24,
  borderBottom: "1px solid #e2e8f0",
},

customerTitle: {
  margin: "0 0 18px",
  color: "#172b4d",
  fontSize: 22,
},

customerLabel: {
  display: "block",
  marginBottom: 16,
  color: "#334155",
  fontWeight: 700,
},

customerInput: {
  width: "100%",
  marginTop: 8,
  padding: "13px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 16,
  boxSizing: "border-box",
  outline: "none",
},

summary: {
  background: "#ffffff",
  borderRadius: 18,
  padding: 24,
  boxShadow:
    "0 8px 24px rgba(0,0,0,0.06)",
  position: "sticky",
  top: 20,
},

  summaryTitle: {
    margin: "0 0 20px",
    color: "#172b4d",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 16,
    color: "#475569",
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
    fontSize: 22,
    color: "#172b4d",
    marginBottom: 22,
  },

  whatsappButton: {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: "17px",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
  },

  checkoutMessage: {
    margin: "14px 0 0",
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.5,
  },

  note: {
    marginTop: 14,
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },

  empty: {
    maxWidth: 520,
    margin: "80px auto",
    padding: 40,
    background: "#ffffff",
    borderRadius: 22,
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.06)",
  },

  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },

  emptyTitle: {
    color: "#172b4d",
    marginBottom: 12,
  },

  emptyText: {
    color: "#64748b",
    lineHeight: 1.6,
    marginBottom: 24,
  },

  shopButton: {
    display: "inline-block",
    padding: "14px 22px",
    borderRadius: 12,
    background: "#172b4d",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 800,
  },
};

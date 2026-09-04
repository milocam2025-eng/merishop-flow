"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import StoreFooter from "@/components/StoreFooter";
import PwaInstaller from "@/components/PwaInstaller";
import {
  addCartItem,
  cartItemCount,
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  parseStoredCart,
} from "@/lib/store-cart";

type StoreProduct = {
  id: string;
  product: string;
  brand?: string | null;
  category?: string | null;
  size?: string | null;
  image_url?: string | null;
  sale_price_mxn?: number | null;
  quantity: number;
  status: string;
};

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

export default function TiendaPage() {
  const [products, setProducts] =
    useState<StoreProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("Todos");

  const [sort, setSort] = useState("recommended");
  const [notice, setNotice] = useState("");

const [cartCount, setCartCount] =
  useState(0);

  const [isAdmin, setIsAdmin] =
    useState(false);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError("");

      const supabase =
        createClient();

      const { data, error } =
        await supabase.rpc(
          "list_store_products"
        );

      if (error) {
        console.error(
          "Error cargando tienda:",
          error
        );

        setError(
          "No se pudieron cargar los productos."
        );

        setLoading(false);
        return;
      }

      setProducts(
        (data as StoreProduct[]) ??
          []
      );

      setLoading(false);
    }

    loadProducts();
  }, []);
useEffect(() => {
  let active = true;

  async function checkAdminSession() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase.rpc("is_admin");
    if (active && !error && data === true) {
      setIsAdmin(true);
    }
  }

  checkAdminSession();

  return () => {
    active = false;
  };
}, []);

useEffect(() => {
  function loadCartCount() {
    setCartCount(cartItemCount(parseStoredCart(localStorage.getItem(CART_STORAGE_KEY))));
  }

  loadCartCount();

  window.addEventListener(
    "focus",
    loadCartCount
  );
  window.addEventListener(CART_UPDATED_EVENT, loadCartCount);

  return () => {
    window.removeEventListener(
      "focus",
      loadCartCount
    );
    window.removeEventListener(CART_UPDATED_EVENT, loadCartCount);
  };
}, []);

  const categories = useMemo(() => {
  const values = products
    .map((item) => item.category?.trim())
    .filter(
      (value): value is string =>
        Boolean(value)
    );

  return [
    "Todos",
    ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es")),
  ];
}, [products]);

  const filteredProducts =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      const matches = products.filter(
        (item) => {
          const matchesSearch =
            !q ||
            [
              item.product,
              item.brand,
              item.category,
              item.size,
            ].some((value) =>
              String(
                value ?? ""
              )
                .toLowerCase()
                .includes(q)
            );

          const matchesCategory =
            category ===
              "Todos" ||
            item.category ===
              category;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );

      return [...matches].sort((a, b) => {
        if (sort === "price-asc") return Number(a.sale_price_mxn ?? 0) - Number(b.sale_price_mxn ?? 0);
        if (sort === "price-desc") return Number(b.sale_price_mxn ?? 0) - Number(a.sale_price_mxn ?? 0);
        if (sort === "name") return a.product.localeCompare(b.product, "es");
        return 0;
      });
    }, [
      products,
      search,
      category,
      sort,
    ]);

  function addProductToCart(item: StoreProduct) {
    const current = parseStoredCart(localStorage.getItem(CART_STORAGE_KEY));
    const result = addCartItem(current, {
      id: item.id,
      product: item.product,
      brand: item.brand,
      size: item.size,
      price: Number(item.sale_price_mxn ?? 0),
      image: item.image_url ?? "",
      stock: Number(item.quantity ?? 0),
      quantity: 1,
    });

    if (!result.added) {
      setNotice(result.reason ?? "No se pudo agregar el producto.");
      return;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(result.items));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    setNotice(`${item.product} se agregó al carrito.`);
  }

  function buyProduct(
    item: StoreProduct
  ) {
   const message = [
  "Hola MeriShop",
  "",
  "Me interesa este producto:",
  "",
  `Producto: ${item.product}`,
  item.brand
    ? `Marca: ${item.brand}`
    : "",
  item.size
    ? `Talla: ${item.size}`
    : "",
  `Precio: ${money(
    item.sale_price_mxn
  )} MXN`,
  "",
  "¿Está disponible?",
]
  .filter(Boolean)
  .join("\n");
const whatsappNumber = "18402792847";

const url =
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
    
    window.open(
      url,
      "_blank"
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "#f8fafc",
      }}
    >
      <header className="store-main-header">
        <div className="store-main-nav">
          <Link className="store-logo" href="/tienda" aria-label="MeriShop">
            <span>Meri</span><span>Shop</span>
          </Link>
          <nav aria-label="Navegación principal">
            <a href="#productos">Productos</a>
            <Link href="/acerca">Nosotros</Link>
            <Link href="/como-comprar">Cómo comprar</Link>
            <Link href="/contacto">Contacto</Link>
          </nav>
          <div className="store-account-actions">
            {isAdmin && (
              <Link className="store-admin-return" href="/inventario">
                ⚙ Inventario
              </Link>
            )}
            <Link className="store-cart-link" href="/carrito">
              🛒 Carrito{cartCount > 0 && ` (${cartCount})`}
            </Link>
          </div>
        </div>
      </header>

      <section className="store-hero">
        <div>
          <span className="store-kicker">Compras seleccionadas en Estados Unidos</span>
          <h1>Productos especiales, atención personal y compras con confianza</h1>
          <p>
            Descubre productos seleccionados y confirma tu compra directamente
            con MeriShop. Te acompañamos desde tu pedido hasta la entrega.
          </p>
          <div className="store-hero-actions">
            <a className="store-primary-link" href="#productos">Ver productos</a>
            <a
              className="store-secondary-link"
              href="https://wa.me/18402792847?text=Hola%20MeriShop%2C%20quiero%20informaci%C3%B3n."
              target="_blank"
              rel="noreferrer"
            >
              Hablar por WhatsApp
            </a>
          </div>
        </div>
        <aside className="store-hero-card" aria-label="Beneficios de MeriShop">
          <div><strong>✓ Atención personalizada</strong><span>Resolvemos tus dudas antes de comprar.</span></div>
          <div><strong>✓ Compra confirmada</strong><span>Validamos existencia y pago contigo.</span></div>
          <div><strong>✓ Seguimiento directo</strong><span>Te acompañamos hasta la entrega.</span></div>
        </aside>
      </section>

      <section className="store-trust-strip" aria-label="Ventajas de comprar en MeriShop">
        <div><span>🛍️</span><strong>Selección especial</strong><small>Productos elegidos para nuestros clientes</small></div>
        <div><span>💬</span><strong>Atención humana</strong><small>Confirmación personal por WhatsApp</small></div>
        <div><span>🔒</span><strong>Proceso claro</strong><small>Precios y condiciones antes del pago</small></div>
        <div><span>📦</span><strong>Seguimiento</strong><small>Información sobre pedido y entrega</small></div>
      </section>

      <PwaInstaller />

      <div
        id="productos"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding:
            "30px 20px 60px",
        }}
      >
        <div className="store-catalog-heading">
          <span>Catálogo</span>
          <h2>Productos disponibles</h2>
          <p>Elige tus favoritos y confirma disponibilidad con nosotros.</p>
        </div>

        {/* BUSCADOR */}

        <input
          type="text"
          aria-label="Buscar productos"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="🔎 Buscar productos..."
          style={{
            width: "100%",
            padding: 15,
            borderRadius: 12,
            border:
              "1px solid #cbd5e1",
            fontSize: 16,
            marginBottom: 20,
          }}
        />

        <div className="store-toolbar">
          <p aria-live="polite">
            <strong>{filteredProducts.length}</strong>{" "}
            {filteredProducts.length === 1 ? "producto" : "productos"}
          </p>
          <label>
            Ordenar por
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recommended">Recomendados</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name">Nombre</option>
            </select>
          </label>
        </div>

        {/* CATEGORÍAS */}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 30,
          }}
        >
          {categories.map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setCategory(
                    item
                  )
                }
                style={{
                  padding:
                    "10px 16px",
                  borderRadius: 999,
                  border:
                    category ===
                    item
                      ? "2px solid #2563eb"
                      : "1px solid #cbd5e1",
background:
  category === item
    ? "#dbeafe"
    : "#ffffff",

color:
  category === item
    ? "#1d4ed8"
    : "#334155",

fontWeight: 700,
cursor: "pointer",                
                }}
              >
                {item}
              </button>
            )
          )}
        </div>

        {(search || category !== "Todos") && (
          <button
            type="button"
            className="store-clear-filters"
            onClick={() => {
              setSearch("");
              setCategory("Todos");
            }}
          >
            Limpiar filtros
          </button>
        )}

        {notice && (
          <div className="store-notice" role="status">
            <span>{notice}</span>
            <Link href="/carrito">Ver carrito</Link>
          </div>
        )}

        {loading && (
          <p>
            Cargando productos...
          </p>
        )}

        {error && (
          <p
            style={{
              color: "#dc2626",
            }}
          >
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          filteredProducts.length ===
            0 && (
            <div
              style={{
                textAlign:
                  "center",
                padding: 50,
                background:
                  "#ffffff",
                borderRadius: 16,
              }}
            >
              <h2>
                No hay productos
                disponibles
              </h2>

              <p>
                Vuelve pronto para
                ver nuevos productos.
              </p>
            </div>
          )}

        {/* PRODUCTOS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 24,
          }}
        >
          {filteredProducts.map(
            (item) => (
              <article
                key={item.id}
                style={{
                  background:
                    "#ffffff",
                  borderRadius: 18,
                  overflow:
                    "hidden",
                  border:
                    "1px solid #e2e8f0",
                  boxShadow:
                    "0 8px 25px rgba(15, 23, 42, 0.08)",
                }}
              >
                {item.image_url ? (
                  <img
                    src={
                      item.image_url
                    }
                    alt={
                      item.product
                    }
                    style={{
                      width:
                        "100%",
                      height: 300,
                      objectFit:
                        "cover",
                      display:
                        "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 300,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      background:
                        "#f1f5f9",
                      fontSize: 60,
                    }}
                  >
                    📦
                  </div>
                )}

                <div
                  style={{
                    padding: 20,
                  }}
                >
                  {item.category && (
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize: 14,
                        marginBottom: 6,
                      }}
                    >
                      {
                        item.category
                      }
                    </div>
                  )}

                  <h2
                    style={{
                      margin:
                        "0 0 6px",
                      fontSize: 21,
                    }}
                  >
                    {
                      item.product
                    }
                  </h2>

                  {item.brand && (
                    <div
                      style={{
                        fontWeight:
                          600,
                        color:
                          "#475569",
                        marginBottom:
                          8,
                      }}
                    >
                      {
                        item.brand
                      }
                    </div>
                  )}

                  {item.size && (
                    <div
                      style={{
                        marginBottom:
                          12,
                      }}
                    >
                      Talla:{" "}
                      <strong>
                        {
                          item.size
                        }
                      </strong>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color:
                        "#0f2d4d",
                      margin:
                        "15px 0",
                    }}
                  >
                    {money(
                      item.sale_price_mxn
                    )}
                  </div>

                  <div
                    style={{
                      color:
                        "#16a34a",
                      fontWeight: 700,
                      marginBottom:
                        15,
                    }}
                  >
                    {Number(item.quantity) <= 2
                      ? `Quedan ${item.quantity} ${item.quantity === 1 ? "unidad" : "unidades"}`
                      : "✓ Disponible"}
                  </div>

                 <div
  style={{
    display: "grid",
    gap: 10,
  }}
>
  <Link
    href={`/tienda/${item.id}`}
    style={{
      width: "100%",
      padding: 14,
      borderRadius: 12,
      background: "#0f2d4d",
      color: "#ffffff",
      fontSize: 16,
      fontWeight: 800,
      textAlign: "center",
      textDecoration: "none",
      boxSizing: "border-box",
      display: "block",
    }}
  >
    👁 Ver producto
  </Link>

  <button
    type="button"
    onClick={() => addProductToCart(item)}
    className="store-add-button"
  >
    🛒 Agregar al carrito
  </button>

  <button
    type="button"
    onClick={() =>
      buyProduct(
        item
      )
    }
    style={{
      width: "100%",
      padding: 14,
      border: 0,
      borderRadius: 12,
      background: "#16a34a",
      color: "#ffffff",
      fontSize: 16,
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
                    💬 Quiero comprar
                  </button>
                </div>
</div>
              </article>
            )
          )}
        </div>
      </div>
      <section className="store-about-preview">
        <div>
          <span className="store-kicker">Tu personal shopper de confianza</span>
          <h2>Comprar desde Estados Unidos puede ser fácil</h2>
          <p>
            En MeriShop seleccionamos productos y ofrecemos un proceso acompañado,
            con comunicación directa y seguimiento organizado.
          </p>
          <Link href="/acerca">Conoce más sobre MeriShop →</Link>
        </div>
        <div className="store-process-preview">
          <div><b>1</b><span><strong>Elige</strong><small>Explora el catálogo</small></span></div>
          <div><b>2</b><span><strong>Confirma</strong><small>Revisa por WhatsApp</small></span></div>
          <div><b>3</b><span><strong>Recibe</strong><small>Da seguimiento a tu pedido</small></span></div>
        </div>
      </section>
      <StoreFooter />
    </main>
  );
}

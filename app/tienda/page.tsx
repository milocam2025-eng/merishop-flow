"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError("");

      const supabase =
        createClient();

      const { data, error } =
        await supabase
          .from("inventory")
          .select(`
            id,
            product,
            brand,
            category,
            size,
            image_url,
            sale_price_mxn,
            quantity,
            status
          `)
          .eq(
            "status",
            "Disponible"
          )
          .gt(
            "quantity",
            0
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
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

  const categories =
    useMemo(() => {
      const values =
        products
          .map(
            (item) =>
              item.category
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          );

      return [
        "Todos",
        ...Array.from(
          new Set(values)
        ),
      ];
    }, [products]);

  const filteredProducts =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      return products.filter(
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
    }, [
      products,
      search,
      category,
    ]);

  function buyProduct(
    item: StoreProduct
  ) {
    const message = [
      "Hola MeriShop 👋",
      "",
      "Me interesa este producto:",
      "",
      `🛍️ ${item.product}`,
      item.brand
        ? `🏷️ ${item.brand}`
        : "",
      item.size
        ? `📏 Talla ${item.size}`
        : "",
      `💰 ${money(
        item.sale_price_mxn
      )}`,
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
      {/* ENCABEZADO */}

      <header
        style={{
          background:
            "#0f2d4d",
          color: "#ffffff",
          padding:
            "28px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 36,
            }}
          >
            <span
              style={{
                color:
                  "#ed174c",
              }}
            >
              MeriShop
            </span>
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              opacity: 0.9,
            }}
          >
            Productos disponibles
            para compra
          </p>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding:
            "30px 20px 60px",
        }}
      >
        {/* BUSCADOR */}

        <input
          type="text"
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
                    category ===
                    item
                      ? "#dbeafe"
                      : "#ffffff",
                  fontWeight: 700,
                  cursor:
                    "pointer",
                }}
              >
                {item}
              </button>
            )
          )}
        </div>

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
                    ✓ Disponible
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      buyProduct(
                        item
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding: 14,
                      border: 0,
                      borderRadius:
                        12,
                      background:
                        "#16a34a",
                      color:
                        "#ffffff",
                      fontSize: 16,
                      fontWeight: 800,
                      cursor:
                        "pointer",
                    }}
                  >
                    💬 Quiero comprar
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      </div>
    </main>
  );
}
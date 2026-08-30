"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  product: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  color: string | null;
  image_url: string | null;
  sale_price_mxn: number | null;
  quantity: number | null;
  status: string | null;
};
type ProductImage = {
  id: string;
  image_url: string;
  sort_order: number;
  is_primary: boolean;
};
function money(value: number | null) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value ?? 0));
}

export default function ProductPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] =
    useState<Product | null>(null);

const [images, setImages] =
  useState<ProductImage[]>([]);

const [selectedImage, setSelectedImage] =
  useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
  async function loadProduct() {
    const supabase = createClient();

    const { data, error } = await supabase
      .rpc("get_store_product", {
        p_inventory_id: id,
      });

    if (error || !data) {
      console.error(error);

      setError(
        "No pudimos encontrar este producto."
      );

      setLoading(false);
      return;
    }

    const storeProduct = data as Product;
    setProduct(storeProduct);

    // ========================================
    // CARGAR GALERÍA DE FOTOS
    // ========================================

    const { data: imageData, error: imageError } =
      await supabase.rpc(
        "list_store_product_images",
        {
          p_inventory_id: id,
        }
      );

    if (imageError) {
      console.error(
        "Error cargando galería:",
        imageError
      );

      if (storeProduct.image_url) {
        setSelectedImage(
          storeProduct.image_url
        );
      }
    } else {
      const gallery =
        (imageData as ProductImage[]) ?? [];

      setImages(gallery);

      if (gallery.length > 0) {
        const primary =
          gallery.find(
            (image) =>
              image.is_primary
          ) ?? gallery[0];

        setSelectedImage(
          primary.image_url
        );
      } else if (storeProduct.image_url) {
        setSelectedImage(
          storeProduct.image_url
        );
      }
    }

    setLoading(false);
  }

  if (id) {
    loadProduct();
  }
}, [id]);

  function buyWhatsApp() {
  if (!product) return;

  const whatsappNumber =
    "18402792847";

 const message = [
  "Hola MeriShop",
  "",
  "Me interesa este producto:",
  "",
  `Producto: ${product.product}`,
  product.brand
    ? `Marca: ${product.brand}`
    : "",
  product.size
    ? `Talla: ${product.size}`
    : "",
  product.color
    ? `Color: ${product.color}`
    : "",
  `Precio: ${money(
    product.sale_price_mxn
  )} MXN`,
  "",
  "¿Está disponible?",
]
  .filter(Boolean)
  .join("\n");

  const url =
     `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(
    message
    )}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}
function addToCart() {
  if (!product) return;

  const savedCart =
    localStorage.getItem("merishop_cart");

  let cart: any[] = [];

  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);

      if (!Array.isArray(cart)) {
        cart = [];
      }
    } catch {
      cart = [];
    }
  }

  const existingIndex =
    cart.findIndex(
      (item) => item.id === product.id
    );

if (existingIndex >= 0) {
  const currentQuantity =
    Number(
      cart[existingIndex].quantity ?? 1
    );

  const maxStock =
    Number(product.quantity ?? 0);

  if (
    maxStock > 0 &&
    currentQuantity >= maxStock
  ) {
    alert(
      `Solo hay ${maxStock} ${
        maxStock === 1
          ? "unidad disponible"
          : "unidades disponibles"
      } de ${product.product}.`
    );

    return;
  }

  cart[existingIndex].quantity =
    currentQuantity + 1;

  cart[existingIndex].stock =
    maxStock;
}

     else {
    cart.push({
      id: product.id,
      product: product.product,
      brand: product.brand,
      size: product.size,
      color: product.color,
      price: Number(
        product.sale_price_mxn ?? 0
      ),
      image:
        selectedImage ||
        product.image_url ||
        "",   
      stock: Number(product.quantity ?? 0),
      quantity: 1,
    });
  }

  localStorage.setItem(
    "merishop_cart",
    JSON.stringify(cart)
  );

  alert(
    `${product.product} fue agregado al carrito.`
  );
}
  if (loading) {
    return (
      <main style={styles.center}>
        <h2>Cargando producto...</h2>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main style={styles.center}>
        <h2>{error}</h2>

        <Link
          href="/tienda"
          style={styles.backButton}
        >
          ← Volver a la tienda
        </Link>
      </main>
    );
  }

  const available =
    Number(product.quantity ?? 0) > 0 &&
    product.status !== "Vendido" &&
    product.status !== "Agotado";

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <Link
          href="/tienda"
          style={styles.back}
        >
          ← Volver a MeriShop
        </Link>

        <div
  className="product-card"
  style={styles.card}
>

          <div style={styles.imageArea}>
           
{selectedImage ? (
  <>
   <img
  className="product-main-image"
  src={selectedImage}
  alt={product.product}
  style={styles.image}
/>
    {images.length > 1 && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(80px, 1fr))",
          gap: 10,
          padding: 15,
          background: "#ffffff",
        }}
      >
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() =>
              setSelectedImage(
                image.image_url
              )
            }
            style={{
              padding: 0,
              border:
                selectedImage === image.image_url
                  ? "3px solid #ed174c"
                  : "1px solid #cbd5e1",
              borderRadius: 10,
              overflow: "hidden",
              cursor: "pointer",
              background: "#ffffff",
            }}
          >
            <img
              src={image.image_url}
              alt={product.product}
              style={{
                width: "100%",
                height: 90,
                objectFit: "cover",
                display: "block",
              }}
            />
          </button>
        ))}
      </div>
    )}
  </>
) : (
  <div style={styles.noImage}>
    Sin fotografía
  </div>
)}
          </div>

          <div
  className="product-info"
  style={styles.info}
>

            {product.category && (
              <div style={styles.category}>
                {product.category}
              </div>
            )}

            <h1 style={styles.title}>
              {product.product}
            </h1>

            {product.brand && (
              <div style={styles.brand}>
                {product.brand}
              </div>
            )}

            
            <div style={styles.price}>
              {money(
                product.sale_price_mxn
              )}
            </div>

            <div
              style={{
                ...styles.status,
                ...(available
                  ? styles.available
                  : styles.unavailable),
              }}
            >
              {available
                ? "✓ Disponible"
                : "Agotado"}
            </div>

        {/* DETALLES DEL PRODUCTO */}

<div
  style={{
    marginBottom: 28,
    padding: 20,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  }}
>
  <h3
    style={{
      margin: "0 0 16px",
      color: "#172b4d",
      fontSize: 18,
    }}
  >
    Detalles del producto
  </h3>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(2, minmax(0, 1fr))",
      gap: 14,
      color: "#475569",
    }}
  >
    {product.category && (
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          Categoría
        </div>

        <strong>
          {product.category}
        </strong>
      </div>
    )}

    {product.brand && (
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          Marca
        </div>

        <strong>
          {product.brand}
        </strong>
      </div>
    )}

    {product.size && (
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          Talla
        </div>

        <strong>
          {product.size}
        </strong>
      </div>
    )}

    {product.color && (
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          Color
        </div>

        <strong>
          {product.color}
        </strong>
      </div>
    )}

    <div>
      <div
        style={{
          fontSize: 13,
          color: "#94a3b8",
        }}
      >
        Existencias
      </div>

      <strong>
        {Number(
          product.quantity ?? 0
        )}{" "}
        {Number(
          product.quantity ?? 0
        ) === 1
          ? "unidad"
          : "unidades"}
      </strong>
    </div>
  </div>
</div>


{/* BOTÓN WHATSAPP */}

{available && (
  <button
    type="button"
    onClick={addToCart}
    style={styles.cartButton}
  >
    🛒 Agregar al carrito
  </button>
)}

{available && (
  <button
    type="button"
    onClick={buyWhatsApp}
    style={styles.whatsapp}
  >
    Comprar por WhatsApp
  </button>
)}

<div style={styles.note}>
  Compra segura directamente
  con MeriShop.
</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .product-card {
            grid-template-columns: 1fr !important;
          }

          .product-info {
            padding: 24px !important;
          }

          .product-main-image {
            height: 420px !important;
            min-height: 0 !important;
            object-fit: contain !important;
          }
        }

        @media (max-width: 480px) {
          .product-info {
            padding: 20px !important;
          }

          .product-main-image {
            height: 340px !important;
          }
        }
      `}</style>

    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "40px 20px",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  back: {
    display: "inline-block",
    marginBottom: "24px",
    color: "#12385d",
    textDecoration: "none",
    fontWeight: 700,
  },

  card: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(0, 1fr)",
    background: "#ffffff",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow:
      "0 12px 40px rgba(0,0,0,0.08)",
  },

  imageArea: {
  background: "#f0f2f5",
  display: "flex",
  flexDirection: "column",
},

  image: {
  width: "100%",
  height: "620px",
  objectFit: "contain",
  display: "block",
  background: "#ffffff",
},
  noImage: {
    minHeight: "500px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#718096",
  },

  info: {
    padding: "50px",
  },

  category: {
    color: "#718096",
    fontSize: "16px",
    marginBottom: "10px",
  },

  title: {
    color: "#172b4d",
    fontSize: "38px",
    margin: "0 0 10px",
  },

  brand: {
    color: "#52657a",
    fontSize: "21px",
    fontWeight: 600,
    marginBottom: "24px",
  },

  detail: {
    color: "#334e68",
    fontSize: "18px",
    marginBottom: "20px",
  },

  price: {
    color: "#172b4d",
    fontSize: "40px",
    fontWeight: 800,
    marginBottom: "20px",
  },

  status: {
    display: "inline-block",
    padding: "9px 16px",
    borderRadius: "999px",
    fontWeight: 700,
    marginBottom: "30px",
  },

  available: {
    background: "#dcfce7",
    color: "#166534",
  },

  unavailable: {
    background: "#fee2e2",
    color: "#991b1b",
  },

cartButton: {
  width: "100%",
  border: "2px solid #172b4d",
  borderRadius: "14px",
  padding: "17px",
  background: "#ffffff",
  color: "#172b4d",
  fontSize: "18px",
  fontWeight: 800,
  cursor: "pointer",
  marginBottom: "14px",
},

  whatsapp: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "17px",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: "18px",
  },

  note: {
    color: "#718096",
    textAlign: "center",
    fontSize: "14px",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
  },

  backButton: {
    color: "#12385d",
    fontWeight: 700,
  },
};

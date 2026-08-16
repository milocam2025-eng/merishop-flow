"use client";

import { useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import CameraPicker from "@/components/CameraPicker";

function numberValue(value: string) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function moneyMXN(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function moneyUSD(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function PublicarPage() {
  const [photo, setPhoto] =
    useState<File | null>(null);

  const [generatedImage, setGeneratedImage] =
    useState<string | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [product, setProduct] =
    useState("");

  const [brand, setBrand] =
    useState("");

  const [size, setSize] =
    useState("");

  const [costUsd, setCostUsd] =
    useState("");

  const [taxRate, setTaxRate] =
    useState("7.75");

  const [commissionPercent, setCommissionPercent] =
    useState("20");

  const [shippingUsd, setShippingUsd] =
    useState("0");

  const [exchangeRate, setExchangeRate] =
    useState("");

const [publishPrice, setPublishPrice] =
  useState("");

  const calculations = useMemo(() => {
    const cost =
      numberValue(costUsd);

    const tax =
      cost *
      (numberValue(taxRate) / 100);

    const commission =
      cost *
      (
        numberValue(
          commissionPercent
        ) / 100
      );

    const shipping =
      numberValue(shippingUsd);

    const totalUsd =
      cost +
      tax +
      commission +
      shipping;

    const totalMxn =
      totalUsd *
      numberValue(exchangeRate);

    return {
      cost,
      tax,
      commission,
      shipping,
      totalUsd,
      totalMxn,
    };
  }, [
    costUsd,
    taxRate,
    commissionPercent,
    shippingUsd,
    exchangeRate,
  ]);

const suggestedPrice = useMemo(() => {
  if (calculations.totalMxn <= 0) {
    return 0;
  }

  return Math.ceil(
    calculations.totalMxn / 5
  ) * 5;
}, [calculations.totalMxn]);

async function createWhatsAppImage() {
  if (!photo) {
    return;
  }


  if (calculations.totalMxn <= 0) {
    return;
  }

  const canvas =
    document.createElement("canvas");

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  // Tamaño vertical ideal para publicación
  canvas.width = 1080;
  canvas.height = 1350;

  const image = new Image();

  const photoUrl =
    URL.createObjectURL(photo);

  image.src = photoUrl;

  try {
    await new Promise<void>(
      (resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject();
      }
    );

    // Fondo blanco
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    // =========================
    // FOTOGRAFÍA
    // =========================

    const photoHeight = 1000;

    const scale = Math.min(
      canvas.width / image.width,
      photoHeight / image.height
    );

    const drawWidth =
      image.width * scale;

    const drawHeight =
      image.height * scale;

    const x =
      (canvas.width - drawWidth) / 2;

    const y =
      (photoHeight - drawHeight) / 2;

    ctx.drawImage(
      image,
      x,
      y,
      drawWidth,
      drawHeight
    );

    // =========================
    // PANEL MERISHOP
    // =========================

    ctx.fillStyle = "#0f2742";

    ctx.fillRect(
      0,
      1000,
      1080,
      350
    );

    // Nombre MeriShop
    ctx.fillStyle = "#ffffff";

    ctx.font =
      "700 42px Arial";

    ctx.fillText(
      "MeriShop",
      60,
      1070
    );

    // Producto
    if (product) {
      ctx.font =
        "500 34px Arial";

      ctx.fillText(
        product,
        60,
        1130
      );
    }

    // Marca y talla
    const details = [
      brand,
      size
        ? `Talla ${size}`
        : "",
    ]
      .filter(Boolean)
      .join(" • ");

    if (details) {
      ctx.fillStyle =
        "#cbd5e1";

      ctx.font =
        "500 28px Arial";

      ctx.fillText(
        details,
        60,
        1185
      );
    }

    // =========================
    // PRECIO FINAL
    // =========================

const priceForPublication =
  publishPrice
    ? Number(publishPrice)
    : suggestedPrice;

const finalPrice =
  moneyMXN(
    priceForPublication
  );

    ctx.fillStyle = "#ffffff";

    ctx.font =
      "800 72px Arial";

    ctx.fillText(
      finalPrice,
      60,
      1285
    );

    // Crear imagen final
    const dataUrl =
      canvas.toDataURL(
        "image/jpeg",
        0.92
      );

    setGeneratedImage(
      dataUrl
    );
  } finally {
    URL.revokeObjectURL(
      photoUrl
    );
  }
}

async function shareWhatsAppImage() {
  if (!generatedImage) {
    return;
  }

  try {
    const response =
      await fetch(generatedImage);

    const blob =
      await response.blob();

    const file = new File(
      [blob],
      `merishop-${product || "producto"}.jpg`,
      {
        type: "image/jpeg",
      }
    );

    const shareData = {
  files: [file],
  title: "MeriShop",
  text: `${product || "Producto"} - ${moneyMXN(
    publishPrice
      ? Number(publishPrice)
      : suggestedPrice
  )}`,
};

    if (
      navigator.share &&
      navigator.canShare?.(shareData)
    ) {
      await navigator.share(
        shareData
      );

      return;
    }

    // Respaldo para computadora
    const link =
      document.createElement("a");

    link.href =
      generatedImage;

    link.download =
      `merishop-${product || "producto"}.jpg`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  } catch (error) {
    console.error(
      "No se pudo compartir la imagen:",
      error
    );
  }
}
 
  function handlePhoto(
    file: File | null
  ) {
    setPhoto(file);

    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url =
      URL.createObjectURL(file);

    setPreviewUrl(url);
  }

  return (
    <AuthGuard>
      <AppShell title="Publicar">
        <section className="panel">
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            <h1>
              📲 WhatsApp Shopper
            </h1>

            <p
              style={{
                color: "#64748b",
                marginBottom: 25,
              }}
            >
              Toma una fotografía,
              calcula el precio final
              en pesos y prepara el
              producto para compartir.
            </p>

            {/* FOTO */}

            <div
              className="panel"
              style={{
                marginBottom: 25,
              }}
            >
              <h2>
                📷 Fotografía
              </h2>

              <CameraPicker
                onFileSelected={
                  handlePhoto
                }
              />

              {previewUrl && (
                <div
                  style={{
                    marginTop: 20,
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    style={{
                      width: "100%",
                      maxWidth: 500,
                      maxHeight: 550,
                      objectFit:
                        "contain",
                      borderRadius: 14,
                      background:
                        "#f8fafc",
                    }}
                  />
                </div>
              )}
            </div>

            {/* PRODUCTO */}

            <div
              className="panel"
              style={{
                marginBottom: 25,
              }}
            >
              <h2>
                Producto
              </h2>

              <div className="form-grid">
                <label>
                  Producto
                  <input
                    value={product}
                    onChange={(e) =>
                      setProduct(
                        e.target.value
                      )
                    }
                    placeholder="Ej. Bolsa Coach"
                  />
                </label>

                <label>
                  Marca
                  <input
                    value={brand}
                    onChange={(e) =>
                      setBrand(
                        e.target.value
                      )
                    }
                    placeholder="Ej. Coach"
                  />
                </label>

                <label>
                  Talla
                  <input
                    value={size}
                    onChange={(e) =>
                      setSize(
                        e.target.value
                      )
                    }
                    placeholder="Ej. M"
                  />
                </label>
              </div>
            </div>

            {/* CÁLCULO */}

            <div
              className="panel"
              style={{
                marginBottom: 25,
              }}
            >
              <h2>
                💵 Precio para cliente
              </h2>

              <div className="form-grid">
                <label>
                  Costo USD
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costUsd}
                    onChange={(e) =>
                      setCostUsd(
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </label>

                <label>
                  Tax %
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Comisión %
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      commissionPercent
                    }
                    onChange={(e) =>
                      setCommissionPercent(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Envío USD
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingUsd}
                    onChange={(e) =>
                      setShippingUsd(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Tipo de cambio
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) =>
                      setExchangeRate(
                        e.target.value
                      )
                    }
                    placeholder="Ej. 18.50"
                  />
                </label>
              </div>
            </div>

            {/* RESULTADO */}

            <div
              style={{
                padding: 24,
                borderRadius: 16,
                background: "#0f2742",
                color: "#ffffff",
                marginBottom: 25,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  opacity: 0.8,
                }}
              >
                Precio final
              </div>

              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  marginTop: 5,
                }}
              >
                {moneyMXN(
                  calculations.totalMxn
                )}
              </div>
<div
  style={{
    marginTop: 20,
  }}
>
  <div
    style={{
      marginBottom: 8,
      fontSize: 14,
      opacity: 0.85,
    }}
  >
    Precio sugerido:{" "}
    <strong>
      {moneyMXN(suggestedPrice)}
    </strong>
  </div>

  <label
    style={{
      display: "block",
      color: "#ffffff",
      fontWeight: 700,
    }}
  >
    Precio de publicación MXN

    <input
      type="number"
      min="0"
      step="1"
      value={publishPrice}
      onChange={(e) =>
        setPublishPrice(
          e.target.value
        )
      }
      placeholder={
        suggestedPrice > 0
          ? String(suggestedPrice)
          : "0"
      }
      style={{
        width: "100%",
        marginTop: 8,
        padding: 12,
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        fontSize: 18,
        fontWeight: 700,
      }}
    />
  </label>
</div>

              <div
                style={{
                  marginTop: 18,
                  lineHeight: 1.8,
                }}
              >
                <div>
                  Compra:{" "}
                  {moneyUSD(
                    calculations.cost
                  )}
                </div>

                <div>
                  Tax:{" "}
                  {moneyUSD(
                    calculations.tax
                  )}
                </div>

                <div>
                  Comisión:{" "}
                  {moneyUSD(
                    calculations.commission
                  )}
                </div>

                <div>
                  Envío:{" "}
                  {moneyUSD(
                    calculations.shipping
                  )}
                </div>

                <div>
                  Total USD:{" "}
                  <strong>
                    {moneyUSD(
                      calculations.totalUsd
                    )}
                  </strong>
                </div>
              </div>
            </div>

           <button
  type="button"
  onClick={createWhatsAppImage}
  disabled={
    !photo ||
    calculations.totalMxn <= 0
  }
  style={{
    width: "100%",
    padding: 15,
    fontSize: 16,
    fontWeight: 800,
  }}
>
  ✨ Crear imagen para WhatsApp
</button>
{generatedImage && (
  <div
    style={{
      marginTop: 25,
    }}
  >
    <h2>
      Vista previa para WhatsApp
    </h2>

    <img
      src={generatedImage}
      alt="Publicación MeriShop"
      style={{
        display: "block",
        width: "100%",
        maxWidth: 500,
        marginTop: 15,
        borderRadius: 14,
        border: "1px solid #dbe3ec",
      }}
    />
  <a
      href={generatedImage}
      download={`merishop-${product || "producto"}.jpg`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: 500,
        marginTop: 15,
        padding: "12px 16px",
        borderRadius: 10,
        background: "#0f2742",
        color: "#ffffff",
        fontWeight: 800,
        textDecoration: "none",
      }}
    >
      📥 Guardar imagen
    </a>
<button
  type="button"
  onClick={shareWhatsAppImage}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 500,
    marginTop: 12,
    padding: "13px 16px",
    borderRadius: 10,
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  }}
>
  💬 Compartir / Guardar en el teléfono
</button>
  </div>
)}
  
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
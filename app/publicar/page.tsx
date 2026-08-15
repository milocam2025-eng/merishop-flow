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
              disabled={
                !photo ||
                calculations.totalMxn <=
                  0
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
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
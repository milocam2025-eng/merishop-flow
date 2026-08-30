"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import HeaderMetrics from "@/components/HeaderMetrics";
import { formatMXN, formatUSD, numberValue } from "@/lib/formatters";
import { validateInventory } from "@/lib/inventory-validation";
import { createClient } from "@/lib/supabase/client";

type InventoryRow = {
  id: string;
  sku: string | null;
  product: string;
  quantity: number;
  status: string;

  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  image_url?: string | null;
  supplier?: string | null;
  store?: string | null;
  purchase_location?: string | null;

  cost_usd?: number | null;
  tax_rate?: number | null;
  tax_usd?: number | null;
  shipping_usd?: number | null;

  commission_percent?: number | null;
  commission_usd?: number | null;

  exchange_rate?: number | null;

  total_cost_usd?: number | null;
  total_cost_mxn?: number | null;

  sale_price_mxn?: number | null;
  profit_mxn?: number | null;
  profit_percent?: number | null;

  minimum_stock?: number | null;
  physical_location?: string | null;
  notes?: string | null;

  created_at?: string;
};

const initialForm = {
  sku: "",
  product: "",
  brand: "",
  category: "",
  barcode: "",
  color: "",
  size: "",
  supplier: "",
  store: "",
  purchase_location: "",

  quantity: "1",
  status: "Disponible",
  minimum_stock: "1",

  cost_usd: "",
  tax_rate: "0",
  shipping_usd: "0",
  commission_percent: "20",
  exchange_rate: "",
  sale_price_mxn: "",

  physical_location: "",
  notes: "",
};


// CATEGORÍAS PREDETERMINADAS
const defaultCategories = [
  "Ropa",
  "Calzado",
  "Bolsas",
  "Belleza",
  "Accesorios",
  "Hogar",
];

const money = formatMXN;
const moneyUSD = formatUSD;

export default function InventarioPage() {
const [rows, setRows] = useState<InventoryRow[]>([]);
const [query, setQuery] = useState("");
const [form, setForm] = useState(initialForm);
const [message, setMessage] = useState("");
const [saving, setSaving] = useState(false);

const [savedCategories, setSavedCategories] =
  useState<string[]>(defaultCategories);

const [selectedImages, setSelectedImages] = useState<File[]>([]);
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

useEffect(() => {
  const savedCategoriesJson =
    localStorage.getItem(
      "merishop_saved_categories"
    );

  if (savedCategoriesJson) {
    try {
      const parsedCategories =
        JSON.parse(savedCategoriesJson);

      if (Array.isArray(parsedCategories)) {
        setSavedCategories(parsedCategories);
      }
    } catch {
      setSavedCategories(defaultCategories);
    }
  }
}, []);

useEffect(() => {
  localStorage.setItem(
    "merishop_saved_categories",
    JSON.stringify(savedCategories)
  );
}, [savedCategories]);

function saveCurrentCategory() {
  const newCategory =
    form.category.trim();

  if (!newCategory) {
    return;
  }

  const alreadyExists =
    savedCategories.some(
      (item) =>
        item.toLowerCase() ===
        newCategory.toLowerCase()
    );

  if (alreadyExists) {
    return;
  }

  setSavedCategories([
    ...savedCategories,
    newCategory,
  ]);
}

  async function load() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setRows((data as InventoryRow[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const calculations = useMemo(() => {
    const costUsd = numberValue(form.cost_usd);
    const taxRate = numberValue(form.tax_rate);
    const shippingUsd = numberValue(form.shipping_usd);
    const commissionPercent = numberValue(form.commission_percent);
    const exchangeRate = numberValue(form.exchange_rate);
    const salePriceMxn = numberValue(form.sale_price_mxn);

    const taxUsd = costUsd * (taxRate / 100);

    const commissionUsd =
      costUsd * (commissionPercent / 100);

    const totalCostUsd =
      costUsd +
      taxUsd +
      shippingUsd +
      commissionUsd;

    const totalCostMxn =
      totalCostUsd * exchangeRate;

    const profitMxn =
      salePriceMxn - totalCostMxn;

    const profitPercent =
      totalCostMxn > 0
        ? (profitMxn / totalCostMxn) * 100
        : 0;

    return {
      costUsd,
      taxUsd,
      shippingUsd,
      commissionUsd,
      totalCostUsd,
      totalCostMxn,
      salePriceMxn,
      profitMxn,
      profitPercent,
    };
  }, [form]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.sku,
        row.product,
        row.brand,
        row.category,
        row.barcode,
        row.color,
        row.size,
        row.status,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [rows, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateInventory({
      sku: form.sku,
      product: form.product,
      category: form.category,
      quantity: form.quantity,
      minimumStock: form.minimum_stock,
      costUsd: form.cost_usd,
      exchangeRate: form.exchange_rate,
      salePriceMxn: form.sale_price_mxn,
    });

    if (!validation.valid) {
      setMessage(validation.errors[0]);
      return;
    }

    setSaving(true);
    setMessage("Guardando artículo...");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setMessage("No se encontró una sesión activa.");
      return;
    }

    const { data: duplicateSku, error: duplicateError } = await supabase
      .from("inventory")
      .select("id")
      .ilike("sku", validation.normalizedSku)
      .limit(1);

    if (duplicateError) {
      setSaving(false);
      setMessage("No se pudo validar el SKU: " + duplicateError.message);
      return;
    }

    if ((duplicateSku ?? []).length > 0) {
      setSaving(false);
      setMessage("Ya existe un producto con ese SKU.");
      return;
    }

    const payload = {
      user_id: user.id,

      sku: validation.normalizedSku,
      product: form.product.trim(),
      brand: form.brand.trim() || null,
      category: form.category.trim() || null,
      barcode: form.barcode.trim() || null,
      color: form.color.trim() || null,
      size: form.size.trim() || null,

      supplier: form.supplier.trim() || null,
      store: form.store.trim() || null,
      purchase_location:
        form.purchase_location.trim() || null,

      quantity: Math.max(
        0,
        Math.floor(numberValue(form.quantity))
      ),

      minimum_stock: Math.max(
        0,
        Math.floor(numberValue(form.minimum_stock))
      ),

      status: form.status,

      cost_usd: calculations.costUsd,
      tax_rate: numberValue(form.tax_rate),
      tax_usd: calculations.taxUsd,

      shipping_usd: calculations.shippingUsd,

      commission_percent: numberValue(
        form.commission_percent
      ),

      commission_usd:
        calculations.commissionUsd,

      exchange_rate: numberValue(
        form.exchange_rate
      ),

      total_cost_usd:
        calculations.totalCostUsd,

      total_cost_mxn:
        calculations.totalCostMxn,

      sale_price_mxn:
        calculations.salePriceMxn,

      profit_mxn:
        calculations.profitMxn,

      profit_percent:
        calculations.profitPercent,

      physical_location:
        form.physical_location.trim() || null,

      notes: form.notes.trim() || null,
    };

    const result = await supabase
  .from("inventory")
  .insert(payload)
  .select("id")
  .single();

const insertedRow = result.data as { id: string } | null;

const insertError = result.error as
  | { message: string }
  | null;

if (insertError) {
  setSaving(false);
  setMessage(insertError.message);
  return;
}

if (!insertedRow) {
  setSaving(false);
  setMessage("No se pudo obtener el ID del producto.");
  return;
}

const inventoryId = insertedRow.id;
if (selectedImages.length > 0) {
  const imageRecords = [];

  for (
    let index = 0;
    index < selectedImages.length;
    index++
  ) {
    const file = selectedImages[index];

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const storagePath =
      `${user.id}/${inventoryId}/${Date.now()}-${index}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("product-images")
        .upload(storagePath, file);

    if (uploadError) {
      setSaving(false);
      setMessage(
        `El producto se guardó, pero falló una imagen: ${uploadError.message}`
      );
      return;
    }

    const { data: publicUrlData } =
      supabase.storage
        .from("product-images")
        .getPublicUrl(storagePath);

    imageRecords.push({
      inventory_id: inventoryId,
      user_id: user.id,
      image_url: publicUrlData.publicUrl,
      storage_path: storagePath,
      sort_order: index,
      is_primary: index === primaryImageIndex,
    });
  }

  // Guardar todas las fotografías en inventory_images
  const { error: imageInsertError } =
    await supabase
      .from("inventory_images")
      .insert(imageRecords);

  if (imageInsertError) {
    setSaving(false);
    setMessage(
      `El producto se guardó, pero no se pudieron registrar las fotos: ${imageInsertError.message}`
    );
    return;
  }

  // Buscar cuál fue seleccionada como fotografía principal
  const primaryImage = imageRecords.find(
    (image) => image.is_primary
  );

  // Guardar también la principal en inventory.image_url
  // para que aparezca en la tabla del inventario
  if (primaryImage) {
    const { error: mainImageError } =
      await supabase
        .from("inventory")
        .update({
          image_url: primaryImage.image_url,
        })
        .eq("id", inventoryId);

    if (mainImageError) {
      setSaving(false);
      setMessage(
        `Las fotos se guardaron, pero no se pudo establecer la foto principal: ${mainImageError.message}`
      );
      return;
    }
  }
}

// Limpiar formulario después de guardar
setForm(initialForm);
setSelectedImages([]);
setImagePreviews([]);
setPrimaryImageIndex(0);

setSaving(false);

setMessage(
  "Artículo agregado correctamente al inventario."
);

await load();
}
  async function remove(id: string) {
    if (!confirm("¿Eliminar este artículo del inventario?")) {
      return;
    }

    const { error } = await createClient()
      .from("inventory")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Artículo eliminado.");
    await load();
  }

  const units = filtered.reduce(
    (sum, row) =>
      sum + Number(row.quantity || 0),
    0
  );

  const inventoryValue = filtered.reduce(
    (sum, row) =>
      sum +
      Number(row.total_cost_mxn || 0) *
        Number(row.quantity || 0),
    0
  );

  const potentialSales = filtered.reduce(
    (sum, row) =>
      sum +
      Number(row.sale_price_mxn || 0) *
        Number(row.quantity || 0),
    0
  );

  const potentialProfit =
    potentialSales - inventoryValue;

  return (
<AuthGuard>
  <AppShell
  title="Inventario"
  subtitle="Control de productos, existencias, costos y rentabilidad."
  headerExtra={
    <HeaderMetrics
      metrics={[
        { label: "Artículos", value: filtered.length },
        { label: "Unidades", value: units },
        {
          label: "Valor inventario",
          value: money(inventoryValue),
          minWidth: 145,
        },
        {
          label: "Ganancia potencial",
          value: money(potentialProfit),
          minWidth: 145,
        },
      ]}
    />
  }
>
        <section className="panel">
          <div className="section-title">
            <div>
              <h1>Inventario Pro</h1>
              <p>
                Control de productos, costos,
                impuestos, comisión y ganancias.
              </p>
            </div>
          </div>

          <form onSubmit={submit}>
            <h2>Información del producto</h2>

            <div className="form-grid">
              <label>
                SKU
                <input
                  required
                  value={form.sku}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sku: e.target.value,
                    })
                  }
                  placeholder="Ej. COA-001"
                />
              </label>

              <label>
                Producto
                <input
                  required
                  value={form.product}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      product: e.target.value,
                    })
                  }
                  placeholder="Ej. Bolsa Coach"
                />
              </label>

              <label>
                Marca
                <input
                  value={form.brand}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      brand: e.target.value,
                    })
                  }
                  placeholder="Ej. Coach"
                />
              </label>

             <div
  style={{
    gridColumn: "1 / -1",
    marginBottom: 10,
  }}
>
  <div
    style={{
      fontWeight: 700,
      marginBottom: 8,
    }}
  >
    Categoría
  </div>

  <div
  style={{
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 10,
    marginBottom: 12,
    alignItems: "stretch",
  }}
>
    <input
      type="text"
      required
      value={form.category}
      onChange={(e) =>
        setForm({
          ...form,
          category: e.target.value,
        })
      }
      placeholder="Ej. Juguetes, Electrónica..."
style={{
  width: "100%",
  minWidth: 0,
}}      
    />

    <button
      type="button"
      onClick={saveCurrentCategory}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "none",
        background: "#0f2742",
        color: "#ffffff",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      ➕ Guardar categoría
    </button>
  </div>

  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
    }}
  >
    {savedCategories.map((item) => (
      <button
        key={item}
        type="button"
        onClick={() =>
          setForm({
            ...form,
            category: item,
          })
        }
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border:
            form.category === item
              ? "2px solid #2563eb"
              : "1px solid #cbd5e1",
          background:
            form.category === item
              ? "#dbeafe"
              : "#ffffff",
          color: "#0f2742",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {form.category === item
          ? "✓ "
          : ""}
        {item}
      </button>
    ))}
  </div>
</div>
              <label>
                Código de barras
                <input
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      barcode: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Color
                <input
                  value={form.color}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      color: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Talla
                <input
                  value={form.size}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      size: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Cantidad
                <input
                  type="number"
                  min="0"
                  required
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantity: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Stock mínimo
                <input
                  type="number"
                  min="0"
                  value={form.minimum_stock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minimum_stock:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Estado
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value,
                    })
                  }
                >
                  <option>Disponible</option>
                  <option>Apartado</option>
                  <option>Vendido</option>
                  <option>Agotado</option>
                </select>
              </label>
            </div>

            <h2 style={{ marginTop: 30 }}>
              Compra y proveedor
            </h2>

            <div className="form-grid">
              <label>
                Proveedor
                <input
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      supplier: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Tienda
                <input
                  value={form.store}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      store: e.target.value,
                    })
                  }
                  placeholder="Ej. Coach Outlet"
                />
              </label>

              <label>
                Ciudad / lugar de compra
                <input
                  value={form.purchase_location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purchase_location:
                        e.target.value,
                    })
                  }
                  placeholder="Ej. Ontario, CA"
                />
              </label>

              <label>
                Ubicación física
                <input
                  value={form.physical_location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      physical_location:
                        e.target.value,
                    })
                  }
                  placeholder="Ej. Estante A-3"
                />
              </label>
            </div>

            <h2 style={{ marginTop: 30 }}>
              Costos y rentabilidad
            </h2>

            <div className="form-grid">
              <label>
                Costo de compra USD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_usd}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cost_usd: e.target.value,
                    })
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
                  value={form.tax_rate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tax_rate: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Tax USD
                <input
                  readOnly
                  value={calculations.taxUsd.toFixed(
                    2
                  )}
                />
              </label>

              <label>
                Envío USD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shipping_usd}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      shipping_usd:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Comisión %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commission_percent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      commission_percent:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Comisión USD
                <input
                  readOnly
                  value={calculations.commissionUsd.toFixed(
                    2
                  )}
                />
              </label>

              <label>
                Tipo de cambio USD → MXN
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.exchange_rate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      exchange_rate:
                        e.target.value,
                    })
                  }
                  placeholder="Ej. 18.50"
                />
              </label>

              <label>
                Precio de venta MXN
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price_mxn}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sale_price_mxn:
                        e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </label>
            </div>

            <div
              className="panel"
              style={{ marginTop: 25 }}
            >
              <h2>Resumen automático</h2>

              <div className="form-grid">
                <div>
                  <strong>Tax</strong>
                  <p>
                    {moneyUSD(
                      calculations.taxUsd
                    )}
                  </p>
                </div>

                <div>
                  <strong>Comisión</strong>
                  <p>
                    {moneyUSD(
                      calculations.commissionUsd
                    )}
                  </p>
                </div>

                <div>
                  <strong>Costo total USD</strong>
                  <p>
                    {moneyUSD(
                      calculations.totalCostUsd
                    )}
                  </p>
                </div>

                <div>
                  <strong>Costo total MXN</strong>
                  <p>
                    {money(
                      calculations.totalCostMxn
                    )}
                  </p>
                </div>

                <div>
                  <strong>Precio venta</strong>
                  <p>
                    {money(
                      calculations.salePriceMxn
                    )}
                  </p>
                </div>

                <div>
                  <strong>Ganancia</strong>
                  <p>
                    {money(
                      calculations.profitMxn
                    )}
                  </p>
                </div>

                <div>
                  <strong>
                    Margen sobre costo
                  </strong>
                  <p>
                    {calculations.profitPercent.toFixed(
                      2
                    )}
                    %
                  </p>
                </div>
              </div>
            </div>
<h2 style={{ marginTop: 30 }}>Fotografías</h2>

<label style={{ display: "block", marginBottom: 20 }}>
  Seleccionar fotografías

  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => {
      const files = Array.from(e.target.files ?? []);

      setSelectedImages(files);

      setImagePreviews(
        files.map((file) =>
          URL.createObjectURL(file)
        )
      );

      setPrimaryImageIndex(0);
    }}
  />
</label>

{imagePreviews.length > 0 && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fill,minmax(140px,1fr))",
      gap: 16,
      marginBottom: 20,
    }}
  >
    {imagePreviews.map((src, index) => (
      <div
        key={index}
        style={{
          border:
            index === primaryImageIndex
              ? "3px solid #2563eb"
              : "1px solid #ddd",
          borderRadius: 10,
          padding: 8,
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: 140,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />

        <button
          type="button"
          style={{
            width: "100%",
            marginTop: 10,
          }}
          onClick={() =>
            setPrimaryImageIndex(index)
          }
        >
          {index === primaryImageIndex
            ? "✓ Foto principal"
            : "Elegir principal"}
        </button>
      </div>
    ))}
  </div>
)}
            <label
              style={{
                display: "block",
                marginTop: 25,
              }}
            >
              Notas
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
                  })
                }
                placeholder="Detalles, características, instrucciones, etc."
                rows={3}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 20,
              }}
            >
              {saving
                ? "Guardando..."
                : "Guardar artículo"}
            </button>

            {message && (
              <p style={{ marginTop: 15 }}>
                {message}
              </p>
            )}
          </form>
        </section>

        <section className="panel">
          <div className="section-title">
            <div>
              <h2>Inventario actual</h2>
              <p>
                {filtered.length} artículos ·{" "}
                {units} unidades
              </p>
            </div>

            <input
              className="search-input"
              placeholder="Buscar SKU, producto, marca..."
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
            />
          </div>

          <div
            className="form-grid"
            style={{ marginBottom: 25 }}
          >
            <div className="panel">
              <strong>
                Valor del inventario
              </strong>
              <h2>{money(inventoryValue)}</h2>
            </div>

            <div className="panel">
              <strong>
                Venta potencial
              </strong>
              <h2>{money(potentialSales)}</h2>
            </div>

            <div className="panel">
              <strong>
                Ganancia potencial
              </strong>
              <h2>{money(potentialProfit)}</h2>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Categoría</th>
                  <th>Talla</th>
                  <th>Color</th>
                  <th>Cantidad</th>
                  <th>Costo USD</th>
                  <th>Costo MXN</th>
                  <th>Venta MXN</th>
                  <th>Ganancia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => {
                  const lowStock =
                    Number(row.quantity || 0) <=
                    Number(
                      row.minimum_stock ?? 1
                    );
return (
<tr key={row.id}>
  <td>
    <Link href={`/inventario/${row.id}`}>
      {row.image_url ? (
        <img
          src={row.image_url}
          alt={row.product}
          style={{
            width: 70,
            height: 70,
            objectFit: "cover",
            borderRadius: 10,
            border: "1px solid #dde5ef",
            background: "#ffffff",
            display: "block",
            cursor: "pointer",
          }}
        />
      ) : (
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 10,
            border: "1px solid #dde5ef",
            background: "#f5f7fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            cursor: "pointer",
          }}
        >
          📦
        </div>
      )}
    </Link>
  </td>

  <td>{row.sku || "-"}</td>

  <td>
    <Link
      href={`/inventario/${row.id}`}
      style={{
        color: "inherit",
        textDecoration: "none",
        fontWeight: 600,
      }}
    >
      {row.product}
    </Link>
  </td>
<td>{row.brand || "-"}</td><td>{row.category || "-"}</td><td>{row.size || "-"}</td><td>{row.color || "-"}</td><td>{row.quantity}</td><td>{moneyUSD(row.cost_usd)}</td><td>{money(row.total_cost_mxn)}</td><td>{money(row.sale_price_mxn)}</td><td>
    {money(row.profit_mxn)}
    <div style={{ fontSize: 12 }}>
      {Number(row.profit_percent || 0).toFixed(1)}%
    </div>
  </td><td>
    <StatusBadge value={row.status} />
  </td>

 <td>
  <div
    style={{
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap",
      minWidth: 320,
    }}
  >
    {/* EDITAR PRODUCTO */}
    <Link
      href={`/inventario/${row.id}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "8px 10px",
        borderRadius: 8,
        background: "#eff6ff",
        color: "#1d4ed8",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid #bfdbfe",
        whiteSpace: "nowrap",
      }}
    >
      ✏️ Editar
    </Link>

    {/* PUBLICAR PRODUCTO */}
    <Link
      href={`/publicar?producto=${row.id}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "8px 10px",
        borderRadius: 8,
        background: "#f0fdf4",
        color: "#15803d",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid #bbf7d0",
        whiteSpace: "nowrap",
      }}
    >
      📲 Publicar
    </Link>

    {/* VER PRODUCTO EN LA TIENDA */}
    <Link
     href={`/tienda/${row.id}`}
      target="_blank"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "8px 10px",
        borderRadius: 8,
        background: "#fff7ed",
        color: "#c2410c",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid #fed7aa",
        whiteSpace: "nowrap",
      }}
    >
      🏪 Ver en tienda
    </Link>

    {/* ELIMINAR PRODUCTO */}
    <button
      className="danger"
      type="button"
      onClick={() => remove(row.id)}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 13,
        whiteSpace: "nowrap",
      }}
    >
      🗑️ Eliminar
    </button>
  </div>
</td>

</tr>
);
          })}
        </tbody>
      </table>
    </div>
  </section>
</AppShell>
</AuthGuard>
);
}

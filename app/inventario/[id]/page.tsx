"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  sku: string | null;
  product: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  color: string | null;
  size: string | null;

  supplier: string | null;
  store: string | null;
  purchase_location: string | null;
  physical_location: string | null;

  quantity: number;
  minimum_stock: number;
  status: string;

  cost_usd: number;
  tax_rate: number;
  tax_usd: number;
  shipping_usd: number;

  commission_percent: number;
  commission_usd: number;

  exchange_rate: number;

  total_cost_usd: number;
  total_cost_mxn: number;

  sale_price_mxn: number;

  profit_mxn: number;
  profit_percent: number;

  image_url: string | null;

  notes: string | null;
};

type ProductImage = {
  id: string;
  inventory_id: string;
  user_id: string;

  image_url: string;
  storage_path: string | null;

  is_primary: boolean;
  sort_order: number;

  created_at: string;
};
export default function ProductoPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [form, setForm] =
    useState<Product | null>(null);

  const [images, setImages] =
    useState<ProductImage[]>([]);

  const [message, setMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // FOTO PRINCIPAL
  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  // GALERÍA
  const [galleryFile, setGalleryFile] =
    useState<File | null>(null);

  const [uploadingGallery, setUploadingGallery] =
    useState(false);

const [activeImage, setActiveImage] =
  useState<string | null>(null);

  async function loadProduct() {
    const { data, error } =
      await createClient()
        .from("inventory")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm(data as Product);
  }

  async function loadImages() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory_images")
    .select("*")
    .eq("inventory_id", id)
    .order("is_primary", {
      ascending: false,
    })
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    setMessage(error.message);
    return;
  }

  setImages((data as ProductImage[]) ?? []);
}

  async function loadAll() {
    await Promise.all([
      loadProduct(),
      loadImages(),
    ]);
  }

  useEffect(() => {
    loadAll();
  }, [id]);

useEffect(() => {
  if (images.length > 0) {
    const primaryImage =
      images.find((image) => image.is_primary) ||
      images[0];

    setActiveImage((current) => {
      const exists = images.some(
        (image) =>
          image.image_url === current
      );

      return exists
        ? current
        : primaryImage.image_url;
    });

    return;
  }

  if (form?.image_url) {
    setActiveImage(form.image_url);
  }
}, [images, form?.image_url]);
  /*
  ==========================================
  FOTO PRINCIPAL
  ==========================================
  */

  async function uploadMainImage() {
  if (!imageFile) {
    setMessage("Selecciona una fotografía primero.");
    return;
  }

  if (!imageFile.type.startsWith("image/")) {
    setMessage("El archivo seleccionado no es una imagen.");
    return;
  }

  if (imageFile.size > 5 * 1024 * 1024) {
    setMessage("La fotografía no puede superar 5 MB.");
    return;
  }

  setUploading(true);
  setMessage("Subiendo fotografía principal...");

  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setUploading(false);
    setMessage("No se encontró una sesión activa.");
    return;
  }

  const extension =
    imageFile.name.split(".").pop()?.toLowerCase() || "jpg";

  const filePath =
    `${user.id}/${id}/principal-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    setUploading(false);
    setMessage(uploadError.message);
    return;
  }

  const { data: publicData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  const imageUrl = publicData.publicUrl;

  // Quitar marca de principal a las fotos anteriores
  const { error: resetPrimaryError } = await supabase
    .from("inventory_images")
    .update({
      is_primary: false,
    })
    .eq("inventory_id", id);

  if (resetPrimaryError) {
    setUploading(false);
    setMessage(resetPrimaryError.message);
    return;
  }

  // Registrar la nueva foto como principal
  const { error: imageInsertError } = await supabase
    .from("inventory_images")
    .insert({
      inventory_id: id,
      user_id: user.id,
      image_url: imageUrl,
      storage_path: filePath,
      is_primary: true,
      sort_order: 0,
    });

  if (imageInsertError) {
    setUploading(false);
    setMessage(imageInsertError.message);
    return;
  }

  // Mantener image_url para que la tabla del inventario
  // siga mostrando la miniatura principal
  const { error: updateError } = await supabase
    .from("inventory")
    .update({
      image_url: imageUrl,
    })
    .eq("id", id);

  if (updateError) {
    setUploading(false);
    setMessage(updateError.message);
    return;
  }

  setImageFile(null);
  setUploading(false);

  setMessage(
    "Fotografía principal guardada correctamente."
  );

  await loadAll();
}

  /*
  ==========================================
  AGREGAR FOTO A GALERÍA
  ==========================================
  */

  async function uploadGalleryImage() {
    if (!galleryFile) {
      setMessage(
        "Selecciona una fotografía para la galería."
      );
      return;
    }

    if (!galleryFile.type.startsWith("image/")) {
      setMessage(
        "El archivo seleccionado no es una imagen."
      );
      return;
    }

    if (
      galleryFile.size >
      5 * 1024 * 1024
    ) {
      setMessage(
        "La fotografía no puede superar 5 MB."
      );
      return;
    }

    /*
      Máximo recomendado:
      foto principal + 9 adicionales = 10
    */

    const totalPhotos =
      images.length +
      (form?.image_url ? 1 : 0);

    if (totalPhotos >= 10) {
      setMessage(
        "Este producto ya tiene el máximo de 10 fotografías."
      );
      return;
    }

    setUploadingGallery(true);

    setMessage(
      "Agregando fotografía a la galería..."
    );

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUploadingGallery(false);

      setMessage(
        "No se encontró una sesión activa."
      );

      return;
    }

    const extension =
      galleryFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const filePath =
      `${user.id}/${id}/galeria-` +
      `${Date.now()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("product-images")
        .upload(
          filePath,
          galleryFile,
          {
            cacheControl: "3600",
            upsert: false,
          }
        );

    if (uploadError) {
      setUploadingGallery(false);
      setMessage(uploadError.message);
      return;
    }

    const { data: publicData } =
      supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

    const imageUrl =
      publicData.publicUrl;

    const { error: insertError } =
  await supabase
    .from("inventory_images")
    .insert({
      inventory_id: id,
      user_id: user.id,

      image_url: imageUrl,
      storage_path: filePath,

      is_primary: false,
      sort_order: images.length + 1,
    });

    if (insertError) {
      /*
        Si falla la base de datos,
        borramos la imagen recién subida
        para no dejar archivos huérfanos.
      */

      await supabase.storage
        .from("product-images")
        .remove([filePath]);

      setUploadingGallery(false);

      setMessage(
        insertError.message
      );

      return;
    }

    setGalleryFile(null);

    setUploadingGallery(false);

    setMessage(
      "Fotografía agregada a la galería."
    );

    await loadImages();
  }

  /*
  ==========================================
  HACER FOTO PRINCIPAL
  ==========================================
  */

  async function makePrimary(
    image: ProductImage
  ) {
    const supabase = createClient();

    setMessage(
      "Cambiando fotografía principal..."
    );

    const { error } =
      await supabase
        .from("inventory")
        .update({
          image_url: image.image_url,
        })
        .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    /*
      No es obligatorio para que funcione,
      pero dejamos registrada cuál fue marcada.
    */

    await supabase
      .from("inventory_images")
.update({
  is_primary: false,
})
.eq("inventory_id", id);

    await supabase
  .from("inventory_images")
  .update({
    is_primary: true,
  })
  .eq("id", image.id);


    setMessage(
      "Fotografía principal actualizada."
    );

    await loadAll();
  }

  /*
  ==========================================
  ELIMINAR FOTO DE GALERÍA
  ==========================================
  */

  async function deleteGalleryImage(
    image: ProductImage
  ) {
    const accepted = confirm(
      "¿Eliminar esta fotografía de la galería?"
    );

    if (!accepted) return;

    const supabase = createClient();

    setMessage(
      "Eliminando fotografía..."
    );

if (image.storage_path) {
  const { error: storageError } =
    await supabase.storage
      .from("product-images")
      .remove([image.storage_path]);

  if (storageError) {
    setMessage(storageError.message);
    return;
  }
}

    const { error: deleteError } =
      await supabase
        .from("inventory_images")
.delete()
.eq("id", image.id);

    if (deleteError) {
      setMessage(
        deleteError.message
      );

      return;
    }

    /*
      Si eliminamos una foto que actualmente
      también era la principal:
    */

    if (
      form?.image_url ===
      image.image_url
    ) {
      const remaining =
        images.filter(
          (item) =>
            item.id !== image.id
        );

      const nextImage =
        remaining[0]?.image_url ||
        null;

      await supabase
        .from("inventory")
        .update({
          image_url: nextImage,
        })
        .eq("id", id);
    }

    setMessage(
      "Fotografía eliminada."
    );

    await loadAll();
  }

  /*
  ==========================================
  FORMULARIO PRODUCTO
  ==========================================
  */

  if (!form) {
    return (
<AuthGuard>
  <AppShell title="Editar producto">
          <section className="panel">
            <p>
              {message ||
                "Cargando producto..."}
            </p>
          </section>
        </AppShell>
      </AuthGuard>
    );
  }

  const costUsd =
    Number(form.cost_usd || 0);

  const taxRate =
    Number(form.tax_rate || 0);

  const shippingUsd =
    Number(
      form.shipping_usd || 0
    );

  const commissionPercent =
    Number(
      form.commission_percent || 0
    );

  const exchangeRate =
    Number(
      form.exchange_rate || 0
    );

  const salePriceMxn =
    Number(
      form.sale_price_mxn || 0
    );

  const taxUsd =
    costUsd *
    (taxRate / 100);

  const commissionUsd =
    costUsd *
    (commissionPercent / 100);

  const totalCostUsd =
    costUsd +
    taxUsd +
    shippingUsd +
    commissionUsd;

  const totalCostMxn =
    totalCostUsd *
    exchangeRate;

  const profitMxn =
    salePriceMxn -
    totalCostMxn;

  const profitPercent =
    totalCostMxn > 0
      ? (profitMxn /
          totalCostMxn) *
        100
      : 0;


function updateField<K extends keyof Product>(
  field: K,
  value: Product[K]
) {
  setForm((current) => {
    if (!current) return current;

    return {
      ...current,
      [field]: value,
    };
  });
}

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);

    setMessage(
      "Guardando cambios..."
    );
if (!form) {
  setMessage("No se pudo cargar el producto.");
  return;
}
    const payload = {
      sku:
        form.sku || null,

      product:
        form.product,

      brand:
        form.brand || null,

      category:
        form.category || null,

      barcode:
        form.barcode || null,

      color:
        form.color || null,

      size:
        form.size || null,

      supplier:
        form.supplier || null,

      store:
        form.store || null,

      purchase_location:
        form.purchase_location ||
        null,

      physical_location:
        form.physical_location ||
        null,

      quantity:
        Number(
          form.quantity || 0
        ),

      minimum_stock:
        Number(
          form.minimum_stock || 0
        ),

      status:
        form.status,

      cost_usd:
        costUsd,

      tax_rate:
        taxRate,

      tax_usd:
        taxUsd,

      shipping_usd:
        shippingUsd,

      commission_percent:
        commissionPercent,

      commission_usd:
        commissionUsd,

      exchange_rate:
        exchangeRate,

      total_cost_usd:
        totalCostUsd,

      total_cost_mxn:
        totalCostMxn,

      sale_price_mxn:
        salePriceMxn,

      profit_mxn:
        profitMxn,

      profit_percent:
        profitPercent,

      notes:
        form.notes || null,
    };

    const { error } =
      await createClient()
        .from("inventory")
        .update(payload)
        .eq("id", id);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Cambios guardados correctamente."
    );

    await loadProduct();
  }

  const totalPhotos =
    images.length +
    (form.image_url ? 1 : 0);
return (


  <AuthGuard>
    <AppShell title="Editar producto">
        <section className="panel">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/inventario"
              )
            }
            style={{
              marginBottom: 20,
            }}
          >
            ← Volver al inventario
          </button>

          <h1>
            {form.product}
          </h1>

          <p>
            SKU:{" "}
            <strong>
              {form.sku || "-"}
            </strong>
          </p>

{activeImage && (
  <div
    style={{
      display: "flex",
      gap: 20,
      marginTop: 25,
      marginBottom: 30,
      alignItems: "flex-start",
    }}
  >
    {/* Miniaturas */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {images.map((image) => (
        <img
          key={image.id}
          src={image.image_url}
          alt=""
          onClick={() =>
            setActiveImage(image.image_url)
          }
          style={{
            width: 80,
            height: 80,
            objectFit: "cover",
            cursor: "pointer",
            border:
              activeImage === image.image_url
                ? "3px solid #2563eb"
                : "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />
      ))}
    </div>

    {/* Imagen grande */}
    <div>
      <img
        src={activeImage}
        alt={form.product}
        style={{
          width: 500,
          maxWidth: "100%",
          borderRadius: 12,
          border: "1px solid #ddd",
        }}
      />
    </div>
  </div>
)}

          {/* =========================
              FOTOGRAFÍA PRINCIPAL
          ========================= */}

          <div
            className="panel"
            style={{
              marginTop: 25,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 15,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2>
                  Fotografías del producto
                </h2>

                <p>
                  {totalPhotos} de 10 fotografías
                </p>
              </div>
            </div>

            <h3
              style={{
                marginTop: 20,
              }}
            >
              Foto principal
            </h3>

            {form.image_url ? (
              <div
                style={{
                  marginTop: 15,
                  marginBottom: 20,
                }}
              >
                <img
                  src={
                    form.image_url
                  }
                  alt={
                    form.product
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: 500,
                    height: 420,
                    objectFit:
                      "contain",
                    borderRadius: 12,
                    border:
                      "1px solid #dde5ef",
                    background:
                      "#ffffff",
                  }}
                />
              </div>
            ) : (
              <p>
                Este producto todavía no tiene fotografía principal.
              </p>
            )}

            <div
              style={{
                marginTop: 15,
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(
                  event
                ) =>
                  setImageFile(
                    event.target
                      .files?.[0] ??
                      null
                  )
                }
              />

              <br />

              <button
                type="button"
                onClick={
                  uploadMainImage
                }
                disabled={
                  !imageFile ||
                  uploading
                }
                style={{
                  marginTop: 15,
                }}
              >
                {uploading
                  ? "Subiendo..."
                  : form.image_url
                  ? "Reemplazar fotografía principal"
                  : "Subir fotografía principal"}
              </button>
            </div>

            {/* =========================
                GALERÍA
            ========================= */}

            <div
              style={{
                marginTop: 35,
                paddingTop: 25,
                borderTop:
                  "1px solid #e3e9f0",
              }}
            >
              <h3>
                Galería
              </h3>

              {images.length ===
              0 ? (
                <p>
                  Todavía no hay fotografías adicionales.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 18,
                    marginTop: 20,
                  }}
                >
                  {images.map(
                    (image) => (
                      <div
                        key={
                          image.id
                        }
                        style={{
                          border:
                            "1px solid #dde5ef",
                          borderRadius:
                            12,
                          padding: 12,
                          background:
                            "#ffffff",
                        }}
                      >
                        <img
                          src={
                            image.image_url
                          }
                          alt={
                            form.product
                          }
                          style={{
                            display:
                              "block",
                            width:
                              "100%",
                            height:
                              190,
                            objectFit:
                              "contain",
                            borderRadius:
                              8,
                          }}
                        />

                        {form.image_url ===
                          image.image_url && (
                          <div
                            style={{
                              marginTop:
                                8,
                              fontWeight:
                                700,
                              fontSize:
                                13,
                            }}
                          >
                            ⭐ Principal
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            makePrimary(
                              image
                            )
                          }
                          disabled={
                            form.image_url ===
                            image.image_url
                          }
                          style={{
                            width:
                              "100%",
                            marginTop:
                              10,
                          }}
                        >
                          Hacer principal
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            deleteGalleryImage(
                              image
                            )
                          }
                          style={{
                            width:
                              "100%",
                            marginTop:
                              8,
                          }}
                        >
                          Eliminar foto
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              {totalPhotos <
                10 && (
                <div
                  style={{
                    marginTop: 25,
                  }}
                >
                  <h3>
                    Agregar otra fotografía
                  </h3>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(
                      event
                    ) =>
                      setGalleryFile(
                        event.target
                          .files?.[0] ??
                          null
                      )
                    }
                  />

                  <br />

                  <button
                    type="button"
                    onClick={
                      uploadGalleryImage
                    }
                    disabled={
                      !galleryFile ||
                      uploadingGallery
                    }
                    style={{
                      marginTop: 15,
                    }}
                  >
                    {uploadingGallery
                      ? "Subiendo..."
                      : "Agregar a galería"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* =========================
              FORMULARIO
          ========================= */}

          <form
            onSubmit={save}
            style={{
              marginTop: 30,
            }}
          >
            <h2>
              Información del producto
            </h2>

            <div className="form-grid">
              <label>
                SKU
                <input
                  value={
                    form.sku || ""
                  }
                  onChange={(e) =>
                    updateField(
                      "sku",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Producto
                <input
                  required
                  value={
                    form.product
                  }
                  onChange={(e) =>
                    updateField(
                      "product",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Marca
                <input
                  value={
                    form.brand || ""
                  }
                  onChange={(e) =>
                    updateField(
                      "brand",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Categoría
                <input
                  value={
                    form.category ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "category",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Código de barras
                <input
                  value={
                    form.barcode ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "barcode",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Color
                <input
                  value={
                    form.color || ""
                  }
                  onChange={(e) =>
                    updateField(
                      "color",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Talla
                <input
                  value={
                    form.size || ""
                  }
                  onChange={(e) =>
                    updateField(
                      "size",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Cantidad
                <input
                  type="number"
                  min="0"
                  value={
                    form.quantity
                  }
                  onChange={(e) =>
                    updateField(
                      "quantity",
                      Number(
                        e.target.value
                      )
                    )
                  }
                />
              </label>

              <label>
                Stock mínimo
                <input
                  type="number"
                  min="0"
                  value={
                    form.minimum_stock
                  }
                  onChange={(e) =>
                    updateField(
                      "minimum_stock",
                      Number(
                        e.target.value
                      )
                    )
                  }
                />
              </label>

              <label>
                Estado
                <select
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    updateField(
                      "status",
                      e.target.value
                    )
                  }
                >
                  <option>
                    Disponible
                  </option>
                  <option>
                    Apartado
                  </option>
                  <option>
                    Vendido
                  </option>
                  <option>
                    Agotado
                  </option>
                </select>
              </label>
            </div>

            <h2
              style={{
                marginTop: 30,
              }}
            >
              Compra y proveedor
            </h2>

            <div className="form-grid">
              <label>
                Proveedor
                <input
                  value={
                    form.supplier ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "supplier",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Tienda
                <input
                  value={
                    form.store || ""
                  }
                  onChange={(e) =>
                    updateField(
                      "store",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Lugar de compra
                <input
                  value={
                    form.purchase_location ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "purchase_location",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Ubicación física
                <input
                  value={
                    form.physical_location ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "physical_location",
                      e.target.value
                    )
                  }
                />
              </label>
            </div>

            <h2
              style={{
                marginTop: 30,
              }}
            >
              Costos y rentabilidad
            </h2>

            <div className="form-grid">
              <label>
                Costo USD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.cost_usd
                  }
                  onChange={(e) =>
                    updateField(
                      "cost_usd",
                      Number(
                        e.target.value
                      )
                    )
                  }
                />
              </label>

              <label>
                Tax %
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={
                    form.tax_rate
                  }
                  onChange={(e) =>
                    updateField(
                      "tax_rate",
                      Number(
                        e.target.value
                      )
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
                  value={
                    form.shipping_usd
                  }
                  onChange={(e) =>
                    updateField(
                      "shipping_usd",
                      Number(
                        e.target.value
                      )
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
                    form.commission_percent
                  }
                  onChange={(e) =>
                    updateField(
                      "commission_percent",
                      Number(
                        e.target.value
                      )
                    )
                  }
                />
              </label>

              <label>
                Tipo de cambio
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={
                    form.exchange_rate
                  }
                  onChange={(e) =>
                    updateField(
                      "exchange_rate",
                      Number(
                        e.target.value
                      )
                    )
                  }
                />
              </label>

              <label>
                Precio venta MXN
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.sale_price_mxn
                  }
                  onChange={(e) =>
                    updateField(
                      "sale_price_mxn",
                      Number(
                        e.target.value
                      )
                    )
                  }
                />
              </label>
            </div>

            <div
              className="panel"
              style={{
                marginTop: 25,
              }}
            >
              <h2>
                Rentabilidad
              </h2>

              <p>
                Tax USD:{" "}
                <strong>
                  $
                  {taxUsd.toFixed(
                    2
                  )}
                </strong>
              </p>

              <p>
                Comisión USD:{" "}
                <strong>
                  $
                  {commissionUsd.toFixed(
                    2
                  )}
                </strong>
              </p>

              <p>
                Costo total USD:{" "}
                <strong>
                  $
                  {totalCostUsd.toFixed(
                    2
                  )}
                </strong>
              </p>

              <p>
                Costo total MXN:{" "}
                <strong>
                  $
                  {totalCostMxn.toFixed(
                    2
                  )}
                </strong>
              </p>

              <p>
                Ganancia:{" "}
                <strong>
                  $
                  {profitMxn.toFixed(
                    2
                  )}{" "}
                  MXN
                </strong>
              </p>

              <p>
                Margen sobre costo:{" "}
                <strong>
                  {profitPercent.toFixed(
                    2
                  )}
                  %
                </strong>
              </p>
            </div>

            <label
              style={{
                display: "block",
                marginTop: 25,
              }}
            >
              Notas

              <textarea
                rows={5}
                value={
                  form.notes || ""
                }
                onChange={(e) =>
                  updateField(
                    "notes",
                    e.target.value
                  )
                }
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
                : "Guardar cambios"}
            </button>
          </form>

          {message && (
            <p
              style={{
                marginTop: 20,
                fontWeight: 600,
              }}
            >
              {message}
            </p>
          )}
        </section>
      </AppShell>
    </AuthGuard>
  );
}
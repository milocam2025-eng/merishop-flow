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
import CameraPicker from "@/components/CameraPicker";
import { validateInventory } from "@/lib/inventory-validation";
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

type InventoryMovement = {
  id: string;
  movement_type: string;
  reason: string;
  previous_quantity: number;
  new_quantity: number;
  quantity_delta: number;
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
  const [movements, setMovements] =
    useState<InventoryMovement[]>([]);

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

  const [imageModalOpen, setImageModalOpen] =
    useState(false);
const [zoomActive, setZoomActive] =
  useState(false);

const [zoomPosition, setZoomPosition] =
  useState({
    x: 50,
    y: 50,
  });

const [draggedImageId, setDraggedImageId] =
  useState<string | null>(null);
const [dragOverImageId, setDragOverImageId] =
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

  async function loadMovements() {
    const { data, error } = await createClient()
      .from("inventory_movements")
      .select("id,movement_type,reason,previous_quantity,new_quantity,quantity_delta,created_at")
      .eq("inventory_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // La pantalla sigue funcionando antes de aplicar la migración de fase 6.
      setMovements([]);
      return;
    }
    setMovements((data as InventoryMovement[]) ?? []);
  }

  async function loadAll() {
    await Promise.all([
      loadProduct(),
      loadImages(),
      loadMovements(),
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

  async function uploadMainImage(
  selectedFile?: File
) {
  const file =
    selectedFile ?? imageFile;

  if (!file) {
    setMessage(
      "Selecciona una fotografía primero."
    );
    return;
  }

  if (!file.type.startsWith("image/")) {
    setMessage(
      "El archivo seleccionado no es una imagen."
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setMessage(
      "La fotografía no puede superar 5 MB."
    );
    return;
  }

  if (uploading) return;

  setUploading(true);

  setMessage(
    "Subiendo fotografía principal..."
  );

  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setUploading(false);

    setMessage(
      "No se encontró una sesión activa."
    );

    return;
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "jpg";

  const filePath =
    `${user.id}/${id}/principal-` +
    `${Date.now()}.${extension}`;

  const { error: uploadError } =
    await supabase.storage
      .from("product-images")
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
        }
      );

  if (uploadError) {
    setUploading(false);
    setMessage(uploadError.message);
    return;
  }

  const { data: publicData } =
    supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

  const imageUrl =
    publicData.publicUrl;

  // Quitar la marca de principal
  // a las fotografías anteriores
  const { error: resetPrimaryError } =
    await supabase
      .from("inventory_images")
      .update({
        is_primary: false,
      })
      .eq("inventory_id", id);

  if (resetPrimaryError) {
    setUploading(false);
    setMessage(
      resetPrimaryError.message
    );
    return;
  }

  // Registrar nueva fotografía
  // como principal
  const { error: imageInsertError } =
    await supabase
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
    setMessage(
      imageInsertError.message
    );
    return;
  }

  // Actualizar miniatura principal
  // del inventario
  const { error: updateError } =
    await supabase
      .from("inventory")
      .update({
        image_url: imageUrl,
      })
      .eq("id", id);

  if (updateError) {
    setUploading(false);
    setMessage(
      updateError.message
    );
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

  async function uploadGalleryImage(
  selectedFile?: File
) {
  const file =
    selectedFile ?? galleryFile;

  if (!file) {
    setMessage(
      "Selecciona una fotografía para la galería."
    );
    return;
  }

  if (!file.type.startsWith("image/")) {
    setMessage(
      "El archivo seleccionado no es una imagen."
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setMessage(
      "La fotografía no puede superar 5 MB."
    );
    return;
  }

  if (uploadingGallery) return;

  const totalPhotos =
    images.length;

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
    file.name
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
        file,
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
    await supabase.storage
      .from("product-images")
      .remove([filePath]);

    setUploadingGallery(false);
    setMessage(insertError.message);
    return;
  }

  setGalleryFile(null);
  setUploadingGallery(false);

  setMessage(
    "Fotografía agregada automáticamente a la galería."
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

// AQUÍ PEGA EL PASO 1

async function moveImage(
  image: ProductImage,
  direction: "up" | "down"
) {
  const currentIndex = images.findIndex(
    (item) => item.id === image.id
  );

  if (currentIndex === -1) return;

  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= images.length
  ) {
    return;
  }

  const targetImage = images[targetIndex];

  const supabase = createClient();

  setMessage("Actualizando orden...");

  const currentOrder =
    image.sort_order ?? currentIndex;

  const targetOrder =
    targetImage.sort_order ?? targetIndex;

  const { error: firstError } =
    await supabase
      .from("inventory_images")
      .update({
        sort_order: targetOrder,
      })
      .eq("id", image.id);

  if (firstError) {
    setMessage(firstError.message);
    return;
  }

  const { error: secondError } =
    await supabase
      .from("inventory_images")
      .update({
        sort_order: currentOrder,
      })
      .eq("id", targetImage.id);

  if (secondError) {
    setMessage(secondError.message);
    return;
  }

  setMessage("Orden actualizado.");

  await loadImages();
}

async function moveImageByDrag(
  draggedId: string,
  targetId: string
) {
  if (draggedId === targetId) return;

  const draggedIndex = images.findIndex(
    (image) => image.id === draggedId
  );

  const targetIndex = images.findIndex(
    (image) => image.id === targetId
  );

  if (
    draggedIndex === -1 ||
    targetIndex === -1
  ) {
    return;
  }

  const reordered = [...images];

  const [draggedImage] =
    reordered.splice(draggedIndex, 1);

  reordered.splice(
    targetIndex,
    0,
    draggedImage
  );

  setImages(reordered);

  setMessage("Guardando nuevo orden...");

  const supabase = createClient();

  for (
    let index = 0;
    index < reordered.length;
    index++
  ) {
    const image = reordered[index];

    const { error } =
      await supabase
        .from("inventory_images")
        .update({
          sort_order: index,
        })
        .eq("id", image.id);

    if (error) {
      setMessage(error.message);
      await loadImages();
      return;
    }
  }

  setMessage(
    "Orden de fotografías actualizado."
  );

  await loadImages();
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

  const finalSalePriceMxn =
  Number(
    form.sale_price_mxn || 0
    );

  const taxUsd =
    costUsd *
    (taxRate / 100);

  const commissionUsd =
    costUsd *
    (commissionPercent / 100);

// COSTO REAL DEL PRODUCTO
// Compra + Tax + Envío
const baseCostUsd =
  costUsd +
  taxUsd +
  shippingUsd;

// Costo real convertido a MXN
const baseCostMxn =
  baseCostUsd *
  exchangeRate;

// Comisión MeriShop convertida a MXN
const commissionMxn =
  commissionUsd *
  exchangeRate;

// PRECIO FINAL ESTIMADO
// Costo real + comisión MeriShop
const estimatedSalePriceMxn =
  baseCostMxn +
  commissionMxn;

// La ganancia de MeriShop es la comisión
const profitMxn =
  finalSalePriceMxn > 0
    ? finalSalePriceMxn - baseCostMxn
    : commissionMxn;

// Porcentaje real de ganancia sobre el costo
const profitPercent =
  baseCostMxn > 0
    ? (profitMxn / baseCostMxn) * 100
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
function updateNumberField(
  field:
    | "quantity"
    | "minimum_stock"
    | "cost_usd"
    | "tax_rate"
    | "shipping_usd"
    | "commission_percent"
    | "exchange_rate"
    | "sale_price_mxn",
  value: string
) {
  setForm((current) => {
    if (!current) return current;

    return {
      ...current,
      [field]:
        value === ""
          ? ("" as unknown as number)
          : Number(value),
    };
  });
}
  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!form) {
      setMessage("No se pudo cargar el producto.");
      return;
    }

    const validation = validateInventory({
      sku: form.sku,
      product: form.product,
      category: form.category,
      quantity: form.quantity,
      minimumStock: form.minimum_stock,
      costUsd,
      exchangeRate,
      salePriceMxn: finalSalePriceMxn > 0
        ? finalSalePriceMxn
        : estimatedSalePriceMxn,
    });

    if (!validation.valid) {
      setMessage(validation.errors[0]);
      return;
    }

    setSaving(true);
    setMessage("Guardando cambios...");

    const supabase = createClient();
    const { data: duplicateSku, error: duplicateError } = await supabase
      .from("inventory")
      .select("id")
      .ilike("sku", validation.normalizedSku)
      .neq("id", id)
      .limit(1);

    if (duplicateError || (duplicateSku ?? []).length > 0) {
      setSaving(false);
      setMessage(duplicateError
        ? "No se pudo validar el SKU: " + duplicateError.message
        : "Ya existe otro producto con ese SKU.");
      return;
    }
    const payload = {
      sku: validation.normalizedSku,

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
  baseCostUsd,

total_cost_mxn:
  baseCostMxn,

   sale_price_mxn:
  finalSalePriceMxn > 0
    ? finalSalePriceMxn
    : estimatedSalePriceMxn,

      profit_mxn:
        profitMxn,

      profit_percent:
        profitPercent,

      notes:
        form.notes || null,
    };

    const { error } =
      await supabase
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

    await Promise.all([loadProduct(), loadMovements()]);
  }

  const displayImages: ProductImage[] = [...images];

  if (
    form.image_url &&
    !displayImages.some(
      (image) => image.image_url === form.image_url
    )
  ) {
    displayImages.unshift({
      id: "legacy-main-image",
      inventory_id: id,
      user_id: "",
      image_url: form.image_url,
      storage_path: null,
      is_primary: true,
      sort_order: -1,
      created_at: "",
    });
  }

  const totalPhotos = displayImages.length;

  const activeImageIndex = activeImage
    ? displayImages.findIndex(
        (image) => image.image_url === activeImage
      )
    : -1;

  function showPreviousImage() {
    if (displayImages.length === 0) return;

    const currentIndex =
      activeImageIndex >= 0 ? activeImageIndex : 0;

    const previousIndex =
      currentIndex === 0
        ? displayImages.length - 1
        : currentIndex - 1;

    setActiveImage(
      displayImages[previousIndex].image_url
    );
  }

  function showNextImage() {
    if (displayImages.length === 0) return;

    const currentIndex =
      activeImageIndex >= 0 ? activeImageIndex : 0;

    const nextIndex =
      currentIndex === displayImages.length - 1
        ? 0
        : currentIndex + 1;

    setActiveImage(
      displayImages[nextIndex].image_url
    );
  }

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
      {displayImages.map((image) => (
        <img
          key={image.id}
          src={image.image_url}
          alt={form.product}
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

    {/* Imagen grande con zoom */}
    <div>
      <div
        style={{
          position: "relative",
          width: 500,
          maxWidth: "100%",
        }}
        onMouseEnter={() =>
          setZoomActive(true)
        }
        onMouseLeave={() =>
          setZoomActive(false)
        }
        onMouseMove={(event) => {
          const rect =
            event.currentTarget.getBoundingClientRect();

          const x =
            ((event.clientX - rect.left) /
              rect.width) *
            100;

          const y =
            ((event.clientY - rect.top) /
              rect.height) *
            100;

          setZoomPosition({
            x,
            y,
          });
        }}
      >
        <img
          src={activeImage}
          alt={form.product}
          onClick={() =>
            setImageModalOpen(true)
          }
          style={{
            width: "100%",
            maxHeight: 650,
            objectFit: "contain",
            borderRadius: 12,
            border: "1px solid #ddd",
            cursor: "zoom-in",
            display: "block",
          }}
        />

        {zoomActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 12,
              backgroundImage: `url(${activeImage})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "220%",
              backgroundPosition:
                `${zoomPosition.x}% ${zoomPosition.y}%`,
              pointerEvents: "none",
              border: "1px solid #d1d5db",
            }}
          />
        )}
      </div>
    </div>
  </div>
)}

{/* VISOR DE PANTALLA COMPLETA */}
{imageModalOpen && activeImage && (
  <div
    onClick={() =>
      setImageModalOpen(false)
    }
    style={{
      position: "fixed",
      inset: 0,
      background:
        "rgba(0, 0, 0, 0.88)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}
  >
    {/* Cerrar */}
    <button
      type="button"
      aria-label="Cerrar"
      onClick={(event) => {
        event.stopPropagation();
        setImageModalOpen(false);
      }}
      style={{
        position: "absolute",
        top: 25,
        right: 25,
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: "none",
        background: "#ffffff",
        cursor: "pointer",
        boxShadow:
          "0 6px 20px rgba(0,0,0,.35)",
        zIndex: 10003,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M18 6L6 18"
          stroke="#111827"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M6 6L18 18"
          stroke="#111827"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </button>

    {/* Anterior */}
    {displayImages.length > 1 && (
      <button
        type="button"
        aria-label="Fotografía anterior"
        onClick={(event) => {
          event.stopPropagation();
          showPreviousImage();
        }}
        style={{
          position: "absolute",
          left: 40,
          top: "50%",
          transform:
            "translateY(-50%)",
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "#ffffff",
          cursor: "pointer",
          boxShadow:
            "0 6px 20px rgba(0,0,0,.35)",
          zIndex: 10002,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M15 18L9 12L15 6"
            stroke="#111827"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )}

    {/* Foto grande */}
    <div
      onClick={(event) =>
        event.stopPropagation()
      }
      style={{
        maxWidth: "92vw",
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <img
        src={activeImage}
        alt={form.product}
        style={{
          maxWidth: "92vw",
          maxHeight: "84vh",
          objectFit: "contain",
          borderRadius: 12,
          background: "#ffffff",
        }}
      />

      <div
        style={{
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {Math.max(
          activeImageIndex,
          0
        ) + 1}{" "}
        de {displayImages.length}
      </div>
    </div>

    {/* Siguiente */}
    {displayImages.length > 1 && (
      <button
        type="button"
        aria-label="Fotografía siguiente"
        onClick={(event) => {
          event.stopPropagation();
          showNextImage();
        }}
        style={{
          position: "absolute",
          right: 40,
          top: "50%",
          transform:
            "translateY(-50%)",
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "#ffffff",
          cursor: "pointer",
          boxShadow:
            "0 6px 20px rgba(0,0,0,.35)",
          zIndex: 10002,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 18L15 12L9 6"
            stroke="#111827"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )}
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
             <div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 15,
  }}
>
  {/* TOMAR FOTO CON EL TELÉFONO */}
  
<div
  style={{
    marginTop: 15,
  }}
>
<CameraPicker
  onFileSelected={async (file) => {
    if (!file) return;

    setImageFile(file);

    await uploadMainImage(file);
  }}
/>
{imageFile && (
  <div
    style={{
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      background: "#f1f5f9",
      fontSize: 14,
    }}
  >
    <strong>Foto seleccionada:</strong>
    <br />

    {imageFile.name}
    <br />

    Tamaño:{" "}
    {(imageFile.size / 1024 / 1024).toFixed(2)} MB
    <br />

    Tipo: {imageFile.type || "sin tipo"}
  </div>
)}
</div>

              <br />

              <button
                type="button"
                
onClick={() =>
  uploadMainImage()
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

              {images.length === 0 ? (
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
  
 {images.map((image, index) => (
  <div
    key={image.id}
    draggable
    onDragStart={() => {
      setDraggedImageId(image.id);
    }}
    onDragEnd={() => {
      setDraggedImageId(null);
      setDragOverImageId(null);
    }}
    onDragOver={(event) => {
      event.preventDefault();
      setDragOverImageId(image.id);
    }}
    onDragLeave={() => {
      setDragOverImageId(null);
    }}
    onDrop={async () => {
      if (!draggedImageId) return;

      setDragOverImageId(null);

      await moveImageByDrag(
        draggedImageId,
        image.id
      );

      setDraggedImageId(null);
    }}
    style={{
      border:
        dragOverImageId === image.id &&
        draggedImageId !== image.id
          ? "2px solid #2563eb"
          : draggedImageId === image.id
          ? "2px dashed #2563eb"
          : "1px solid #dde5ef",

      borderRadius: 16,
      padding: 14,

      background:
        dragOverImageId === image.id &&
        draggedImageId !== image.id
          ? "#eff6ff"
          : "#ffffff",

      cursor: "grab",

      opacity:
        draggedImageId === image.id
          ? 0.55
          : 1,

      transform:
        draggedImageId === image.id
          ? "scale(0.97)"
          : "scale(1)",

      boxShadow:
        draggedImageId === image.id
          ? "0 12px 30px rgba(37,99,235,.25)"
          : "0 6px 18px rgba(15,23,42,.08)",

      transition: "all .18s ease",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: "1px solid #eef2f7",
        fontSize: 13,
        fontWeight: 700,
        color: "#64748b",
      }}
    >
      <span>⋮⋮ Arrastrar</span>

      <span>
        Foto {index + 1}
      </span>
    </div>

<img
  src={image.image_url}
  alt={form.product}
  style={{
    display: "block",
    width: "100%",
    height: 210,
    objectFit: "contain",
    borderRadius: 12,
    background: "#f8fafc",
    padding: 6,
  }}
/>
{/* ORDEN DE LA FOTOGRAFÍA */}
<div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  }}
>
  <button
    type="button"
    onClick={() =>
      moveImage(image, "up")
    }
    disabled={index === 0}
    style={{
      width: 42,
      height: 42,
      borderRadius: "50%",
      border: "1px solid #d1d5db",
      background: "#ffffff",
      color: "#374151",
      fontSize: 22,
      fontWeight: 700,
      cursor:
        index === 0
          ? "default"
          : "pointer",
      opacity:
        index === 0
          ? 0.4
          : 1,
      boxShadow:
        "0 2px 8px rgba(0,0,0,.08)",
    }}
  >
    ↑
  </button>

  <button
    type="button"
    onClick={() =>
      moveImage(image, "down")
    }
    disabled={
      index === images.length - 1
    }
    style={{
      width: 42,
      height: 42,
      borderRadius: "50%",
      border: "1px solid #d1d5db",
      background: "#ffffff",
      color: "#374151",
      fontSize: 22,
      fontWeight: 700,
      cursor:
        index === images.length - 1
          ? "default"
          : "pointer",
      opacity:
        index === images.length - 1
          ? 0.4
          : 1,
      boxShadow:
        "0 2px 8px rgba(0,0,0,.08)",
    }}
  >
    ↓
  </button>
</div>

{/* ESTADO DE LA FOTO */}
<div
  style={{
    minHeight: 22,
    marginTop: 6,
    marginBottom: 8,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    color:
      form.image_url === image.image_url
        ? "#b7791f"
        : "#64748b",
  }}
>
  {form.image_url === image.image_url
    ? "⭐ Foto principal"
    : "Foto secundaria"}
</div>

{/* HACER PRINCIPAL */}
<button
  type="button"
  onClick={() =>
    makePrimary(image)
  }
  disabled={
    form.image_url === image.image_url
  }
  style={{
    width: "100%",
    marginTop: 6,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #bfdbfe",
    background:
      form.image_url === image.image_url
        ? "#eff6ff"
        : "#ffffff",
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: 700,
    cursor:
      form.image_url === image.image_url
        ? "default"
        : "pointer",
  }}
>
  {form.image_url === image.image_url
    ? "⭐ Foto principal"
    : "⭐ Hacer principal"}
</button>

       <button
  type="button"
  onClick={() =>
    deleteGalleryImage(image)
  }
  style={{
    width: "100%",
    marginTop: 8,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fff7f7",
    color: "#dc2626",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  🗑 Eliminar fotografía
</button>
      </div>
    ))}
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
<CameraPicker
  onFileSelected={async (file) => {
    if (!file) return;

    setGalleryFile(file);

    await uploadGalleryImage(file);
  }}
/>

<br />

<button
  type="button"
onClick={() => uploadGalleryImage()}
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
                  required
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
                  required
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
                    updateNumberField(
                      "cost_usd",
                      e.target.value
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
                      updateNumberField("tax_rate", e.target.value)
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
                    updateNumberField(
                      "shipping_usd",
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
                    form.commission_percent
                  }
                  onChange={(e) =>
                    updateNumberField(
                      "commission_percent",
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
                  step="0.0001"
                  value={
                    form.exchange_rate
                  }
                  onChange={(e) =>
                    updateNumberField(
                      "exchange_rate",
                        e.target.value
                    )
                  }
                />
              </label>
<div
  style={{
    display: "grid",
    gap: 16,
  }}
>
  <label>
    Precio mínimo sugerido MXN

    <input
      type="number"
      value={estimatedSalePriceMxn.toFixed(2)}
      readOnly
      style={{
        background: "#f1f5f9",
        fontWeight: 700,
      }}
    />
  </label>

  <label>
    Precio final de venta MXN

    <input
      type="number"
      min="0"
      step="0.01"
      value={form.sale_price_mxn}
      onChange={(e) =>
        updateNumberField(
          "sale_price_mxn",
          e.target.value
        )
      }
      placeholder={estimatedSalePriceMxn.toFixed(2)}
      style={{
        fontWeight: 700,
      }}
    />
  </label>
</div>
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
                Comisión MeriShop USD:{" "}
                <strong>
                  $
                  {commissionUsd.toFixed(
                    2
                  )}
                </strong>
              </p>

              <p>
                Costo real USD:{" "}
                <strong>
                  $
                                 {baseCostUsd.toFixed(
                                     2
                                     )}
                </strong>
              </p>

              <p>
                Costo real MXN:{" "}
                <strong>
                  $
                  {baseCostMxn.toFixed(
                                             2
                                        )}
                </strong>
              </p>

              <p>
                Ganancia MeriShop:{" "}
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

          <section className="inventory-history" aria-labelledby="inventory-history-title">
            <div className="section-title">
              <div>
                <h2 id="inventory-history-title">Historial de existencias</h2>
                <p>Últimos movimientos registrados automáticamente.</p>
              </div>
            </div>

            {movements.length === 0 ? (
              <p className="muted-text">
                El historial aparecerá después de aplicar la migración de fase 6 y realizar un movimiento.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Anterior</th>
                      <th>Cambio</th>
                      <th>Nueva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{new Date(movement.created_at).toLocaleString("es-MX")}</td>
                        <td>{movement.movement_type}</td>
                        <td>{movement.reason}</td>
                        <td>{movement.previous_quantity}</td>
                        <td className={movement.quantity_delta >= 0 ? "movement-positive" : "movement-negative"}>
                          {movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}
                        </td>
                        <td>{movement.new_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

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

"use client";

type CameraPickerProps = {
  onFileSelected: (file: File | null) => void;
};

export default function CameraPicker({
  onFileSelected,
}: CameraPickerProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 15,
      }}
    >
      {/* CÁMARA */}
      <label
        htmlFor="camera-product-input"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 18px",
          borderRadius: 10,
          background: "#2563eb",
          color: "#ffffff",
          fontWeight: 700,
          cursor: "pointer",
          minHeight: 46,
        }}
      >
        📷 Tomar fotografía
      </label>

      <input
        id="camera-product-input"
        type="file"
        accept="image/*"
        capture="environment"
        style={{
          display: "none",
        }}
        onChange={(event) =>
          onFileSelected(
            event.target.files?.[0] ?? null
          )
        }
      />

      {/* GALERÍA DEL TELÉFONO */}
      <label
        htmlFor="library-product-input"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 18px",
          borderRadius: 10,
          background: "#ffffff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
          fontWeight: 700,
          cursor: "pointer",
          minHeight: 46,
        }}
      >
        🖼 Elegir de galería
      </label>

      <input
        id="library-product-input"
        type="file"
        accept="image/*"
        style={{
          display: "none",
        }}
        onChange={(event) =>
          onFileSelected(
            event.target.files?.[0] ?? null
          )
        }
      />
    </div>
  );
}
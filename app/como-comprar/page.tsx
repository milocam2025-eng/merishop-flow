import StoreLegalPage from "@/components/StoreLegalPage";

export default function ComoComprarPage() {
  return (
    <StoreLegalPage
      eyebrow="Compra segura"
      title="Cómo comprar en MeriShop"
      intro="Un proceso sencillo, con confirmación personal en cada pedido."
    >
      <ol className="store-steps-list">
        <li><strong>Explora:</strong> revisa el catálogo y la disponibilidad.</li>
        <li><strong>Selecciona:</strong> agrega productos al carrito.</li>
        <li><strong>Confirma:</strong> envía tu solicitud por WhatsApp.</li>
        <li><strong>Paga:</strong> recibe las instrucciones y confirma tu pago.</li>
        <li><strong>Recibe:</strong> consulta el seguimiento de tu entrega.</li>
      </ol>
      <h2>Apartados</h2>
      <p>
        Los apartados solo quedan confirmados después de recibir y validar el
        pago acordado. La disponibilidad puede cambiar antes de esa confirmación.
      </p>
      <h2>Antes de pagar</h2>
      <p>
        Verifica producto, talla, color, precio, costo de envío y condiciones
        aplicables. Conserva tu comprobante y número de pedido.
      </p>
    </StoreLegalPage>
  );
}

import StoreLegalPage from "@/components/StoreLegalPage";

export default function AcercaPage() {
  return (
    <StoreLegalPage
      eyebrow="Nuestra historia"
      title="Compras con atención personal y confianza"
      intro="MeriShop acerca productos seleccionados en Estados Unidos a clientes en México mediante un servicio claro, cercano y organizado."
    >
      <h2>Nuestro objetivo</h2>
      <p>
        Facilitar compras de productos seleccionados, ofreciendo información
        clara sobre disponibilidad, precio, apartado, pago y entrega antes de
        confirmar cada operación.
      </p>
      <h2>Lo que nos distingue</h2>
      <ul>
        <li>Atención personalizada antes, durante y después de la compra.</li>
        <li>Inventario y precios visibles y actualizados.</li>
        <li>Confirmación directa de pedidos mediante WhatsApp.</li>
        <li>Seguimiento organizado de pagos y envíos.</li>
      </ul>
      <h2>Nuestro compromiso</h2>
      <p>
        Trabajamos para que cada cliente conozca las condiciones de su compra y
        reciba acompañamiento hasta completar la entrega.
      </p>
    </StoreLegalPage>
  );
}

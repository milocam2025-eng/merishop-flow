import StoreLegalPage from "@/components/StoreLegalPage";

export default function ContactoPage() {
  return (
    <StoreLegalPage
      eyebrow="Estamos para ayudarte"
      title="Contacto"
      intro="Escríbenos para confirmar disponibilidad, resolver dudas o consultar un pedido."
    >
      <div className="store-contact-card">
        <h2>WhatsApp</h2>
        <p>Atención personalizada para compras y seguimiento.</p>
        <a
          className="store-primary-link"
          href="https://wa.me/18402792847?text=Hola%20MeriShop%2C%20necesito%20informaci%C3%B3n."
          target="_blank"
          rel="noreferrer"
        >
          Escribir a MeriShop
        </a>
      </div>
      <h2>Para atenderte mejor</h2>
      <p>
        Incluye tu nombre y, si ya realizaste una compra, el número de pedido.
        Nunca envíes contraseñas ni datos completos de tarjetas por mensaje.
      </p>
    </StoreLegalPage>
  );
}

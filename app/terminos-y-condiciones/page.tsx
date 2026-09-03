import StoreLegalPage from "@/components/StoreLegalPage";

export default function TerminosPage() {
  return (
    <StoreLegalPage
      eyebrow="Última actualización: 3 de septiembre de 2026"
      title="Términos y condiciones"
      intro="Estas condiciones ayudan a mantener compras claras y seguras para ambas partes."
    >
      <h2>Disponibilidad y confirmación</h2>
      <p>
        Mostrar un producto o agregarlo al carrito no garantiza su apartado. La
        compra queda confirmada cuando MeriShop valida disponibilidad y pago.
      </p>
      <h2>Precios y pagos</h2>
      <p>
        Los precios se muestran en pesos mexicanos salvo indicación distinta.
        Antes del pago se informarán los cargos aplicables, incluido el envío.
      </p>
      <h2>Apartados</h2>
      <p>
        Los plazos y cantidades de un apartado se acordarán antes de confirmarlo.
        El incumplimiento del acuerdo puede causar su cancelación.
      </p>
      <h2>Cambios y devoluciones</h2>
      <p>
        Debido a la naturaleza del servicio de compra personalizada, las ventas
        pueden ser finales. Cualquier excepción por producto incorrecto o defecto
        deberá reportarse de inmediato y será evaluada según el caso.
      </p>
      <h2>Envíos</h2>
      <p>
        Los tiempos son estimados y pueden variar por transportista o situaciones
        fuera del control de MeriShop. El cliente debe proporcionar datos correctos.
      </p>
      <h2>Uso del sitio</h2>
      <p>
        El usuario se compromete a proporcionar información verdadera y no usar
        el sitio de forma fraudulenta o que afecte su funcionamiento.
      </p>
      <h2>Contacto</h2>
      <p>Las dudas sobre una compra o estas condiciones se atienden por WhatsApp.</p>
    </StoreLegalPage>
  );
}

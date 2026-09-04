import StoreLegalPage from "@/components/StoreLegalPage";

export default function PrivacidadPage() {
  return (
    <StoreLegalPage
      eyebrow="Última actualización: 3 de septiembre de 2026"
      title="Política de privacidad"
      intro="Explicamos de forma clara qué información utilizamos para atender pedidos y prestar nuestro servicio."
    >
      <h2>Información que recopilamos</h2>
      <p>
        Podemos solicitar nombre, teléfono, información de entrega, productos
        solicitados, pagos y comunicaciones relacionadas con la compra.
      </p>
      <h2>Cómo utilizamos la información</h2>
      <p>
        La usamos para confirmar pedidos, registrar pagos, coordinar envíos,
        ofrecer soporte, prevenir errores y cumplir obligaciones aplicables.
      </p>
      <h2>Protección y conservación</h2>
      <p>
        Aplicamos controles razonables de acceso. Conservamos la información el
        tiempo necesario para prestar el servicio y atender obligaciones
        operativas o legales.
      </p>
      <h2>Compartición</h2>
      <p>
        No vendemos datos personales. Solo podemos compartir la información
        necesaria con proveedores que intervienen en pagos, tecnología o entrega.
      </p>
      <h2>Tus solicitudes</h2>
      <p>
        Puedes solicitar acceso, corrección o eliminación de tus datos mediante
        nuestro canal de contacto, sujeto a los requisitos aplicables.
      </p>
    </StoreLegalPage>
  );
}

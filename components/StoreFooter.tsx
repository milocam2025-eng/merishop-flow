import Link from "next/link";

export default function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="store-footer-grid">
        <div>
          <Link className="store-footer-brand" href="/tienda" aria-label="MeriShop">
            <span>Meri</span><span>Shop</span>
          </Link>
          <p>
            Compras seleccionadas en Estados Unidos con atención personalizada
            para nuestros clientes en México.
          </p>
        </div>

        <div>
          <h2>Información</h2>
          <Link href="/acerca">Acerca de nosotros</Link>
          <Link href="/como-comprar">Cómo comprar</Link>
          <Link href="/contacto">Contacto</Link>
        </div>

        <div>
          <h2>Legal</h2>
          <Link href="/politica-de-privacidad">Política de privacidad</Link>
          <Link href="/terminos-y-condiciones">Términos y condiciones</Link>
        </div>

        <div>
          <h2>Atención directa</h2>
          <a
            href="https://wa.me/18402792847"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp: +1 (840) 279-2847
          </a>
          <p>Atención para compras, apartados y seguimiento de pedidos.</p>
        </div>
      </div>
      <div className="store-footer-bottom">
        <span>© {new Date().getFullYear()} MeriShop. Todos los derechos reservados.</span>
        <span>Compras personalizadas con atención directa.</span>
      </div>
    </footer>
  );
}

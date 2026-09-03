import Link from "next/link";
import StoreFooter from "@/components/StoreFooter";

type StoreLegalPageProps = {
  title: string;
  eyebrow: string;
  intro: string;
  children: React.ReactNode;
};

export default function StoreLegalPage({
  title,
  eyebrow,
  intro,
  children,
}: StoreLegalPageProps) {
  return (
    <main className="store-public-page">
      <header className="store-simple-header">
        <Link className="store-logo" href="/tienda" aria-label="MeriShop">
          <span>Meri</span><span>Shop</span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/tienda">Tienda</Link>
          <Link href="/acerca">Nosotros</Link>
          <Link href="/como-comprar">Cómo comprar</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
      </header>
      <section className="store-document-hero">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </section>
      <article className="store-document">{children}</article>
      <StoreFooter />
    </main>
  );
}

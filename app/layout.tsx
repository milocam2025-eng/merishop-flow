import "./styles.css";
export const metadata = { title: "MeriShop Flow", description: "Gestión para personal shoppers" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="es"><body>{children}</body></html>;
}

# MeriShop Flow Cloud — Etapa 2

Esta versión agrega:

- Inicio de sesión y creación de cuenta.
- Base de datos Supabase.
- Protección de datos por usuario mediante Row Level Security.
- Panel conectado a clientes y pedidos.
- Proyecto Next.js preparado para Vercel.

## Instalación local

1. Instala Node.js.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta `npm install`.
4. Crea un proyecto en Supabase.
5. Ejecuta `supabase/schema.sql` en el SQL Editor.
6. Copia `.env.example` como `.env.local`.
7. Coloca la URL y la clave pública de Supabase.
8. Ejecuta `npm run dev`.
9. Abre `http://localhost:3000`.

## Publicación

Sube la carpeta a GitHub e importa el repositorio en Vercel.
Agrega las dos variables de entorno en la configuración del proyecto.

## Próximo desarrollo

- Formularios CRUD completos para clientes y pedidos.
- Fotografías de productos.
- Facturas PDF.
- Seguimiento público por enlace.
- Roles para administradora y empleadas.

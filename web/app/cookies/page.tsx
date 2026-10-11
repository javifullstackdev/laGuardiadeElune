import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/app/components/LegalDoc";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: `Política de cookies de ${SITE_NAME}: qué cookies usamos y para qué.`,
};

export default function CookiesPage() {
  return (
    <LegalDoc title="Política de cookies">
      <h2>1. Qué son las cookies</h2>
      <p>
        Las cookies son pequeños archivos que el sitio guarda en tu navegador
        para recordar información entre visitas o mantener una sesión.
      </p>

      <h2>2. Cookies que usamos</h2>
      <p>
        <strong>{SITE_NAME}</strong> solo utiliza cookies <em>técnicas
        esenciales</em>. No usamos cookies de publicidad, analítica de terceros
        ni redes sociales embebidas con tracking.
      </p>
      <ul>
        <li>
          <strong>Nombre:</strong> <code>token</code>
        </li>
        <li>
          <strong>Finalidad:</strong> mantener la sesión autenticada (JWT) tras
          iniciar sesión con Discord.
        </li>
        <li>
          <strong>Tipo:</strong> propia, httpOnly, SameSite=Lax; Secure en
          producción.
        </li>
        <li>
          <strong>Duración:</strong> limitada (sesión / caducidad del token);
          se elimina al cerrar sesión.
        </li>
      </ul>

      <h2>3. OAuth de terceros</h2>
      <p>
        Al pulsar «Entrar con Discord» o «Conectar Battle.net», serás
        redirigido a esos sitios. Allí pueden establecerse cookies propias de
        Discord o Blizzard bajo sus políticas. Nosotros no controlamos esas
        cookies.
      </p>

      <h2>4. Cómo gestionarlas</h2>
      <p>
        Puedes borrar o bloquear cookies desde la configuración de tu navegador.
        Si eliminas la cookie <code>token</code>, tendrás que volver a iniciar
        sesión.
      </p>

      <h2>5. Más información</h2>
      <p>
        Tratamiento de datos personales:{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>
    </LegalDoc>
  );
}

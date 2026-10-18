import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/app/components/LegalDoc";
import { CONTACT_EMAIL_PLACEHOLDER, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: `Términos de uso de ${SITE_NAME}: normas de la comunidad y del contenido publicado.`,
};

export default function TerminosPage() {
  return (
    <LegalDoc title="Términos de uso">
      <h2>1. Aceptación</h2>
      <p>
        Al usar el Sitio de <strong>{SITE_NAME}</strong> aceptas estos términos
        y las normas de la hermandad comunicadas por sus oficiales.
      </p>

      <h2>2. Cuenta</h2>
      <p>
        El acceso autenticado se realiza mediante Discord. Eres responsable de
        la actividad asociada a tu cuenta. Podemos suspender el acceso ante
        abuso, fraude o incumplimiento.
      </p>

      <h2>3. Contenido de usuarios (UGC)</h2>
      <ul>
        <li>
          Conservas la autoría de lo que escribes o subes (bios, historias,
          imágenes).
        </li>
        <li>
          Nos concedes una licencia no exclusiva para alojar, mostrar y
          moderar ese contenido en el Sitio mientras permanezca publicado.
        </li>
        <li>
          No publiques contenido ilegal, ofensivo, que vulnere derechos de
          terceros o las normas de la hermandad / ToS de Blizzard o Discord.
        </li>
        <li>
          El personal (p. ej. el Eremita / oficiales) puede revisar, rechazar o
          retirar publicaciones.
        </li>
      </ul>

      <h2>4. Áreas públicas y privadas</h2>
      <p>
        El tablón, fichas publicadas e historias aprobadas son
        contenidos pensados para ser visibles. El ranking, el banco, el perfil y el panel de
        administración son privados y no deben indexarse.
      </p>

      <h2>5. Disponibilidad</h2>
      <p>
        Podemos modificar, suspender o discontinuar funciones del Sitio. No
        garantizamos un servicio ininterrumpido.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Dudas sobre estos términos:{" "}
        <a href={`mailto:${CONTACT_EMAIL_PLACEHOLDER}`}>
          {CONTACT_EMAIL_PLACEHOLDER}
        </a>
        . Ver también el <Link href="/aviso-legal">Aviso legal</Link> y la{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>
    </LegalDoc>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/app/components/LegalDoc";
import { CONTACT_EMAIL_PLACEHOLDER, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: `Aviso legal de ${SITE_NAME}: información del titular y condiciones de uso del sitio.`,
};

export default function AvisoLegalPage() {
  return (
    <LegalDoc title="Aviso legal">
      <h2>1. Titular del sitio</h2>
      <p>
        El sitio web <strong>{SITE_URL}</strong> (en adelante, «el Sitio») es
        operado por la hermandad de jugadores <strong>{SITE_NAME}</strong>,
        comunidad no profesional dedicada a World of Warcraft.
      </p>
      <p>
        Contacto:{" "}
        <a href={`mailto:${CONTACT_EMAIL_PLACEHOLDER}`}>
          {CONTACT_EMAIL_PLACEHOLDER}
        </a>
      </p>

      <h2>2. Objeto</h2>
      <p>
        El Sitio ofrece información y herramientas para miembros y visitantes de
        la hermandad: tablón de anuncios, fichas públicas de personajes,
        historias de rol, y áreas privadas (ranking, banco, perfil y
        administración).
      </p>

      <h2>3. Propiedad intelectual y marcas de terceros</h2>
      <p>
        World of Warcraft® y las marcas relacionadas son propiedad de Blizzard
        Entertainment, Inc. Discord® es marca de Discord Inc. Este Sitio no
        está afiliado, asociado, autorizado ni respaldado por Blizzard
        Entertainment ni por Discord.
      </p>
      <p>
        Los textos, imágenes de personaje y demás contenidos generados por los
        usuarios pertenecen a sus autores, sin perjuicio de la licencia de uso
        necesaria para mostrarlos en el Sitio (ver{" "}
        <Link href="/terminos">Términos de uso</Link>).
      </p>

      <h2>4. Responsabilidad</h2>
      <p>
        El Sitio se ofrece «tal cual». La hermandad no garantiza disponibilidad
        ininterrumpida ni la exactitud absoluta de datos sincronizados desde
        servicios de terceros (Discord, Battle.net).
      </p>
      <p>
        El usuario es responsable del contenido que publique y de no vulnerar
        derechos de terceros ni la normativa aplicable.
      </p>

      <h2>5. Enlaces</h2>
      <p>
        El Sitio puede enlazar a servicios externos (Discord, Battle.net,
        redes). Esas páginas tienen sus propias condiciones; no controlamos su
        contenido.
      </p>

      <h2>6. Legislación</h2>
      <p>
        Salvo norma imperativa en contrario, las cuestiones relativas a este
        aviso se interpretan conforme a la legislación española y al Reglamento
        (UE) 2016/679 (RGPD) en lo que afecte al tratamiento de datos personales
        (ver <Link href="/privacidad">Política de privacidad</Link>).
      </p>
    </LegalDoc>
  );
}

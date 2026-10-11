import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/app/components/LegalDoc";
import { CONTACT_EMAIL_PLACEHOLDER, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Política de privacidad de ${SITE_NAME}: qué datos tratamos, para qué y tus derechos.`,
};

export default function PrivacidadPage() {
  return (
    <LegalDoc title="Política de privacidad">
      <h2>1. Responsable del tratamiento</h2>
      <p>
        Responsable: hermandad <strong>{SITE_NAME}</strong>, a través del Sitio{" "}
        <strong>{SITE_URL}</strong>.
      </p>
      <p>
        Contacto en materia de privacidad:{" "}
        <a href={`mailto:${CONTACT_EMAIL_PLACEHOLDER}`}>
          {CONTACT_EMAIL_PLACEHOLDER}
        </a>
        .
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>
          <strong>Cuenta Discord (OAuth):</strong> identificador, nombre de
          usuario / apodo, avatar y token de sesión propio del Sitio.
        </li>
        <li>
          <strong>Battle.net (OAuth, opcional):</strong> BattleTag y datos de
          personajes WoW necesarios para fichas, renders y sincronización.
        </li>
        <li>
          <strong>Perfil y juego:</strong> puntos, ranking, títulos, preferencias
          de ficha pública.
        </li>
        <li>
          <strong>Contenido generado por el usuario (UGC):</strong> biografías,
          historias, imágenes de personaje, menciones y relaciones narrativas.
        </li>
        <li>
          <strong>Datos técnicos mínimos:</strong> logs de servidor, dirección
          IP y User-Agent que el hosting pueda registrar de forma habitual para
          seguridad y operación.
        </li>
      </ul>

      <h2>3. Finalidades y bases jurídicas</h2>
      <ul>
        <li>
          Prestar el servicio de hermandad (login, perfil, fichas, ranking):
          ejecución del servicio solicitado / interés legítimo de la comunidad.
        </li>
        <li>
          Moderación de contenido y seguridad (abuso, spam): interés legítimo.
        </li>
        <li>
          Cumplir obligaciones legales aplicables cuando proceda.
        </li>
      </ul>
      <p>
        No usamos los datos para publicidad comportamental ni los vendemos a
        terceros.
      </p>

      <h2>4. Destinatarios</h2>
      <ul>
        <li>
          <strong>Discord Inc.</strong> y <strong>Blizzard Entertainment</strong>{" "}
          cuando inicias OAuth en sus plataformas (sus propias políticas
          aplican).
        </li>
        <li>
          <strong>Proveedor de hosting</strong> (VPS / infraestructura donde
          corre el Sitio) como encargado de alojamiento.
        </li>
        <li>
          Contenido marcado como público (fichas, historias aprobadas, tablón)
          es visible en Internet.
        </li>
      </ul>

      <h2>5. Conservación</h2>
      <p>
        Conservamos los datos mientras mantengas cuenta activa o el contenido
        público siga publicado. Puedes solicitar baja o borrado; algunos
        registros técnicos o de seguridad pueden conservarse el tiempo
        necesario para defender el Sitio o cumplir la ley.
      </p>

      <h2>6. Derechos</h2>
      <p>
        Puedes ejercer acceso, rectificación, supresión, limitación, oposición y
        portabilidad, cuando procedan, escribiendo a{" "}
        <a href={`mailto:${CONTACT_EMAIL_PLACEHOLDER}`}>
          {CONTACT_EMAIL_PLACEHOLDER}
        </a>
        . También puedes reclamar ante la Agencia Española de Protección de
        Datos (AEPD).
      </p>

      <h2>7. Cookies</h2>
      <p>
        Detalle en la <Link href="/cookies">Política de cookies</Link>. Solo
        usamos cookies técnicas esenciales de sesión.
      </p>

      <h2>8. Menores</h2>
      <p>
        El Sitio está orientado a jugadores de una hermandad de WoW. Si eres
        menor, solo deberías usar el servicio con consentimiento de quien
        ostente la patria potestad, conforme a la normativa aplicable.
      </p>
    </LegalDoc>
  );
}

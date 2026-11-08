export type Faq = {
  question: string;
  answer: string;
};

/** Preguntas públicas. El texto visible y el schema FAQPage usan la misma redacción. */
export const FAQS: Faq[] = [
  {
    question: "¿Qué es La Guardia de Elune?",
    answer:
      "La Guardia de Elune es una hermandad de World of Warcraft en español. Jugamos juntos y escribimos la historia y las aventurasde nuestros personajes.",
  },
  {
    question: "¿Qué sentido tiene la Guardia?",
    answer:
      "La Guardia existe para no jugar solo. El sentido está en hacer raids o míticas juntos, en compartir aventuras, y en que cada personaje tenga nombre, historia y un sitio donde quedarse.",
  },
  {
    question: "¿Qué puedo leer sin entrar?",
    answer:
      "Quien pase por aquí puede leer el tablón, las fichas de los personajes y las historias ya publicadas. El ranking, el banco, los pedidos, los sorteos y el perfil son sólo para miembros: para eso hace falta entrar con Discord.",
  },
  {
    question: "¿Cómo pido unirme?",
    answer:
      "En Reclutamiento, en el menú, deja tu nombre, tu apellido y la razón por la que quieres entrar. La hermandad lee cada solicitud.",
  },
  {
    question: "¿Cómo entro con mi cuenta de Discord?",
    answer:
      "Si ya eres de la Guardia, entra desde Entrar, en el menú, con Discord. Después puedes conectar Battle.net para verificar tus personajes y dejar el perfil en orden.",
  },
  {
    question: "¿Quién escribe las fichas y las historias?",
    answer:
      "Las escribes tú. La ficha es la cara pública del personaje y la historia es lo que le ocurre. El Eremita las lee antes de publicarlas, para que lo que sale al pergamino esté cuidado. Las fichas están en Personajes y los relatos en Historias.",
  },
  {
    question: "¿Cómo hablo con la Guardia?",
    answer:
      "Escríbenos a info@laguardiadeelune.com. Si ya eres miembro, escribe por el canal de #guardianocturna.",
  },
  {
    question: "¿Esta web es de Blizzard?",
    answer:
      "No. World of Warcraft es de Blizzard Entertainment. La Guardia es una hermandad de jugadores: no estamos afiliados, asociados ni respaldados por Blizzard.",
  },
];

export function faqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

import type { BioSheetImage, BioStoryImage } from "@/lib/bio";

const STORY_STATUS: Record<string, string> = {
  pending: "Pendiente",
  changes_requested: "Cambios pedidos",
  rejected: "Rechazada",
  approved: "Publicada",
};

function Frame({
  src,
  href,
  label,
  detail,
}: {
  src: string;
  href: string;
  label: string;
  detail?: string;
}) {
  return (
    <div className="space-y-2">
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg overflow-hidden border border-gray-700 bg-black/40"
      >
        <img src={src} alt="" className="w-full h-36 object-contain" />
      </a>
      <p className="text-xs text-gray-300">{label}</p>
      {detail ? <p className="text-[11px] text-gray-500">{detail}</p> : null}
      <a href={href} className="inline-flex text-xs font-medium text-cyan-400 hover:text-cyan-300">
        Descargar
      </a>
    </div>
  );
}

export default function PlayerImageGallery({
  characterId,
  sheetImages,
  storyImages,
}: {
  characterId: string;
  sheetImages?: BioSheetImage[];
  storyImages?: BioStoryImage[];
}) {
  const sheets = sheetImages ?? [];
  const stories = storyImages ?? [];
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-gray-500">Imágenes del jugador</h3>
      <p className="text-xs text-gray-500">
        Se quedan guardadas. Si pides cambios, no tiene que volver a subirlas.
      </p>
      {sheets.length === 0 && stories.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no ha subido imágenes de la ficha ni portadas de historias.</p>
      ) : (
        <div className="space-y-4">
          {sheets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Ficha</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sheets.map((image) => (
                  <Frame
                    key={image.slot}
                    src={image.url}
                    href={`/api/admin/bios/${characterId}/sheet/${image.slot}`}
                    label={image.label}
                  />
                ))}
              </div>
            </div>
          )}
          {stories.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Historias</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stories.map((image) => (
                  <Frame
                    key={image.story_id}
                    src={image.url}
                    href={`/api/admin/bios/${characterId}/stories/${image.story_id}/cover`}
                    label={image.title}
                    detail={STORY_STATUS[image.status] ?? image.status}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

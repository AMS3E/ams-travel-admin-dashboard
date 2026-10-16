import { PictureThumb } from "@/features/catalog/components/fields/picture-thumb";
import { cn } from "@/lib/utils";

interface InterestPreviewProps {
  /** Its group, empty until chosen. */
  readonly group: string;
  /** The group's other interests, top to bottom, each with its picture link. */
  readonly others: readonly { readonly name: string; readonly image: string }[];
  /** Its spot among them, 0 for the first. */
  readonly position: number;
  readonly name: string;
  /** Its picture link; empty until one is uploaded. */
  readonly image: string;
  readonly description: string;
  readonly editing: boolean;
}

/** An interest as the website shows it: on its group's shelf under Explore, and at the top of its own page. */
export function InterestPreview({ group, others, position, name, image, description, editing }: InterestPreviewProps) {
  const shelf = [...others.slice(0, position).map((row) => ({ ...row, own: false })), { name, image, own: true }, ...others.slice(position).map((row) => ({ ...row, own: false }))];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-2xs font-semibold tracking-wide text-muted uppercase">Preview</p>
        <p className="text-xs text-muted">On the website{group ? ` · Explore › Interests › ${group}` : ""}</p>
      </div>

      {group ? (
        <ol className="flex flex-col gap-1">
          {shelf.map((row, index) => (
            <li
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                row.own ? "border-teal bg-teal-soft/50 font-medium text-ink ring-1 ring-teal" : "border-line bg-paper text-ink-soft",
              )}
              key={row.own ? "own" : `${index}-${row.name}`}
            >
              <PictureThumb className="size-6" src={row.image} />
              <span className={cn("min-w-0 flex-1 truncate", row.own && !row.name && "font-normal text-muted italic")}>{row.name || "Its name"}</span>
              {row.own ? <span className="text-2xs font-semibold text-teal">{editing ? "This one" : "New"}</span> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed border-line-strong px-3 py-4 text-center text-xs text-muted">Choose a group to see its shelf.</p>
      )}

      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <p className="text-xs text-muted">Its own page</p>
        <PictureThumb className="aspect-video w-full rounded-md" iconClassName="size-6" src={image} />
        <span className={cn("min-w-0 truncate text-base font-semibold", name ? "text-ink" : "text-muted italic")}>{name || "Its name"}</span>
        <p className={cn("text-xs leading-relaxed", description ? "text-ink-soft" : "text-muted italic")}>
          {description || "No description: only its name shows."}
        </p>
      </div>
    </div>
  );
}

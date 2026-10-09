import type { ReactNode } from "react";
import { firstLine } from "@/lib/text";
import { Badge } from "@/components/ui/badge";
import type { DestinationResponse } from "@/features/catalog/api/contracts";
import {
  EmptyRow,
  EntityRow,
  RowList,
} from "@/features/dashboard/components/entity-row";
import { isLive } from "@/features/dashboard/destinations";

interface DestinationRowsProps {
  readonly destinations: readonly DestinationResponse[];
  readonly empty: string;
  /** How many rows before the list becomes a wall. */
  readonly limit?: number;
  /** Rows link to the edit form only for roles allowed to open it. */
  readonly editable?: boolean;
  /** Hidden when the list is already grouped by status. */
  readonly showStatus?: boolean;
  readonly trailing?: (destination: DestinationResponse) => ReactNode;
  /** A control beside the row, outside its link — see `EntityRow.action`. */
  readonly action?: (destination: DestinationResponse) => ReactNode;
}

export function DestinationRows({
  destinations,
  empty,
  limit = 6,
  editable = false,
  showStatus = true,
  trailing,
  action,
}: DestinationRowsProps) {
  if (!destinations.length) return <EmptyRow>{empty}</EmptyRow>;

  return (
    <RowList>
      {destinations.slice(0, limit).map((destination) => (
        <EntityRow
          badges={
            <>
              {showStatus ? (
                <Badge tone={isLive(destination) ? "active" : "neutral"}>
                  {isLive(destination) ? "Live" : destination.status === "ARCHIVED" ? "Archived" : "Draft"}
                </Badge>
              ) : null}
            </>
          }
          href={editable ? `/destinations/${destination.id}` : undefined}
          key={destination.id}
          subtitle={destination.address ?? firstLine(destination.description) ?? undefined}
          title={destination.name}
          trailing={trailing?.(destination)}
          action={action?.(destination)}
        />
      ))}
    </RowList>
  );
}

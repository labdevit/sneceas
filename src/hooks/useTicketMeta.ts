import { useQuery } from '@tanstack/react-query';
import { fetchTicketTypes, fetchTicketStatuses } from '@/lib/api/tickets';
import type { ApiTicketType, ApiTicketStatus } from '@/lib/api/tickets';

/**
 * Hook qui charge les types et statuts de tickets (données référentielles).
 * Mise en cache longue (10 min) car ces données changent rarement.
 */
export function useTicketMeta() {
  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: fetchTicketTypes,
    staleTime: 10 * 60 * 1000,
  });

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    staleTime: 10 * 60 * 1000,
  });

  // Maps pour résolution rapide UUID → objet
  const statusById = new Map<string, ApiTicketStatus>(statuses.map((s) => [s.id, s]));
  const typeById = new Map<string, ApiTicketType>(types.map((t) => [t.id, t]));

  /** Résout un UUID de statut → { code, label } */
  const resolveStatus = (uuid: string): ApiTicketStatus | undefined => statusById.get(uuid);

  /** Résout un UUID de type → { code, label } */
  const resolveType = (uuid: string): ApiTicketType | undefined => typeById.get(uuid);

  /** Obtient le code de statut à partir du UUID (utile pour StatusBadge) */
  const statusCode = (uuid: string): string => statusById.get(uuid)?.code ?? 'new';

  /** Obtient le label de statut à partir du UUID */
  const statusLabel = (uuid: string): string => statusById.get(uuid)?.label ?? uuid;

  return {
    types,
    statuses,
    statusById,
    typeById,
    resolveStatus,
    resolveType,
    statusCode,
    statusLabel,
    isLoading: typesLoading || statusesLoading,
  };
}

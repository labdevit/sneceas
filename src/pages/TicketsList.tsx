import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Clock, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UrgencyBadge } from '@/components/ui/UrgencyBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ticketTypeLabels, statusLabels, urgencyLabels } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';

type ApiTicket = {
  id: number;
  numero_reference: string;
  type_probleme: string;
  priorite: string;
  statut: string;
  titre: string;
  updated_at: string;
  travailleur: string | null;
  pole?: { id: number; nom: string } | null;
  entreprise?: { id: number; nom: string } | null;
};

export default function TicketsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);
        const data = await apiRequest<{ results: ApiTicket[] }>('/requetes/');
        setTickets(data.results);
        setErrorMessage(null);
      } catch {
        setErrorMessage("Impossible de charger les requêtes.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const matchesSearch =
      ticket.numero_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.titre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.statut === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || ticket.priorite === urgencyFilter;
    return matchesSearch && matchesStatus && matchesUrgency;
  }), [tickets, searchQuery, statusFilter, urgencyFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes requêtes</h1>
          <p className="text-muted-foreground mt-1">
            Suivez l'avancement de toutes vos demandes.
          </p>
        </div>
        <Button asChild>
          <Link to="/submit">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle requête
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par référence ou objet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Urgence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes urgences</SelectItem>
            {Object.entries(urgencyLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Référence</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Pôle</TableHead>
              <TableHead className="font-semibold">Entreprise</TableHead>
              <TableHead className="font-semibold">Demandeur</TableHead>
              <TableHead className="font-semibold">
                <div className="flex items-center gap-1">
                  Urgence
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold">Mise à jour</TableHead>
              <TableHead className="font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-muted-foreground">Chargement...</p>
                </TableCell>
              </TableRow>
            ) : errorMessage ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-destructive">{errorMessage}</p>
                </TableCell>
              </TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-muted-foreground">Aucune requête trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="group hover:bg-accent/50 transition-colors"
                >
                  <TableCell>
                    <div>
                      <p className="font-mono text-sm font-medium">{ticket.numero_reference}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {ticket.titre}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{ticketTypeLabels[ticket.type_probleme]}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {ticket.pole?.nom ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {ticket.entreprise?.nom ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {ticket.travailleur ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={ticket.priorite} size="sm" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.statut} size="sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ticket.updated_at).toLocaleDateString('fr-FR')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/tickets/${ticket.id}`}>Voir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>{filteredTickets.length} requête(s) trouvée(s)</p>
      </div>
    </div>
  );
}

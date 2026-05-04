import { useState } from 'react';
import {
  Mail, MessageCircle, Users, Calendar, Loader2, Send,
  ChevronLeft, ChevronRight, Eye, Paperclip,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { fetchBroadcastsPaginated, type ApiBroadcast } from '@/lib/api/broadcasts';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:   { label: 'Brouillon', variant: 'outline' },
  sending: { label: 'En cours',  variant: 'default' },
  sent:    { label: 'Envoyé',    variant: 'secondary' },
  failed:  { label: 'Échec',     variant: 'destructive' },
};

const PAGE_SIZE = 10;

function BroadcastDetailDialog({
  broadcast,
  onClose,
}: {
  broadcast: ApiBroadcast | null;
  onClose: () => void;
}) {
  if (!broadcast) return null;

  const st = statusConfig[broadcast.status] ?? statusConfig.draft;
  const isWhatsapp = broadcast.channel === 'whatsapp';

  const audienceLabel =
    broadcast.audience === 'all'
      ? 'Tout le monde'
      : broadcast.audience === 'poles'
      ? broadcast.target_pole_names.join(', ') || 'Pôles'
      : broadcast.target_company_names.join(', ') || 'Entreprises';

  const sentDate = broadcast.sent_at || broadcast.created_at;

  return (
    <Dialog open={!!broadcast} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8 min-w-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              isWhatsapp ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600',
            )}>
              {isWhatsapp ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <span className="break-words min-w-0">{broadcast.subject}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Méta-données */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Canal</p>
            <p className="font-medium">{isWhatsapp ? 'WhatsApp' : 'Email'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Statut</p>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Destinataires</p>
            <p className="font-medium flex items-start gap-1 break-words">
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span>{audienceLabel}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Envoyé le</p>
            <p className="font-medium flex items-start gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span>{new Date(sentDate).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}</span>
            </p>
          </div>
          {broadcast.author_name && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Auteur</p>
              <p className="font-medium break-words">{broadcast.author_name}</p>
            </div>
          )}
          {broadcast.recipient_count > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre envoyés</p>
              <p className="font-medium">{broadcast.recipient_count} destinataire{broadcast.recipient_count !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Contenu du message */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Contenu du message</p>
          {isWhatsapp || !broadcast.html_content ? (
            <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed bg-muted rounded-lg p-4 font-sans overflow-x-hidden">
              {broadcast.plain_content || broadcast.html_content || '(aucun contenu)'}
            </pre>
          ) : (
            <div
              className="prose prose-sm max-w-none bg-muted rounded-lg p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: broadcast.html_content }}
            />
          )}
        </div>

        {/* Pièces jointes */}
        {broadcast.attachments.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Pièces jointes ({broadcast.attachments.length})
              </p>
              <div className="space-y-2">
                {broadcast.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Paperclip className="w-4 h-4 shrink-0" />
                    {att.filename || att.file.split('/').pop()}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BroadcastHistory() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ApiBroadcast | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['broadcasts', page],
    queryFn: () => fetchBroadcastsPaginated({ page: String(page), page_size: String(PAGE_SIZE) }),
  });

  const broadcasts = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = !!data?.next;
  const hasPrev = page > 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border">
        <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Aucune diffusion envoyée</p>
        <p className="text-sm text-muted-foreground mt-1">
          Créez votre premier message de diffusion
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {broadcasts.map((b: ApiBroadcast) => {
          const st = statusConfig[b.status] || statusConfig.draft;
          const audienceLabel =
            b.audience === 'all'
              ? 'Tout le monde'
              : b.audience === 'poles'
              ? b.target_pole_names.join(', ') || 'Pôles'
              : b.target_company_names.join(', ') || 'Entreprises';

          return (
            <article
              key={b.id}
              onClick={() => setSelected(b)}
              className="bg-card rounded-xl border shadow-card overflow-hidden p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    b.channel === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600',
                  )}>
                    {b.channel === 'email' ? <Mail className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{b.subject}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {audienceLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(b.sent_at || b.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.recipient_count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {b.recipient_count} dest.
                    </Badge>
                  )}
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </article>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} sur {totalPages} — {totalCount} diffusion{totalCount !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrev}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <BroadcastDetailDialog broadcast={selected} onClose={() => setSelected(null)} />
    </>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Megaphone, Calendar, Loader2, ExternalLink, CircleDot, Plus, Send, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotificationsPaginated, markAsRead } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import { BroadcastComposer } from '@/components/communication/BroadcastComposer';
import { BroadcastHistory } from '@/components/communication/BroadcastHistory';
import { useAcl } from '@/contexts/AuthContext';

export default function Communication() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useAcl();
  const canManageBroadcasts = can('ticket_classify');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('notifications');
  const [showComposer, setShowComposer] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const NOTIF_PAGE_SIZE = 20;

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications', notifPage],
    queryFn: () => fetchNotificationsPaginated({ page: String(notifPage), page_size: String(NOTIF_PAGE_SIZE) }),
  });

  const notifications = notifData?.results ?? [];
  const notifTotalCount = notifData?.count ?? 0;
  const notifTotalPages = Math.ceil(notifTotalCount / NOTIF_PAGE_SIZE);
  const notifHasNext = !!notifData?.next;
  const notifHasPrev = notifPage > 1;

  const filtered = notifications.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q)
    );
  });

  // ── Composer mode ───────────────────────────────────────────
  if (showComposer) {
    return (
      <BroadcastComposer
        onBack={() => setShowComposer(false)}
        onSent={() => {
          setShowComposer(false);
          setActiveTab('history');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Communication syndicale</h1>
          <p className="text-muted-foreground mt-1">
            Restez informé des actualités et annonces du S.N.E.C.E.A.
          </p>
        </div>
        {canManageBroadcasts && (
          <Button onClick={() => setShowComposer(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle diffusion
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          {canManageBroadcasts && (
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Diffusions envoyées
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Notifications tab ────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une notification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Notifications list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border">
                  <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune notification trouvée</p>
                </div>
              ) : (
                filtered.map((notification) => (
                  <article
                    key={notification.id}
                    className={cn(
                      'bg-card rounded-xl border shadow-card overflow-hidden card-interactive',
                      !notification.read && 'border-primary/40'
                    )}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              notification.read ? 'bg-muted' : 'bg-primary/10'
                            )}
                          >
                            <Megaphone
                              className={cn(
                                'w-5 h-5',
                                notification.read ? 'text-muted-foreground' : 'text-primary'
                              )}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className={cn('text-lg font-semibold', !notification.read && 'font-bold')}>
                                {notification.title}
                              </h2>
                              {!notification.read && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  Nouveau
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                        <CircleDot
                          className={cn(
                            'w-4 h-4 mt-1 shrink-0',
                            notification.read ? 'text-muted-foreground/40' : 'text-primary'
                          )}
                        />
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {notification.message}
                      </p>
                      {notification.link && (
                        <div className="mt-4">
                          <button
                            onClick={() => {
                              if (!notification.read) {
                                markAsRead(notification.id).then(() =>
                                  queryClient.invalidateQueries({ queryKey: ['notifications'] })
                                );
                              }
                              navigate(notification.link);
                            }}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Voir le détail
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {!isLoading && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filtered.length} notification(s) sur {notifTotalCount}
              </p>
              {notifTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotifPage((p) => p - 1)}
                    disabled={!notifHasPrev}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {notifPage} / {notifTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotifPage((p) => p + 1)}
                    disabled={!notifHasNext}
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── History tab ──────────────────────────────────────── */}
        {canManageBroadcasts && (
          <TabsContent value="history" className="mt-4">
            <BroadcastHistory />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

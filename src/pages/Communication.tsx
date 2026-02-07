import { useState } from 'react';
import { Search, Megaphone, Calendar, Loader2, ExternalLink, CircleDot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

export default function Communication() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const filtered = notifications.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication syndicale</h1>
        <p className="text-muted-foreground mt-1">
          Restez informé des actualités et annonces du S.N.E.C.E.A.
        </p>
      </div>

      {/* Filters */}
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

      {/* Notifications */}
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
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          notification.read
                            ? 'bg-muted'
                            : 'bg-primary/10'
                        )}
                      >
                        <Megaphone
                          className={cn(
                            'w-5 h-5',
                            notification.read
                              ? 'text-muted-foreground'
                              : 'text-primary'
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

                  {/* Content */}
                  <p className="text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>

                  {/* Link */}
                  {notification.link && (
                    <div className="mt-4">
                      <a
                        href={notification.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir
                      </a>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* Summary */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} notification(s)
        </p>
      )}
    </div>
  );
}

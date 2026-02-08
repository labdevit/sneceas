import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Building2, FolderOpen, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  searchGlobal,
  type GlobalSearchResults,
  type SearchTicketResult,
  type SearchCompanyResult,
  type SearchDocumentResult,
} from '@/lib/api/search';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResults | null>(null);

  const debouncedQuery = useDebounce(query.trim(), 350);

  // Fetch results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    searchGlobal(debouncedQuery).then((data) => {
      if (!cancelled) {
        setResults(data);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const goTo = useCallback(
    (path: string) => {
      navigate(path);
      setIsOpen(false);
      setQuery('');
    },
    [navigate],
  );

  const totalResults =
    (results?.tickets.length ?? 0) +
    (results?.companies.length ?? 0) +
    (results?.documents.length ?? 0);

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Rechercher requêtes, documents...  ⌘K"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-8 bg-background border-input input-focus"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Recherche en cours…</span>
            </div>
          ) : results && totalResults === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Aucun résultat pour « {debouncedQuery} »
            </div>
          ) : results ? (
            <div className="max-h-80 overflow-y-auto">
              {/* Tickets */}
              {results.tickets.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    <FileText className="w-3 h-3 inline mr-1.5" />
                    Requêtes ({results.tickets.length})
                  </div>
                  {results.tickets.slice(0, 5).map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => goTo(`/tickets/${ticket.id}`)}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {ticket.reference}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {ticket.status_label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">{ticket.company_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Companies */}
              {results.companies.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    <Building2 className="w-3 h-3 inline mr-1.5" />
                    Compagnies ({results.companies.length})
                  </div>
                  {results.companies.slice(0, 3).map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => goTo('/admin')}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {company.sector || 'Compagnie'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Documents */}
              {results.documents.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    <FolderOpen className="w-3 h-3 inline mr-1.5" />
                    Documents ({results.documents.length})
                  </div>
                  {results.documents.slice(0, 3).map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => goTo('/documents')}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <FolderOpen className="w-4 h-4 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.document_type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

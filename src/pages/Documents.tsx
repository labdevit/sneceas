import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, FolderOpen, FileText, Download, Calendar, ChevronRight, Loader2, Eye, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchDocuments, type ApiDocument } from '@/lib/api/documents';
import { useQuery } from '@tanstack/react-query';
import { resolveFileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import DocumentPreviewDialog from '@/components/documents/DocumentPreviewDialog';
import DocumentShareDialog from '@/components/documents/DocumentShareDialog';

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<ApiDocument | null>(null);
  const [shareDoc, setShareDoc] = useState<ApiDocument | null>(null);

  const handleDownload = useCallback((doc: ApiDocument) => {
    const url = doc.file_url || doc.file;
    if (!url) return;
    const token = localStorage.getItem('snecea_token');
    const scheme = import.meta.env.VITE_AUTH_SCHEME ?? 'Token';
    const hdrs: Record<string, string> = {};
    if (token) hdrs['Authorization'] = `${scheme} ${token}`;

    fetch(resolveFileUrl(url), { headers: hdrs })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        // Extract extension from the URL and ensure filename has it
        const urlPath = (doc.file_url || doc.file || '').split('?')[0];
        const urlExt = urlPath.includes('.') ? '.' + urlPath.split('.').pop() : '';
        const baseName = doc.name || 'document';
        const fileName = baseName.includes('.') ? baseName : baseName + urlExt;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        window.open(resolveFileUrl(doc.file || doc.file_url || ''), '_blank');
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryParams: Record<string, string | undefined> = { page_size: '1000' };
  if (debouncedSearch) queryParams.q = debouncedSearch;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', queryParams],
    queryFn: () => fetchDocuments(queryParams),
  });

  const years = [
    ...new Set(
      documents
        .map((d) => d.generated_at ?? d.created_at ?? d.updated_at)
        .filter((dateStr): dateStr is string => !!dateStr)
        .map((dateStr) => new Date(dateStr).getFullYear())
        .filter((year) => Number.isFinite(year)),
    ),
  ].sort((a, b) => b - a);

  const filteredDocuments = documents.filter((doc) => {
    const dateStr = doc.generated_at ?? doc.created_at ?? doc.updated_at;
    const year = dateStr ? new Date(dateStr).getFullYear() : null;
    const matchesYear =
      yearFilter === 'all' || (year !== null && year === parseInt(yearFilter));
    return matchesYear;
  });

  // Group by template name
  const groupedDocuments = useMemo(
    () =>
      filteredDocuments.reduce<Record<string, typeof documents>>((acc, doc) => {
        const category = doc.template_name || 'Autres';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(doc);
        return acc;
      }, {}),
    [filteredDocuments]
  );

  // Auto-expand all categories when documents first load
  const [didAutoExpand, setDidAutoExpand] = useState(false);
  useEffect(() => {
    if (didAutoExpand) return;
    const cats = Object.keys(groupedDocuments);
    if (cats.length > 0) {
      setOpenCategories(cats);
      setDidAutoExpand(true);
    }
  }, [groupedDocuments, didAutoExpand]);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">
          Accédez aux documents syndicaux, conventions et ressources.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les années</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents by category */}
      <div className="space-y-4">
        {Object.entries(groupedDocuments).length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun document trouvé</p>
          </div>
        ) : (
          Object.entries(groupedDocuments).map(([category, docs]) => (
            <Collapsible
              key={category}
              open={openCategories.includes(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'w-full flex items-center justify-between p-4 bg-card rounded-xl border shadow-card',
                    'hover:bg-accent/50 transition-colors'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{category}</h3>
                      <p className="text-sm text-muted-foreground">
                        {docs.length} document(s)
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      'w-5 h-5 text-muted-foreground transition-transform',
                      openCategories.includes(category) && 'rotate-90'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 pl-4">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.template_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {(() => {
                                const dateStr = doc.generated_at ?? doc.created_at ?? doc.updated_at;
                                if (!dateStr) return '';
                                return new Date(dateStr).getFullYear();
                              })()}
                            </div>
                            {doc.ticket_reference && (
                              <Badge variant="secondary" className="text-xs">
                                {doc.ticket_reference}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Aperçu</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Télécharger</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setShareDoc(doc)}
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Partager</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground">
        {filteredDocuments.length} document(s) disponible(s)
      </p>

      {/* Preview dialog */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        previewUrl={previewDoc?.preview_url || previewDoc?.file_url || null}
        title={previewDoc?.template_name || previewDoc?.name || 'Document'}
      />

      {/* Share dialog */}
      {shareDoc && (
        <DocumentShareDialog
          open={!!shareDoc}
          onOpenChange={(open) => { if (!open) setShareDoc(null); }}
          documentId={shareDoc.id}
          documentName={shareDoc.template_name || shareDoc.name || 'Document'}
        />
      )}
    </div>
  );
}

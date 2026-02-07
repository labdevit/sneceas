import { useState } from 'react';
import { Search, FolderOpen, FileText, Download, Calendar, ChevronRight, Loader2 } from 'lucide-react';
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
import { fetchDocuments } from '@/lib/api/documents';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  });

  const years = [...new Set(documents.map((d) => new Date(d.created_at).getFullYear()))].sort((a, b) => b - a);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'all' || new Date(doc.created_at).getFullYear() === parseInt(yearFilter);
    return matchesSearch && matchesYear;
  });

  // Group by document_type
  const groupedDocuments = filteredDocuments.reduce<Record<string, typeof documents>>((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {});

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
                          <p className="font-medium">{doc.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(doc.created_at).getFullYear()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.file} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </a>
                      </Button>
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
    </div>
  );
}

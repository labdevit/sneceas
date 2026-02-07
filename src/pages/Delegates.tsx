import { useState } from 'react';
import { Search, Phone, Mail, Building2, User, Loader2 } from 'lucide-react';
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
import { fetchDelegates } from '@/lib/api/delegates';
import { fetchCompanies } from '@/lib/api/companies';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function Delegates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  const { data: delegates = [], isLoading: isLoadingDelegates } = useQuery({
    queryKey: ['delegates'],
    queryFn: fetchDelegates,
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  });

  const isLoading = isLoadingDelegates || isLoadingCompanies;

  const filteredDelegates = delegates.filter((delegate) => {
    const matchesSearch = delegate.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = companyFilter === 'all' || delegate.company === companyFilter;
    return matchesSearch && matchesCompany && delegate.active;
  });

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
        <h1 className="text-2xl font-bold tracking-tight">Annuaire des délégués</h1>
        <p className="text-muted-foreground mt-1">
          Trouvez et contactez les délégués syndicaux de votre compagnie.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un délégué..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Toutes les compagnies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les compagnies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Delegates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDelegates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun délégué trouvé</p>
          </div>
        ) : (
          filteredDelegates.map((delegate) => (
            <div
              key={delegate.id}
              className="bg-card rounded-xl border shadow-card p-6 card-interactive"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {delegate.username.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {delegate.username}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {delegate.company_name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    Délégué syndical
                  </Badge>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`tel:${delegate.phone}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {delegate.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`mailto:${delegate.email}`}
                    className="text-muted-foreground hover:text-primary transition-colors truncate"
                  >
                    {delegate.email}
                  </a>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1" asChild>
                  <a href={`tel:${delegate.phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </a>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`mailto:${delegate.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </a>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground">
        {filteredDelegates.length} délégué(s) trouvé(s)
      </p>
    </div>
  );
}

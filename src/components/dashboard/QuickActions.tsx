import { Link } from 'react-router-dom';
import { PlusCircle, FileText, Users, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  variant: 'primary' | 'secondary' | 'accent';
}

const actions: QuickAction[] = [
  {
    label: 'Nouvelle requête',
    description: 'Soumettre une demande',
    icon: PlusCircle,
    href: '/submit',
    variant: 'primary',
  },
  {
    label: 'Mes requêtes',
    description: 'Suivre mes dossiers',
    icon: FileText,
    href: '/tickets',
    variant: 'secondary',
  },
  {
    label: 'Délégués',
    description: 'Contacter un délégué',
    icon: Users,
    href: '/delegates',
    variant: 'accent',
  },
  {
    label: 'Documents',
    description: 'Consulter les ressources',
    icon: FolderOpen,
    href: '/documents',
    variant: 'secondary',
  },
];

const variantStyles = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  accent: 'bg-accent text-accent-foreground hover:bg-accent/80',
};

const iconVariantStyles = {
  primary: 'bg-primary-foreground/20',
  secondary: 'bg-secondary-foreground/10',
  accent: 'bg-accent-foreground/10',
};

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            to={action.href}
            className={cn(
              'group relative rounded-xl p-5 transition-all duration-200',
              'hover:shadow-lg hover:-translate-y-0.5',
              variantStyles[action.variant]
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
              iconVariantStyles[action.variant]
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-semibold">{action.label}</p>
            <p className="text-sm opacity-80">{action.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

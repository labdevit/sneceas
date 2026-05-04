import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-status-resolved/10 border-status-resolved/20',
  warning: 'bg-urgency-medium/10 border-urgency-medium/20',
  danger: 'bg-urgency-critical/10 border-urgency-critical/20',
};

const iconVariantStyles = {
  default: 'bg-secondary text-secondary-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-status-resolved/20 text-status-resolved',
  warning: 'bg-urgency-medium/20 text-urgency-medium',
  danger: 'bg-urgency-critical/20 text-urgency-critical',
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6 shadow-card card-interactive',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p className={cn(
              'text-sm font-medium',
              trend.isPositive ? 'text-status-resolved' : 'text-urgency-critical'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}% vs. mois dernier
            </p>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          iconVariantStyles[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

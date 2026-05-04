import { cn } from '@/lib/utils';
import type { TicketUrgency } from '@/types';
import { urgencyLabels } from '@/lib/mock-data';
import { AlertTriangle, AlertCircle, AlertOctagon, Circle } from 'lucide-react';

interface UrgencyBadgeProps {
  urgency: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const urgencyConfig: Record<TicketUrgency, { 
  class: string; 
  icon: React.ComponentType<{ className?: string }> 
}> = {
  low: { 
    class: 'badge-urgency-low', 
    icon: Circle 
  },
  medium: { 
    class: 'badge-urgency-medium', 
    icon: AlertCircle 
  },
  high: { 
    class: 'badge-urgency-high', 
    icon: AlertTriangle 
  },
  critical: { 
    class: 'badge-urgency-critical', 
    icon: AlertOctagon 
  },
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export function UrgencyBadge({ 
  urgency, 
  showIcon = true, 
  size = 'md',
  className 
}: UrgencyBadgeProps) {
  const config = urgencyConfig[urgency as TicketUrgency] ?? { class: 'bg-muted text-muted-foreground', icon: Circle };
  const Icon = config.icon;

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        config.class,
        sizeStyles[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {urgencyLabels[urgency] ?? urgency}
    </span>
  );
}

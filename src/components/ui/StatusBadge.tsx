import { cn } from '@/lib/utils';
import type { TicketStatus } from '@/types';
import { statusLabels } from '@/lib/mock-data';
import { 
  Circle, 
  HelpCircle, 
  Loader2, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

interface StatusBadgeProps {
  status: TicketStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<TicketStatus, { 
  class: string; 
  icon: React.ComponentType<{ className?: string }> 
}> = {
  new: { 
    class: 'badge-status-new', 
    icon: Circle 
  },
  info_needed: { 
    class: 'badge-status-info-needed', 
    icon: HelpCircle 
  },
  processing: { 
    class: 'badge-status-processing', 
    icon: Loader2 
  },
  hr_escalated: { 
    class: 'badge-status-hr-escalated', 
    icon: Users 
  },
  hr_pending: { 
    class: 'badge-status-hr-escalated', 
    icon: Clock 
  },
  resolved: { 
    class: 'badge-status-resolved', 
    icon: CheckCircle2 
  },
  non_resolu: { 
    class: 'badge-status-non-resolu', 
    icon: XCircle 
  },
  closed: { 
    class: 'badge-status-closed', 
    icon: XCircle 
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

export function StatusBadge({ 
  status, 
  showIcon = true, 
  size = 'md',
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status];
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
      {showIcon && <Icon className={cn(iconSizes[size], status === 'processing' && 'animate-spin')} />}
      {statusLabels[status]}
    </span>
  );
}

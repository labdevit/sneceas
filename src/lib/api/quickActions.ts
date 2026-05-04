import { apiGet, type Paginated, unwrap } from '../api';

export interface ApiQuickAction {
  id: string;
  label: string;
  code: string;
  description: string;
  pole: string;
  pole_name: string;
  icon: string;
  action_type: 'status_change' | 'assign' | 'create_activity' | 'generate_document' | 'custom';
  config: Record<string, unknown>;
  order: number;
  active: boolean;
}

export const fetchQuickActions = async (params?: Record<string, string | undefined>) =>
  unwrap(
    await apiGet<Paginated<ApiQuickAction> | ApiQuickAction[]>(
      '/quick-actions/',
      params,
    ),
  );

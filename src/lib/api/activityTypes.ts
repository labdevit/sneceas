import { apiGet, type Paginated, unwrap } from '../api';

export interface ActivityTypeFieldConfig {
  id: string;
  name: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'boolean' | 'file' | 'choice';
  required: boolean;
  order: number;
  options: string[] | null;
}

export interface ApiActivityType {
  id: string;
  code: string;
  label: string;
  primary_pole: string | null;
  primary_pole_name: string | null;
  poles: string[];
  default_channel: string;
  active: boolean;
  fields_config: ActivityTypeFieldConfig[];
}

export const fetchActivityTypes = async (params?: Record<string, string | undefined>) =>
  unwrap(
    await apiGet<Paginated<ApiActivityType> | ApiActivityType[]>(
      '/activity-types/',
      params,
    ),
  );

/** Activity types accessible to the current user (based on their poles) */
export const fetchMyActivityTypes = () =>
  apiGet<ApiActivityType[]>('/activity-types/mine/');

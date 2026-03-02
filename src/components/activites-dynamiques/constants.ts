export const TYPE_CHAMP_ACTIVITE = [
  'text',
  'textarea',
  'number',
  'date',
  'datetime',
  'boolean',
  'file',
  'choice',
] as const;
export type TypeChampActivite = (typeof TYPE_CHAMP_ACTIVITE)[number];

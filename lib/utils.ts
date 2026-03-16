export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>
  | ClassValue[];

const flattenClassValue = (value: ClassValue): string[] => {
  if (!value) return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(flattenClassValue);

  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([className]) => className);
};

export const cn = (...inputs: ClassValue[]): string => inputs.flatMap(flattenClassValue).join(' ');
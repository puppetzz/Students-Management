export function transformUpdateData<T extends object>(
  data: T,
): Partial<Record<keyof T, NonNullable<T[keyof T]>>> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  ) as Partial<Record<keyof T, NonNullable<T[keyof T]>>>;
}

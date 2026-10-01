export const localDateTimeInput = (date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const localDateInput = (date = new Date()): string => localDateTimeInput(date).slice(0, 10);

/** Calendar-only documents are not UTC instants. */
export const displayLocalDate = (value: string): string => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString("en-PK");
};

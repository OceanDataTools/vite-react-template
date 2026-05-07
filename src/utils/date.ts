export const toDatetimeLocal = (iso: string): string => {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16)
}

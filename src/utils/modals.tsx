export function getDialog(id: string): HTMLDialogElement | null {
  const el = document.getElementById(id)
  return el instanceof HTMLDialogElement ? el : null
}

/** Construye el enlace de WhatsApp con mensaje prellenado (`wa.me/<número>?text=...`). */
export function whatsAppUrl(number: string, message: string): string {
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${number}?${params.toString()}`;
}

/** Mensaje prellenado que identifica la casa desde la que se originó la consulta. */
export function whatsAppMessageForHouse(houseName: string): string {
  return `Hola! Quería consultar por ${houseName} de Las Petras.`;
}

/** Mensaje prellenado genérico, sin mencionar una casa en particular (usado desde el inicio). */
export function whatsAppGenericMessage(): string {
  return 'Hola! Quería consultar por las casas de Las Petras.';
}

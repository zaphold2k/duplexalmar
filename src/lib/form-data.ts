/**
 * Lee un campo de texto de un `FormData`. Si el cliente mandó un archivo en
 * ese campo en vez de texto, devuelve `''` en lugar de "[object File]".
 */
export function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

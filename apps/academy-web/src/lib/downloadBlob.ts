/**
 * Zapisuje Blob jako plik na dysku.
 *
 * Pobieranie przez `<a href="/api/…" download>` nie działa dla chronionych endpointów:
 * przeglądarka nawiguje bez nagłówka `Authorization`, serwer odpowiada 401 z ciałem JSON,
 * a atrybut `download` zapisuje to JSON-owe ciało jako plik. Pliki trzeba więc pobierać
 * przez axios (`responseType: 'blob'`), a dopiero wynik zapisywać tą funkcją.
 */
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

// Czysta reguła: czy wynik synchronizacji uzasadnia skasowanie z bazy wystąpień,
// których nie ma już w świeżo pobranym pliku .ics.
//
// Zero sparsowanych wydarzeń jest niejednoznaczne — może oznaczać, że właścicielka
// faktycznie wyczyściła kalendarz, ale równie dobrze może to być efekt uciętej
// odpowiedzi serwera (np. 200 OK z przerwanym połączeniem), którą strażnik parsera
// przepuścił. Żeby nie ryzykować utraty danych przy fałszywym alarmie, w tym
// przypadku NIE kasujemy — legalnie opróżniony kalendarz i tak odzyska spójność przy
// najbliższej synchronizacji, która zwróci choć jedno wydarzenie.
export function shouldDeleteStale(parsedEventCount: number): boolean {
  return parsedEventCount > 0;
}

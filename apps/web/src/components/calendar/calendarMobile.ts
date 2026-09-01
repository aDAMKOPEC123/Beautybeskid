/**
 * Czy pokazać przycisk „Dziś".
 *
 * Pokazujemy go wyłącznie wtedy, gdy nie stoimy na dzisiejszym dniu — zabierałby
 * miejsce dokładnie w chwili, w której jest niepotrzebny, a na telefonie każdy
 * element górnej belki konkuruje o tę samą szerokość.
 */
export function shouldShowTodayButton(anchor: Date, today: Date): boolean {
  return (
    anchor.getFullYear() !== today.getFullYear() ||
    anchor.getMonth() !== today.getMonth() ||
    anchor.getDate() !== today.getDate()
  );
}

/**
 * Klucz zapamiętywania stanu legendy.
 *
 * Telefon i komputer mają osobne klucze, bo mają nieporównywalne budżety
 * wysokości: legenda rozwinięta na komputerze zabierała na telefonie 90 px
 * z około 200 px dostępnych na siatkę. Klucz komputera zostaje bez zmian, żeby
 * nie skasować wyboru, który użytkownicy już zapisali.
 */
export function storageKeyFor(isMobile: boolean): string {
  return isMobile ? 'cosmo-calendar-legend-open-mobile' : 'cosmo-calendar-legend-open';
}

type Seller = {
  legalName: string;
  displayName: string;
  taxId: string | null;
  registryNumber: string | null;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
};

const sellerBlock = (seller: Seller) => `${seller.legalName}
adres: ${seller.street}, ${seller.postalCode} ${seller.city}, ${seller.country}
NIP: ${seller.taxId || '[DO UZUPEŁNIENIA PRZED URUCHOMIENIEM SPRZEDAŻY]'}${seller.registryNumber ? `\nREGON/KRS: ${seller.registryNumber}` : ''}
e-mail: ${seller.email}
telefon: ${seller.phone}`;

export const LEGAL_VERSION = '2026-07-15';

export const defaultLegalDocuments = (seller: Seller) => ({
  TERMS: {
    title: 'Regulamin Akademii BeskidStudio',
    content: `REGULAMIN SPRZEDAŻY I KORZYSTANIA Z AKADEMII BESKIDSTUDIO
Wersja: ${LEGAL_VERSION}

1. SPRZEDAWCA I KONTAKT
Sprzedawcą i usługodawcą jest:
${sellerBlock(seller)}

2. ZAKRES REGULAMINU
Regulamin określa zasady zakładania konta, zawierania umów na odległość, płatności, dostarczania kursów i innych treści cyfrowych, korzystania ze wsparcia oraz składania reklamacji.

3. WYMAGANIA TECHNICZNE
Do korzystania z Akademii potrzebne są: aktualna przeglądarka internetowa z włączoną obsługą JavaScript, dostęp do internetu, aktywny adres e-mail oraz urządzenie umożliwiające odtwarzanie materiałów audio i wideo. Użytkownik powinien chronić dane logowania i nie udostępniać konta osobom trzecim.

4. KONTO
Utworzenie konta jest bezpłatne. Użytkownik podaje prawdziwe dane i akceptuje aktualny Regulamin oraz Politykę prywatności. Konto i licencja na kurs są przeznaczone dla jednej osoby. Użytkownik może zażądać usunięcia konta, z zastrzeżeniem obowiązków prawnych dotyczących przechowywania dokumentacji sprzedaży.

5. OFERTA I CENY
Opis kursu wskazuje zakres materiału, czas dostępu, wymagania, cenę brutto albo informację o zwolnieniu podatkowym, o ile ma zastosowanie. Cena widoczna w podsumowaniu zamówienia jest ceną całkowitą. W przypadku obniżki prezentowana jest także najniższa cena z 30 dni przed obniżką.

6. ZAWARCIE UMOWY I PŁATNOŚĆ
Przed złożeniem zamówienia użytkownik otrzymuje podsumowanie produktu, ceny, okresu dostępu, danych sprzedawcy i wymaganych zgód. Umowa zostaje zawarta po użyciu przycisku jednoznacznie wskazującego obowiązek zapłaty i skutecznym potwierdzeniu płatności. Potwierdzenie umowy jest wysyłane na trwałym nośniku na adres e-mail przypisany do konta.

7. DOSTARCZENIE TREŚCI CYFROWEJ
Dostęp jest nadawany automatycznie po potwierdzeniu płatności przez operatora. Użytkownik może dobrowolnie zażądać rozpoczęcia dostarczania treści cyfrowej przed upływem terminu na odstąpienie oraz przyjąć do wiadomości konsekwencje tej decyzji. Okres dostępu jest liczony od dnia nadania dostępu, o ile oferta nie stanowi inaczej.

8. PRAWO ODSTĄPIENIA
Konsument co do zasady może odstąpić od umowy zawartej na odległość w ciągu 14 dni. W przypadku treści cyfrowych niedostarczanych na nośniku materialnym prawo to może wygasnąć po rozpoczęciu świadczenia, jeżeli konsument uprzednio wyraził wyraźną zgodę, został poinformowany o utracie prawa, przyjął to do wiadomości oraz otrzymał potwierdzenie umowy. Formularz i instrukcja znajdują się w sekcji „Odstąpienie od umowy”.

9. ZGODNOŚĆ TREŚCI CYFROWEJ Z UMOWĄ
Sprzedawca odpowiada za zgodność kursu z umową, w szczególności jego opis, kompletność, funkcjonalność, kompatybilność i dostępność przez zadeklarowany okres. W razie braku zgodności konsument może skorzystać ze środków ochrony przewidzianych ustawą o prawach konsumenta.

10. REKLAMACJE I WSPARCIE
Reklamacje można składać przez panel Akademii lub na adres ${seller.email}. Należy opisać problem, wskazać kurs i oczekiwane rozwiązanie. Odpowiedź zostanie udzielona w terminie wymaganym prawem. Szczegóły znajdują się w sekcji „Reklamacje”.

11. PRAWA AUTORSKIE I CERTYFIKATY
Materiały są chronione prawem autorskim. Zakup daje niewyłączną, niezbywalną licencję do osobistego korzystania w okresie dostępu. Zabronione jest kopiowanie, odsprzedaż, publiczne udostępnianie i przekazywanie danych logowania. Certyfikat potwierdza ukończenie programu Akademii; sam w sobie nie nadaje państwowych uprawnień zawodowych ani prawa wykonywania zawodu regulowanego.

12. OPINIE
Opinie oznaczone jako zweryfikowane mogą wystawiać wyłącznie osoby, które otrzymały dostęp i ukończyły kurs. Opinie mogą podlegać moderacji wyłącznie pod kątem zgodności z prawem, bezpieczeństwa danych i zasad publikacji; ocena nie jest zmieniana.

13. POZASĄDOWE ROZWIĄZYWANIE SPORÓW
Konsument może skorzystać z pomocy miejskiego lub powiatowego rzecznika konsumentów oraz właściwych podmiotów polubownego rozwiązywania sporów wskazanych przez UOKiK.

14. ZMIANY REGULAMINU
Zmiany nie naruszają praw nabytych ani warunków już opłaconego dostępu. O istotnych zmianach użytkownik zostanie poinformowany na trwałym nośniku. Dla każdego zamówienia zapisywana jest zaakceptowana wersja Regulaminu.

15. PRAWO WŁAŚCIWE
W sprawach nieuregulowanych stosuje się prawo polskie, w szczególności ustawę o prawach konsumenta, ustawę o świadczeniu usług drogą elektroniczną, Kodeks cywilny i RODO.`,
  },
  PRIVACY: {
    title: 'Polityka prywatności Akademii',
    content: `POLITYKA PRYWATNOŚCI AKADEMII BESKIDSTUDIO
Wersja: ${LEGAL_VERSION}

1. ADMINISTRATOR DANYCH
Administratorem danych jest ${sellerBlock(seller)}.

2. CELE I PODSTAWY PRZETWARZANIA
Dane są przetwarzane w celu: utworzenia i obsługi konta; zawarcia i wykonania umowy; obsługi płatności, dokumentów księgowych, reklamacji i wsparcia; ochrony przed nadużyciami; realizacji obowiązków podatkowych i rachunkowych; oraz — po uzyskaniu zgody — prowadzenia analityki i marketingu.

3. ZAKRES DANYCH
Przetwarzamy dane konta, dane rozliczeniowe, historię zamówień, postęp nauki, wyniki quizów, notatki, wiadomości do wsparcia, dane techniczne niezbędne dla bezpieczeństwa oraz zgody wraz z wersją dokumentu. Dane płatnicze karty są przetwarzane przez operatora płatności i nie są zapisywane w Akademii.

4. ODBIORCY
Dane mogą być powierzane dostawcom hostingu, poczty transakcyjnej, operatorowi płatności, dostawcom usług logowania i wideo, księgowości oraz podmiotom uprawnionym na podstawie prawa. Dostawcy otrzymują wyłącznie dane potrzebne do realizacji ich zadań.

5. OKRES PRZECHOWYWANIA
Dane konta są przechowywane przez czas korzystania z Akademii i okres potrzebny do obsługi roszczeń. Dokumentację sprzedaży przechowujemy przez okres wynikający z przepisów podatkowych i rachunkowych. Dane oparte na zgodzie są przetwarzane do jej cofnięcia, a dane bezpieczeństwa przez okres niezbędny do wykrywania nadużyć.

6. PRAWA
Osobie przysługuje prawo dostępu, sprostowania, usunięcia, ograniczenia, przenoszenia danych, sprzeciwu oraz cofnięcia zgody. Przysługuje także skarga do Prezesa Urzędu Ochrony Danych Osobowych. Wnioski można przesyłać na ${seller.email}.

7. PRZEKAZYWANIE POZA EOG
Jeżeli dostawca technologiczny przetwarza dane poza Europejskim Obszarem Gospodarczym, administrator stosuje wymagany prawem mechanizm transferu, w szczególności decyzję stwierdzającą odpowiedni stopień ochrony lub standardowe klauzule umowne.

8. BEZPIECZEŃSTWO
Stosujemy kontrolę dostępu, szyfrowanie transmisji, sesje chronione, prywatne pliki, kopie zapasowe i rejestrowanie kluczowych zdarzeń. Użytkownik powinien używać unikalnego hasła i chronić dostęp do skrzynki e-mail.

9. KONTAKT
Pytania dotyczące danych osobowych można kierować na ${seller.email}.`,
  },
  COOKIES: {
    title: 'Polityka cookies',
    content: `POLITYKA COOKIES AKADEMII BESKIDSTUDIO
Wersja: ${LEGAL_VERSION}

Akademia używa niezbędnych plików cookies i pamięci przeglądarki do utrzymania bezpiecznej sesji, zapamiętania ustawień i ochrony formularzy. Te mechanizmy są konieczne do działania usługi.

Analityka zachowania, pomiar kampanii i inne mechanizmy opcjonalne są uruchamiane dopiero po zgodzie. Zgodę można w każdej chwili zmienić w ustawieniach cookies dostępnych w stopce. Cofnięcie zgody nie wpływa na zgodność wcześniejszego przetwarzania.

Osadzone materiały zewnętrzne, np. wideo, mogą łączyć się z dostawcą dopiero po świadomym uruchomieniu materiału. Szczegóły o odbiorcach i prawach znajdują się w Polityce prywatności.`,
  },
  WITHDRAWAL: {
    title: 'Odstąpienie od umowy',
    content: `ODSTĄPIENIE OD UMOWY ZAWARTEJ NA ODLEGŁOŚĆ

Konsument może co do zasady odstąpić od umowy w ciągu 14 dni od jej zawarcia. Oświadczenie można przesłać na ${seller.email} lub pocztą na adres ${seller.street}, ${seller.postalCode} ${seller.city}.

Jeżeli konsument wyraźnie zażądał natychmiastowego dostarczenia treści cyfrowej, przyjął do wiadomości utratę prawa odstąpienia i otrzymał potwierdzenie tych oświadczeń, prawo odstąpienia może wygasnąć po rozpoczęciu dostarczania treści.

WZÓR FORMULARZA
Adresat: ${seller.legalName}, ${seller.street}, ${seller.postalCode} ${seller.city}, ${seller.email}
Ja/My niniejszym informuję/informujemy o odstąpieniu od umowy dotyczącej kursu: ................................
Data zawarcia umowy: ................................
Numer zamówienia: ................................
Imię i nazwisko konsumenta: ................................
Adres e-mail konta: ................................
Data i podpis (tylko dla formularza papierowego): ................................`,
  },
  COMPLAINTS: {
    title: 'Reklamacje',
    content: `REKLAMACJE TREŚCI I USŁUG CYFROWYCH

Reklamację można złożyć przez sekcję „Zapytaj kosmetologa” wybierając kategorię „Reklamacja” albo e-mailem na ${seller.email}. W zgłoszeniu warto podać numer zamówienia, nazwę kursu, opis niezgodności, datę jej wystąpienia i oczekiwane rozwiązanie.

Sprzedawca odpowiada za zgodność treści cyfrowej z umową. Konsument może żądać doprowadzenia treści do zgodności, a w przypadkach przewidzianych prawem także obniżenia ceny lub odstąpienia od umowy. Reklamacja zostanie rozpatrzona w terminie wymaganym ustawą o prawach konsumenta.

Problemy techniczne i pytania o materiał można zgłaszać tym samym kanałem. Zgłoszenie reklamacyjne nie wymaga użycia specjalnego formularza.`,
  },
  ACCESSIBILITY: {
    title: 'Informacja o dostępności usługi',
    content: `INFORMACJA O DOSTĘPNOŚCI AKADEMII BESKIDSTUDIO

Akademia jest usługą handlu elektronicznego umożliwiającą przeglądanie oferty, zakup dostępu, naukę, rozwiązywanie quizów, pobieranie certyfikatów i kontakt ze wsparciem.

Serwis jest projektowany do obsługi klawiaturą, współpracy z technologiami asystującymi, powiększania tekstu, logicznej kolejności nagłówków, czytelnych etykiet formularzy i komunikatów o błędach. Materiały wideo powinny otrzymywać napisy lub równoważną transkrypcję, a obrazy przekazujące informację — tekst alternatywny.

Jeżeli napotkasz barierę, zgłoś ją na ${seller.email} lub telefonicznie ${seller.phone}. W zgłoszeniu opisz stronę, problem, używane urządzenie i preferowany sposób kontaktu. Odpowiemy i zaproponujemy dostępny sposób realizacji usługi.`,
  },
});

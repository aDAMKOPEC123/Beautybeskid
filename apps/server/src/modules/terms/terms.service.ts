// filepath: apps/server/src/modules/terms/terms.service.ts
import { prisma } from '../../config/prisma';

const DEFAULT_TERMS = `REGULAMIN GABINETU BeskidStudio By Wiktoria Ćwik

§1. POSTANOWIENIA OGÓLNE
Niniejszy regulamin określa zasady korzystania z usług gabinetu kosmetologicznego BeskidStudio By Wiktoria Ćwik, w tym programu lojalnościowego, rabatów oraz systemu rezerwacji online.

§2. USŁUGI KOSMETOLOGICZNE
1. Gabinet BeskidStudio By Wiktoria Ćwik świadczy profesjonalne usługi kosmetologiczne.
2. Przed każdym zabiegiem przeprowadzany jest wywiad zdrowotny.
3. Klient zobowiązany jest do poinformowania o alergiach, schorzeniach skóry oraz przyjmowanych lekach.

§3. RYZYKO POWIKŁAŃ
1. Zabiegi kosmetologiczne, jak każda procedura estetyczna, mogą wiązać się z ryzykiem wystąpienia reakcji niepożądanych.
2. Możliwe reakcje obejmują: zaczerwienienie, obrzęk, swędzenie, przebarwienia skóry.
3. Gabinet nie ponosi odpowiedzialności za powikłania wynikające z zatajenia informacji zdrowotnych przez klienta.
4. W razie niepokojących objawów po zabiegu należy niezwłocznie skontaktować się z gabinetem.

§4. PROGRAM LOJALNOŚCIOWY
1. Klienci zbierają punkty lojalnościowe za każdą opłaconą wizytę.
2. Poziomy lojalnościowe: Brąz (0–499 pkt), Srebro (500–1499 pkt), Złoto (1500+ pkt).
3. Punkty można wymieniać na nagrody i rabaty dostępne w katalogu programu lojalnościowego.
4. Punkty nie podlegają wymianie na gotówkę.

§5. RABATY I KODY AMBASADORSKIE
1. Klienci otrzymują indywidualny kod ambasadorski, którym mogą dzielić się z innymi osobami.
2. Osoby rejestrujące się przy użyciu kodu ambasadorskiego otrzymują kod rabatowy powitalny.
3. Rabaty nie łączą się, chyba że regulamin promocji stanowi inaczej.

§6. REZERWACJE I ODWOŁANIA
1. Wizyty można rezerwować przez aplikację online lub telefonicznie.
2. Odwołanie wizyty powinno nastąpić co najmniej 24 godziny przed planowanym terminem.
3. Nieodwołanie wizyty może skutkować utratą punktów lojalnościowych lub blokadą konta.

§7. OCHRONA DANYCH OSOBOWYCH
1. Administratorem danych osobowych jest właściciel gabinetu BeskidStudio By Wiktoria Ćwik.
2. Dane przetwarzane są w celu realizacji usług, obsługi programu lojalnościowego i kontaktu z klientem.
3. Klient ma prawo do wglądu, poprawy i usunięcia swoich danych.

§8. ZGODA MARKETINGOWA (OPCJONALNA)
1. Wyrażenie zgody marketingowej jest dobrowolne.
2. Zgoda obejmuje: powiadomienia o promocjach i nowościach, newslettery, komunikaty SMS/e-mail.

§9. ZGODA NA WYKORZYSTANIE ZDJĘĆ (OPCJONALNA)
1. Zgoda na fotografię jest dobrowolna.
2. Dotyczy zdjęć wykonanych przed i po zabiegu w celach dokumentacyjnych i marketingowych.
3. Zdjęcia mogą być publikowane w mediach społecznościowych i materiałach reklamowych gabinetu.
4. Klient może w dowolnym momencie cofnąć zgodę, kontaktując się z gabinetem.

§10. POSTANOWIENIA KOŃCOWE
1. Regulamin wchodzi w życie z dniem jego publikacji.
2. Gabinet zastrzega sobie prawo do zmiany regulaminu z powiadomieniem klientów.
3. W sprawach nieuregulowanych zastosowanie mają przepisy Kodeksu Cywilnego.`;

export const getTerms = async () => {
  let terms = await prisma.salonTerms.findFirst();
  if (!terms) {
    terms = await prisma.salonTerms.create({
      data: { content: DEFAULT_TERMS, version: '1.0' },
    });
  }
  return terms;
};

export const upsertTerms = async (content: string, version: string) => {
  const existing = await prisma.salonTerms.findFirst();
  if (existing) {
    return prisma.salonTerms.update({
      where: { id: existing.id },
      data: { content, version },
    });
  }
  return prisma.salonTerms.create({ data: { content, version } });
};

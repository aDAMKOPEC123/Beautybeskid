# Cloudflare Tunnel dla COSMO

Ten wariant korzysta z bezpłatnego Cloudflare Tunnel i tunelu zarządzanego z
panelu Cloudflare. `cloudflared` działa jako usługa systemd, uruchamia się po
restarcie VPS-a i łączy Cloudflare z Nginxem przez lokalny adres
`http://127.0.0.1:8080`.

Token tunelu nigdy nie trafia do Git, pliku `.env` aplikacji ani historii
poleceń. Instalator zapisuje go jako `/etc/cloudflared/cosmo-tunnel.token` z
dostępem wyłącznie dla roota i usługi `cloudflared`.

## Koszt

Cloudflare Free, Cloudflare Tunnel, podstawowa ochrona DDoS, HTTP/3 i cache
statycznych zasobów są wystarczające dla tego wdrożenia. Nie trzeba kupować
Argo Smart Routing, Load Balancera ani płatnego planu Zero Trust.

## 1. Podłącz domenę do Cloudflare

1. Dodaj `kosmetologwiktoriacwik.pl` w panelu Cloudflare i wybierz plan Free.
2. Ustaw u rejestratora serwery nazw podane przez Cloudflare.
3. Poczekaj, aż status domeny w Cloudflare zmieni się na `Active`.

Nie usuwaj jeszcze działającego rekordu A kierującego na VPS.

## 2. Utwórz tunel

1. W panelu Cloudflare otwórz **Networking → Tunnels**.
2. Wybierz **Create tunnel → Cloudflared**.
3. Nazwij tunel `cosmo-production`.
4. Wybierz Linux i skopiuj sam token z pokazanego polecenia instalacyjnego.

Token jest sekretem dającym możliwość uruchomienia tego konkretnego tunelu.
Nie wklejaj go do repozytorium, komunikatora ani dokumentacji.

## 3. Zainstaluj tunel na VPS-ie

Po wdrożeniu najnowszej wersji repozytorium zaloguj się przez SSH i uruchom:

```bash
cd /home/ubuntu/cosmo-app
git pull origin main
sudo bash deploy/cloudflare/install.sh
```

Instalator poprosi o token w niewidocznym polu, a następnie:

- doda oficjalne repozytorium APT Cloudflare;
- zainstaluje `cloudflared`;
- zainstaluje konfigurację Nginx z portem tylko na `127.0.0.1:8080`;
- uruchomi tunel jako usługę systemd;
- włączy cotygodniową aktualizację pakietu;
- sprawdzi lokalny origin i endpoint gotowości tunelu.

Kontrola stanu:

```bash
sudo systemctl status cloudflared-cosmo
curl -fsS http://127.0.0.1:20241/ready && echo OK
curl -I -H 'Host: kosmetologwiktoriacwik.pl' http://127.0.0.1:8080/
```

## 4. Dodaj publiczne trasy

W tunelu przejdź do **Published application routes** i dodaj dwie trasy.

### Domena główna

- Hostname: `kosmetologwiktoriacwik.pl`
- Service URL: `http://localhost:8080`
- Additional application settings → HTTP Host Header:
  `kosmetologwiktoriacwik.pl`

### Wariant www

- Hostname: `www.kosmetologwiktoriacwik.pl`
- Service URL: `http://localhost:8080`
- Additional application settings → HTTP Host Header:
  `www.kosmetologwiktoriacwik.pl`

Jeżeli panel zgłosi konflikt rekordu DNS, usuń dotychczasowy rekord A/AAAA dla
danego hosta i od razu ponów dodanie trasy. Tunel musi wcześniej mieć status
`Healthy`.

Nginx przekieruje `www` trwałym 301 na wariant bez `www`. API i Socket.IO
działają przez ten sam tunel, więc nie wymagają osobnych tras.

## 5. Ustawienia Cloudflare

Zalecane bezpłatne ustawienia:

- SSL/TLS mode: **Full (strict)**;
- Edge Certificates → Always Use HTTPS: **On**;
- Speed → Protocol Optimization → HTTP/3: **On**;
- Brotli: **On**;
- DDoS Protection: ustawienia automatyczne;
- WAF → Free Managed Ruleset: **On**.

Nie włączaj stale `Under Attack Mode` ani agresywnych challenge'y dla całej
domeny. Mogą utrudnić dostęp Googlebotowi, monitoringowi oraz botom wyszukiwarek
AI.

### Cache

Cloudflare automatycznie może cache'ować obrazy, CSS, JavaScript i fonty.
Publiczny HTML tej aplikacji ma rewalidację i na początku nie wymaga dodatkowej
reguły.

Nie używaj globalnej reguły **Cache Everything**. Bezwzględnie należy omijać
cache dla:

- `/api/*`;
- `/socket.io/*`;
- `/admin/*`, `/employee/*`, `/user/*`, `/auth/*`;
- `/akademia/*` i `/rezerwacja/*`;
- `private-spa.html`, `sw.js` i `registerSW.js`.

Po zebraniu danych można dodać osobną regułę edge cache tylko dla publicznych
stron i TTL 10–60 minut. Po każdym deployu należy wtedy czyścić cache HTML.

## 6. Test po przełączeniu DNS

```bash
curl -I https://kosmetologwiktoriacwik.pl/
curl -I https://www.kosmetologwiktoriacwik.pl/
curl -I https://kosmetologwiktoriacwik.pl/sitemap.xml
curl -I https://kosmetologwiktoriacwik.pl/socket.io/
```

Oczekiwane wyniki:

- domena główna: `200`;
- `www`: `301` do domeny głównej;
- sitemap: `200`;
- Socket.IO bez parametrów może zwrócić błąd aplikacyjny, ale nie `502`/`504`.

W odpowiedzi powinien pojawić się nagłówek `server: cloudflare` lub `cf-ray`.

## 7. Zamknięcie publicznego originu — dopiero po testach

Po co najmniej jednym poprawnym teście strony, logowania, rezerwacji, uploadu i
czatu można zamknąć przychodzące porty 80/443 w firewallu dostawcy VPS lub UFW.
Pozostaw SSH oraz ruch wychodzący TCP/UDP 7844 i HTTPS 443.

Przed zmianą UFW koniecznie upewnij się, że SSH jest dozwolone:

```bash
sudo ufw allow OpenSSH
sudo ufw status numbered
```

Usuń wyłącznie reguły przychodzące 80/443. Nie wyłączaj ruchu wychodzącego.
Samo działanie tunelu nie wymaga otwartych portów przychodzących.

## Diagnostyka

```bash
sudo journalctl -u cloudflared-cosmo -n 100 --no-pager
sudo systemctl restart cloudflared-cosmo
sudo nginx -t
curl -fsS http://127.0.0.1:20241/ready
```

`502` oznacza zwykle, że tunel działa, ale nie może połączyć się z Nginxem na
`127.0.0.1:8080`. `1033` oznacza, że Cloudflare nie widzi aktywnego konektora
tunelu.

## Zmiana tokenu

Wygeneruj nowy token w panelu Cloudflare i ponownie uruchom instalator. Nadpisze
on zabezpieczony plik tokenu oraz zrestartuje usługę.

## Wycofanie tunelu

1. Przywróć w Cloudflare poprzednie rekordy A/AAAA VPS-a.
2. Upewnij się, że porty 80/443 originu są ponownie otwarte.
3. Zatrzymaj tunel:

```bash
sudo systemctl disable --now cloudflared-cosmo
```

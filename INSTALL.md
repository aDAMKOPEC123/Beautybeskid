# Instrukcja Wdrożenia na mikr.us (VPS)

1. **Wymagania Systemowe**
   - Node.js 20 LTS
   - Nginx
   - Docker i Docker Compose
   - PM2
   - certbot (dla SSL)

2. **Instalacja Node.js, PM2 i Docker**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs docker docker-compose nginx certbot python3-certbot-nginx
   sudo npm install -g pnpm pm2
   ```

3. **Optymalizacje dla VPS (1GB RAM)**
   Utwórz plik wymiany (swap 1GB), aby uniknąć problemów z pamięcią (OOM killer):
   ```bash
   sudo fallocate -l 1G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

4. **Klonowanie i Konfiguracja Repo**
   ```bash
   git clone <repo-url> /var/www/cosmo-app
   cd /var/www/cosmo-app
   cp .env.example .env
   # Edytuj .env według potrzeb (ustaw długie, bezpieczne hasła!)
   nano .env
   ```

5. **Start Bazy Danych i Instalacja Zależności**
   ```bash
   docker-compose up -d postgres
   pnpm install
   pnpm prisma migrate deploy --schema=./apps/server/prisma/schema.prisma
   pnpm prisma generate --schema=./apps/server/prisma/schema.prisma
   pnpm prisma db seed --schema=./apps/server/prisma/schema.prisma
   ```

6. **Budowanie Aplikacji (Turborepo)**
   ```bash
   pnpm build
   ```

7. **Uruchamianie z PM2**
   Plik `ecosystem.config.js` jest już w repo. Uruchom:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

8. **Konfiguracja Nginx**
   Gotowy plik konfiguracyjny z cache headers i gzip znajduje się w `deploy/nginx/cosmo.conf`.
   Na serwerze możesz go skopiować poleceniem:
   ```bash
   sudo cp deploy/nginx/cosmo.conf /etc/nginx/sites-available/cosmo
   ```

   Utwórz `/etc/nginx/sites-available/cosmo`:
   ```nginx
   # Rate limiting dla endpointów auth (10 req/min per IP)
   limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

   server {
       listen 80;
       server_name twojadomena.pl;

       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

       location / {
           root /var/www/cosmo-app/apps/web/dist;
           try_files $uri $uri/ /index.html;
       }

       location /assets/ {
           root /var/www/cosmo-app/apps/web/dist;
           expires 1y;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }

       location /images/ {
           root /var/www/cosmo-app/apps/web/dist;
           expires 1y;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }

       location /icons/ {
           root /var/www/cosmo-app/apps/web/dist;
           expires 1y;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }

       location /uploads/ {
           alias /var/www/cosmo-app/apps/server/uploads/;
           expires 1y;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }

       location /api/auth/ {
           limit_req zone=auth_limit burst=5 nodelay;
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /socket.io/ {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/cosmo /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

9. **Aktywacja SSL**
   ```bash
   sudo certbot --nginx -d twojadomena.pl
   ```

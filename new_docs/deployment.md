# Julkaisu tuotantoon

Tämä dokumentti kuvaa, miten sovellus julkaistaan tuotantopalvelimelle, miten julkaisu perutaan, mitä ympäristömuuttujia tarvitaan ja mitkä tunnetut sudenkuopat kannattaa tietää etukäteen.

## Tuotantoympäristö

| Osa | Toteutus |
|---|---|
| Osoite | `https://tiketti.esedu.fi` |
| Palvelin | `ossi2`, käyttäjä `it-admin` |
| Repon polku | `/home/it-admin/esedu-tiketti` |
| Backend | Docker-kontti `esedu-tiketti-backend`, kuuntelee `127.0.0.1:3001` |
| Tietokanta | Docker-kontti `esedu-tiketti-db`, kuuntelee `127.0.0.1:5434` |
| Frontend | Staattinen Vite-build hakemistossa `/var/www/tiketti/dist` |
| Web-palvelin | nginx 1.22.1 (hostilla, ei kontissa) |
| Compose-tiedosto | `backend/docker-compose.yml` |

Backend ja tietokanta on sidottu tarkoituksella osoitteeseen `127.0.0.1`, joten ne ovat tavoitettavissa vain nginxin kautta. Palvelimella ajetaan myös muita palveluita (ossi2, vaks), jotka noudattavat samaa käytäntöä.

## Julkaisu

Julkaisu tehdään repon juuressa olevalla `deploy.sh`-skriptillä.

```bash
ssh it-admin@tiketti.esedu.fi
cd /home/it-admin/esedu-tiketti
./deploy.sh
```

Tai suoraan omalta koneelta:

```bash
ssh it-admin@tiketti.esedu.fi '/home/it-admin/esedu-tiketti/deploy.sh'
```

### Valitsimet

| Valitsin | Vaikutus |
|---|---|
| (ei valitsinta) | Julkaisee backendin ja frontendin |
| `--frontend`, `-f` | Vain frontend. Ei kosketa konttiin eikä tietokantaan, ei ota varmuuskopiota |
| `--backend`, `-b` | Vain backend. Ei rakenna frontendiä |
| `--all`, `-a` | Sama kuin ilman valitsinta |
| `--help`, `-h` | Ohje |

### Ympäristömuuttujat

| Muuttuja | Käyttö |
|---|---|
| `BRANCH=main` | Julkaistava haara |
| `SKIP_GIT=1` | Ohita koodin haku — käytetään rollbackissa |
| `SKIP_BACKUP=1` | Ohita tietokannan varmuuskopio |
| `ALLOW_DIRTY=1` | Salli julkaisu, vaikka palvelimen repossa on paikallisia muutoksia |

### Mitä skripti tekee

1. **Esitarkistukset** — tarvittavat komennot, `backend/.env`, `frontend/.env.production`, ja keskeytys jos repossa on committaamattomia muutoksia
2. **Varmuuskopio** — `pg_dump` hakemistoon `~/esedu-tiketti-backups`, 10 uusinta säilytetään (vain backend-julkaisussa)
3. **Koodin haku** — `git fetch` + `reset --hard origin/main`
4. **Backend** — `docker compose up -d --build backend`; migraatiot ajetaan kontin käynnistyskomennossa
5. **Frontend** — `npm ci && npm run build`, sitten `rsync --delete` web-juureen
6. **Terveystarkistus** — pollaa `/api/health/live`, ja epäonnistuessa tulostaa lokin lopun ja rollback-komennon

Jos hostilla ei ole npm:ää, frontend rakennetaan kertakäyttöisessä `node:20-alpine`-kontissa. Skripti ei koskaan poista `backend/.env`- tai `backend/uploads`-tiedostoja, koska ne eivät ole versionhallinnassa.

## Rollback

```bash
cd /home/it-admin/esedu-tiketti
git checkout <commit-sha>
SKIP_GIT=1 ./deploy.sh
```

`SKIP_GIT=1` on olennainen: ilman sitä skripti hakisi uusimman koodin takaisin.

**Tietokantamigraatiot eivät peruunnu rollbackissa.** Jos julkaisu sisälsi migraation, tarkista ennen palautusta, toimiiko vanha koodi uuden skeeman kanssa. Lisäkenttien kanssa se yleensä toimii; enum-arvojen kanssa ei — ks. kohta TEACHER-rooli alempana.

## Ympäristömuuttujat

### `backend/.env` (ei versionhallinnassa)

| Muuttuja | Huomioitavaa |
|---|---|
| `DATABASE_URL` | Compose ylikirjoittaa tämän kontissa |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Käytetään sekä kontin luonnissa että `deploy.sh`:n varmuuskopiossa |
| `JWT_SECRET` | Vähintään 32 merkkiä |
| `OPENAI_API_KEY` | Alkaa `sk-` |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` | **Pakollisia.** Samat GUIDit kuin frontendin `VITE_MSAL_*` |
| `AUTH_VERIFY_MODE` | `enforce` (oletus) tai `warn` — ks. kohta Todennuksen käyttöönotto |
| `NODE_ENV=production` | **Pakollinen.** Ilman tätä virhevastauksiin liitetään stack trace ja lokit eivät ole JSON-muodossa |
| `FRONTEND_URL` | CORS ja Socket.IO |
| `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` | Valinnaisia |

`NODE_ENV=production` aktivoi myös tiukan ympäristövalidoinnin: jos jokin pakollinen arvo puuttuu tai on väärässä muodossa, prosessi sammuu. Koska kontissa on `restart: unless-stopped`, seurauksena on käynnistyssilmukka. Tarkista arvot ennen muutosta.

### `frontend/.env.production` (ei versionhallinnassa)

```
VITE_API_URL=https://tiketti.esedu.fi/api
VITE_ENVIRONMENT=production
VITE_MSAL_CLIENT_ID=...
VITE_MSAL_TENANT_ID=...
VITE_MSAL_REDIRECT_URI=https://tiketti.esedu.fi
```

Nämä arvot **paistetaan JS-bundleen build-vaiheessa**. Muutos vaatii siis aina uuden frontend-buildin, ei pelkkää uudelleenkäynnistystä.

## Nginx

Konfiguraatio on versionhallinnassa tiedostossa `deploy/nginx/tiketti.esedu.fi.conf`.

```bash
sudo cp /etc/nginx/sites-available/tiketti /etc/nginx/sites-available/tiketti.bak
sudo cp deploy/nginx/tiketti.esedu.fi.conf /etc/nginx/sites-available/tiketti
sudo nginx -t && sudo systemctl reload nginx
```

Palautus: kopioi `.bak` takaisin ja aja `reload` uudelleen.

**Palvelimen nginx on versio 1.22.1.** HTTP/2 määritellään siinä `listen`-rivin parametrina (`listen 443 ssl http2;`). Erillinen `http2 on;` -direktiivi vaatii nginx 1.25.1 tai uudemman, ja aiheuttaa vanhemmassa virheen `unknown directive "http2"`.

Konfiguraatio sisältää kohtia, joita ilman sovellus ei toimi oikein:

* `location /uploads/` — liitetiedostot tarjoillaan backendistä. Ilman tätä `try_files` palauttaa `index.html` ja kaikki liitekuvat ovat rikki
* `client_max_body_size 25m` — multer sallii 10 MB, nginxin oletus olisi 1 MB
* `proxy_read_timeout 300s` `/api`-lohkossa — AI-pyynnöt kestävät yli oletuksen 60 s
* `index.html` ilman välimuistia, `/assets/` vuodeksi — muuten julkaisun jälkeen selain näyttää vanhaa sivua
* `X-Forwarded-For` ja `X-Real-IP` — backendissä on `app.set('trust proxy', 1)`, ja ilman otsakkeita rate limit kohdistuisi kaikkiin käyttäjiin yhteisesti

## Tietokanta

### Migraatiot

Migraatiot ajetaan automaattisesti kontin käynnistyskomennossa (`npx prisma migrate deploy`). **Seediä ei ajeta tuotannossa.** Aiemmin se ajettiin joka käynnistyksessä, mistä kertyi demotikettien duplikaatteja. Siivousskripti on `backend/scripts/cleanup-demo-tickets.sql`.

### Postgres-imagen versio

Image on kiinnitetty muotoon `postgres:16.15-trixie` — sekä versio että pohjadistro. Syy: liukuva tagi `postgres:16` vaihtoi pohjan Debian 12:sta 13:een, jolloin glibc vaihtui 2.36:sta 2.41:een. Tietokannan lajittelusäännöt tallennetaan luontihetken glibc-version mukaan, joten muutos aiheutti varoituksen:

```
WARNING: database "esedu_tiketti_db" has a collation version mismatch
```

Jos versio joskus päivitetään ja pohjadistro vaihtuu, aja päivityksen jälkeen hiljaisena hetkenä:

```bash
docker compose exec postgres psql -U admin -d esedu_tiketti_db -c "REINDEX DATABASE esedu_tiketti_db;"
docker compose exec postgres psql -U admin -d esedu_tiketti_db -c "ALTER DATABASE esedu_tiketti_db REFRESH COLLATION VERSION;"
```

Pelkkä `REFRESH COLLATION VERSION` poistaa varoituksen mutta jättää indeksit korjaamatta. Aja aina `REINDEX` ensin.

### Varmuuskopiot

`deploy.sh` ottaa varmuuskopion ennen backend-julkaisua hakemistoon `~/esedu-tiketti-backups`. Käsin:

```bash
cd /home/it-admin/esedu-tiketti/backend
docker compose exec -T postgres pg_dump -U admin -d esedu_tiketti_db | gzip > ~/varmuuskopio.sql.gz
```

## Todennuksen käyttöönotto (`AUTH_VERIFY_MODE`)

Backend tarkistaa Azure AD -tokenin allekirjoituksen (`backend/src/middleware/azureTokenVerifier.ts`). Jos todennukseen tehdään muutoksia, käyttöönoton voi tehdä vaiheittain:

1. Lisää `.env`-tiedostoon `AUTH_VERIFY_MODE=warn` ja julkaise. Kelpaamattomat tokenit hyväksytään, mutta jokaisesta kirjataan lokiin virhekoodi, tokenin `aud` ja `iss`
2. Seuraa lokia ja varmista, että oikeaa liikennettä tulee eikä epäonnistumisia näy:
   ```bash
   docker compose logs -f backend | grep -iE "verification failed|WebSocket authenticated"
   ```
3. Poista rivi ja julkaise uudelleen — `enforce` on oletus

**Warn-tilassa järjestelmä on käytännössä ilman todennusta.** Käytä sitä vain väliaikaisesti ja valvottuna. Käynnistysloki varoittaa tilasta erikseen.

Virhekoodit: `CONFIG_MISSING`, `MALFORMED`, `GRAPH_TOKEN`, `EXPIRED`, `INVALID_SIGNATURE`, `INVALID_CLAIMS`, `MISSING_USER_INFO`. `INVALID_CLAIMS` sisältää sekä tokenin että odotetut arvot.

## TEACHER-rooli ja enum-migraatiot

`UserRole`-enumiin lisättiin arvo `TEACHER`. Postgres ei tue enum-arvon poistamista ilman tyypin uudelleenrakennusta, joten migraatio on käytännössä yksisuuntainen.

**Jos jollekin käyttäjälle on annettu TEACHER-rooli ja joudutaan palaamaan vanhaan versioon, vanha Prisma-client kaatuu tuntemattomaan enum-arvoon.** Alenna siinä tapauksessa opettajat ensin:

```sql
UPDATE "User" SET role='SUPPORT' WHERE role='TEACHER';
```

Sama koskee mitä tahansa tulevaa enum-laajennusta.

## Sudenkuopat

**`docker compose restart` ei lue `.env`-tiedostoa uudelleen.** Ympäristömuuttujat ovat osa kontin luontikonfiguraatiota. Muutoksen jälkeen tarvitaan `docker compose up -d`, joka luo kontin uudelleen. Tämä on aiheuttanut useamman turhan selvittelykierroksen.

**Compose-projektin nimeä ei saa vaihtaa.** Nimi tulee hakemistosta (`backend`), joten datavolyymin todellinen nimi on `backend_postgres_data`. Jos composeen lisättäisiin `name:`-kenttä, Docker etsisi eri volyymia ja loisi tyhjän tietokannan — tuotantodata näyttäisi kadonneen.

**Frontendin ympäristömuuttujat vaativat uuden buildin.** Ne eivät ole ajonaikaisia.

**`npm run dev` backend-kansiossa nollaa paikallisen tietokannan**, koska `dev:setup` sisältää `db:reset`-vaiheen. Kehityksessä käytä `npm run dev:server`.

## Savutesti julkaisun jälkeen

```bash
curl -s -o /dev/null -w "sivusto: %{http_code}\n" https://tiketti.esedu.fi/
curl -s -o /dev/null -w "health:  %{http_code}\n" https://tiketti.esedu.fi/api/health/live
curl -s -o /dev/null -w "ilman tokenia (odotus 401): %{http_code}\n" https://tiketti.esedu.fi/api/tickets
curl -sI https://tiketti.esedu.fi/uploads/ei-ole.png | head -1   # 404 backendistä, ei index.html
curl -s https://tiketti.esedu.fi/api/ei-ole | grep -c stack      # 0 = NODE_ENV on production
```

Lisäksi kirjaudu sisään ja avaa tiketti, jossa on kuvaliite — se kattaa kerralla todennuksen, WebSocketin ja liitetiedostojen reitityksen.

## Vianetsintä

```bash
cd /home/it-admin/esedu-tiketti/backend

docker compose ps                        # konttien tila
docker compose logs --tail 100 backend   # lokin loppu
docker compose logs -f backend           # seuranta
docker compose exec backend printenv     # kontin ympäristömuuttujat
docker compose config                    # composen lopullinen konfiguraatio
sudo nginx -t                            # nginx-konfiguraation tarkistus
```

Jos kontti on tilassa `Restarting`, katso lokista ympäristövalidoinnin virheet. Jos käyttäjät saavat 401-virheitä, katso `verification failed` -rivit — virhekoodi kertoo syyn suoraan.

## Jatkokehitys

Palvelimen muut palvelut (ossi2, vaks) käyttävät GHCR-imageja, jotka rakennetaan GitHub Actionsissa ja vain vedetään palvelimelle. Tikettisovellus rakentaa imagen paikallisesti. Siirtymä samaan malliin toisi tagipohjaisen rollbackin eikä kuormittaisi palvelinta buildaamisella — ks. issue #11.

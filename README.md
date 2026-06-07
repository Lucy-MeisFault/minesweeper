# Global Minesweeper

Kooperativní online verze Minesweeperů, kde hráči společně řeší jeden herní plán v reálném čase. Hra je tahová, každý hráč má omezený počet tahů, poté přichází na řadu další.

---

## Účel aplikace

Hráči si zakládají místnosti, zvou přátele pomocí kódu místnosti a společně hrají Minesweeper. Aktivita se zaznamenává na žebříčku. Za nasbírané tahy se odemykají kosmetiky (vlajky).

---

## Struktura projektu

```
frontend/
  index.html          - struktura stránky
  style.css           - vzhled, design
  script.js           - logika frontendu
  manifest.json       - konfigurace PWA
  service-worker.js   - PWA

backend/
  index.js            — vstupní bod Express serveru
  config.js           — obtížnosti, kosmetika, JWT
  src/
    db.js             — inicializace JSON databáze
    store.js          — čtení a zápis dat
    game.js           — generování hrací desky, flood fill, kontrola výhry
    middleware/
      auth.js         — ověření JWT tokenu
    routes/
      accounts.js     — registrace, přihlášení, profil, kosmetika
      rooms.js        — správa místností a tahů
      leaderboard.js  — žebříček hráčů
```

---

## Použité API endpointy

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| POST | `/accounts/register` | Registrace |
| POST | `/accounts/login` | Přihlášení |
| GET | `/accounts/me` | Vlastní profil |
| GET | `/accounts/me/cosmetics` | Seznam kosmetiky |
| POST | `/accounts/me/cosmetics/:id/unlock` | Odemknutí kosmetiky |
| POST | `/rooms` | Vytvoření místnosti |
| GET | `/rooms/:id` | Stav místnosti |
| POST | `/rooms/:id/join` | Vstup do místnosti |
| POST | `/rooms/:id/start` | Spuštění hry |
| POST | `/rooms/:id/move` | Odehrání tahu |
| POST | `/rooms/:id/skip` | Přeskočení tahu |
| DELETE | `/rooms/:id/leave` | Opuštění místnosti |
| GET | `/leaderboard` | Žebříček hráčů |

---

## Princip fungování

Autentizace - po registraci nebo přihlášení server vrátí JWT token, který se uloží do localStorage. Token se přikládá ke každému chráněnému požadavku v hlavičce Authorization.

Místnosti - hráč vytvoří místnost a sdílí její ID. Ostatní hráči se připojí pomocí tohoto kódu. Hostitel spustí hru, načež server vygeneruje herní desku.

Multiplayer - frontend každé 3 sekundy dotazuje server na aktuální stav místnosti polling. Změny provedené ostatními hráči se tak zobrazí všem.

Tahy - hráč může odkrýt nebo označit políčko. Po vyčerpání povolených tahů přejde řada na dalšího hráče.

Kosmetika - za nasbírané tahy se automaticky odemykají různé varianty vlajky. Hráč si může vybrat aktivní skin v profilu.


---

## Use-case diagram

```
┌─────────────────────────────────────────────┐
│                  Hráč                       │
│                                             │
│  [Registrace / Přihlášení]                  │
│           │                                 │
│           ▼                                 │
│  [Vytvoření místnosti] ──► [Nastavení]      │
│  [Vstup do místnosti]                       │
│           │                                 │
│           ▼                                 │
│  [Čekání na hráče] ──► [Spuštění hry]       │
│           │                                 │
│           ▼                                 │
│  [Odkrytí políčka]                          │
│  [Označení vlajkou]  ◄──► [Tahová rotace]   │
│  [Přeskočení tahu]                          │
│           │                                 │
│           ▼                                 │
│  [Výhra / Prohra] ──► [Žebříček]            │
│                    ──► [Odemknutí kosmetiky]│
└─────────────────────────────────────────────┘
```

---

## Známé problémy, chyby

PWA nemá žádnou opravdovou funkci, protože to je online hra. Ani nevím jestli funguje.

Hráč může začít hru i o samotě. toto mi ale pomáhalo v debugování, a tak to tam zatím nechám pro jednodušší demonstraci funkce.

Hráč může umíšťovat a odstraňovat vlajky opakovaně, a rychle tak získat množství tahů. Ze stejných důvodů zde vadu zanechám.

Při výhře se neukáže overlay informujíc o výhře. Netuším proč, a je mi blbé dělat třetí commit ve snaze zpravit tuto chybu.

Web není hostován na školním hostingu. Já vím.
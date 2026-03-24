# Unit & Integration Tests

Dieser Ordner enthält Unit- und Integrationstests, die mit **Vitest** ausgeführt werden.

## Warum hier?

- Tests liegen nah am Quellcode im Next.js App-Router-Verzeichnis (`app/`) — sogenannte _Co-location_
- Vitest läuft im Node-Prozess, ohne Browser — schnell und leichtgewichtig
- Unterordner spiegeln die Testart wider:
  - `unit/` — einzelne Funktionen und Module isoliert testen
  - `arch/` — Architekturregeln prüfen (Schichtentrennung, zirkuläre Abhängigkeiten)
  - `security/` — sicherheitsrelevante Einschränkungen verifizieren
  - `e2e/` - Tests in einem echten Laufenden Browser ausführen

## Ausführen

```bash
npm test              # alle Tests einmalig
npm run test:watch    # im Watch-Modus
npm run test:coverage # mit Coverage-Report
```

## E2E Ausführen

```bash
npm run test:e2e                   # alle E2E-Tests
npx playwright test --ui           # interaktiver UI-Modus
npx playwright install chromium    # Browser einmalig installieren
```
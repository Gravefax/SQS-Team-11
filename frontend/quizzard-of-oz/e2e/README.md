# End-to-End Tests

Dieser Ordner enthält E2E-Tests, die mit **Playwright** ausgeführt werden.

## Warum hier?

- E2E-Tests steuern einen echten Browser gegen den laufenden Dev-Server — sie gehören konzeptuell nicht zum App-Quellcode
- Playwright hat eine eigene Konfiguration (`playwright.config.ts`) und erwartet die Specs standardmäßig in `e2e/`
- Die Trennung verhindert, dass Vitest versehentlich Playwright-Specs aufnimmt (zwei inkompatible Test-Runner)

## Ausführen

```bash
npm run test:e2e                   # alle E2E-Tests
npx playwright test --ui           # interaktiver UI-Modus
npx playwright install chromium    # Browser einmalig installieren
```

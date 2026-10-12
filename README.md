# Katılım Endeksi Checker — 1.1.0

Select a BIST ticker or company name, right-click and choose **Katılım Uygunluğunu Kontrol Et**. The Chrome extension resolves the official KAP company identity, reads the company page's index memberships and opens source links. It works without a local API server.

## What changed

- PETKİM / Petkim / PETKM / BIST:PETKM resolve to **PETKM** and its numbered KAP summary URL.
- Company identities are refreshed from the KAP BIST directory at most once per 24 hours on use. A 12 October 2026 identity-only snapshot is bundled for offline resolution.
- Membership is fetched on demand, cached for one hour, and labelled with the actual fetch time. **Yenile** bypasses both caches. Expired or failed fetches do not produce a negative or positive compliance verdict.
- Static sample ratios, synthetic disclosure links and inferred Helal Finans/Fintables observations are excluded from the production result. Their buttons are links for manual review.
- KAP page membership is shown separately from a complete compliance assessment. KAFİF ratios, effective BIST period lists and live fund data are **not yet integrated**. Missing financial data stays missing.
- Chrome uses activeTab injection on request; no all-page content script, all_urls permission or localhost connection.

## Build and test

```sh
npm install
npm run build
npm test
```

Load `apps/extension/dist/chrome` through `chrome://extensions` → Developer mode → Load unpacked. Reload an existing unpacked installation and reload the target page after updating.

The `packages/compliance-engine` deterministic engine and legacy dataset remain for unit examples. They are not verified live financial feeds. Production extension checks use `live-data.ts`. The optional API also uses the live KAP membership reader; its unused legacy source adapters are prototypes, not connected providers.

## Delivery and limitations

- [Arabic installation guide](docs/INSTALL-AR.md)
- [Chrome Store preparation](docs/CHROME-STORE-AR.md)
- [Privacy policy draft](docs/privacy-policy.html)
- [QA evidence](docs/QA-2026-10-12.md)

The v1.1.0 ZIP is a local test/submission preparation package. No Chrome Web Store upload or public publication has occurred. Store approval and installed-browser context-menu checks remain separate from the code, fixture, worker and live-fetch tests.

KAP markup may change or requests may be blocked. Parsing failures fail closed and show unavailable data. Index membership alone is not a complete religious assessment or investment recommendation.

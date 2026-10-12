# Katılım Endeksi Checker — 1.3.0

Select a BIST ticker, company name, fund code or full fund name, right-click and choose **Katılım Uygunluğunu Kontrol Et**. The Chrome extension resolves the official KAP identity, reads BIST participation membership, KAFİF disclosures and available TEFAS fund profiles/asset allocation. It works without an API key, account, subscription or local server.

## What changed

- PETKİM / Petkim / PETKM / BIST:PETKM resolve to **PETKM** and its numbered KAP summary URL.
- Company identities are refreshed from the KAP BIST directory at most once per 24 hours on use. A 12 October 2026 identity-only snapshot is bundled for offline resolution.
- Coverage is directory-wide: 803 company symbol entries and 3,523 fund codes from KAP's ALL fund directory, including participation and conventional funds, pension funds and exchange-traded funds. These counts describe identities, not completed financial assessments or TEFAS availability.
- Fund identities are refreshed daily on use. The current official KAP fund page is read for umbrella name/type when those fields exist. Missing umbrella fields remain unknown; portfolio and religious approval are not inferred from the fund name.
- Search covers both directories. For code collisions, the user selects the intended instrument. `BIST:CODE` and `FON:CODE` explicitly choose stocks or funds.
- Source results are fetched on demand and cached for one hour. **Yenile** bypasses identity, result and shared-source caches. Failed refreshes do not reuse expired results or produce a negative or positive compliance verdict.
- Static sample ratios, synthetic disclosure links and inferred Helal Finans/Fintables observations are excluded from the production result. Their buttons are links for manual review.
- Seven BIST participation indices are read from the official dated CSV. Lists dated tomorrow are labelled as upcoming rather than today's membership; older than seven days or further-future files fail closed.
- KAFİF activity/governance declarations and three financial ratios are read with the financial period and identity verification. Missing values stay unknown; disclosed ratios do not automatically become a religious verdict.
- TEFAS profiles and dated asset-type allocation are queried for mutual, pension and ETF funds when supported. Allocation older than 14 days is not used. Null interest-content does not mean interest-free. Individual holdings and approval documents still require separate review.
- Free public-source access was tested; availability and redistribution rights are not guaranteed. There is no paid fallback or bypass of source access restrictions.
- Chrome uses activeTab injection on request; no all-page content script, all_urls permission or localhost connection.

## Build and test

```sh
npm install
npm run build
npm test
```

Load `apps/extension/dist/chrome` through `chrome://extensions` → Developer mode → Load unpacked. Reload an existing unpacked installation and reload the target page after updating.

The deterministic engine and legacy dataset remain for unit examples and are excluded from the production extension. Production extension and optional API checks use `public-sources.ts`. The optional API is not required, deployed or contacted by the extension.

## Delivery and limitations

- [Arabic installation guide](docs/INSTALL-AR.md)
- [Chrome Store preparation](docs/CHROME-STORE-AR.md)
- [Privacy policy draft](docs/privacy-policy.html)
- [QA evidence](docs/QA-2026-10-12.md)
- [1.3 release, security checks and limitations (Arabic)](docs/RELEASE-1.3.0-AR.md)
- [Actual live-source evidence](docs/public-source-coverage-2026-10-12.json)

The v1.3.0 ZIP is a local test/submission preparation package. No Chrome Web Store upload or publication has occurred. Store approval and installed-browser context-menu checks remain separate from the code, fixture, worker, rendered-interface and live-fetch tests. Chrome Store developer registration has a one-time fee; local installation is free.

KAP markup may change or requests may be blocked. Parsing failures fail closed and show unavailable data. Index membership alone is not a complete religious assessment or investment recommendation.

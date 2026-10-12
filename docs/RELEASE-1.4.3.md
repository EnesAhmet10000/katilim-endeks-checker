# Katılım Endeksi Checker 1.4.3

The Chrome extension reads official BIST membership, KAP company disclosures and available KAP/TEFAS fund records without an API key, account or local server.

## Included

- Three saved display modes: **Basit** (simple), **Tam** (full) and **Özel** (custom sections).
- Green for confirmed membership/supported compliance, red for explicit non-compliance, and yellow for unknown or unavailable evidence. Red index chips indicate non-membership, not an automatic haram verdict.
- Correct official KAP identity links and normalized stock symbols, including PETKM.
- On-demand official-source requests, one-hour result caches, and forced refresh via **Yenile**.
- **Fix:** valid annual KAFİF periods such as `2025 / Yıllık` are read correctly; future financial periods remain rejected.
- A recorded demo video with an animated README preview, and a documented live audit of 30 random equity companies.

## Validation

- Build succeeded; 24 engine tests, 6 API tests, packaged-worker checks and result-color checks passed.
- 30/30 equity identities and KAP links verified.
- 210/210 index memberships matched the dated official BIST CSV.
- 182 KAFİF fields matched for 26 companies. Four companies had no matching financial row and remained unavailable.
- No extraction errors in the final sample. Three KAP pages omit an equal-weight index shown in the BIST CSV; see the attached audit.

## Download and install

Download **katilim-finans-chrome-v1.4.3.zip**, extract it, open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select the folder containing `manifest.json`. Reload an existing installation and its target webpage after updating.

The audit report is attached as Markdown, CSV and JSON. **SHA256SUMS.txt** contains checksums for the ZIP and reports.

**katilim-demo.mp4** is the original 56-second recording, including its audio. The README shows an animated preview; download the full MP4 here or through its README link. Dates and results shown in the recording are historical examples.

لا يحتاج API أو اشتراك. حمّل ZIP وفك الضغط، ثم اختر المجلد من Load unpacked في Chrome. التقرير المرفق يفصّل نتائج الأسهم الثلاثين والنواقص.

## Scope

This is a GitHub release for local installation; it has not been published in Chrome Web Store. The live audit exercised the packaged worker with real HTTPS requests and simulated Chrome messaging/storage, not an installed-browser context-menu test. Index membership and disclosed ratios are not a complete religious verdict or investment recommendation. Source availability and freshness depend on the official providers.

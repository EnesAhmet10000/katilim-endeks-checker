# Language QA — 2026-10-13

- Full build, TypeScript check, engine/API tests and existing worker/color checks passed.
- Translation tests cover all three languages, persisted selection, storage changes, annual periods, missing-data states, and unchanged source names, symbols, numeric values and URLs.
- Actual bundled background worker tests verify the saved Arabic right-click menu and switching its title to English and Turkish.
- Built content bundle was rendered with the captured CIMSA audit response. Arabic full mode displayed RTL; English custom mode displayed translated visibility options. Switching back to Turkish and reloading retained the language and display preference.
- Built popup rendered Arabic welcome/search/controls, a CIMSA result in Arabic, then the same result in English without refetching. Disclosed ratios remained 1.39, 5.05 and 29.64; source links remained unchanged.
- The preview uses simulated Chrome messaging/storage and recorded official-source responses. This is rendered-interface verification, not an installed-Chrome context-menu interaction test or a new live 30-stock audit.
- Images `readme-ar.png` and `readme-en.png` were captured from the current built interface. The original video is retained separately.

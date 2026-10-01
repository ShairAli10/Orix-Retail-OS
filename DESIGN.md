# Orix interface design

Existing identity: offline Windows retail counter, English labels, PKR amounts, store-local business dates. Preserve the current compact Settings panels and teal checkout emphasis.

Runtime token owner: `apps/desktop/src/renderer/styles.css`. Surface #ffffff, background #edf1f5, text #17202a, muted #64748b, primary #0f766e; existing dark-theme overrides remain authoritative. System/Inter stack for labels and headings; monospace only for build references. No new fonts or independent palette for Support.

Support uses the existing SettingsPanel, native buttons, inline status/error regions, and OS save dialog for destination selection. Version/build reference is useful support information; internal exception messages and customer records are not UI content.

App identity: the editable `apps/desktop/build/icon.svg` uses the existing primary teal (#0f766e), a white cart, and a mint (#99f6e4) O detail. The cart alone serves small taskbar sizes; the adjacent Orix Retail wordmark names the product at larger sizes. Do not squeeze text into 16–32px icons. `pnpm build:icons` exports the committed PNG and multi-resolution Windows ICO. Windows executable/shortcut identity remains Orix Retail OS so upgrades retain the existing installation identity.

Sales History filters reuse existing native fields and runtime tokens: compact Period and Status fields alongside a flexible Search field; custom date inputs occupy a conditional second row. On narrow windows Search spans the first row. Keep the active local date range visible below the controls.

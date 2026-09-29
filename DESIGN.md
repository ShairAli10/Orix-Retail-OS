# Orix interface design

Existing identity: offline Windows retail counter, English labels, PKR amounts, store-local business dates. Preserve the current compact Settings panels and teal checkout emphasis.

Runtime token owner: `apps/desktop/src/renderer/styles.css`. Surface #ffffff, background #edf1f5, text #17202a, muted #64748b, primary #0f766e; existing dark-theme overrides remain authoritative. System/Inter stack for labels and headings; monospace only for build references. No new fonts or independent palette for Support.

Support uses the existing SettingsPanel, native buttons, inline status/error regions, and OS save dialog for destination selection. Version/build reference is useful support information; internal exception messages and customer records are not UI content.

# Orix Retail artwork

`icon.svg` is the editable cart mark in the app's teal identity. `icon.png` supplies the running app window and macOS development Dock; `icon.ico` supplies the Windows executable and installer. The ICO includes 16, 24, 32, 48, 64, 128, and 256px sizes. Wordmark SVG/PNG assets provide the full Orix Retail name for larger placements.

Regenerate after editing the source with `pnpm build:icons`, then commit the exported files. The wordmark generator uses Arial with a sans-serif fallback; regenerate on the same design machine to avoid font-dependent differences. Packaging uses committed assets and does not regenerate them.

Small icons intentionally omit text. Windows labels the shortcut **Orix Retail OS**, preserving the existing installation identity and data path across updates.

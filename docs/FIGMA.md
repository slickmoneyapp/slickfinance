# Figma reference — Budgeting App

**Design file:** [Budgeting App – Figma](https://www.figma.com/design/b6SpQd4YKwrRuBWIb0aCXR/Budgeting-App)

**Subscriptions list frame (pixel source for the RN screen):**  
[node **273:1518** — direct link](https://www.figma.com/design/b6SpQd4YKwrRuBWIb0aCXR/Budgeting-App?node-id=273-1518)

### Syncing from the Figma API

`figma.subscriptions273` in `src/ui/theme.ts` is aligned to **frame `273:1518` (“Updated”)** using `GET https://api.figma.com/v1/files/<file_key>/nodes?ids=273:1518` (requires a personal access token with **`file_content:read`** only; **never commit tokens**).

If you pasted a token in chat or committed it, **revoke it in Figma → Settings → Security** and create a new one.

## How this repo stays aligned with Figma

1. **Tokens live in code** — Inspect values from the frame above and mirror them in `src/ui/theme.ts` under `figma`. **`figma.screenTitle`** is the **Subscriptions** (and other) nav title: Bricolage Grotesque ExtraBold **800**, **30px**, **tall `lineHeight` in RN** (e.g. **52** for 30px type), **no extra `fontWeight`** when using the ExtraBold font file (avoids iOS clipping), **letter-spacing -3%** (≈ **-0.9px** in RN), **`#000`**. **`figma.subscriptions273`** covers the Subscriptions body. Screens should **consume those tokens**, not duplicate values.
2. **This environment cannot log into Figma** — Automated assistants don’t receive your Figma session. To sync precisely:
   - Use **Dev Mode** in Figma and copy spacing/typography, **or**
   - Use the [Figma REST API](https://www.figma.com/developers/api) with a **personal access token** (never commit the token; use env vars only).
3. **Layout modes** — `src/config/featureFlags.ts`:
   - **`USE_FIGMA_SINGLE_PAGE_NAV` (default `true`)** — Single-stack flow like the Figma frame: no bottom tab bar; root opens on **Subscriptions**; **Settings** from the header.
   - Set to **`false`** for the classic **Home / Subscriptions / Settings** tab bar.

**Background:** `TabScreenBackground` uses `background.png` (top illustration) and `colors.bg` below, matching the soft sky art from the design file.

## Checklist when the Figma frame changes

- [ ] Update `figma` / `figma.subscriptions273` in `src/ui/theme.ts`
- [ ] Re-run the app on a reference device width (e.g. iPhone 14) and compare to Dev Mode
- [ ] If a new screen is added, add a `figma.node…` comment + token group the same way

**Do not commit Figma personal access tokens.** If a token was shared in chat or issues, rotate it in Figma → Settings → Security.

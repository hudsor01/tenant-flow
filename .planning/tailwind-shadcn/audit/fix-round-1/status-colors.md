# 66.2-39 fix round 1, parts C to F: status colors, chart marks, meter fills and state labels through the token layer

Owner decision, 2026-11-01: "Fix all in this PR", including every raw-palette status color moving to the project tokens, with each visual change measured before it ships. This file is the measurement record for that change: status colors (UI-SPEC VD-51, sections 1-3) chart series (VD-52, section 4) and, from part D, the dashboard chart marks and the remaining chart-2 / chart-3 uses (VD-53, section 5); from part E, the meter fills, status marks and labels on the vivid fills (VD-55, VD-56, section 6); from part F, the label of every interactive state (VD-59, section 7) and the vivid status tokens used as text (VD-60, section 8).

Base: `d0cc141b5`. Every ratio below is painted WCAG contrast read back from a 1x1 canvas in Chrome (Playwright 1.64.1 headless shell) under the project's own compiled stylesheet: `loadProjectTailwindEngine()` compiles `src/app/globals.css` with the project scan plus the probe classes, and each background stack is painted in order over white, so opacity tints compose the way they do on the page. Light is `<html>` without a class, dark is `<html class="dark">`. Probe scripts: `scratchpad/exec/fix3/pairs.mjs` (derived from part B's `fix2/contrast.mjs`) with the cases in `status-cases.mjs`; chart colors with `fix2/contrast.mjs` itself.

Minimums: text 4.5:1; large text (the 32px bold `StatValue`, `typography-stat`; the 24px semibold cash-flow tiles) 3:1; non-text marks that carry information (icons, bars, dots, chart series) 3:1. A badge border is decorative (the badge text names the state) and has no minimum.

## 1. Sweep

Command (first-party `src/`, every `.ts`/`.tsx`/`.css`/`.md(x)`/`.js`/`.mjs` file, 1275 files): `node scratchpad/exec/fix3/palette-sweep.mjs src`. It splits each line into class-shaped tokens, strips variants (outside brackets) and matches the utility against

- families: red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, slate, gray, zinc, neutral, stone;
- utilities: text, bg, border (and `border-t/r/b/l/x/y/s/e`), ring, ring-offset, fill, stroke, from, via, to, outline, decoration, divide, shadow, inset-shadow, inset-ring, accent, caret, placeholder, drop-shadow, text-shadow;
- every shade (50, 100-900, 950), with an optional `/N`, `/[x]` or `/(x)` opacity modifier and an optional `!`.

Result on `d0cc141b5`: **374 hits in 44 files**; 0 after this change. The compiler-driven guard G10 (section 3) reports the identical 374 `(path, line, class)` set on `d0cc141b5` (`diff` of the two sorted lists is empty), so the regex walk and Tailwind's own compiler agree on the class.

By utility and family: text emerald 54, red 43, amber 37, orange 30, blue 15, stone 14, green 12, purple 4, indigo 4, rose 1; bg emerald 27, amber 24, red 22, stone 17, blue 17, orange 16, green 6, purple 4, rose 2, indigo 2; border amber 10, red 6, indigo 2, emerald 2, blue 2, orange 1. 140 of the 374 are `dark:` pairs.

### Classification

| Class | Hits | Files | Disposition |
|-------|------|-------|-------------|
| (a) status or semantic meaning | 345 | 42 | mapped to the semantic token with the same meaning (table below) |
| (b) categorical, no brand palette for it | 28 | 1 (`expense-category-badge.tsx`) | six expense categories, each a different family. No category palette exists, so each takes the semantic token of its own hue, which keeps all six distinct: maintenance orange -> warning, utilities blue -> info, insurance purple -> primary, taxes red -> destructive, management emerald -> success, other/default stone -> muted |
| (c) not a status use | 1 | 1 (`src/lib/utils.ts:49`) | a JSDoc example for `cn()`. Tailwind still compiles it (comments are scanned), so the example now names a token |
| non-color false positives | 0 | 0 | the pattern requires a palette family and a shade step, and every hit compiled to a default-palette variable (G10 agrees hit for hit) |

No hit stays: the exemption list is empty.

### Mapping rules

| Raw form | Token form | Why |
|----------|------------|-----|
| status text: emerald/green, red/rose, amber/orange/yellow, blue, indigo/purple, stone | `text-success-text`, `text-destructive-text`, `text-warning-text`, `text-info-text`, `text-primary-text`, `text-muted-foreground` | CLAUDE.md: status-colored text uses the AA companions |
| status icons | the same `-text` companion | globals.css documents the companions as AA-safe "foreground text/icons"; the vivid fills fail 3:1 in light mode as foreground (success 2.62, warning 2.18 on the card) |
| data marks: occupancy bars, cash-flow bars, income-statement dots | `bg-success-text`, `bg-info-text`, `bg-warning-text`, `bg-destructive-text` | measured: the vivid fills fail 3:1 as marks (bg-success on the muted track 2.26 light; bg-destructive 2.87 dark; bg-warning 1.88 light; bg-info 2.87 light). Rejected alternatives are rows in the table |
| tints: `bg-X-50`, `bg-X-100`, `bg-X-500/10`, `dark:bg-X-900/30`, `dark:bg-X-950/30`, `dark:bg-X-500/20` | `bg-<token>/10` (`/5` where the source was a `/5` or `-50/50` wash; `/20` for the second level of a two-level tint: the 8-14-day aging badge and the 2FA icon circle) | the token carries its dark value, so the hand-written `dark:` tint is dropped |
| borders: `border-X-200/300` with `dark:border-X-700/800`, `border-amber-500/30` | `border-<token>/30` | decorative container edge; the dark pair is dropped |
| link hover: `hover:text-X-900` + `dark:hover:text-X-100` | `hover:text-foreground` | the same direction in both themes (darker in light, lighter in dark), and 14.5-17.3:1 |
| an outline Badge recolored by hand (`lease-header`, year-end "1099 Required", lease review "Disclosure Acknowledged") and the three property-row badges | `Badge variant="warning"` / `"success"` / `"info"` | the project's own status badge variants (`border-X/20 bg-X/10 text-X-text`); the hand-colored orange/amber borders read 2.81 and 1.41 light, decorative either way |
| `dark:` pairs (140) | dropped | every token used has a `.dark` value in globals.css (G4) |
| BorderBeam `hsl(142 76% 36%)` (property-performance occupancy card) and `hsl(45 93% 47%)` (tenant-stats pending card) | `var(--color-success)` / `var(--color-warning)` and `oklch(from var(--color-…) l c h / 0.3)` | the `var(--color-…)` token form the other beams use; decorative |
| image-upload status overlay (`bg-black/50`, `text-green-400` / `text-red-400` labels) | `dark` scope on the always-dark scrim, `bg-black/75`, labels `text-white`, icons `text-success-text` / `text-destructive-text` | the scrim is dark in both themes, so it reads the dark token values (`.dark` keys them; G9 lists `dark` as a hook name). At /50 over a white image no colored text can reach 4.5:1 (green-400 2.25, red-400 1.39, and the sibling white "Uploading..." only 4.0). At /75 the white labels read 10.37 and the icons 5.91 / 3.64 over white, 11.97 / 7.37 over black |

Siblings in the same maps that used a vivid token as text were moved to the companion in the same edit (all measured below): `maintenance-utils.ts` `text-primary` (4.33 light) and `text-destructive` (3.85 light, 3.13 dark, both under 4.5) on their tints, and the `timeline-card.tsx` primary event icon.

Families that collapse: amber and orange both become warning. In the lease status map "Pending Signature" (amber) and "Expiring" (orange) now share the warning badge and differ by label; amber-100 and orange-100 were already within a few percent lightness of each other. Indigo (trial banner, reserved unit, insurance) becomes primary, blue becomes info.

## 2. Before and after, every changed site

Each row is one distinct (classes, surface) pair; a row lists every file:line that renders that pair. "Before" and "after" give the painted foreground and background hex and the ratio. 108 rows: 103 shipped pairs and 5 rejected alternatives (marked "rejected", each failing its minimum); every shipped pair meets its minimum in both themes. Before this change 39 of the 103 shipped pairs failed their minimum in at least one theme. Worst after: text 4.66:1 ("Balanced", light), large text 4.70:1 (cash-flow operating tile, light), marks 3.64:1 (the Failed icon over a white image).

| # | Site | Kind (min) | Before: fg classes / bg stack | After: fg classes / bg stack | Light before | Light after | Dark before | Dark after |
|---|------|------------|-------------------------------|------------------------------|--------------|-------------|-------------|------------|
| 1 | billing-settings.tsx:83 Active badge | text (4.5) | `text-emerald-700 dark:text-emerald-300` / `bg-background` > `bg-card` > `bg-emerald-500/10 dark:bg-emerald-500/20` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #007a55 on #e1f5f0 = **4.73** | #007b40 on #e1f4ee = **4.7** | #5ee9b5 on #06312b = **9.31** | #4bdc95 on #071f1c = **9.8** |
| 2 | billing-settings.tsx:88 Trial badge | text (4.5) | `text-blue-700 dark:text-blue-300` / `bg-background` > `bg-card` > `bg-blue-100 dark:bg-blue-900/30` | `text-info-text` / `bg-background` > `bg-card` > `bg-info/10` | #1447e6 on #dbeafe = **5.6** | #0064b2 on #e1f0fb = **5.21** | #8ec5ff on #0d1a3a = **9.45** | #6cc3ff on #091b2c = **9.04** |
| 3 | billing-settings.tsx:93,98 Past Due/Unpaid badge | text (4.5) | `text-amber-700 dark:text-amber-300` / `bg-background` > `bg-card` > `bg-amber-100 dark:bg-amber-900/30` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #bb4d00 on #fef3c6 = **4.52** | #965900 on #f8f2e4 = **5.05** | #ffd230 on #2a1811 = **11.73** | #fbc044 on #1d1c14 = **10.36** |
| 4 | billing-settings.tsx:102,110,117 Canceled/Expired badge | text (4.5) | `text-red-700 dark:text-red-300` / `bg-background` > `bg-card` > `bg-red-100 dark:bg-red-900/30` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-destructive/10` | #c10007 on #ffe2e2 = **5.27** | #be000d on #f8e2e7 = **5.33** | #ffa2a2 on #2c1017 = **9.17** | #ff6762 on #1b0d14 = **6.61** |
| 5 | subscription-cancel-section.tsx:125 Subscription Ended heading | text (4.5) | `text-red-800 dark:text-red-200` / `bg-background` > `bg-red-50 dark:bg-red-950/50` | `text-destructive-text` / `bg-background` > `bg-destructive/10` | #9f0712 on #fef2f2 = **7.64** | #be000d on #f7e1e4 = **5.27** | #ffc9c9 on #25090d = **12.86** | #ff6762 on #18090f = **6.79** |
| 6 | subscription-cancel-section.tsx:188 / account-data-section.tsx:193 / gdpr-data-actions.tsx:213 callout text | text (4.5) | `text-amber-700` / `bg-background` > `bg-card` > `bg-amber-500/5` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/5` | #bb4d00 on #faf7f1 = **4.7** | #965900 on #f8f7f1 = **5.25** | #bb4d00 on #151515 = **3.63** | #fbc044 on #131415 = **11.18** |
| 7 | subscription-cancel-section.tsx:184 / account-data-section.tsx:189 / gdpr-data-actions.tsx:209 Clock icon | nontext (3) | `text-amber-600` / `bg-background` > `bg-card` > `bg-amber-500/5` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/5` | #e17100 on #faf7f1 = **2.99** | #965900 on #f8f7f1 = **5.25** | #e17100 on #151515 = **5.71** | #fbc044 on #131415 = **11.18** |
| 8 | two-factor-section.tsx:64 Shield icon in circle | nontext (3) | `text-amber-600` / `bg-background` > `bg-card` > `bg-amber-50 dark:bg-amber-950/30` > `bg-amber-100 dark:bg-amber-900/30` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` > `bg-warning/20` | #e17100 on #fef3c6 = **2.87** | #965900 on #f3e2b6 = **4.39** | #e17100 on #371a0c = **4.99** | #fbc044 on #433410 = **7.32** |
| 9 | personal-info-section.tsx:181 CheckCircle icon | nontext (3) | `text-emerald-500` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #00bc7d on #fafcfe = **2.41** | #007b40 on #fafcfe = **5.23** | #00bc7d on #080e16 = **7.83** | #4bdc95 on #080e16 = **11.04** |
| 10 | subscription-status-banner.tsx:35 no-subscription banner | text (4.5) | `text-blue-800 dark:text-blue-200` / `bg-background` > `bg-blue-50 dark:bg-blue-950/50` | `text-info-text` / `bg-background` > `bg-info/10` | #193cb8 on #eff6ff = **8.11** | #0064b2 on #e0eff8 = **5.16** | #bedbff on #0d1833 = **12.35** | #6cc3ff on #051728 = **9.39** |
| 11 | subscription-status-banner.tsx:42 View plans hover | text (4.5) | `text-blue-900 dark:text-blue-100` / `bg-background` > `bg-blue-50 dark:bg-blue-950/50` | `text-foreground` / `bg-background` > `bg-info/10` | #1c398e on #eff6ff = **9.53** | #0e171f on #e0eff8 = **15.39** | #dbeafe on #0d1833 = **14.4** | #ecf3f8 on #051728 = **16.16** |
| 12 | subscription-status-banner.tsx:66 trial banner | text (4.5) | `text-indigo-800 dark:text-indigo-200` / `bg-background` > `bg-indigo-50 dark:bg-indigo-950/50` | `text-primary-text` / `bg-background` > `bg-primary/10` | #372aac on #eef2ff = **8.99** | #004fc4 on #e0ebf9 = **5.98** | #c6d2ff on #11122f = **12.21** | #7cbeff on #0a192d = **8.96** |
| 13 | subscription-status-banner.tsx:71 Upgrade hover | text (4.5) | `text-indigo-900 dark:text-indigo-100` / `bg-background` > `bg-indigo-50 dark:bg-indigo-950/50` | `text-foreground` / `bg-background` > `bg-primary/10` | #312c85 on #eef2ff = **10.26** | #0e171f on #e0ebf9 = **15** | #e0e7ff on #11122f = **14.8** | #ecf3f8 on #0a192d = **15.75** |
| 14 | subscription-status-banner.tsx:87 past-due banner | text (4.5) | `text-amber-800 dark:text-amber-200` / `bg-background` > `bg-amber-50 dark:bg-amber-950/50` | `text-warning-text` / `bg-background` > `bg-warning/10` | #973c00 on #fffbeb = **6.84** | #965900 on #f7f1e1 = **5** | #fee685 on #251209 = **14.43** | #fbc044 on #1a180f = **10.77** |
| 15 | subscription-status-banner.tsx:95 Update billing hover | text (4.5) | `text-amber-900 dark:text-amber-100` / `bg-background` > `bg-amber-50 dark:bg-amber-950/50` | `text-foreground` / `bg-background` > `bg-warning/10` | #7b3306 on #fffbeb = **8.73** | #0e171f on #f7f1e1 = **16.04** | #fef3c6 on #251209 = **16.12** | #ecf3f8 on #1a180f = **15.86** |
| 16 | subscription-status-banner.tsx:108 inactive banner | text (4.5) | `text-red-800 dark:text-red-200` / `bg-background` > `bg-red-50 dark:bg-red-950/50` | `text-destructive-text` / `bg-background` > `bg-destructive/10` | #9f0712 on #fef2f2 = **7.64** | #be000d on #f7e1e4 = **5.27** | #ffc9c9 on #25090d = **12.86** | #ff6762 on #18090f = **6.79** |
| 17 | subscription-status-banner.tsx:116 Reactivate hover | text (4.5) | `text-red-900 dark:text-red-100` / `bg-background` > `bg-red-50 dark:bg-red-950/50` | `text-foreground` / `bg-background` > `bg-destructive/10` | #82181a on #fef2f2 = **9.16** | #0e171f on #f7e1e4 = **14.51** | #ffe2e2 on #25090d = **15.33** | #ecf3f8 on #18090f = **17.28** |
| 18 | columns.tsx:32,44,92,134 / maintenance-utils.ts:22,37,67 Open/Needs Reassignment/High/aging<=7 | text (4.5) | `text-orange-600 dark:text-orange-400` / `bg-background` > `bg-card` > `bg-orange-500/10` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #f54a00 on #fbede5 = **3.13** | #965900 on #f8f2e4 = **5.05** | #ff8904 on #211714 = **7.38** | #fbc044 on #1d1c14 = **10.36** |
| 19 | columns.tsx:48,131 / maintenance-utils.ts:42 Completed / aging<=3 | text (4.5) | `text-green-600 dark:text-green-400` / `bg-background` > `bg-card` > `bg-green-500/10` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #00a63e on #e1f6ec = **2.85** | #007b40 on #e1f4ee = **4.7** | #05df72 on #07211c = **9.49** | #4bdc95 on #071f1c = **9.8** |
| 20 | columns.tsx:138 / maintenance-card.tsx:35 aging<=14 | text (4.5) | `text-orange-700 dark:text-orange-400` / `bg-background` > `bg-card` > `bg-orange-100 dark:bg-orange-500/20` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/20` | #ca3500 on #ffedd4 = **4.56** | #965900 on #f5eacb = **4.7** | #ff8904 on #3a2012 = **6.33** | #fbc044 on #322912 = **8.71** |
| 21 | maintenance-utils.ts:27,32,64,65 Assigned/In Progress/Normal/Medium (sibling) | text (4.5) | `text-primary` / `bg-background` > `bg-card` > `bg-primary/10` | `text-primary-text` / `bg-background` > `bg-card` > `bg-primary/10` | #0064ef on #e1ecfc = **4.33** | #004fc4 on #e1ecfc = **6.04** | #439fff on #0e1c32 = **6.21** | #7cbeff on #0e1c32 = **8.67** |
| 22 | maintenance-utils.ts:70 Urgent (sibling) | text (4.5) | `text-destructive` / `bg-background` > `bg-card` > `bg-destructive/10` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-destructive/10` | #e7001e on #f8e2e7 = **3.85** | #be000d on #f8e2e7 = **5.33** | #c90000 on #1b0d14 = **3.13** | #ff6762 on #1b0d14 = **6.61** |
| 23 | maintenance-kanban.client.tsx:76 Needs Reassignment column icon | nontext (3) | `text-orange-600 dark:text-orange-400` / `bg-background` > `bg-card` > `bg-orange-500/10` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #f54a00 on #fbede5 = **3.13** | #965900 on #f8f2e4 = **5.05** | #ff8904 on #211714 = **7.38** | #fbc044 on #1d1c14 = **10.36** |
| 24 | timeline-card.tsx:27 completed event icon | nontext (3) | `text-green-600` / `bg-background` > `bg-card` > `bg-green-500/10` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #00a63e on #e1f6ec = **2.85** | #007b40 on #e1f4ee = **4.7** | #00a63e on #07211c = **5.25** | #4bdc95 on #071f1c = **9.8** |
| 25 | timeline-card.tsx:28 other event icon (sibling) | nontext (3) | `text-primary` / `bg-background` > `bg-card` > `bg-primary/10` | `text-primary-text` / `bg-background` > `bg-card` > `bg-primary/10` | #0064ef on #e1ecfc = **4.33** | #004fc4 on #e1ecfc = **6.04** | #439fff on #0e1c32 = **6.21** | #7cbeff on #0e1c32 = **8.67** |
| 26 | lease-detail-utils.ts:164,171,174 timeline created/ended icon | nontext (3) | `text-stone-500` / `bg-background` > `bg-card` > `bg-stone-100 dark:bg-stone-800` | `text-muted-foreground` / `bg-background` > `bg-card` > `bg-muted` | #79716b on #f5f5f4 = **4.39** | #575f66 on #e5ecf1 = **5.44** | #79716b on #292524 = **3.17** | #a2acb7 on #141b24 = **7.53** |
| 27 | lease-detail-utils.ts:165,169 timeline sent/renewed icon | nontext (3) | `text-blue-600` / `bg-background` > `bg-card` > `bg-blue-100 dark:bg-blue-900/30` | `text-info-text` / `bg-background` > `bg-card` > `bg-info/10` | #155dfc on #dbeafe = **4.3** | #0064b2 on #e1f0fb = **5.21** | #155dfc on #0d1a3a = **3.27** | #6cc3ff on #091b2c = **9.04** |
| 28 | lease-detail-utils.ts:166-168 timeline signed/activated icon | nontext (3) | `text-emerald-600` / `bg-background` > `bg-card` > `bg-emerald-100 dark:bg-emerald-900/30` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #009966 on #d0fae5 = **3.22** | #007b40 on #e1f4ee = **4.7** | #009966 on #062221 = **4.57** | #4bdc95 on #071f1c = **9.8** |
| 29 | lease-detail-utils.ts:170 timeline terminated icon | nontext (3) | `text-red-600` / `bg-background` > `bg-card` > `bg-red-100 dark:bg-red-900/30` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-destructive/10` | #e7000b on #ffe2e2 = **3.91** | #be000d on #f8e2e7 = **5.33** | #e7000b on #2c1017 = **3.69** | #ff6762 on #1b0d14 = **6.61** |
| 30 | lease-detail-utils.ts:172 timeline expired icon | nontext (3) | `text-amber-600` / `bg-background` > `bg-card` > `bg-amber-100 dark:bg-amber-900/30` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #e17100 on #fef3c6 = **2.87** | #965900 on #f8f2e4 = **5.05** | #e17100 on #2a1811 = **5.31** | #fbc044 on #1d1c14 = **10.36** |
| 31 | lease-detail-utils.ts:188,203,208 Draft/Ended/Expired badge | text (4.5) | `text-stone-600 dark:text-stone-400` / `bg-background` > `bg-card` > `bg-stone-100 dark:bg-stone-800` | `text-muted-foreground` / `bg-background` > `bg-card` > `bg-muted` | #57534d on #f5f5f4 = **7** | #575f66 on #e5ecf1 = **5.44** | #a6a09b on #292524 = **5.87** | #a2acb7 on #141b24 = **7.53** |
| 32 | lease-detail-utils.ts:226 fallback badge | text (4.5) | `text-stone-600` / `bg-background` > `bg-card` > `bg-stone-100` | `text-muted-foreground` / `bg-background` > `bg-card` > `bg-muted` | #57534d on #f5f5f4 = **7** | #575f66 on #e5ecf1 = **5.44** | #57534d on #f5f5f4 = **7** | #a2acb7 on #141b24 = **7.53** |
| 33 | lease-detail-utils.ts:193 Pending Signature badge | text (4.5) | `text-amber-700 dark:text-amber-400` / `bg-background` > `bg-card` > `bg-amber-100 dark:bg-amber-900/30` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #bb4d00 on #fef3c6 = **4.52** | #965900 on #f8f2e4 = **5.05** | #ffb900 on #2a1811 = **9.85** | #fbc044 on #1d1c14 = **10.36** |
| 34 | lease-detail-utils.ts:198 Active badge | text (4.5) | `text-emerald-700 dark:text-emerald-400` / `bg-background` > `bg-card` > `bg-emerald-100 dark:bg-emerald-900/30` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #007a55 on #d0fae5 = **4.72** | #007b40 on #e1f4ee = **4.7** | #00d492 on #062221 = **8.61** | #4bdc95 on #071f1c = **9.8** |
| 35 | lease-detail-utils.ts:212 Terminated badge | text (4.5) | `text-red-700 dark:text-red-400` / `bg-background` > `bg-card` > `bg-red-100 dark:bg-red-900/30` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-destructive/10` | #c10007 on #ffe2e2 = **5.27** | #be000d on #f8e2e7 = **5.33** | #ff6467 on #2c1017 = **6.09** | #ff6762 on #1b0d14 = **6.61** |
| 36 | lease-detail-utils.ts:219 Expiring badge | text (4.5) | `text-orange-700 dark:text-orange-400` / `bg-background` > `bg-card` > `bg-orange-100 dark:bg-orange-900/30` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #ca3500 on #ffedd4 = **4.56** | #965900 on #f8f2e4 = **5.05** | #ff8904 on #2b1613 = **7.2** | #fbc044 on #1d1c14 = **10.36** |
| 37 | lease-header.tsx:120 Expires-in badge (outline -> Badge variant=warning) | text (4.5) | `text-orange-600 dark:text-orange-400` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #f54a00 on #fafcfe = **3.48** | #965900 on #f8f2e4 = **5.05** | #ff8904 on #080e16 = **8.14** | #fbc044 on #1d1c14 = **10.36** |
| 38 | lease-header.tsx:120 Expires-in badge border (decorative; Badge variant border) | decor (none) | `text-orange-500` / `bg-background` > `bg-card` | `text-warning/20` / `bg-background` > `bg-card` | #ff6900 on #fafcfe = **2.81** | #f5eacb on #fafcfe = **1.17** | #ff6900 on #080e16 = **6.7** | #322912 on #080e16 = **1.35** |
| 39 | lease-details-tab.tsx:58 expiring-soon text | text (4.5) | `text-orange-600 dark:text-orange-400` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #f54a00 on #fafcfe = **3.48** | #965900 on #fafcfe = **5.48** | #ff8904 on #080e16 = **8.14** | #fbc044 on #080e16 = **11.73** |
| 40 | lease-terms-tab.tsx:131 disclosure heading | text (4.5) | `text-amber-800 dark:text-amber-200` / `bg-background` > `bg-card` > `bg-amber-50/50 dark:bg-amber-900/10` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/5` | #973c00 on #fdfcf4 = **6.89** | #965900 on #f8f7f1 = **5.25** | #fee685 on #141114 = **15.06** | #fbc044 on #131415 = **11.18** |
| 41 | lease-terms-tab.tsx:134 disclosure body | text (4.5) | `text-amber-700 dark:text-amber-300` / `bg-background` > `bg-card` > `bg-amber-50/50 dark:bg-amber-900/10` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/5` | #bb4d00 on #fdfcf4 = **4.89** | #965900 on #f8f7f1 = **5.25** | #ffd230 on #141114 = **12.96** | #fbc044 on #131415 = **11.18** |
| 42 | details-step.tsx:270 lead-paint AlertTriangle icon | nontext (3) | `text-amber-500` / `bg-background` > `bg-card` > `bg-muted/50` | `text-warning-text` / `bg-background` > `bg-card` > `bg-muted/50` | #fe9a00 on #f0f4f8 = **1.93** | #965900 on #f0f4f8 = **5.1** | #fe9a00 on #0e151d = **8.6** | #fbc044 on #0e151d = **11.13** |
| 43 | review-step.tsx:255 acknowledged CheckCircle2 icon | nontext (3) | `text-green-500` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #00c950 on #fafcfe = **2.16** | #007b40 on #fafcfe = **5.23** | #00c950 on #080e16 = **8.73** | #4bdc95 on #080e16 = **11.04** |
| 44 | review-step.tsx:256 required CheckCircle2 icon | nontext (3) | `text-amber-500` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #fe9a00 on #fafcfe = **2.08** | #965900 on #fafcfe = **5.48** | #fe9a00 on #080e16 = **9.07** | #fbc044 on #080e16 = **11.73** |
| 45 | review-step.tsx:263 Disclosure Acknowledged badge (outline -> Badge variant=success) | text (4.5) | `text-green-600` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #00a63e on #fafcfe = **3.13** | #007b40 on #e1f4ee = **4.7** | #00a63e on #080e16 = **6.01** | #4bdc95 on #071f1c = **9.8** |
| 46 | tenant-grid.tsx:76 Active badge | text (4.5) | `text-emerald-700 dark:text-emerald-400` / `bg-background` > `bg-card` > `bg-emerald-100 dark:bg-emerald-900/30` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #007a55 on #d0fae5 = **4.72** | #007b40 on #e1f4ee = **4.7** | #00d492 on #062221 = **8.61** | #4bdc95 on #071f1c = **9.8** |
| 47 | tenant-stats.tsx:50 Active value (32px bold StatValue) | large (3) | `text-emerald-600 dark:text-emerald-400` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #00d492 on #080e16 = **9.99** | #4bdc95 on #080e16 = **11.04** |
| 48 | tenant-stats.tsx:71 Pending value (32px bold StatValue) | large (3) | `text-amber-600 dark:text-amber-400` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #e17100 on #fafcfe = **3.11** | #965900 on #fafcfe = **5.48** | #ffb900 on #080e16 = **11.24** | #fbc044 on #080e16 = **11.73** |
| 49 | tenant-detail-sheet-tabs.tsx:164 Verified | text (4.5) | `text-emerald-600` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #009966 on #080e16 = **5.3** | #4bdc95 on #080e16 = **11.04** |
| 50 | tenant-detail-sheet-tabs.tsx:168 Pending | text (4.5) | `text-amber-600` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #e17100 on #fafcfe = **3.11** | #965900 on #fafcfe = **5.48** | #e17100 on #080e16 = **6.05** | #fbc044 on #080e16 = **11.73** |
| 51 | property-table-row.tsx:160 available badge | text (4.5) | `text-emerald-700 dark:text-emerald-400` / `bg-background` > `bg-card` > `bg-emerald-100 dark:bg-emerald-500/20` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #007a55 on #d0fae5 = **4.72** | #007b40 on #e1f4ee = **4.7** | #00d492 on #06312b = **7.31** | #4bdc95 on #071f1c = **9.8** |
| 52 | property-table-row.tsx:168 maintenance badge | text (4.5) | `text-amber-700 dark:text-amber-400` / `bg-background` > `bg-card` > `bg-amber-100 dark:bg-amber-500/20` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #bb4d00 on #fef3c6 = **4.52** | #965900 on #f8f2e4 = **5.05** | #ffb900 on #392a12 = **8.05** | #fbc044 on #1d1c14 = **10.36** |
| 53 | property-table-row.tsx:178 Full badge | text (4.5) | `text-blue-700 dark:text-blue-400` / `bg-background` > `bg-card` > `bg-blue-100 dark:bg-blue-500/20` | `text-info-text` / `bg-background` > `bg-card` > `bg-info/10` | #1447e6 on #dbeafe = **5.6** | #0064b2 on #e1f0fb = **5.21** | #50a2ff on #0f2546 = **5.79** | #6cc3ff on #091b2c = **9.04** |
| 54 | property-table-row.tsx:191 revenue | text (4.5) | `text-emerald-600 dark:text-emerald-400` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #00d492 on #080e16 = **9.99** | #4bdc95 on #080e16 = **11.04** |
| 55 | property-table-row.tsx:137 occupancy bar 100% | nontext (3) | `text-emerald-500` / `bg-background` > `bg-card` > `bg-muted` | `text-success-text` / `bg-background` > `bg-card` > `bg-muted` | #00bc7d on #e5ecf1 = **2.07** | #007b40 on #e5ecf1 = **4.5** | #00bc7d on #141b24 = **7** | #4bdc95 on #141b24 = **9.88** |
| 56 | property-table-row.tsx:139 occupancy bar >=80% | nontext (3) | `text-blue-500` / `bg-background` > `bg-card` > `bg-muted` | `text-info-text` / `bg-background` > `bg-card` > `bg-muted` | #2b7fff on #e5ecf1 = **3.15** | #0064b2 on #e5ecf1 = **5.08** | #2b7fff on #141b24 = **4.61** | #6cc3ff on #141b24 = **8.98** |
| 57 | property-table-row.tsx:140 occupancy bar <80% | nontext (3) | `text-amber-500` / `bg-background` > `bg-card` > `bg-muted` | `text-warning-text` / `bg-background` > `bg-card` > `bg-muted` | #fe9a00 on #e5ecf1 = **1.79** | #965900 on #e5ecf1 = **4.72** | #fe9a00 on #141b24 = **8.12** | #fbc044 on #141b24 = **10.5** |
| 58 | property-table-row.tsx:137 occupancy bar 100%, vivid bg-success (rejected: light < 3:1) | nontext (3) | `text-emerald-500` / `bg-background` > `bg-card` > `bg-muted` | `text-success` / `bg-background` > `bg-card` > `bg-muted` | #00bc7d on #e5ecf1 = **2.07** | #00b565 on #e5ecf1 = **2.26** | #00bc7d on #141b24 = **7** | #00b84e on #141b24 = **6.57** |
| 59 | property-table-row.tsx:139 occupancy bar >=80%, vivid bg-info (rejected: light < 3:1) | nontext (3) | `text-blue-500` / `bg-background` > `bg-card` > `bg-muted` | `text-info` / `bg-background` > `bg-card` > `bg-muted` | #2b7fff on #e5ecf1 = **3.15** | #008feb on #e5ecf1 = **2.87** | #2b7fff on #141b24 = **4.61** | #1795fa on #141b24 = **5.54** |
| 60 | property-table-row.tsx:140 occupancy bar <80%, vivid bg-warning (rejected: light < 3:1) | nontext (3) | `text-amber-500` / `bg-background` > `bg-card` > `bg-muted` | `text-warning` / `bg-background` > `bg-card` > `bg-muted` | #fe9a00 on #e5ecf1 = **1.79** | #e1a200 on #e5ecf1 = **1.88** | #fe9a00 on #141b24 = **8.12** | #de9400 on #141b24 = **6.88** |
| 61 | property-units-table-config.ts:12 Occupied badge | text (4.5) | `text-blue-700 dark:text-blue-400` / `bg-background` > `bg-card` > `bg-blue-100 dark:bg-blue-500/20` | `text-info-text` / `bg-background` > `bg-card` > `bg-info/10` | #1447e6 on #dbeafe = **5.6** | #0064b2 on #e1f0fb = **5.21** | #50a2ff on #0f2546 = **5.79** | #6cc3ff on #091b2c = **9.04** |
| 62 | property-units-table-config.ts:18 Available badge | text (4.5) | `text-green-700 dark:text-green-400` / `bg-background` > `bg-card` > `bg-green-100 dark:bg-green-500/20` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #008236 on #dbfce7 = **4.5** | #007b40 on #e1f4ee = **4.7** | #05df72 on #063322 = **7.85** | #4bdc95 on #071f1c = **9.8** |
| 63 | property-units-table-config.ts:24 Maintenance badge | text (4.5) | `text-amber-700 dark:text-amber-400` / `bg-background` > `bg-card` > `bg-amber-100 dark:bg-amber-500/20` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #bb4d00 on #fef3c6 = **4.52** | #965900 on #f8f2e4 = **5.05** | #ffb900 on #392a12 = **8.05** | #fbc044 on #1d1c14 = **10.36** |
| 64 | property-units-table-config.ts:30 Reserved badge | text (4.5) | `text-purple-700 dark:text-purple-400` / `bg-background` > `bg-card` > `bg-purple-100 dark:bg-purple-500/20` | `text-primary-text` / `bg-background` > `bg-card` > `bg-primary/10` | #8200db on #f3e8ff = **5.99** | #004fc4 on #e1ecfc = **6.04** | #c27aff on #291946 = **5.69** | #7cbeff on #0e1c32 = **8.67** |
| 65 | property-select-card.tsx:105 DollarSign icon | nontext (3) | `text-emerald-600` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #009966 on #080e16 = **5.3** | #4bdc95 on #080e16 = **11.04** |
| 66 | property-stats-section.tsx:85 DollarSign icon on tile | nontext (3) | `text-emerald-600` / `bg-background` > `bg-card` > `bg-emerald-500/10` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #009966 on #e1f5f0 = **3.22** | #007b40 on #e1f4ee = **4.7** | #009966 on #072020 = **4.65** | #4bdc95 on #071f1c = **9.8** |
| 67 | property-stats-section.tsx:85 DollarSign icon on hovered tile | nontext (3) | `text-emerald-600` / `bg-background` > `bg-card` > `bg-emerald-500/20` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/20` | #009966 on #c8f0e4 = **2.96** | #007b40 on #c8eedf = **4.29** | #009966 on #06312b = **3.88** | #4bdc95 on #063022 = **8.23** |
| 68 | property-images-create-section.tsx:114 Uploaded label (over white image) | text (4.5) | `text-green-400` / `bg-white` > `bg-black/50` | `text-white` / `bg-white` > `bg-black/75` | #05df72 on #7f7f7f = **2.25** | #ffffff on #404040 = **10.37** | #05df72 on #7f7f7f = **2.25** | #ffffff on #404040 = **10.37** |
| 69 | property-images-create-section.tsx:120 Failed label (over white image) | text (4.5) | `text-red-400` / `bg-white` > `bg-black/50` | `text-white` / `bg-white` > `bg-black/75` | #ff6467 on #7f7f7f = **1.39** | #ffffff on #404040 = **10.37** | #ff6467 on #7f7f7f = **1.39** | #ffffff on #404040 = **10.37** |
| 70 | property-images-create-section.tsx:109 Uploading label (over white image, sibling) | text (4.5) | `text-white` / `bg-white` > `bg-black/50` | `text-white` / `bg-white` > `bg-black/75` | #ffffff on #7f7f7f = **4** | #ffffff on #404040 = **10.37** | #ffffff on #7f7f7f = **4** | #ffffff on #404040 = **10.37** |
| 71 | property-images-create-section.tsx:114 Uploaded icon (over white image) | nontext (3) | `text-green-400` / `bg-white` > `bg-black/50` | `dark text-success-text` / `bg-white` > `bg-black/75` | #05df72 on #7f7f7f = **2.25** | #4bdc95 on #404040 = **5.91** | #05df72 on #7f7f7f = **2.25** | #4bdc95 on #404040 = **5.91** |
| 72 | property-images-create-section.tsx:120 Failed icon (over white image) | nontext (3) | `text-red-400` / `bg-white` > `bg-black/50` | `dark text-destructive-text` / `bg-white` > `bg-black/75` | #ff6467 on #7f7f7f = **1.39** | #ff6762 on #404040 = **3.64** | #ff6467 on #7f7f7f = **1.39** | #ff6762 on #404040 = **3.64** |
| 73 | property-images-create-section.tsx:114 Uploaded icon (over black image) | nontext (3) | `text-green-400` / `bg-black` > `bg-black/50` | `dark text-success-text` / `bg-black` > `bg-black/75` | #05df72 on #000000 = **11.8** | #4bdc95 on #000000 = **11.97** | #05df72 on #000000 = **11.8** | #4bdc95 on #000000 = **11.97** |
| 74 | property-images-create-section.tsx:120 Failed icon (over black image) | nontext (3) | `text-red-400` / `bg-black` > `bg-black/50` | `dark text-destructive-text` / `bg-black` > `bg-black/75` | #ff6467 on #000000 = **7.27** | #ff6762 on #000000 = **7.37** | #ff6467 on #000000 = **7.27** | #ff6762 on #000000 = **7.37** |
| 75 | balance-equation-check.tsx:32 Balanced | text (4.5) | `text-emerald-600` / `bg-background` > `bg-emerald-50 dark:bg-emerald-950/30` | `text-success-text` / `bg-background` > `bg-success/10` | #009966 on #ecfdf5 = **3.47** | #007b40 on #e0f3eb = **4.66** | #009966 on #031416 = **5.15** | #4bdc95 on #041b17 = **10.19** |
| 76 | balance-equation-check.tsx:37 Unbalanced | text (4.5) | `text-red-600` / `bg-background` > `bg-red-50 dark:bg-red-950/30` | `text-destructive-text` / `bg-background` > `bg-destructive/10` | #e7000b on #fef2f2 = **4.36** | #be000d on #f7e1e4 = **5.27** | #e7000b on #17080e = **4.09** | #ff6762 on #18090f = **6.79** |
| 77 | balance-section.tsx:72 negative amount | text (4.5) | `text-red-600` / `bg-background` > `bg-card` | `text-destructive-text` / `bg-background` > `bg-card` | #e7000b on #fafcfe = **4.64** | #be000d on #fafcfe = **6.39** | #e7000b on #080e16 = **4.06** | #ff6762 on #080e16 = **6.79** |
| 78 | balance-sheet/page.tsx:227 / cash-flow-stats.tsx:34 / income-statement-page-stats.tsx:36 / analytics-stat-cards.tsx:98 / financial-overview-stats.tsx:79 / performance-stat-cards.tsx:51 success stat value (32px bold StatValue) | large (3) | `text-emerald-600 dark:text-emerald-400` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #00d492 on #080e16 = **9.99** | #4bdc95 on #080e16 = **11.04** |
| 79 | balance-sheet/page.tsx:244 / cash-flow-stats.tsx:51 / income-statement-page-stats.tsx:52 / expense-stats.tsx:48 destructive stat value (32px bold StatValue) | large (3) | `text-red-600 dark:text-red-400` / `bg-background` > `bg-card` | `text-destructive-text` / `bg-background` > `bg-card` | #e7000b on #fafcfe = **4.64** | #be000d on #fafcfe = **6.39** | #ff6467 on #080e16 = **6.7** | #ff6762 on #080e16 = **6.79** |
| 80 | analytics-stat-cards.tsx:130 Open Maintenance value (32px bold StatValue) | large (3) | `text-amber-600 dark:text-amber-400` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #e17100 on #fafcfe = **3.11** | #965900 on #fafcfe = **5.48** | #ffb900 on #080e16 = **11.24** | #fbc044 on #080e16 = **11.73** |
| 81 | analytics-stat-cards.tsx:81,138 / expense-stats.tsx:88 change text (success) | text (4.5) | `text-emerald-600 dark:text-emerald-400` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #00d492 on #080e16 = **9.99** | #4bdc95 on #080e16 = **11.04** |
| 82 | analytics-stat-cards.tsx:142 / expense-stats.tsx:88 change text (warning/destructive) | text (4.5) | `text-amber-600 dark:text-amber-400` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #e17100 on #fafcfe = **3.11** | #965900 on #fafcfe = **5.48** | #ffb900 on #080e16 = **11.24** | #fbc044 on #080e16 = **11.73** |
| 83 | expense-stats.tsx:74 Maintenance value (32px bold StatValue) | large (3) | `text-orange-600 dark:text-orange-400` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #f54a00 on #fafcfe = **3.48** | #965900 on #fafcfe = **5.48** | #ff8904 on #080e16 = **8.14** | #fbc044 on #080e16 = **11.73** |
| 84 | balance-sheet/page.tsx:303 / cash-flow-breakdown.tsx:44,66 / cash-flow-balance-summary.tsx:32 / income-statement-page-breakdowns.tsx:29,64 / income-statement-page-net-summary.tsx:33,65,82 / year-end-report-section.tsx:160,169 success amount (no dark pair) | text (4.5) | `text-emerald-600` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #009966 on #080e16 = **5.3** | #4bdc95 on #080e16 = **11.04** |
| 85 | balance-sheet/page.tsx:313 / cash-flow-breakdown.tsx:90,112 / cash-flow-balance-summary.tsx:32 / income-statement-page-breakdowns.tsx:113 / income-statement-page-net-summary.tsx:41 destructive amount (no dark pair) | text (4.5) | `text-red-600` / `bg-background` > `bg-card` | `text-destructive-text` / `bg-background` > `bg-card` | #e7000b on #fafcfe = **4.64** | #be000d on #fafcfe = **6.39** | #e7000b on #080e16 = **4.06** | #ff6762 on #080e16 = **6.79** |
| 86 | year-end-report-section.tsx:163,170,216 negative/expense amount | text (4.5) | `text-red-500` / `bg-background` > `bg-card` | `text-destructive-text` / `bg-background` > `bg-card` | #fb2c36 on #fafcfe = **3.7** | #be000d on #fafcfe = **6.39** | #fb2c36 on #080e16 = **5.08** | #ff6762 on #080e16 = **6.79** |
| 87 | cash-flow-breakdown.tsx:30 / income-statement-page-breakdowns.tsx:29 inflow/revenue heading icon | nontext (3) | `text-emerald-600` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #009966 on #fafcfe = **3.55** | #007b40 on #fafcfe = **5.23** | #009966 on #080e16 = **5.3** | #4bdc95 on #080e16 = **11.04** |
| 88 | cash-flow-breakdown.tsx:76 / income-statement-page-breakdowns.tsx:76 outflow/expense heading icon | nontext (3) | `text-red-600` / `bg-background` > `bg-card` | `text-destructive-text` / `bg-background` > `bg-card` | #e7000b on #fafcfe = **4.64** | #be000d on #fafcfe = **6.39** | #e7000b on #080e16 = **4.06** | #ff6762 on #080e16 = **6.79** |
| 89 | cash-flow-breakdown.tsx:51 inflow bar on track | nontext (3) | `text-emerald-500` / `bg-background` > `bg-card` > `bg-muted` | `text-success-text` / `bg-background` > `bg-card` > `bg-muted` | #00bc7d on #e5ecf1 = **2.07** | #007b40 on #e5ecf1 = **4.5** | #00bc7d on #141b24 = **7** | #4bdc95 on #141b24 = **9.88** |
| 90 | cash-flow-breakdown.tsx:97 outflow bar on track | nontext (3) | `text-red-500` / `bg-background` > `bg-card` > `bg-muted` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-muted` | #fb2c36 on #e5ecf1 = **3.19** | #be000d on #e5ecf1 = **5.51** | #fb2c36 on #141b24 = **4.55** | #ff6762 on #141b24 = **6.08** |
| 91 | cash-flow-breakdown.tsx:97 outflow bar, vivid bg-destructive (rejected: dark < 3:1) | nontext (3) | `text-red-500` / `bg-background` > `bg-card` > `bg-muted` | `text-destructive` / `bg-background` > `bg-card` > `bg-muted` | #fb2c36 on #e5ecf1 = **3.19** | #e7001e on #e5ecf1 = **3.99** | #fb2c36 on #141b24 = **4.55** | #c90000 on #141b24 = **2.87** |
| 92 | cash-flow-breakdown.tsx:51 inflow bar, vivid bg-success (rejected: light < 3:1) | nontext (3) | `text-emerald-500` / `bg-background` > `bg-card` > `bg-muted` | `text-success` / `bg-background` > `bg-card` > `bg-muted` | #00bc7d on #e5ecf1 = **2.07** | #00b565 on #e5ecf1 = **2.26** | #00bc7d on #141b24 = **7** | #00b84e on #141b24 = **6.57** |
| 93 | income-statement-page-breakdowns.tsx:44 revenue dot | nontext (3) | `text-emerald-500` / `bg-background` > `bg-card` | `text-success-text` / `bg-background` > `bg-card` | #00bc7d on #fafcfe = **2.41** | #007b40 on #fafcfe = **5.23** | #00bc7d on #080e16 = **7.83** | #4bdc95 on #080e16 = **11.04** |
| 94 | income-statement-page-breakdowns.tsx:93 expense dot | nontext (3) | `text-red-500` / `bg-background` > `bg-card` | `text-destructive-text` / `bg-background` > `bg-card` | #fb2c36 on #fafcfe = **3.7** | #be000d on #fafcfe = **6.39** | #fb2c36 on #080e16 = **5.08** | #ff6762 on #080e16 = **6.79** |
| 95 | cash-flow-activity.tsx:23 operating value (text-2xl semibold) | large (3) | `text-emerald-600` / `bg-background` > `bg-card` > `bg-emerald-50 dark:bg-emerald-950/30` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #009966 on #ecfdf5 = **3.47** | #007b40 on #e1f4ee = **4.7** | #009966 on #061719 = **5.02** | #4bdc95 on #071f1c = **9.8** |
| 96 | cash-flow-activity.tsx:31 investing value (text-2xl semibold) | large (3) | `text-red-600` / `bg-background` > `bg-card` > `bg-red-50 dark:bg-red-950/30` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-destructive/10` | #e7000b on #fef2f2 = **4.36** | #be000d on #f8e2e7 = **5.33** | #e7000b on #1a0b12 = **4** | #ff6762 on #1b0d14 = **6.61** |
| 97 | expense-category-badge.tsx:15 maintenance | text (4.5) | `text-orange-700 dark:text-orange-300` / `bg-background` > `bg-card` > `bg-orange-100 dark:bg-orange-900/30` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #ca3500 on #ffedd4 = **4.56** | #965900 on #f8f2e4 = **5.05** | #ffb86a on #2b1613 = **10.04** | #fbc044 on #1d1c14 = **10.36** |
| 98 | expense-category-badge.tsx:16 utilities | text (4.5) | `text-blue-700 dark:text-blue-300` / `bg-background` > `bg-card` > `bg-blue-100 dark:bg-blue-900/30` | `text-info-text` / `bg-background` > `bg-card` > `bg-info/10` | #1447e6 on #dbeafe = **5.6** | #0064b2 on #e1f0fb = **5.21** | #8ec5ff on #0d1a3a = **9.45** | #6cc3ff on #091b2c = **9.04** |
| 99 | expense-category-badge.tsx:18 insurance | text (4.5) | `text-purple-700 dark:text-purple-300` / `bg-background` > `bg-card` > `bg-purple-100 dark:bg-purple-900/30` | `text-primary-text` / `bg-background` > `bg-card` > `bg-primary/10` | #8200db on #f3e8ff = **5.99** | #004fc4 on #e1ecfc = **6.04** | #dab2ff on #201039 = **9.87** | #7cbeff on #0e1c32 = **8.67** |
| 100 | expense-category-badge.tsx:19 taxes | text (4.5) | `text-red-700 dark:text-red-300` / `bg-background` > `bg-card` > `bg-red-100 dark:bg-red-900/30` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-destructive/10` | #c10007 on #ffe2e2 = **5.27** | #be000d on #f8e2e7 = **5.33** | #ffa2a2 on #2c1017 = **9.17** | #ff6762 on #1b0d14 = **6.61** |
| 101 | expense-category-badge.tsx:21 management | text (4.5) | `text-emerald-700 dark:text-emerald-300` / `bg-background` > `bg-card` > `bg-emerald-100 dark:bg-emerald-900/30` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #007a55 on #d0fae5 = **4.72** | #007b40 on #e1f4ee = **4.7** | #5ee9b5 on #062221 = **10.96** | #4bdc95 on #071f1c = **9.8** |
| 102 | expense-category-badge.tsx:22,26 other/default | text (4.5) | `text-stone-700 dark:text-stone-300` / `bg-background` > `bg-card` > `bg-stone-100 dark:bg-stone-800` | `text-muted-foreground` / `bg-background` > `bg-card` > `bg-muted` | #44403b on #f5f5f4 = **9.43** | #575f66 on #e5ecf1 = **5.44** | #d6d3d1 on #292524 = **10.18** | #a2acb7 on #141b24 = **7.53** |
| 103 | tax-documents/page.tsx:173 income icon tile | nontext (3) | `text-emerald-600` / `bg-background` > `bg-card` > `bg-emerald-100 dark:bg-emerald-900/30` | `text-success-text` / `bg-background` > `bg-card` > `bg-success/10` | #009966 on #d0fae5 = **3.22** | #007b40 on #e1f4ee = **4.7** | #009966 on #062221 = **4.57** | #4bdc95 on #071f1c = **9.8** |
| 104 | tax-documents/page.tsx:189 deductions icon tile | nontext (3) | `text-rose-600` / `bg-background` > `bg-card` > `bg-rose-100 dark:bg-rose-900/30` | `text-destructive-text` / `bg-background` > `bg-card` > `bg-destructive/10` | #ec003f on #ffe4e6 = **3.77** | #be000d on #f8e2e7 = **5.33** | #ec003f on #2f0b1f = **3.9** | #ff6762 on #1b0d14 = **6.61** |
| 105 | tax-documents/page.tsx:205 net taxable icon tile | nontext (3) | `text-blue-600` / `bg-background` > `bg-card` > `bg-blue-100 dark:bg-blue-900/30` | `text-info-text` / `bg-background` > `bg-card` > `bg-info/10` | #155dfc on #dbeafe = **4.3** | #0064b2 on #e1f0fb = **5.21** | #155dfc on #0d1a3a = **3.27** | #6cc3ff on #091b2c = **9.04** |
| 106 | year-end-report-section.tsx:234 1099 heading icon | nontext (3) | `text-amber-500` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` | #fe9a00 on #fafcfe = **2.08** | #965900 on #fafcfe = **5.48** | #fe9a00 on #080e16 = **9.07** | #fbc044 on #080e16 = **11.73** |
| 107 | year-end-report-section.tsx:290 1099 Required badge (outline -> Badge variant=warning) | text (4.5) | `text-amber-600` / `bg-background` > `bg-card` | `text-warning-text` / `bg-background` > `bg-card` > `bg-warning/10` | #e17100 on #fafcfe = **3.11** | #965900 on #f8f2e4 = **5.05** | #e17100 on #080e16 = **6.05** | #fbc044 on #1d1c14 = **10.36** |
| 108 | year-end-report-section.tsx:290 1099 Required badge border (decorative; Badge variant border) | decor (none) | `text-amber-300` / `bg-background` > `bg-card` | `text-warning/20` / `bg-background` > `bg-card` | #ffd230 on #fafcfe = **1.41** | #f5eacb on #fafcfe = **1.17** | #ffd230 on #080e16 = **13.38** | #322912 on #080e16 = **1.35** |

BorderBeam before/after (decorative, no minimum; on the card): `hsl(142 76% 36%)` `#16a249` 3.24 / 5.81 -> `var(--color-success)` `#00b565` 2.62 / `#00b84e` 7.34; `hsl(45 93% 47%)` `#e7b008` 1.92 / 9.78 -> `var(--color-warning)` `#e1a200` 2.18 / `#de9400` 7.69.

## 3. Guard G10

`checkRawPaletteColors` (`src/test/utils/tailwind-guards.ts`), run by `describe("G10 …")` in `src/app/__tests__/tailwind-theme-integrity.test.ts` over every shipped source under `src/` (`collectG7SourceTexts`: `.ts`, `.tsx`, `.css`, minus tests, `__tests__/` and `src/test/`; a superset of `src/app` and `src/components`).

- Candidates come from Oxide (`Scanner.getCandidatesWithPositions`) per file, so each hit has its line. Each candidate is compiled with the project's design system; a hit is a candidate whose CSS references `--color-<family>-<shade>`. The compiler decides, so every utility type, variant, opacity modifier and arbitrary form (`bg-[var(--color-rose-50)]`, `[color:var(--color-stone-600)]`, `shadow-sky-500/20`) is in reach.
- A raw `--color-<family>-<shade>` in the source text outside any candidate (a `ChartConfig` color, a style value) is a hit too.
- Exemptions: `PALETTE_EXEMPTIONS`, empty.

Red on `d0cc141b5` (`node scratchpad/exec/fix3/g10-run.mjs d0cc141b5`, the check run over `git show d0cc141b5:<path>` for the same source set): `sources=892 checked=27110 violations=374`, the section 1 set exactly. Green on this change: `violations=0`, and the vitest `it` passes (`checked` > 10 000). The two fixture controls report each form above plus a raw config variable (8 hits) and pass the token forms and an exempted hit.

## 4. Chart series (VD-52)

Sweep: `git grep -nE '(oklch|hsl|hsla|rgb|rgba)\([0-9]|#[0-9a-fA-F]{3,8}\b'` over `src/**/*.{ts,tsx}` minus tests, `src/test/` and `src/app/api/og/**`, after dropping `#` import specifiers and comment lines. On `d0cc141b5`: 20 `ChartConfig` color literals in 6 files, 2 BorderBeam hsl literals (moved with the status colors, section 2), and 7 others that stay:

- `documents/templates/components/{maintenance-request,property-inspection,rental-application,tenant-notice}-template.client.tsx`: `primaryColor: "oklch(0.35 0.08 250)"`, the default of a user-editable `<input type="color">` that `build-template-html.ts` writes into a standalone generated document, where no CSS variable exists (the D-03 class `design-token-drift.test.ts` already exempts for that builder). Chrome reads the oklch default as `#143c62`, so the swatch shows it.
- `src/app/layout.tsx:26,68` and `src/lib/generate-metadata.ts:112`: `#2563eb` in `<meta>` theme color, the tile color and the Safari mask-icon color, HTML attribute values that cannot read a custom property (documented in place; D-03).
- Out of bounds by instruction: `src/app/api/og/**` and `scripts/render-blog-cover.tsx` keep their hsl() literals (satori renders oklch as black).

Convention followed: the dashboard charts reference the token in the config (`color: "var(--color-chart-1)"`, `revenue-area-chart.tsx`, `chart-area-interactive.tsx`, `occupancy-donut-chart.tsx`), and `ChartStyle` (`ui/chart.tsx`) writes it as `--color-<key>` on the chart. A series with status meaning takes the semantic token; a neutral series takes a chart token.

Which tokens qualify, measured as a mark on the card (`bg-card`, light `#fafcfe`, dark `#080e16`; 3:1 needed in both themes):

| Token | Light | Dark | Series use |
|-------|-------|------|------------|
| chart-1 | `#2381ff` 3.61 | `#2381ff` 5.21 | neutral series |
| chart-2 | `#00c0a3` 2.25 | 8.36 | not used: fails light |
| chart-3 | `#d29a00` 2.44 | 7.71 | not used: fails light |
| chart-4 | `#e85760` 3.42 | 5.50 | a second neutral series |
| chart-5 | `#3275b4` 4.71 | 4.00 | not used here: the same hue as chart-1 (250 vs 259), so two series could not be told apart |
| success (vivid) | `#00b565` 2.62 | 7.34 | not used: fails light |
| warning (vivid) | `#e1a200` 2.18 | 7.69 | not used: fails light |
| destructive (vivid) | `#e7001e` 4.62 | `#c90000` 3.21 | not used: the companion has the margin |
| success-text | `#007b40` 5.23 | `#4bdc95` 11.04 | success series |
| warning-text | `#965900` 5.48 | `#fbc044` 11.73 | warning series |
| destructive-text | `#be000d` 6.39 | `#ff6762` 6.79 | destructive series |

The chart tokens are mode-independent and the blog OG renderer mirrors their values in hsl (`src/app/api/og/blog/[slug]/route.tsx`, out of bounds here), so chart-2 and chart-3 are not retuned. Their remaining uses (the occupancy donut, the interactive area chart, the analytics and units legends) and the dashboard sparkline move off them in section 5 (VD-53), which also re-points the two `/properties/units` captions above to the hue of their new dots.

| File:line | Series | Before (light / dark on card) | After token | After (light / dark) |
|-----------|--------|-------------------------------|-------------|----------------------|
| `revenue-expense-chart.tsx:28` | revenue | `oklch(0.6 0.16 138)` `#4a952a` 3.63 / 5.18 | `var(--color-success-text)` | 5.23 / 11.04 |
| `revenue-expense-chart.tsx:29` | expenses | `oklch(0.75 0.08 20)` `#dc9a99` **2.24** / 8.41 | `var(--color-destructive-text)` | 6.39 / 6.79 |
| `revenue-expense-chart.tsx:30` | net income | `oklch(0.64 0.19 162)` `#00ad67` **2.85** / 6.61 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `financial-charts.tsx:42` | invoiced | `oklch(0.72 0.08 45)` `#cf957b` **2.48** / 7.60 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `financial-charts.tsx:43` | paid | `oklch(0.55 0.18 140)` `#258900` 4.39 / 4.29 | `var(--color-success-text)` | 5.23 / 11.04 |
| `financial-charts.tsx:44` | overdue | `oklch(0.72 0.15 30)` `#f47c6b` **2.57** / 7.32 | `var(--color-destructive-text)` | 6.39 / 6.79 |
| `financial-charts.tsx:48` | NOI | `oklch(0.68 0.1 255)` `#6d9bd5` **2.80** / 6.73 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `property-performance/property-charts.tsx:33` | occupancy % | `oklch(0.62 0.12 240)` `#328fc7` 3.47 / 5.43 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `property-performance/property-charts.tsx:37` | monthly revenue | `oklch(0.68 0.14 150)` `#4eb068` **2.64** / 7.13 | `var(--color-success-text)` | 5.23 / 11.04 |
| `property-performance/property-charts.tsx:44` | visits | `oklch(0.73 0.08 40)` `#d49782` **2.39** / 7.88 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `property-performance/property-charts.tsx:48` | inquiries | `oklch(0.6 0.16 120)` `#758c00` 3.71 / 5.08 | `var(--color-chart-4)` | 3.42 / 5.50 |
| `property-performance/property-charts.tsx:52` | applications | `oklch(0.67 0.14 180)` `#00b098` **2.67** / 7.07 | `var(--color-success-text)` | 5.23 / 11.04 |
| `analytics/lease-charts.tsx:24` | renewals | `oklch(0.65 0.14 150)` `#43a65f` **2.98** / 6.32 | `var(--color-success-text)` | 5.23 / 11.04 |
| `analytics/lease-charts.tsx:28` | expirations | `oklch(0.68 0.12 30)` `#d87a6b` **2.95** / 6.38 | `var(--color-warning-text)` | 5.48 / 11.73 |
| `analytics/lease-charts.tsx:32` | notices | `oklch(0.72 0.09 220)` `#5db2cc` **2.35** / 8.03 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `analytics/lease-charts.tsx:39` | status share | `oklch(0.58 0.16 140)` `#3d9028` 3.91 / 4.81 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `analytics/maintenance-charts.tsx:24` | completed | `oklch(0.6 0.16 160)` `#009c5e` 3.45 / 5.46 | `var(--color-success-text)` | 5.23 / 11.04 |
| `analytics/maintenance-charts.tsx:28` | pending | `oklch(0.68 0.12 20)` `#d87879` **2.97** / 6.35 | `var(--color-warning-text)` | 5.48 / 11.73 |
| `analytics/maintenance-charts.tsx:35` | cost | `oklch(0.62 0.14 230)` `#0094c9` 3.36 / 5.61 | `var(--color-chart-1)` | 3.61 / 5.21 |
| `analytics/property-charts.tsx:21` | occupancy rate | `oklch(0.65 0.13 210)` `#00a3bb` **2.94** / 6.41 | `var(--color-chart-1)` | 3.61 / 5.21 |

Before: 13 of the 20 series failed 3:1 on the light card (bold). After: 0 of 20 in either theme. Each chart's series keep distinct hues (blue chart-1, red-orange chart-4, green success, amber warning, red destructive); no chart pairs chart-1 with chart-5. Every token named resolves in the compiled theme (G7, and `--color-success-text: var(--success-text)` and the rest are declared in the project build).

Chart tokens as text. The same sweep for a chart token used as a text color (`git grep -nE '(text|stroke|fill|border|decoration|outline|ring)-chart-[0-9]'` over shipped `src/`) finds two 12px captions on `/properties/units`; a chart token is a fill, and both failed AA in one theme. Each now reads the AA companion of its dot's hue (chart-1 hue 259 -> primary-text, chart-5 hue 250 -> info-text):

| # | Site | Kind (min) | Before: fg classes / bg stack | After: fg classes / bg stack | Light before | Light after | Dark before | Dark after |
|---|------|------------|-------------------------------|------------------------------|--------------|-------------|-------------|------------|
| 1 | units/page.tsx:117 occupancy caption (12px) | text (4.5) | `text-chart-1` / `bg-background` > `bg-card` | `text-primary-text` / `bg-background` > `bg-card` | #2381ff on #fafcfe = **3.61** | #004fc4 on #fafcfe = **7** | #2381ff on #080e16 = **5.21** | #7cbeff on #080e16 = **9.83** |
| 2 | units/page.tsx:139 Needs attention caption (12px) | text (4.5) | `text-chart-5` / `bg-background` > `bg-card` | `text-info-text` / `bg-background` > `bg-card` | #3275b4 on #fafcfe = **4.71** | #0064b2 on #fafcfe = **5.89** | #3275b4 on #080e16 = **4** | #6cc3ff on #080e16 = **10.04** |

Regression test: `describe("chart series and BorderBeam colors reference a token (66.2-39)")` in `src/app/__tests__/design-token-drift.test.ts`. In every `src/app` / `src/components` file outside `src/components/ui/` that mentions `ChartConfig`, each `color:` string is exactly `var(--color-<token>)`; every BorderBeam `colorFrom` / `colorTo` string references `var(--color-…)` and holds no literal color function; and no `text-chart-N` class appears. Red with the eight pre-fix files checked out from `d0cc141b5`: 24 violations (the 20 series and both beams' `colorFrom` and `colorTo`) and the two `text-chart-1` / `text-chart-5` captions; green after. A fixture `it` proves the predicate flags a literal series and a literal beam and passes the token forms.

## 5. Dashboard chart marks and the remaining chart-2 / chart-3 uses (VD-53)

Base: `0145eec0f`. Same instrument as section 4 (`node scratchpad/exec/fix2/contrast.mjs scratchpad/exec/fix4/cases.json`, output `scratchpad/exec/fix4/contrast.txt`): each token painted as a mark over `bg-card` (light `#fafcfe`, dark `#080e16`), 3:1 needed in both themes. A wedge-to-wedge row paints one token over the other.

Sweep, every reference to a sub-3:1 chart token and to the vivid status fills in a chart: `rg -nP '(?<![\w-])(?:[\w-]+:)*(?:bg|fill|stroke)-(?:success|warning|accent|chart-[0-9])(?![\w/-])' src -g '!**/__tests__/**' -g '!src/test/**'` plus `` git grep -nE -- '--color-(success|warning|accent|chart-2|chart-3)["`)]' -- src ':!**/__tests__/**' ':!src/app/globals.css' ':!src/test/**' `` and `git grep -nE 'chart-[0-9]' -- src` (OG route excluded). On `0145eec0f`, outside the vendored primitives and the satori route:

- chart-2: the occupancy donut's occupied wedge and swatch (`occupancy-donut-chart.tsx`, config, `pieData` fill, `bg-chart-2`) and the interactive area chart's expenses series (`chart-area-interactive.tsx`, config, both gradient stops, the stroke).
- chart-3: the `/analytics/overview` Revenue legend swatch (`overview/page.tsx:153`) and the `/properties/units` Vacant dot (`units/page.tsx:125`, set by VD-47).
- chart-5: the donut's vacant wedge and swatch, the `/analytics/overview` Expenses swatch (`overview/page.tsx:157`) and the `/properties/units` Maintenance dot (`units/page.tsx:136`). chart-5 clears 3:1 (4.71 / 4.00), but each of the three sat in a set that changes below.
- Vivid status fills in a chart: the dashboard KPI sparkline (`kpi-helpers.ts` `sparklineConfigForTrend`: up `--color-success`, down `--color-warning`), the one chart outside the chart-2/3/5 list. The BorderBeam `--color-success` / `--color-warning` hits are decorative animated borders (VD-51) and stay; the remaining `bg-success` / `bg-warning` / `bg-accent` hits are non-chart surfaces (hover fills, the password-strength bar, the Progress variants, steppers, marketing) outside this chart item.
- chart-2 / chart-3 in `src/components/ui/__tests__/chart.test.tsx` and `src/test/utils/tailwind-guards.ts` are test fixtures and the mode-independent token list, not marks.

Tokens as a mark on the card:

| Token | Light | Dark | Use after this change |
|-------|-------|------|-----------------------|
| chart-1 | `#2381ff` 3.61 | 5.21 | revenue series and its legend swatch |
| chart-2 | `#00c0a3` **2.25** | 8.36 | none |
| chart-3 | `#d29a00` **2.44** | 7.71 | none |
| chart-4 | `#e85760` 3.42 | 5.50 | expenses series and its legend swatch |
| chart-5 | `#3275b4` 4.71 | 4.00 | none in a chart (passes; replaced for coherence below) |
| success (vivid) | `#00b565` **2.62** | 7.34 | none in a chart |
| warning (vivid) | `#e1a200` **2.18** | 7.69 | none in a chart |
| muted-foreground | `#575f66` 6.31 | `#a2acb7` 8.41 | stable sparkline, Total Units dot |
| success-text | `#007b40` 5.23 | `#4bdc95` 11.04 | occupied wedge, swatch and dot; up sparkline |
| warning-text | `#965900` 5.48 | `#fbc044` 11.73 | down sparkline |
| primary-text | `#004fc4` 7.00 | `#7cbeff` 9.83 | vacant wedge, swatch and dot |
| destructive-text | `#be000d` 6.39 | `#ff6762` 6.79 | Maintenance dot |

Status marks follow the unit status badge (`properties/units/components/unit-status-badge.tsx`: occupied `text-success-text`, available `text-primary-text`, maintenance `text-destructive-text`), so the donut, the `/properties/units` metric dots and the units table badges read one palette. A neutral series takes chart-1 / chart-4.

| # | Site | Mark | Before: token, light / dark | After: token, light / dark |
|---|------|------|-----------------------------|----------------------------|
| 1 | `occupancy-donut-chart.tsx` occupied wedge (config, `pieData`) and swatch | wedge, 10px swatch (3) | chart-2 **2.25** / 8.36 | success-text 5.23 / 11.04 |
| 2 | `occupancy-donut-chart.tsx` vacant wedge and swatch | wedge, swatch (3) | chart-5 4.71 / 4.00 | primary-text 7.00 / 9.83 |
| 3 | donut wedge against wedge | boundary | chart-2 / chart-5 **2.09** / **2.09**, no stroke (`strokeWidth={0}`) | success-text / primary-text 1.34 / 1.12, so each wedge is outlined in the card color: `stroke="var(--color-card)"` `strokeWidth={2}`; each wedge then meets the card, 5.23 / 11.04 and 7.00 / 9.83. Fix round 3 (`7ba8647d4`, F75): until then ChartContainer's `[&_.recharts-sector[stroke]]:stroke-transparent` turned this stroke transparent, so the wedges met unseparated; the rule now skips a token stroke (`[&_.recharts-sector:not([stroke^='var('])]`) and the separator paints the card color, 2px, in both themes (Chrome computed style, the `81fdadd71` build) |
| 4 | `chart-area-interactive.tsx` expenses series (config, gradient stops, stroke) | 2px line (3) | chart-2 **2.25** / 8.36 | chart-4 3.42 / 5.50 |
| 5 | `chart-area-interactive.tsx` revenue series | 2px line (3) | chart-1 3.61 / 5.21 | unchanged |
| 6 | revenue line against expenses line | separate lines | chart-1 / chart-2 1.60 / 1.60, blue 259 against teal 180 | chart-1 / chart-4 1.05 / 1.05, blue 259 against red 20; two lines, not adjacent fills, named in the tooltip and the summary row |
| 7 | `analytics/overview/page.tsx:153` Revenue legend swatch | 12px swatch (3) | chart-3 **2.44** / 7.71, and not the series color (the series is chart-1) | chart-1 3.61 / 5.21, the series color |
| 8 | `analytics/overview/page.tsx:157` Expenses legend swatch | swatch (3) | chart-5 4.71 / 4.00, and not the series color (chart-2) | chart-4 3.42 / 5.50, the series color |
| 9 | `properties/units/page.tsx:103` Total Units dot | 8px dot (3) | chart-4 3.42 / 5.50 | muted-foreground 6.31 / 8.41 (neutral, and no longer a red beside the Maintenance dot) |
| 10 | `properties/units/page.tsx:114` Occupied dot | dot (3) | chart-1 3.61 / 5.21 | success-text 5.23 / 11.04 |
| 11 | `properties/units/page.tsx:117` occupancy caption (12px) | text (4.5) | primary-text 7.00 / 9.83 (section 4) | success-text 5.23 / 11.04, the dot's hue |
| 12 | `properties/units/page.tsx:125` Vacant dot | dot (3) | chart-3 **2.44** / 7.71 (VD-47) | primary-text 7.00 / 9.83 |
| 13 | `properties/units/page.tsx:136` Maintenance dot | dot (3) | chart-5 4.71 / 4.00 | destructive-text 6.39 / 6.79 |
| 14 | `properties/units/page.tsx:139` Needs attention caption (12px) | text (4.5) | info-text 5.89 / 10.04 (section 4) | destructive-text 6.39 / 6.79, the dot's hue |
| 15 | `kpi-helpers.ts` sparkline, up trend | 1.5px line (3) | success **2.62** / 7.34 | success-text 5.23 / 11.04 |
| 16 | `kpi-helpers.ts` sparkline, down trend | line (3) | warning **2.18** / 7.69 | warning-text 5.48 / 11.73 |
| 17 | `kpi-helpers.ts` sparkline, stable | line (3) | muted-foreground 6.31 / 8.41 | unchanged |

Before: 7 of the 17 rows failed (bold): six marks under 3:1 on the light card, and the two donut wedges 2.09:1 apart with no separating stroke in either theme, and the two overview swatches named colors the chart did not draw. After: 0 fail in either theme; the worst mark is chart-4 at 3.42 light, the worst text 5.23. The donut's loading skeleton (`occupancy-donut-chart-skeleton.tsx`) draws `Skeleton` placeholders only and holds no chart color. Every new class is canonical (`designSystem.canonicalizeCandidates([c], { rem: 16 })` and `{ collapse: true }` return it unchanged: `bg-success-text`, `bg-primary-text`, `bg-destructive-text`, `bg-muted-foreground`, `bg-chart-1`, `bg-chart-4`, `text-success-text`, `text-destructive-text`), and `--color-card`, `--color-success-text`, `--color-primary-text`, `--color-warning-text` resolve in the compiled theme (G7).

Regression test: `describe("no chart mark reads a token under 3:1 on the card (66.2-39 VD-53)")` in `src/app/__tests__/design-token-drift.test.ts`. Every shipped `.ts`/`.tsx` file under `src/` (minus tests, `src/test/` and `src/app/api/og/`) is scanned in its string literals only (comments skipped): no chart-2 or chart-3 in any utility (`bg-chart-2`, `dark:fill-chart-3`) or variable (`--color-chart-2`, `--chart-3`) form, and, in a file that builds a `ChartConfig`, no vivid `--color-success` / `--color-warning`. Red on `0145eec0f` (the five source files checked out from it, the test unchanged): 11 violations, `chart-area-interactive.tsx` `--color-chart-2` x4, `kpi-helpers.ts` `--color-success` and `--color-warning`, `occupancy-donut-chart.tsx` `--color-chart-2` x2 and `bg-chart-2`, `overview/page.tsx` `bg-chart-3`, `units/page.tsx` `bg-chart-3`; green after. A fixture `it` proves each form is flagged and that a comment, the companions, chart-1/4/5, `bg-chart-20` and a BorderBeam outside a chart file pass. The component tests (`occupancy-donut-chart.test.tsx`: swatch classes, wedge fills from `pieData`, the card-color stroke; `kpi-helpers.test.ts`: the sparkline tokens) fail on `0145eec0f` with `expected 'var(--color-success)' to be 'var(--color-success-text)'` and `expected "inline-block size-2.5 rounded-full bg-chart-2" to contain "bg-success-text"`.

## 6. Meter fills, status marks and labels on the vivid fills (VD-55, VD-56)

Part E, base `dd25c6b44`. WCAG 1.4.11 asks 3:1 of a graphical object that carries meaning (a progress or meter fill, a status dot, a step mark) against what it touches; a label on a fill is text, 4.5:1 (1.4.3). Same instrument as sections 2-5: each pair painted over white on a 1x1 canvas in Chrome (Playwright 1.64.1 headless shell) under the compiled project stylesheet (`loadProjectTailwindEngine()` plus the probe classes), light `<html>` and dark `<html class="dark">`. Probe: `scratchpad/exec/fix5/contrast.mjs` with the cases in `sweep-cases.mjs` (before), `after-cases.mjs` (after), `progress-cases.json` and `rest-cases.json`; outputs `sweep-before.txt`, `sweep-after.txt`, `progress-before.txt`, `rest.txt`. The probe reproduces the section 2 and 5 figures exactly (bg-success on the card 2.62, bg-warning 2.18, bg-success on the muted track 2.26, bg-success-text 5.23 / 11.04, text-primary on the primary tint 4.33).

### 6.1 Sweep

Command (every tracked `.ts`/`.tsx`/`.css` file under `src/` minus tests, `__tests__/`, `src/test/` and `.d.ts`: 895 files): `node scratchpad/exec/fix5/mark-sweep.mjs dd25c6b44`. Each line is split into class tokens at whitespace, quotes, backticks, braces, parentheses, commas, semicolons and angle brackets, and a token matches `(^|:)!?(bg|fill|stroke)-(success|warning|destructive|info|accent|primary|chart-[0-9])(/N|/[x])?!?$`: the brief's tokens in every utility form, under any variant chain, with or without an opacity modifier. `rg -nP '(?<![\w-])(?:[\w\-\[\]&:*>.()=]+:)*!?(?:bg|fill|stroke)-(?:success|warning|destructive|info|accent|primary|chart-[0-9])(?![\w-])(?:/(?:\d+|\[[^\]]+\]))?' src -g '!**/__tests__/**' -g '!src/test/**' -g '!*.test.*' -o` returns the same count. Result: **526 hits in 174 files**.

The `var()` forms were swept as well: `rg -nP -- '--(?:color-)?(?:success|warning|destructive|info|accent|primary|chart-[0-9])(?![\w-])' src` outside tests and `globals.css`. The marks among them are the chart series and gradients (chart-1, chart-4, section 5: 3.61 / 3.42 light), the admin funnel cells (`funnel-renderer.tsx`, `var(--color-primary)` 5.02 / 7.05 and `var(--color-destructive)` 4.62 / 3.21 on the card), and the `use-mobile-accessibility.ts` focus outline in `var(--color-primary)` (5.02 / 7.05). Everything else is a BorderBeam or glow color (decorative, VD-51), a `color-mix()` hero or grid wash, a `::selection` tint, or comment text. None is under its minimum.

Out of class and not changed here: a vivid token as a text or icon color (`text-success`, `text-warning`, `text-destructive` and the rest: 236 hits, ``git grep -nP '(?<![\w-])(?:[^\s"'\''`]+:)?!?text-(success|warning|destructive|info|accent|primary|chart-[0-9])(?![\w-])(?:/\d+)?'`` over the same files). CLAUDE.md documents the vivid tokens as the icon color, but measured as icons text-success (2.62:1) and text-warning (2.18:1) fail 3:1 on the light card. That class is reported to the orchestrator, not swept here.

### 6.2 Classification

Every hit has one code. A tint (`/3` to `/20`) sits behind the text or icon it frames (badge, tile, banner, chip, hover wash), or is a progress track (measured below as the indicator's neighbor), a loading skeleton or a blur. The tint hits were checked for a dot or bar shape (`size-1`..`size-3`, `h-0.5`..`h-2.5`, `w-0.5`..`w-2` on the same line): the only matches are the decorative typewriter skeleton lines in `blog-empty-state.tsx`. Classifier: `scratchpad/exec/fix5/classify.mjs` (exits non-zero on an unclassified hit; none).

| Code | Hits | Files | Disposition |
|------|------|-------|-------------|
| F-mark | 9 | 3 | fixed: a meter, dot or step mark under 3:1, moved to the -text companion (or a hollow ring) |
| F-label | 7 | 4 | fixed: a label under 4.5:1 on its fill |
| F-glyph | 1 | 1 | fixed: a check glyph under 3:1 on its fill |
| F-row | 10 | 7 | fixed: text (and the unread dot) on the emerald accent hover or addon, moved to bg-muted |
| F-deco | 1 | 1 | changed: decorative, moved to the companion so no solid vivid success fill remains |
| P-mark | 25 | 16 | passes: a mark at 3:1 or more in both themes (measured) |
| P-label | 47 | 35 | passes: label or icon on the fill at its minimum in both themes (measured) |
| P-edge | 2 | 1 | passes: the range start/end cell behind the bg-primary day button; only its rounded edge shows |
| O-R1 | 22 | 20 | open (token decision): primary-foreground on the hover:bg-primary/90 fill, 4.16:1 light |
| O-R2 | 4 | 4 | open (token decision): destructive-foreground on the hover:bg-destructive/90 fill, 4.39:1 light |
| O-R3 | 17 | 12 | open (token decision): text on the emerald accent hover/focus fill (accent-foreground 3.34:1 light; ghost dark accent/50 2.71:1; muted text on accent/50 3.47 / 3.04, on accent/30 4.41 light) |
| D | 19 | 8 | decorative illustration, skeleton, sparkle or list bullet (no minimum) |
| L-logo | 7 | 4 | brand logo tile (the logo mark inside is the content) |
| C | 2 | 2 | comment text, not a class use |
| N-dead | 1 | 1 | never rendered: DialogClose sets no data-state, so the data-[state=open] classes never match (upstream) |
| N-unreachable | 1 | 1 | never rendered: displaySteps holds only the current step, so the completed branch (bg-primary/50, 2.16:1 light) cannot render |
| T | 351 | 128 | tint surface (/3 to /20) behind text or an icon, a hover tint, a progress track, or a decorative skeleton/blur; not a mark |
| total | 526 | 174 | |

Codes: `F-` fixed in this part (section 6.3), `P-` measured and passing, `O-R1`..`O-R3` open (section 6.4), `D` decorative, `L-logo` a logo tile, `N-` never rendered, `C` comment text, `T` tint.

### 6.3 Before and after, every fixed site

Surfaces: the settings card is `bg-background` > `bg-card`; the popovers `bg-popover`; the marketing pages and the bulk-import and onboarding dialogs `bg-background`. A track or tint is composited over its surface.

| # | Site | Kind (min) | Before: classes / on | After: classes / on | Light before | Light after | Dark before | Dark after |
|---|------|------------|----------------------|---------------------|--------------|-------------|-------------|------------|
| 1 | `ui/progress.tsx` success indicator (usage section, bulk import) | meter (3) | `bg-success` / card | `bg-success-text` / card | #00b565 on #fafcfe **2.62** | #007b40 5.23 | #00b84e on #080e16 7.34 | #4bdc95 11.04 |
| 2 | the same, on its `bg-success/20` track | meter (3) | `bg-success` / track | `bg-success-text` / track | on #c8eedf **2.15** | 4.29 | on #063022 5.48 | 8.23 |
| 3 | `ui/progress.tsx` warning indicator (usage at 80% of a cap) | meter (3) | `bg-warning` / card | `bg-warning-text` / card | #e1a200 **2.18** | #965900 5.48 | #de9400 7.69 | #fbc044 11.73 |
| 4 | the same, on its `bg-warning/20` track | meter (3) | `bg-warning` / track | `bg-warning-text` / track | on #f5eacb **1.87** | 4.70 | on #322912 5.71 | 8.71 |
| 5 | `ui/progress.tsx` destructive indicator (usage at the cap) | meter (3) | `bg-destructive` / card | `bg-destructive-text` / card | #e7001e 4.62 | #be000d 6.39 | #c90000 3.21 | #ff6762 6.79 |
| 6 | the same, on its `bg-destructive/20` track | meter (3) | `bg-destructive` / track | `bg-destructive-text` / track | on #f6cad1 3.23 | 4.47 | on #2e0b12 **2.97** | 6.28 |
| 7 | `ui/progress.tsx` secondary indicator (no caller) | meter (3) | `bg-secondary` / card, track | removed | #def3ff **1.11**, **1.09** | — | #25292e **1.32**, **1.28** | — |
| 8 | `ui/progress.tsx` default indicator (bulk import, usage below 80%) | meter (3) | `bg-primary` / card, `bg-primary/20` track | unchanged | 5.02, 3.76 | 5.02, 3.76 | 7.05, 5.15 | 7.05, 5.15 |
| 9 | `resources/security-deposit-reference-card` legend, itemized dot | dot (3) | `bg-success` / `bg-muted/30` | `bg-success-text` | **2.47** | 4.92 | 7.34 | 11.04 |
| 10 | the same table cell (`role="img"`), even / odd row | dot (3) | `bg-success` / `bg-background`, `bg-muted/20` | `bg-success-text` | **2.58**, **2.51** | 5.14, 5.00 | 7.54, 7.40 | 11.33, 11.12 |
| 11 | legend and cells, interest dot (legend, even, odd) | dot (3) | `bg-info` | `bg-info-text` (the companion, as dot 9) | 3.14, 3.28, 3.19 | 5.55, 5.80, 5.64 | 6.19, 6.36, 6.24 | 10.04, 10.30, 10.11 |
| 12 | legend and cells, "not required" mark (legend, even, odd) | dot (3) | `bg-muted-foreground/30` filled | hollow `border-2 border-muted-foreground` ring (a shape cue, not a third hue) | **1.54**, **1.56**, **1.55** | 5.95, 6.21, 6.04 | **1.76**, **1.73**, **1.77** | 8.41, 8.63, 8.47 |
| 13 | `bulk-import-stepper.tsx` completed step indicator | step mark (3) | `bg-success` box on the trigger (`bg-muted/30` > `bg-success/5`), `text-success-foreground` icon | `bg-success/10` box, `text-success-text` icon: the icon carries the state, as on the success Badge | box **2.35**, icon on box 6.68 | icon 4.26 on the tint | box 6.99, icon 7.11 | icon 9.17 |
| 14 | `bulk-import-stepper.tsx` completed separator (1px) | line (3) | `bg-success` / `bg-muted/30` | `bg-success-text` | **2.47** | 4.92 | 7.34 | 11.04 |
| 15 | `sections/hero-section.tsx` trust-badge pulse dot (`aria-hidden`, decorative) | decor (none) | `bg-success` / `bg-primary/10` | `bg-success-text` | 2.23 | 4.46 | 6.70 | 10.06 |
| 16 | `leases/lease-signature-status.tsx` Fully Signed / Owner / Tenant badge (text-xs) | text (4.5) | Badge `default` + `bg-success`: `text-primary-foreground` / `bg-success` | Badge `success`: `text-success-text` / `bg-success/10` | **2.54** | 4.70 | 7.13 | 9.80 |
| 17 | `properties/property-image-gallery.tsx` Primary badge | text (4.5) | `text-white` / `bg-primary` | the Badge default pair, `text-primary-foreground` | 5.16 | 4.88 | **2.75** | 6.84 |
| 18 | `/faq`, `/help` CTA band paragraph (20px regular) | text (4.5) | `text-primary-foreground/90` / `bg-primary` | `text-primary-foreground` | **4.24** | 4.88 | 6.01 | 6.84 |
| 19 | `/faq` View Pricing, `/help` Talk to an Expert (outline CTA on the band) | text (4.5) | `text-primary-foreground` / the variant's `bg-background` (dark `input/30` over the band) | `bg-transparent dark:bg-transparent`: the label on the band | #f4f9ff on #f9fafb **1.01** | 4.88 | **4.38** | 6.84 |
| 20 | the same CTA, hover | text (4.5) | `text-primary-text` / `hover:bg-primary-foreground` (dark: the variant's `dark:hover:bg-input/50` won) | `dark:hover:bg-primary-foreground` and, from fix round 3 (`7eafdd433`, F7), `dark:hover:text-primary-text`: before it the variant's `dark:hover:text-foreground` won, so the dark hover label read 16.78 on the fill and the 9.55 here held only from that commit | 6.81 | 6.81 | **3.03** | 9.55 |
| 21 | `data-table-faceted-filter.tsx` selected option Check | glyph (3) | CommandItem's `[&_svg:not([class*='text-'])]:text-muted-foreground` / `bg-primary` | `text-primary-foreground` on the Check | **1.26** | 4.88 | **1.19** | 6.84 |
| 22 | row hovers: `notification-item`, `document-row`, `expiring-leases-widget`, `multi-select-chips` (hover and focus), `data-table-column-header` (hover and open): default text | text (4.5) | `text-foreground` / `hover:bg-accent` | `hover:bg-muted` (the app's row hover: 79 uses in 45 files) | 5.15 | 15.16 | **2.19** | 15.46 |
| 23 | the same rows: muted text, the column header's sort icons | text (4.5), icon (3) | `text-muted-foreground` / `bg-accent` | / `bg-muted` | **1.85** | 5.44 | **1.07** | 7.53 |
| 24 | `notification-item` unread dot on the hovered row | dot (3) | `bg-primary` / `bg-accent` | / `bg-muted` | **1.47** | 4.33 | **1.12** | 6.31 |
| 25 | data-table addons (`data-table-toolbar.tsx` number unit, `data-table-slider-filter.tsx` x2) | text (4.5) | `text-muted-foreground` / `bg-accent` | / `bg-muted` | **1.85** | 5.44 | **1.07** | 7.53 |

Before: 21 of the 25 rows failed their minimum in at least one theme (bold). After: none; the worst mark is the stepper icon on its tint, 4.26:1, and the worst text 4.70:1. Every new class is canonical and compiles (G7, G9 and the canonical-candidate guard in `tailwind-theme-integrity.test.ts` pass).

Measured and passing, unchanged (`P-mark`, `P-label`): stepper-header indicators and separators `bg-primary` 4.94 / 7.23 with their `text-primary-foreground` labels 4.88 / 6.84; the password-strength segments on the popover (`bg-destructive` 4.75 / 3.37, `bg-accent` 3.52 / 8.27, `bg-accent-main` 3.53 / 6.79); checkbox, switch track and thumb, slider range (4.33 on its `bg-muted` track light), tabs, calendar selected day, the property-table column checkbox and its check (4.88 / 6.84); the Google loading dots, the inspection-template checklist dots (on 5.02, off `bg-muted-foreground` 6.31), the testimonial carousel's current dot, the `/analytics/overview` legend swatches (section 5); every `bg-primary` / `bg-destructive` button, badge, pill and icon tile at rest (4.88 / 6.84 and 4.63 / 9.67); the photo-upload error overlay icon (3.59 / 4.15 over a white photo, 8.24 / 9.93 over black).

### 6.4 Hover and focus fills under 4.5:1 (open in part E; fixed in part F, section 7)

These three fail at rest-to-hover or on focus in every primitive that uses them, so the fix is a token or variant decision for the owner, not a per-site edit. Measured:

| Code | Pair | Light | Dark | Sites (sweep hits) |
|------|------|-------|------|--------------------|
| R1 | `text-primary-foreground` on `hover:bg-primary/90` | **4.16** (rest 4.88) | 5.94 | Button default, Badge default anchor, Toggle on, and 19 raw first-party text buttons in 17 files (22 hits); the icon-only profile camera button clears its 3:1 icon minimum at 4.16 |
| R2 | `text-destructive-foreground` on `hover:bg-destructive/90` | **4.39** (rest 4.63) | 6.05 | Button and Badge destructive, the GDPR and account-data delete buttons (4) |
| R3 | `text-accent-foreground` on `bg-accent` (outline and ghost Button hover, Badge outline anchor, Select, DropdownMenu, Combobox and Command focus, Calendar today and range middle, the Google button, the blog chips and pagination) | **3.34** | 7.98 | 17 hits in 12 files |
| R3 | ghost Button dark hover: `text-accent-foreground` on `dark:hover:bg-accent/50` | — | **2.71** | Button ghost |
| R3 | Item anchor hover: `text-muted-foreground` on `[a]:hover:bg-accent/50`; dropzone hover and drag: on `hover:bg-accent/30` | **3.47**, **4.41** | **3.04**, 4.91 | Item, FileUploadDropzone |

Candidates, measured: R1 `hover:bg-primary-text` 6.81 / 9.55; R2 `hover:bg-destructive-text` 6.40 light but 2.46 dark (dark needs its own hover); R3 a dark light-theme `--accent-foreground` (`oklch(0.15 0.02 160)`, the dark theme's value) 5.58 light and 7.98 dark, or the neutral shadcn hover (`bg-muted` with `text-foreground`, 15.16 / 15.46) for every accent hover and focus, which also clears the ghost dark hover and the muted text.

### 6.5 Guards

- `design-token-drift.test.ts`, the VD-53 block extended (now "no chart or meter mark reads a token under 3:1 on the card (66.2-39 VD-53, VD-55)"):
  - "draws no meter, dot or step mark in the vivid success or warning fill": no shipped source outside `src/test/` and the satori route uses `bg-`, `fill-` or `stroke-` `success` / `warning` without an opacity modifier, under any variant, in a string literal (comments skipped). Those two fills are under 3:1 on every light surface (the card is the lightest), so they appear only as `/5`-`/20` tints. Red on `dd25c6b44`: 11 violations (`bulk-import-stepper.tsx` x2, `lease-signature-status.tsx` x4, `hero-section.tsx`, `progress.tsx` `bg-success` and `bg-warning`, the security-deposit page x2).
  - "draws every Progress indicator 3:1 against the card and its track in both themes": both cva maps are read from `ui/progress.tsx`, each variant's indicator is measured against `--card` and against its track (the track tint composited over the card) from the `globals.css` values in both themes. The math is `src/test/utils/oklch-contrast.ts`, now shared with `destructive-pair-contrast.test.ts`; it reads within 0.1 of the Chrome readback here (bg-success on the card 2.63 against 2.62). Red on `dd25c6b44`: 9 violations, secondary x4 (1.09-1.33), success light x2 (2.63, 2.15), warning light x2 (2.18, 1.87), destructive dark on its track (2.96).
  - a fixture `it` proves the predicate flags `bg-success`, a variant `bg-warning`, `!fill-success` and `stroke-warning!` and passes a comment, the tints, the companions and `bg-warning-foreground`; and that a fixture meter with `bg-success` fails (2.63, 2.15) and with `bg-success-text` passes.
- `design-token-drift.test.ts`, new block "no row hover or addon reads text on the emerald accent fill (66.2-39 VD-56)": outside `src/components/ui/`, a state-prefixed `bg-accent` (`hover:`, `focus:`, `data-[state=open]:`, ...) must set `text-accent-foreground` under the same prefix, and an unprefixed `bg-accent` may carry no other text color; a literal with the fill alone (the password-strength segments, the decorative dots) is a mark and passes. Red on `dd25c6b44`: 10 violations (row 22-25 sites); a fixture `it` covers each form. It does not judge the accent pair itself (R3, 6.4).
- Component tests: `lease-signature-status.test.tsx` (the success badge classes, both modes), `progress.test.tsx` (`bg-success-text`), `property-image-gallery.test.tsx` (the Primary badge pair), new `data-table-faceted-filter.test.tsx` (the Check's `text-primary-foreground`, against a real TanStack column), new `src/app/__tests__/primary-cta-band-contrast.test.tsx` (the `/faq` and `/help` band CTA and paragraph). Each fails on the `dd25c6b44` sources: `expected 'lucide lucide-check' to contain 'text-primary-foreground'`, `expect(element).toHaveClass("bg-success/10 text-success-text")`, `toHaveClass("bg-primary text-primary-foreground")`, `toHaveClass("text-primary-foreground")` and the CTA class set.

Not changed, by measurement: the onboarding wizard's completed-step dot (`bg-primary/50`, 2.16 / 2.68) cannot render, because `displaySteps` holds only the step being shown; the Dialog close button's `data-[state=open]:bg-accent` never matches, because Radix `DialogClose` sets no `data-state` (the class is upstream's).

### 6.6 Every hit


| File | Code | Hits (line: token) |
|------|------|--------------------|
| app/(auth)/login/login-form.tsx | T | 52: `bg-destructive/10` |
| app/(auth)/login/page.tsx | L-logo | 238: `bg-primary`, 276: `bg-primary` |
| app/(owner)/analytics/financial/page.tsx | O-R1 | 61: `hover:bg-primary/90` |
| app/(owner)/analytics/financial/page.tsx | P-label | 61: `bg-primary` |
| app/(owner)/analytics/overview/page.tsx | P-mark | 153: `bg-chart-1`, 157: `bg-chart-4` |
| app/(owner)/analytics/overview/page.tsx | T | 190: `bg-primary/10` |
| app/(owner)/analytics/property-performance/page.tsx | O-R1 | 60: `hover:bg-primary/90` |
| app/(owner)/analytics/property-performance/page.tsx | P-label | 60: `bg-primary` |
| app/(owner)/billing/checkout/success/page.tsx | T | 34: `bg-success/10` |
| app/(owner)/billing/plans/page.tsx | T | 236: `bg-primary/5`, 238: `bg-primary/10` |
| app/(owner)/dashboard/components/dashboard-empty-state.tsx | O-R1 | 30: `hover:bg-primary/90` |
| app/(owner)/dashboard/components/dashboard-empty-state.tsx | P-label | 30: `bg-primary` |
| app/(owner)/dashboard/page.tsx | O-R1 | 117: `hover:bg-primary/90` |
| app/(owner)/dashboard/page.tsx | P-label | 117: `bg-primary` |
| app/(owner)/documents/document-hub-tile.tsx | C | 17: `bg-primary/10` |
| app/(owner)/documents/page.tsx | T | 87: `bg-primary/10` |
| app/(owner)/documents/recent-documents-panel.tsx | C | 202: `[a]:hover:bg-accent/50` |
| app/(owner)/documents/templates/components/property-inspection-template.client.tsx | P-mark | 288: `bg-primary` |
| app/(owner)/leases/[id]/edit/page.tsx | T | 47: `bg-destructive/10` |
| app/(owner)/leases/leases-stat-cards.tsx | T | 35: `bg-primary/10`, 35: `group-hover:bg-primary/20` |
| app/(owner)/leases/page.tsx | O-R1 | 239: `hover:bg-primary/90`, 266: `hover:bg-primary/90` |
| app/(owner)/leases/page.tsx | P-label | 239: `bg-primary`, 266: `bg-primary` |
| app/(owner)/leases/page.tsx | T | 210: `bg-destructive/10`, 226: `bg-primary/10` |
| app/(owner)/maintenance/[id]/edit/page.tsx | T | 38: `bg-destructive/10` |
| app/(owner)/profile/page.tsx | T | 174: `bg-destructive/10` |
| app/(owner)/properties/[id]/edit/page.tsx | T | 43: `bg-destructive/10` |
| app/(owner)/properties/page.tsx | T | 124: `bg-destructive/10` |
| app/(owner)/properties/property-details.client.tsx | T | 66: `bg-success/10`, 70: `bg-info/10`, 72: `bg-success/10`, 130: `hover:bg-destructive/10` |
| app/(owner)/properties/units/components/unit-actions.tsx | T | 148: `bg-destructive/10`, 161: `bg-destructive/5` |
| app/(owner)/properties/units/components/unit-status-badge.tsx | T | 26: `bg-accent/10`, 26: `dark:bg-accent/20`, 34: `bg-primary/10`, 34: `dark:bg-primary/20`, 42: `bg-destructive/10`, 42: `dark:bg-destructive/20` |
| app/(owner)/reports/balance-sheet/balance-equation-check.tsx | T | 17: `bg-success/10`, 17: `bg-destructive/10` |
| app/(owner)/reports/balance-sheet/balance-sheet-error.tsx | T | 16: `bg-destructive/10` |
| app/(owner)/reports/cash-flow/cash-flow-activity.tsx | T | 22: `bg-success/10`, 30: `bg-destructive/10`, 38: `bg-primary/5` |
| app/(owner)/reports/cash-flow/cash-flow-error.tsx | O-R1 | 23: `hover:bg-primary/90` |
| app/(owner)/reports/cash-flow/cash-flow-error.tsx | P-label | 23: `bg-primary` |
| app/(owner)/reports/cash-flow/cash-flow-error.tsx | T | 12: `bg-destructive/10` |
| app/(owner)/reports/expenses/_components/expense-category-badge.tsx | T | 14: `bg-warning/10`, 15: `bg-info/10`, 16: `bg-primary/10`, 17: `bg-destructive/10`, 18: `bg-success/10` |
| app/(owner)/reports/expenses/_components/expense-table.tsx | P-label | 188: `bg-primary` |
| app/(owner)/reports/expenses/_components/expense-table.tsx | T | 149: `bg-primary/10` |
| app/(owner)/reports/expenses/page.tsx | O-R1 | 134: `hover:bg-primary/90` |
| app/(owner)/reports/expenses/page.tsx | P-label | 134: `bg-primary` |
| app/(owner)/reports/expenses/page.tsx | T | 123: `bg-destructive/10` |
| app/(owner)/reports/income-statement/income-statement-page-error.tsx | T | 16: `bg-destructive/10` |
| app/(owner)/reports/income-statement/income-statement-page-net-summary.tsx | T | 62: `bg-primary/5` |
| app/(owner)/reports/tax-documents/page.tsx | T | 72: `bg-destructive/10`, 172: `bg-success/10`, 188: `bg-destructive/10`, 204: `bg-info/10` |
| app/(owner)/settings/page.tsx | P-label | 226: `bg-primary` |
| app/(owner)/tenants/page.tsx | T | 109: `bg-destructive/10` |
| app/(owner)/units/page.tsx | T | 228: `bg-destructive/10` |
| app/auth/confirm-email/confirm-email-states.tsx | L-logo | 37: `bg-primary`, 90: `bg-primary` |
| app/auth/confirm-email/confirm-email-states.tsx | T | 116: `bg-destructive/10`, 134: `bg-primary/10`, 175: `bg-primary/20` |
| app/auth/update-password/page.tsx | L-logo | 169: `bg-primary`, 233: `bg-primary` |
| app/auth/update-password/page.tsx | T | 84: `bg-destructive/10` |
| app/blog/[slug]/blog-post-page.tsx | P-label | 126: `bg-primary` |
| app/blog/[slug]/blog-post-page.tsx | T | 104: `bg-primary/10`, 104: `hover:bg-primary/15`, 197: `bg-primary/5` |
| app/blog/page.tsx | O-R3 | 198: `hover:bg-accent` |
| app/faq/page.tsx | F-label | 68: `bg-primary` |
| app/globals.css | T | 819: `bg-primary/10` |
| app/help/page.tsx | F-label | 203: `bg-primary` |
| app/help/page.tsx | T | 146: `bg-primary/10`, 154: `bg-success/10`, 162: `bg-primary/10`, 170: `bg-success/10` |
| app/pricing/pricing-content.tsx | T | 190: `bg-primary/5` |
| app/resources/landlord-tax-deduction-tracker/page.tsx | T | 69: `bg-warning/10`, 186: `bg-primary/5` |
| app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts | T | 17: `bg-info/10`, 18: `bg-info/20`, 43: `bg-success/10`, 44: `bg-success/20`, 73: `bg-warning/10`, 74: `bg-warning/20`, 105: `bg-primary/10`, 106: `bg-primary/20`, 137: `bg-destructive/10`, 138: `bg-destructive/20`, 168: `bg-info/10`, 169: `bg-info/20` |
| app/resources/page.tsx | T | 45: `bg-success/10`, 54: `bg-warning/10`, 183: `bg-primary/10`, 236: `hover:bg-primary/5` |
| app/resources/seasonal-maintenance-checklist/page.tsx | T | 23: `bg-success/10`, 24: `bg-success/20`, 81: `bg-warning/10`, 82: `bg-warning/20`, 138: `bg-destructive/10`, 139: `bg-destructive/20`, 197: `bg-info/10`, 198: `bg-info/20` |
| app/resources/security-deposit-reference-card/page.tsx | F-mark | 545: `bg-success`, 553: `bg-info`, 615: `bg-success`, 630: `bg-info` |
| app/resources/security-deposit-reference-card/page.tsx | T | 645: `bg-warning/10` |
| components/auth/change-password-dialog.tsx | T | 306: `bg-destructive/10` |
| components/auth/forgot-password-modal.tsx | T | 91: `bg-info/10`, 130: `bg-success/10` |
| components/auth/google-button.tsx | O-R3 | 39: `hover:bg-accent` |
| components/auth/google-button.tsx | P-mark | 95: `bg-primary`, 99: `bg-primary`, 103: `bg-primary` |
| components/auth/mfa-verification-dialog.tsx | T | 147: `bg-destructive/10` |
| components/auth/password-strength.tsx | P-mark | 69: `bg-destructive`, 70: `bg-accent`, 71: `bg-accent` |
| components/auth/two-factor-setup-steps.tsx | T | 93: `bg-destructive/10`, 173: `bg-destructive/10`, 223: `bg-success/10` |
| components/auth/update-password-form.tsx | O-R1 | 194: `hover:bg-primary/90` |
| components/auth/update-password-form.tsx | P-label | 194: `bg-primary` |
| components/auth/update-password-form.tsx | T | 94: `bg-primary/10` |
| components/billing/plan-card.tsx | T | 63: `bg-primary/5` |
| components/billing/subscription-status-banner.tsx | T | 35: `bg-info/10`, 66: `bg-primary/10`, 87: `bg-warning/10`, 108: `bg-destructive/10` |
| components/blog/blog-pagination.tsx | O-R3 | 35: `hover:bg-accent` |
| components/blog/newsletter-signup.tsx | O-R1 | 82: `hover:bg-primary/90` |
| components/blog/newsletter-signup.tsx | P-label | 82: `bg-primary` |
| components/bulk-import/bulk-import-confirm-step.tsx | T | 60: `bg-primary/10` |
| components/bulk-import/bulk-import-result-panel.tsx | T | 93: `bg-success/10`, 94: `bg-warning/10`, 96: `bg-destructive/10`, 148: `bg-success/10`, 149: `bg-destructive/10`, 158: `bg-success/20`, 159: `bg-destructive/20` |
| components/bulk-import/bulk-import-stepper.tsx | F-mark | 70: `data-[state=completed]:bg-success`, 118: `data-[state=completed]:bg-success` |
| components/bulk-import/bulk-import-stepper.tsx | P-mark | 69: `data-[state=active]:bg-primary` |
| components/bulk-import/bulk-import-stepper.tsx | T | 65: `data-[state=completed]:bg-success/5` |
| components/bulk-import/bulk-import-upload-step.tsx | D | 121: `bg-primary` |
| components/bulk-import/bulk-import-upload-step.tsx | T | 68: `hover:bg-primary/5`, 68: `data-dragging:bg-primary/10`, 68: `data-invalid:bg-destructive/5`, 70: `bg-primary/10`, 70: `group-hover:bg-primary/15`, 70: `group-data-dragging:bg-primary/20`, 94: `bg-info/10`, 107: `hover:bg-primary/5`, 126: `bg-success/10` |
| components/bulk-import/bulk-import-validate-step.tsx | T | 58: `bg-success/10`, 69: `bg-success/10`, 80: `bg-destructive/10`, 96: `bg-warning/10`, 115: `bg-success/5`, 118: `bg-success/10`, 130: `bg-destructive/5`, 138: `bg-destructive/10`, 160: `bg-destructive/10`, 215: `bg-destructive/5`, 215: `hover:bg-destructive/10`, 254: `bg-success/10` |
| components/contact/contact-form.tsx | O-R1 | 285: `hover:bg-primary/90` |
| components/contact/contact-form.tsx | P-label | 285: `bg-primary` |
| components/contact/contact-form.tsx | T | 192: `bg-primary/10`, 235: `bg-primary/10`, 269: `bg-destructive/10` |
| components/dashboard/expiring-leases-widget.tsx | F-row | 81: `hover:bg-accent` |
| components/data-table/data-table-column-header.tsx | F-row | 75: `hover:bg-accent`, 75: `data-[state=open]:bg-accent` |
| components/data-table/data-table-faceted-filter.tsx | F-glyph | 154: `bg-primary` |
| components/data-table/data-table-slider-filter.tsx | F-row | 188: `bg-accent`, 212: `bg-accent` |
| components/data-table/data-table-toolbar.tsx | F-row | 112: `bg-accent` |
| components/documents/document-row.tsx | F-row | 58: `hover:bg-accent` |
| components/documents/document-row.tsx | T | 141: `hover:bg-destructive/10` |
| components/documents/documents-vault.client.tsx | T | 500: `bg-destructive/10`, 520: `bg-primary/10` |
| components/inspections/inspection-list.client.tsx | T | 152: `bg-primary/10` |
| components/inspections/inspection-photo-upload.tsx | P-label | 262: `bg-destructive/70` |
| components/inspections/inspection-photo-upload.tsx | T | 213: `bg-primary/5` |
| components/landing/feature-backgrounds.tsx | D | 264: `bg-primary/70` |
| components/landing/feature-backgrounds.tsx | T | 26: `bg-primary/10`, 76: `bg-primary/10`, 87: `bg-primary/10`, 98: `bg-primary/10`, 148: `bg-primary/10`, 314: `bg-primary/10`, 328: `bg-success/10`, 329: `bg-warning/10` |
| components/landing/final-cta-section.tsx | T | 52: `hover:bg-primary/5` |
| components/landing/hero-section.tsx | T | 45: `hover:bg-primary/5` |
| components/landing/results-proof-section.tsx | T | 49: `bg-primary/10` |
| components/landing/testimonials-section.tsx | P-mark | 76: `bg-primary` |
| components/landing/testimonials-section.tsx | T | 51: `bg-primary/10` |
| components/layout/footer.tsx | L-logo | 87: `bg-primary` |
| components/layout/navbar/navbar-mobile-menu.tsx | O-R1 | 123: `hover:bg-primary/90`, 140: `hover:bg-primary/90` |
| components/layout/navbar/navbar-mobile-menu.tsx | P-label | 123: `bg-primary`, 140: `bg-primary` |
| components/leases/detail/lease-detail-utils.ts | T | 165: `bg-info/10`, 166: `bg-success/10`, 167: `bg-success/10`, 168: `bg-success/10`, 169: `bg-info/10`, 170: `bg-destructive/10`, 172: `bg-warning/10`, 191: `bg-warning/10`, 195: `bg-success/10`, 207: `bg-destructive/10`, 213: `bg-warning/10` |
| components/leases/detail/lease-details-tab.tsx | T | 80: `bg-primary/10`, 102: `bg-primary/10` |
| components/leases/detail/lease-details.client.tsx | T | 97: `bg-destructive/10` |
| components/leases/detail/lease-terms-tab.tsx | T | 130: `bg-warning/5` |
| components/leases/dialogs/terminate-lease-dialog.tsx | T | 62: `bg-destructive/10` |
| components/leases/lease-signature-status.tsx | F-label | 165: `bg-success`, 165: `hover:bg-success`, 210: `bg-success`, 210: `hover:bg-success` |
| components/leases/sign-lease-form.tsx | T | 153: `bg-success/5` |
| components/leases/table/leases-table-columns.tsx | T | 97: `bg-primary/5` |
| components/leases/table/leases-table.tsx | T | 97: `bg-primary/5` |
| components/leases/template/clause-selector.tsx | T | 65: `bg-primary/5` |
| components/leases/wizard/selection-step.tsx | T | 108: `bg-destructive/10`, 147: `bg-destructive/10`, 196: `bg-destructive/10` |
| components/ledger/ledger-balance-strip.tsx | T | 80: `bg-destructive/10` |
| components/maintenance/cards/maintenance-card.tsx | T | 24: `bg-success/10`, 29: `bg-warning/10`, 34: `bg-warning/20`, 39: `bg-destructive/10`, 48: `bg-primary/10`, 49: `bg-primary/10`, 50: `bg-warning/10`, 51: `bg-destructive/10`, 132: `bg-primary/10` |
| components/maintenance/detail/maintenance-details.client.tsx | T | 158: `bg-primary/10`, 169: `bg-primary/10` |
| components/maintenance/detail/maintenance-utils.ts | T | 22: `bg-warning/10`, 27: `bg-primary/10`, 32: `bg-primary/10`, 37: `bg-warning/10`, 42: `bg-success/10`, 63: `bg-primary/10`, 64: `bg-primary/10`, 67: `bg-warning/10`, 71: `bg-destructive/10` |
| components/maintenance/detail/photos-card.tsx | T | 271: `hover:bg-destructive/10` |
| components/maintenance/detail/timeline-card.tsx | T | 27: `bg-success/10`, 28: `bg-primary/10` |
| components/maintenance/kanban/maintenance-kanban.client.tsx | T | 56: `bg-warning/10`, 62: `bg-primary/10`, 68: `bg-primary/10`, 74: `bg-warning/10`, 80: `bg-success/10` |
| components/maintenance/maintenance-form.client.tsx | T | 102: `bg-primary/10` |
| components/maintenance/maintenance-view.client.tsx | O-R1 | 221: `hover:bg-primary/90` |
| components/maintenance/maintenance-view.client.tsx | P-label | 221: `bg-primary` |
| components/maintenance/maintenance-view.client.tsx | T | 161: `bg-primary/10`, 183: `bg-primary/10` |
| components/maintenance/table/columns.tsx | T | 32: `bg-warning/10`, 36: `bg-primary/10`, 40: `bg-primary/10`, 44: `bg-warning/10`, 48: `bg-success/10`, 84: `bg-primary/10`, 88: `bg-primary/10`, 92: `bg-warning/10`, 96: `bg-destructive/10`, 131: `bg-success/10`, 134: `bg-warning/10`, 137: `bg-warning/20`, 140: `bg-destructive/10` |
| components/notifications/notification-item.tsx | F-row | 131: `hover:bg-accent` |
| components/notifications/notification-item.tsx | P-mark | 135: `bg-primary` |
| components/notifications/notification-item.tsx | T | 32: `bg-destructive/10`, 120: `bg-primary/5` |
| components/onboarding/onboarding-step-complete.tsx | T | 18: `bg-success/10` |
| components/onboarding/onboarding-step-property.tsx | T | 86: `bg-primary/10` |
| components/onboarding/onboarding-step-welcome.tsx | T | 20: `bg-primary/10` |
| components/onboarding/onboarding-wizard.tsx | N-unreachable | 67: `bg-primary/50` |
| components/onboarding/onboarding-wizard.tsx | P-mark | 65: `bg-primary` |
| components/pricing/bento-pricing-section.tsx | P-mark | 94: `data-[state=checked]:bg-primary` |
| components/pricing/bento-pricing-section.tsx | T | 106: `bg-success/10` |
| components/pricing/pricing-card-featured.tsx | P-label | 149: `bg-primary` |
| components/pricing/pricing-card-standard.tsx | T | 210: `hover:bg-primary/5` |
| components/pricing/pricing-comparison-table.tsx | T | 205: `bg-primary/5`, 249: `bg-primary/5` |
| components/profiles/owner/profile-card.tsx | P-label | 87: `bg-primary`, 87: `hover:bg-primary/90` |
| components/profiles/owner/profile-card.tsx | T | 79: `bg-primary/10`, 166: `hover:bg-destructive/5` |
| components/profiles/owner/quick-links-section.tsx | P-label | 21: `group-hover:bg-primary`, 37: `group-hover:bg-primary`, 53: `group-hover:bg-primary`, 69: `group-hover:bg-primary` |
| components/profiles/owner/quick-links-section.tsx | T | 21: `bg-primary/10`, 37: `bg-primary/10`, 53: `bg-primary/10`, 69: `bg-primary/10` |
| components/properties/properties-filters.tsx | T | 23: `bg-primary/10` |
| components/properties/property-action-bar.tsx | T | 62: `hover:bg-destructive/10` |
| components/properties/property-form.mobile.tsx | T | 47: `bg-primary/10`, 61: `bg-warning/10` |
| components/properties/property-image-gallery.tsx | F-label | 151: `bg-primary` |
| components/properties/property-select-card.tsx | P-label | 116: `hover:bg-primary` |
| components/properties/property-select-card.tsx | T | 116: `bg-primary/5` |
| components/properties/property-stats-section.tsx | T | 27: `bg-primary/10`, 27: `group-hover:bg-primary/20`, 42: `bg-primary/10`, 42: `group-hover:bg-primary/20`, 57: `bg-primary/10`, 57: `group-hover:bg-primary/20`, 84: `bg-success/10`, 84: `group-hover:bg-success/20` |
| components/properties/property-table-row.tsx | T | 59: `bg-primary/5` |
| components/properties/property-table-toolbar.tsx | P-mark | 86: `bg-primary` |
| components/properties/property-units-table-config.ts | T | 11: `bg-info/10`, 16: `bg-success/10`, 21: `bg-warning/10`, 26: `bg-primary/10` |
| components/properties/sections/property-images-create-section.tsx | P-label | 98: `bg-destructive` |
| components/properties/sections/property-images-create-section.tsx | T | 46: `bg-primary/5` |
| components/sections/comparison-table.tsx | D | 121: `fill-accent` |
| components/sections/comparison-table.tsx | T | 235: `bg-primary/10`, 235: `bg-success/10`, 263: `bg-warning/10` |
| components/sections/features-section.tsx | D | 120: `bg-accent`, 124: `bg-primary/50` |
| components/sections/features-section.tsx | T | 107: `bg-primary/5`, 112: `bg-primary/10`, 112: `group-hover/feature:bg-primary/20`, 142: `bg-primary/10`, 148: `bg-primary/3` |
| components/sections/hero-dashboard-mockup.tsx | D | 23: `bg-destructive/60`, 24: `bg-warning/60`, 25: `bg-success/60`, 48: `bg-primary`, 117: `bg-primary`, 117: `bg-primary/40` |
| components/sections/hero-dashboard-mockup.tsx | T | 50: `bg-primary/10`, 191: `bg-primary/20`, 192: `bg-primary/10`, 213: `bg-primary/10`, 248: `bg-warning/10`, 249: `bg-info/10`, 250: `bg-success/10`, 256: `hover:bg-primary/5`, 259: `bg-primary/10`, 296: `bg-success/10`, 297: `bg-warning/10`, 298: `bg-info/10`, 303: `bg-primary/10` |
| components/sections/hero-section.tsx | F-deco | 27: `bg-success` |
| components/sections/hero-section.tsx | T | 25: `bg-primary/10` |
| components/sections/how-it-works.tsx | T | 106: `bg-primary/10`, 112: `bg-info/10`, 118: `bg-success/10` |
| components/sections/premium-cta.tsx | O-R1 | 56: `hover:bg-primary/90` |
| components/sections/premium-cta.tsx | P-label | 56: `bg-primary` |
| components/sections/premium-cta.tsx | T | 73: `hover:bg-primary/5` |
| components/sections/stats-showcase.tsx | D | 113: `bg-accent`, 117: `bg-primary/60` |
| components/sections/testimonials-section.tsx | P-label | 113: `bg-primary` |
| components/sections/testimonials-section.tsx | P-mark | 179: `bg-primary` |
| components/sections/testimonials-section.tsx | T | 124: `bg-primary/10`, 144: `bg-primary/5`, 219: `bg-primary/10` |
| components/settings/account-data-section.tsx | O-R2 | 287: `hover:bg-destructive/90` |
| components/settings/account-data-section.tsx | P-label | 287: `bg-destructive` |
| components/settings/account-data-section.tsx | T | 180: `bg-destructive/5`, 187: `bg-warning/5`, 241: `hover:bg-destructive/10` |
| components/settings/billing-settings.tsx | O-R1 | 421: `hover:bg-primary/90` |
| components/settings/billing-settings.tsx | P-label | 421: `bg-primary` |
| components/settings/billing-settings.tsx | T | 82: `bg-success/10`, 86: `bg-info/10`, 90: `bg-warning/10`, 94: `bg-warning/10`, 98: `bg-destructive/10`, 106: `bg-destructive/10`, 113: `bg-destructive/10` |
| components/settings/gdpr-data-actions.tsx | O-R2 | 310: `hover:bg-destructive/90` |
| components/settings/gdpr-data-actions.tsx | P-label | 310: `bg-destructive` |
| components/settings/gdpr-data-actions.tsx | T | 207: `bg-warning/5`, 256: `hover:bg-destructive/10`, 349: `bg-destructive/5` |
| components/settings/general-settings.tsx | O-R1 | 379: `hover:bg-primary/90` |
| components/settings/general-settings.tsx | P-label | 379: `bg-primary` |
| components/settings/sections/active-sessions-section.tsx | T | 103: `bg-primary/5`, 113: `bg-primary/10`, 138: `hover:bg-destructive/10` |
| components/settings/sections/password-section.tsx | O-R1 | 173: `hover:bg-primary/90` |
| components/settings/sections/password-section.tsx | P-label | 173: `bg-primary` |
| components/settings/sections/subscription-cancel-section.tsx | T | 124: `bg-destructive/10`, 182: `bg-warning/5`, 237: `bg-destructive/5`, 254: `hover:bg-destructive/10` |
| components/settings/sections/two-factor-section.tsx | T | 38: `bg-success/5`, 40: `bg-success/10`, 54: `hover:bg-destructive/10`, 61: `bg-warning/10`, 63: `bg-warning/20`, 74: `hover:bg-primary/10` |
| components/settings/sections/usage-section.tsx | T | 43: `bg-warning/10` |
| components/shared/blog-empty-state.tsx | D | 28: `bg-primary/30`, 31: `bg-primary/30`, 32: `bg-primary/50` |
| components/shared/blog-empty-state.tsx | T | 27: `bg-primary/20`, 29: `bg-primary/20` |
| components/shared/chart-loading-skeleton.tsx | D | 13: `bg-primary/30`, 14: `bg-primary/40`, 15: `bg-primary/30` |
| components/shared/chart-loading-skeleton.tsx | T | 12: `bg-primary/20`, 16: `bg-primary/20` |
| components/shared/multi-select-chips.tsx | F-row | 110: `hover:bg-accent`, 110: `focus:bg-accent` |
| components/shell/main-nav.tsx | T | 137: `data-[active=true]:bg-primary/10`, 184: `data-[active=true]:bg-primary/5` |
| components/shell/quick-actions-dock.tsx | T | 61: `hover:bg-primary/10` |
| components/shell/user-profile-menu.tsx | T | 45: `bg-primary/10`, 45: `hover:bg-primary/20` |
| components/tenants/tenant-action-bar.tsx | T | 55: `hover:bg-destructive/10` |
| components/tenants/tenant-detail-sheet-tabs.tsx | T | 23: `bg-primary/10`, 38: `bg-primary/10` |
| components/tenants/tenant-grid.tsx | T | 76: `bg-success/10`, 144: `hover:bg-destructive/10` |
| components/tenants/tenant-table-row.tsx | T | 52: `bg-primary/5`, 128: `hover:bg-destructive/10` |
| components/tenants/tenants.tsx | O-R1 | 191: `hover:bg-primary/90` |
| components/tenants/tenants.tsx | P-label | 191: `bg-primary` |
| components/tenants/tenants.tsx | T | 151: `bg-primary/10` |
| components/ui/badge.tsx | O-R1 | 14: `[a&]:hover:bg-primary/90` |
| components/ui/badge.tsx | O-R2 | 18: `[a&]:hover:bg-destructive/90` |
| components/ui/badge.tsx | O-R3 | 20: `[a&]:hover:bg-accent` |
| components/ui/badge.tsx | P-label | 14: `bg-primary`, 18: `bg-destructive`, 18: `dark:bg-destructive/60` |
| components/ui/badge.tsx | T | 23: `bg-success/10`, 23: `[a&]:hover:bg-success/15`, 25: `bg-warning/10`, 25: `[a&]:hover:bg-warning/15`, 26: `bg-info/10`, 26: `[a&]:hover:bg-info/15`, 29: `bg-primary/5` |
| components/ui/bento-grid.tsx | T | 89: `group-hover:bg-primary/[0.03]` |
| components/ui/button.tsx | O-R1 | 31: `hover:bg-primary/90` |
| components/ui/button.tsx | O-R2 | 33: `hover:bg-destructive/90` |
| components/ui/button.tsx | O-R3 | 35: `hover:bg-accent`, 39: `hover:bg-accent`, 39: `dark:hover:bg-accent/50` |
| components/ui/button.tsx | P-label | 31: `bg-primary`, 33: `bg-destructive`, 33: `dark:bg-destructive/60` |
| components/ui/calendar.tsx | O-R3 | 118: `bg-accent`, 209: `data-[range-middle=true]:bg-accent` |
| components/ui/calendar.tsx | P-edge | 112: `bg-accent`, 116: `bg-accent` |
| components/ui/calendar.tsx | P-label | 209: `data-[selected-single=true]:bg-primary`, 209: `data-[range-start=true]:bg-primary`, 209: `data-[range-end=true]:bg-primary` |
| components/ui/checkbox.tsx | P-mark | 17: `data-[state=checked]:bg-primary`, 17: `dark:data-[state=checked]:bg-primary` |
| components/ui/combobox.tsx | O-R3 | 119: `data-highlighted:bg-accent` |
| components/ui/command.tsx | O-R3 | 150: `data-[selected=true]:bg-accent` |
| components/ui/dialog.tsx | N-dead | 91: `data-[state=open]:bg-accent` |
| components/ui/dropdown-menu.tsx | O-R3 | 73: `focus:bg-accent`, 91: `focus:bg-accent` |
| components/ui/dropdown-menu.tsx | T | 73: `data-[variant=destructive]:focus:bg-destructive/10`, 73: `dark:data-[variant=destructive]:focus:bg-destructive/20` |
| components/ui/dropzone.tsx | T | 62: `bg-primary/10`, 63: `bg-destructive/10` |
| components/ui/field.tsx | T | 68: `has-data-[state=checked]:bg-primary/5`, 68: `dark:has-data-[state=checked]:bg-primary/10` |
| components/ui/file-upload/file-upload-dropzone.tsx | O-R3 | 184: `hover:bg-accent/30`, 184: `data-dragging:bg-accent/30` |
| components/ui/input.tsx | P-label | 7: `selection:bg-primary` |
| components/ui/item.tsx | O-R3 | 33: `[a]:hover:bg-accent/50` |
| components/ui/progress.tsx | F-mark | 45: `bg-success`, 46: `bg-warning`, 47: `bg-destructive` |
| components/ui/progress.tsx | P-mark | 43: `bg-primary` |
| components/ui/progress.tsx | T | 21: `bg-primary/20`, 23: `bg-success/20`, 24: `bg-warning/20`, 25: `bg-destructive/20` |
| components/ui/select.tsx | O-R3 | 91: `focus:bg-accent` |
| components/ui/slider.tsx | P-mark | 55: `bg-primary` |
| components/ui/stat.tsx | T | 46: `bg-primary/10`, 47: `bg-success/10`, 48: `bg-info/10`, 49: `bg-warning/10`, 50: `bg-destructive/10`, 52: `bg-destructive/10` |
| components/ui/stepper-header.tsx | P-mark | 55: `data-[state=active]:bg-primary`, 55: `data-[state=completed]:bg-primary`, 121: `data-[state=active]:bg-primary`, 121: `data-[state=completed]:bg-primary` |
| components/ui/switch.tsx | P-mark | 16: `data-[state=checked]:bg-primary` |
| components/ui/tabs.tsx | P-label | 49: `data-[state=active]:bg-primary` |
| components/ui/toggle.tsx | O-R1 | 6: `data-[state=on]:hover:bg-primary/90` |
| components/ui/toggle.tsx | P-label | 6: `data-[state=on]:bg-primary` |

## 7. Every interactive state's label (VD-59)

Part F, base `f48046894`. WCAG 1.4.3 holds in every state, not only at rest: a label that a hover, focus, selection or open state repaints must clear 4.5:1 against the fill that state paints (3:1 for a control whose only content is an icon, 1.4.11).

### 7.1 Sweep

- Unit: one class string (a `className` literal, a `cn()` argument, a cva base or variant string), read by `classStrings` in `src/test/utils/state-fill-pairs.ts` (comments removed; a template's `${…}` parts cut).
- States: `hover`, `focus`, `focus-visible`, `active`, `group-hover` (named too), `data-highlighted`, `data-[highlighted]`, `data-[state=open|on|active|checked]`, `data-[selected=true]`, `data-selected`, `data-[active=true]`, `data-active`, `aria-selected`, `aria-pressed`, `aria-current` (and their bracket forms), under a compound selector too (`[a&]:hover`, `[a]:hover`).
- Pairing (`statePairs`): for each state chain, the fill is the background the most specific matching chain sets (ties go to the variant Tailwind compiles later: `data-*` after `aria-*` after the pseudo-classes), else the resting background, else the surface; the label likewise; `dark:` forms override in dark; a descendant variant (`[&_svg…]:`) paints over the element's own state fill.
- Measure (`worstStateContrast`): the label over the fill composited on each of the page, card and popover surfaces, both themes, from the `globals.css` token values (`oklch-contrast.ts`, within 0.01 of Chrome's readback). An inherited label is read as both `foreground` and `muted-foreground`.
- Command: `bun scratchpad/exec/fix6/state-sweep.mts <files> <out.tsv> [globals.css]` over every tracked `.ts`/`.tsx` under `src/` minus tests, `__tests__/`, `src/test/` and `.d.ts` (894 files on `f48046894`; 896 here).

Result on `f48046894`: 287 class strings carry a state pair; 596 pairs (each in both themes); **77 under 4.5:1**. Here: 284 strings, 596 pairs, 28 under 4.5:1, every one of them classified below and held by the guard.

### 7.2 Classification of the 77

| Pair (worst surface) | Pairs | Resolution |
|----------------------|-------|------------|
| `primary-foreground` on `primary/90` (Button default, Badge default anchor, Toggle on, 20 raw first-party buttons) | 23 | fixed: light hover `bg-primary-text` (6.81:1), dark keeps `primary/90` through `dark:hover:` (5.94:1) |
| `accent-foreground` on `accent` (outline and ghost Button light hover, Badge outline anchor, Select, DropdownMenu, Command, Combobox focus, the Google button, blog chips, blog pagination) | 11 | fixed at the token: light `--accent-foreground` `oklch(0.98 0.01 160)` -> `oklch(0.24 0.01 160)`, same hue and chroma: 3.34 -> 4.66:1 (dark unchanged, 7.98) |
| `destructive-foreground` on `destructive/90` (Button and Badge destructive, the GDPR and account-data delete buttons) | 4 | fixed: light hover `bg-destructive-text` (6.40:1), dark keeps `destructive/90` (6.05) |
| `accent-foreground` on `input/50` (outline Button, dark hover) | 1 | fixed: `dark:hover:text-foreground` (1.17 -> 14.95:1); the CP-2 fill `dark:hover:bg-input/50` stays |
| `accent-foreground` on `accent/50` (ghost Button, dark hover) | 1 | fixed: `dark:hover:text-foreground` (2.80 -> 6.25:1); the CP-2 fill `dark:hover:bg-accent/50` stays |
| `accent-foreground`, no fill of its own (Calendar day button, dark hover over the ghost fill) | 1 | fixed: `dark:hover:text-foreground` (2.64 -> 6.64:1) |
| inherited `muted-foreground` on `accent/50` (Item anchor hover) | 2 | fixed: `[a]:hover:bg-accent/25` (3.47 / 3.04 -> 4.69 / 5.59) |
| inherited `muted-foreground` on `accent/30` (FileUploadDropzone hover and drag) | 1 | fixed: `accent/25` (4.36 -> 4.62) |
| `success-text` on `success/15` (Badge success anchor hover) | 1 | fixed: `success/12` (4.45 -> 4.58) |
| `primary/80` on the page (blog post link hover, x2) | 2 | fixed: `hover:text-primary-text/80` (3.58 -> 4.58 light, 5.30 -> 6.99 dark). Fix round 3 (`f9aa2dd8c`, F29, OD-16): on the post's real surfaces `/80` read 4.21 / 4.17 light; the hover keeps the full `text-primary-text` and adds an underline: 6.16 / 6.04 light, 9.30 / 8.80 dark |
| `destructive` on `muted` (leases Terminate icon button) | 2 | fixed: `hover:text-destructive-text` (2.87 dark -> 6.08; the icon is the button's only content, so 3:1 applied and failed) |
| `destructive` on `destructive/10` and on no fill (nine Trash2 icon buttons) | 13 | kept: icon-only, 3.13:1 at worst (dark card), over the 3:1 non-text minimum (ICON_ONLY). Fix round 3 (`7eafdd433`, F7, F58): that figure read each class string alone; on the merged Button classes four of these hovered destructive on the ghost variant's emerald accent fill in light (1.35:1), and in dark every one took the variant's neutral `text-foreground` hover. Each call site now twins its hover: icons 3.81 light on `destructive/10`, dark `destructive-text` 6.79 (ghost) / 6.44 (outline) (Chrome, the `81fdadd71` build) |
| `primary` on `muted` (leases Renew icon button) | 1 | kept: icon-only, 4.33:1 (ICON_ONLY) |
| `primary` on `primary/15` and `primary/20` (bulk-import Upload tile, feature card tile) | 2 | kept: icon tiles beside their own text, 3.99 and 3.70:1 (ICON_ONLY) |
| inherited `muted-foreground` on `primary` (Switch track x2, the pricing Switch override x2, Stepper indicator x2) | 6 | not a label pair: the switch track carries no text (the thumb is the mark, P-mark in 6.6); the stepper indicator's label is `text-primary-foreground` in another class string, measured 4.88 / 6.84 (LABEL_ELSEWHERE) |
| inherited `muted-foreground` on `black/70` (lightbox close, gallery "+N" overlay) | 2 | not a label pair: both labels are `text-white` in another class string, white on black/70 over a white image 8.4:1 (LABEL_ELSEWHERE) |
| inherited `muted-foreground` on `muted-foreground/50` (testimonial carousel dot hover) | 2 | not a label pair: a dot button with no text (NO_LABEL) |
| `muted-foreground` on `accent` (Dialog close `data-[state=open]:`) | 2 | never rendered: Radix `DialogClose` sets no `data-state` (read in `node_modules/@radix-ui/react-dialog/dist/index.mjs`), so the upstream class never matches (NO_LABEL) |

Also fixed in the same class, though the string-level read cannot see them: the icons of a focused Select, DropdownMenu and Command item stayed `muted-foreground` on the emerald focus fill (1.85:1 light, 1.07:1 dark; for Select that is the selected check). They now follow the label: `focus:[&_svg:not([class*='text-'])]:text-accent-foreground` (Command: `data-[selected=true]:`), 4.66 / 7.98.

Every other use of `accent-foreground` was checked on its surface after the token change: all are on an `accent` fill (4.66 light / 7.98 dark), except the accent BorderBeam variants' gradient end (`to: var(--color-accent-foreground)`), which is decorative and now fades to the dark green in light mode instead of near-white.

### 7.3 Before and after, measured in Chrome

Same instrument as sections 2-6: each pair painted over white on a 1x1 canvas in Chrome (Playwright 1.64.1 headless shell) under the compiled project stylesheet; "before" compiles the `f48046894` `globals.css`. A state's resolved classes are written directly (`bg-primary-text dark:bg-primary/90` for `hover:bg-primary-text dark:hover:bg-primary/90`). Cases: `scratchpad/exec/fix6/state-cases-before.json`, `state-cases-after.json`; probe `scratchpad/exec/fix5/contrast.mjs`. Bold: under its minimum (4.5, or 3 for the icon rows 7 and 17).

| # | Pair | Light before | Light after | Dark before | Dark after |
|---|------|--------------|-------------|-------------|------------|
| 1 | R1 Button default hover (card) | #f4f9ff on #1973f1 **4.16** | #f4f9ff on #004fc4 6.81 | #0e1216 on #3e90ff 5.94 | #0e1216 on #3e90ff 5.94 |
| 2 | R1 Button default hover (popover) | #f4f9ff on #1973f1 **4.16** | #f4f9ff on #004fc4 6.81 | #0e1216 on #3d90ff 5.94 | #0e1216 on #3d90ff 5.94 |
| 3 | R2 Button destructive hover (card) | #fdfcf7 on #e91934 **4.39** | #fdfcf7 on #be000d 6.4 | #f6ede0 on #b60102 6.05 | #f6ede0 on #b60102 6.05 |
| 4 | R2 Button destructive hover (popover) | #fdfcf7 on #e91934 **4.39** | #fdfcf7 on #be000d 6.4 | #f6ede0 on #b50101 6.1 | #f6ede0 on #b50101 6.1 |
| 5 | R3 outline/ghost hover light, chips, google, pagination (background) | #f3fbf6 on #009d5b **3.34** | #1b211e on #009d5b 4.66 | #040e08 on #00bd79 7.98 | #040e08 on #00bd79 7.98 |
| 6 | R3 menu item focus label (popover) | #f3fbf6 on #009d5b **3.34** | #1b211e on #009d5b 4.66 | #040e08 on #00bd79 7.98 | #040e08 on #00bd79 7.98 |
| 7 | R3 menu item focus icon (popover) | #575f66 on #009d5b **1.85** | #1b211e on #009d5b 4.66 | #a2acb7 on #00bd79 **1.07** | #040e08 on #00bd79 7.98 |
| 8 | R3 outline dark hover (card) | (dark only) | (dark only) | #040e08 on #191e25 **1.17** | #ecf3f8 on #191e25 14.95 |
| 9 | R3 ghost dark hover (card) | (dark only) | (dark only) | #040e08 on #046647 **2.8** | #ecf3f8 on #046647 6.25 |
| 10 | R3 ghost dark hover (popover) | (dark only) | (dark only) | #040e08 on #016241 **2.64** | #ecf3f8 on #016241 6.64 |
| 11 | R3 calendar day dark hover (popover) | (dark only) | (dark only) | #040e08 on #016241 **2.64** | #ecf3f8 on #016241 6.64 |
| 12 | Item anchor hover, muted text (card) | #575f66 on #7dcdad **3.47** | #575f66 on #bbe4d5 4.69 | #a2acb7 on #046647 **3.04** | #a2acb7 on #06392e 5.59 |
| 13 | Dropzone hover/drag, muted text (background) | #575f66 on #aedeca **4.36** | #575f66 on #bbe2d3 4.62 | #a2acb7 on #034030 5.12 | #a2acb7 on #03362b 5.82 |
| 14 | Badge success anchor hover (background) | #007b40 on #d4f0e5 **4.45** | #007b40 on #dbf2e8 4.58 | #4bdc95 on #03251a 9.33 | #4bdc95 on #041f18 9.86 |
| 15 | Toggle on hover (background) | #f4f9ff on #1873f1 **4.17** | #f4f9ff on #004fc4 6.81 | #0e1216 on #3d90ff 5.94 | #0e1216 on #3d90ff 5.94 |
| 16 | Blog post link hover (background; fix round 3 makes it the full `text-primary-text` with an underline, 6.16 / 6.04 light and 9.30 / 8.80 dark on the post's surfaces, §7.2) | #3282f2 on #f9fafb **3.58** | #3271ce on #f9fafb 4.58 | #3781f3 on #040a11 5.3 | #649aed on #040a11 6.99 |
| 17 | Leases Terminate icon hover (background) | #e7001e on #e5ecf1 3.99 | #be000d on #e5ecf1 5.51 | #c90000 on #141b24 **2.87** | #ff6762 on #141b24 6.08 |

Before: all 17 rows fail in at least one theme. After: none; the worst label is 4.58:1 (the success badge anchor hover and the blog link hover, light).

### 7.4 Guard

`src/app/__tests__/state-fill-contrast.test.ts` runs the 7.1 pairing and measurement over every shipped source (`collectG7SourceTexts`) and fails on a label under 4.5:1 that no reviewed list explains. The lists (ICON_ONLY, LABEL_ELSEWHERE, NO_LABEL) name a file and the source token; an icon-only entry must clear 3:1, a label-elsewhere entry is re-measured with its real label, and an entry that matches nothing fails as stale. A fixture `it` pins the cascade reading (the dark outline hover, the toggle's on-hover label, the menu icon on its focus fill). Red on the `f48046894` sources of the part F state fixes: `AssertionError: expected [ …(45) ] to deeply equal []`.

## 8. Vivid status tokens used as text (VD-60)

CLAUDE.md: status-colored TEXT uses the AA `-text` companions; the vivid tokens are for fills and icons. As text they fail on the light surfaces (section 8.3).

### 8.1 Sweep

Command: `node scratchpad/exec/fix6/vivid-classify.mjs <files> <out.tsv> [--base <sha>]`. It parses each `.ts`/`.tsx` (oxc, `rolldown/utils`), finds every string holding a vivid text color (`text-success`, `-warning`, `-destructive`, `-info`, `-accent`, `-primary`, `-chart-N`, any variant, optional opacity; the regex part E used) and walks up to the JSX element whose attribute the string sits in:

- icon: a lucide component, an `svg`, an `…Icon` component, or a class aimed at descendant svgs (`[&_svg]:`);
- icon-container: an element with children and no visible text below it (text is JSX text or an expression that is not an icon variable);
- text: an element that shows text;
- leaf: a childless non-icon element;
- config: a string outside any JSX attribute (a color map).

`git grep` of part E's pattern returns 236 lines on `f48046894`; the AST pass finds 237 tokens (one line holds two).

| Class on `f48046894` | Tokens | Resolution |
|----------------------|--------|------------|
| text | 35 | 30 moved to the companion (`primary` -> `primary-text`, `success` -> `success-text`, `warning` -> `warning-text`, `destructive` -> `destructive-text`, `accent` -> `success-text`, the AA token of its hue); 2 moved in section 7 (the blog link hover); 3 kept: they style icon-only buttons whose only text is sr-only or an aria-label (active sessions sign-out, the tenant row delete x2), measured as icons at 3.13:1 |
| icon | 137 | 5 moved: the comparison cells' check and partial marks (`/compare/[competitor]` x2, `ComparisonTable` x2, `PricingComparisonTable`) carry their meaning alone and read 2.33 (success) and 1.99 (warning) on their tiles, 2.47 and 2.05 on the `muted` rows (success-text 4.66, warning-text 5.00); 132 kept: an icon beside text that says the same (a status icon by its label, a heading's icon, a tile by its title), or an icon that alone carries its meaning and clears 3:1 (the comparison add-on mark, `info`, 3.14 at worst; the not-included mark, `destructive`, 3.21 dark; every `primary` icon) |
| icon-container | 49 | 1 moved in section 7 (leases Terminate); 48 kept on the same rule as icons |
| leaf | 4 | kept: three native checkboxes (with no forms plugin `text-primary` paints nothing) and `<card.icon>`, a lucide component held in data |
| config | 12 | 2 moved: `getDashboardPercentage` colors text; 10 kept: the collection-rate KPI icon colors, the resources page icon colors, the how-it-works step tile and its opacity-20 decorative step number |
| total | 237 | 37 moved here, 3 in section 7; 197 remain, each classified |

Every hit and its class: `scratchpad/exec/fix6/vivid-base.tsv` (base) and `vivid-final.tsv` (here); the edits: `vivid-edits.txt`.

### 8.2 Guard

`design-token-drift.test.ts`, block "no vivid status color on an element that shows text": `vividTextUses` (`src/test/utils/vivid-text-elements.ts`, the 8.1 classification) over every shipped source; a text, leaf or config use fails unless `VIVID_TEXT_REVIEWED` names its file and kind with what it colors, and a reviewed file that no longer has a use fails as stale. A fixture `it` pins the classification. Red on the `f48046894` sources: `AssertionError: expected [ …(32) ] to deeply equal []`.

### 8.3 The tokens as text, measured in Chrome

Each vivid token and its companion as a foreground on the card, the muted fill and the `muted/30` section band, light and dark (`scratchpad/exec/fix6/vivid-cases.json`, `vivid-after.txt`; the companions are unaffected by section 7's token change). Bold: under 4.5 (3 for the two icon rows).

| Pair | Light | Dark |
|------|-------|------|
| text-primary on card | #0064ef on #fafcfe 5.02 | #439fff on #080e16 7.05 |
| text-primary-text on card | #004fc4 on #fafcfe 7 | #7cbeff on #080e16 9.83 |
| text-primary on muted | #0064ef on #e5ecf1 **4.33** | #439fff on #141b24 6.31 |
| text-primary-text on muted | #004fc4 on #e5ecf1 6.04 | #7cbeff on #141b24 8.8 |
| text-primary on muted/30 section | #0064ef on #f3f5f8 4.73 | #439fff on #080e16 7.05 |
| text-primary-text on muted/30 section | #004fc4 on #f3f5f8 6.59 | #7cbeff on #080e16 9.83 |
| text-success on card | #00b565 on #fafcfe **2.62** | #00b84e on #080e16 7.34 |
| text-success-text on card | #007b40 on #fafcfe 5.23 | #4bdc95 on #080e16 11.04 |
| text-success on muted | #00b565 on #e5ecf1 **2.26** | #00b84e on #141b24 6.57 |
| text-success-text on muted | #007b40 on #e5ecf1 4.5 | #4bdc95 on #141b24 9.88 |
| text-success on muted/30 section | #00b565 on #f3f5f8 **2.47** | #00b84e on #080e16 7.34 |
| text-success-text on muted/30 section | #007b40 on #f3f5f8 4.92 | #4bdc95 on #080e16 11.04 |
| text-warning on card | #e1a200 on #fafcfe **2.18** | #de9400 on #080e16 7.69 |
| text-warning-text on card | #965900 on #fafcfe 5.48 | #fbc044 on #080e16 11.73 |
| text-warning on muted | #e1a200 on #e5ecf1 **1.88** | #de9400 on #141b24 6.88 |
| text-warning-text on muted | #965900 on #e5ecf1 4.72 | #fbc044 on #141b24 10.5 |
| text-warning on muted/30 section | #e1a200 on #f3f5f8 **2.05** | #de9400 on #080e16 7.69 |
| text-warning-text on muted/30 section | #965900 on #f3f5f8 5.16 | #fbc044 on #080e16 11.73 |
| text-destructive on card | #e7001e on #fafcfe 4.62 | #c90000 on #080e16 **3.21** |
| text-destructive-text on card | #be000d on #fafcfe 6.39 | #ff6762 on #080e16 6.79 |
| text-destructive on muted | #e7001e on #e5ecf1 **3.99** | #c90000 on #141b24 **2.87** |
| text-destructive-text on muted | #be000d on #e5ecf1 5.51 | #ff6762 on #141b24 6.08 |
| text-destructive on muted/30 section | #e7001e on #f3f5f8 **4.35** | #c90000 on #080e16 **3.21** |
| text-destructive-text on muted/30 section | #be000d on #f3f5f8 6.02 | #ff6762 on #080e16 6.79 |
| text-info on card | #008feb on #fafcfe **3.33** | #1795fa on #080e16 6.19 |
| text-info-text on card | #0064b2 on #fafcfe 5.89 | #6cc3ff on #080e16 10.04 |
| text-info on muted | #008feb on #e5ecf1 **2.87** | #1795fa on #141b24 5.54 |
| text-info-text on muted | #0064b2 on #e5ecf1 5.08 | #6cc3ff on #141b24 8.98 |
| text-info on muted/30 section | #008feb on #f3f5f8 **3.14** | #1795fa on #080e16 6.19 |
| text-info-text on muted/30 section | #0064b2 on #f3f5f8 5.55 | #6cc3ff on #080e16 10.04 |
| text-accent on card | #009d5b on #fafcfe **3.42** | #00bd79 on #080e16 7.89 |
| text-success-text on card | #007b40 on #fafcfe 5.23 | #4bdc95 on #080e16 11.04 |
| text-accent on muted | #009d5b on #e5ecf1 **2.95** | #00bd79 on #141b24 7.06 |
| text-success-text on muted | #007b40 on #e5ecf1 4.5 | #4bdc95 on #141b24 9.88 |
| text-accent on muted/30 section | #009d5b on #f3f5f8 **3.22** | #00bd79 on #080e16 7.89 |
| text-success-text on muted/30 section | #007b40 on #f3f5f8 4.92 | #4bdc95 on #080e16 11.04 |
| comparison-table icon text-success on bg-success/10 | #00b565 on #e0f3eb **2.33** | #00b84e on #041b17 6.78 |
| comparison-table icon text-success-text on bg-success/10 | #007b40 on #e0f3eb 4.66 | #4bdc95 on #041b17 10.19 |
| comparison-table icon text-warning on bg-warning/10 | #e1a200 on #f7f1e1 **1.99** | #de9400 on #1a180f 7.06 |
| comparison-table icon text-warning-text on bg-warning/10 | #965900 on #f7f1e1 5 | #fbc044 on #1a180f 10.77 |

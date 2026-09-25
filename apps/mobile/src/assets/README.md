# Brand assets

## Active (used by the app)

| File | Use |
|------|-----|
| **`brand/dentveerse-mark.png`** | Icon-only logo — auth screens (`AppLogo`), splash source |
| **`icon.png`** | App Store / launcher icon (512×512 mark, from brand pack) |
| **`notification-icon.png`** | Push notification icon (96×96) |
| **`splash.png`** | Splash screen (mark on light background via Expo `resizeMode: contain`) |

## Source pack (designer exports)

Folder **`newLogo/dentveerse-brand/`** (from `dentveerse-brand.zip`):

- **`svg/dentveerse-mark.svg`** — mark only (preferred for UI)
- **`svg/dentveerse-logo*.svg`** — mark + wordmark (marketing only)
- **`favicons/`**, **`site.webmanifest`**, **`png/og-image-1200x630.png`** — copied to `apps/web/public/` for the website

Legacy **`logo-transparent-master.png`** — old gold mark; superseded by `newLogo`.

After updating the zip, re-run asset sync (copy favicons + mark to `apps/web/public` and `brand/dentveerse-mark.png`).

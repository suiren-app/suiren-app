# Suiren

The public website for **Suiren: Koi Pond Habit Tracker**, an iPhone app. It's served with GitHub Pages at <https://suirenapp.com/> (the old address, suiren-app.github.io/suiren-app, redirects there).

| Page | URL |
| --- | --- |
| Home | https://suirenapp.com/ |
| Privacy Policy | https://suirenapp.com/privacy/ |
| What's new | https://suirenapp.com/whats-new/ |
| Community | https://suirenapp.com/community/ |
| Support | https://suirenapp.com/support/ |
| Terms of Use | https://suirenapp.com/terms/ |
| Discord (forwards to the invite) | https://suirenapp.com/discord/ |
| Friend invite | https://suirenapp.com/invite/?c=CODE |

The App Store listing and the app link to these URLs, so keep the paths stable.

App Store: https://apps.apple.com/app/suiren-koi-pond-habit-tracker/id6826411943

## Updating

- **Home page:** `index.html` + `home.css`. The koi pond is `js/pond.js`, a port of the app's KoiArt (look), KoiNode (pose) and KoiBrain (behaviour), so the koi swim like they do in Suiren. Tapping the pond drops food. It draws a still frame for reduced motion and pauses when the pond is off screen. The other pages use `style.css`.

- **New release:** in `whats-new/index.html`, add an `<article class="release">` at the top with the App Store "What's New" text from `CHANGELOG.md` in the app repo. Mark the live version with `pill now` ("On the App Store") and an upcoming one with `pill soon`.
- **Screenshots:** `img/shots/` holds the framed App Store screenshots, 600 px wide JPEGs. `img/hero.jpg` is the App Store header creative and `img/og.jpg` the link preview image.
- **App Store badge:** `img/app-store-badge.svg` is Apple's official black "Download on the App Store" badge, from Apple's marketing guidelines. Don't edit or recolor it, keep it at least 40 px tall, and leave a quarter of its height clear around it.

Need help with the app? Email suiren-app@gmail.com or [open an issue](https://github.com/suiren-app/suiren-app/issues/new).

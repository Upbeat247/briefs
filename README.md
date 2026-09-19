# Briefs

One read-only page holding all three weekly streams, built to be openable on a
corporate laptop.

| Stream | Generated | Source |
|---|---|---|
| Asset Integrity deep-dive | Friday 07:00 | `../api-inspector/lib/data/digests.ts` — `AI_*` |
| Integrity Coaching | Saturday 09:00 | `../api-inspector/lib/data/digests.ts` — `D_*` |
| Leadership (Ascend) | Sunday 19:00 | `../ascend/lib/data/briefs.ts` — `B_*` |

All three land before Monday, so the whole week's reading is on the work laptop
by Monday morning. They run on three separate days on purpose: the first two
write the same two files in `api-inspector`, and all three append to the shared
topic log that stops the streams repeating each other. Don't collapse them onto
one morning.

Nothing is authored here. This repo only re-renders what the weekly routines
already write into the two source repos.

## Why it is built the way it is

The point of this app is that a corporate web proxy has nothing to object to:

- **Zero network requests.** No fonts, no CDN, no analytics, no API. Everything —
  CSS, JS, all 19 briefs — is inlined into one HTML file. Verified: the page
  issues no requests at all after load.
- **No login, no cookies, no service worker.** A password gate on a personal
  domain looks more suspicious to a security team than an open page of notes.
- **No AI calls.** Generation stays on the Mac, where the scheduled tasks run.
  Never point this page at OpenRouter — a call to a gen-AI endpoint from the
  work network is the one thing here that could actually get logged.
- **Works from `file://`.** The built page is self-contained, so if the hosted
  URL is ever blocked, the same file can travel by OneDrive or email and open
  from disk with nothing lost.

The design is the house warm-editorial system, with one deliberate deviation:
no Fontshare webfont link (that would be a network request). UI chrome uses the
system grotesk; article prose is set in a serif, which reads better at 2,000
words anyway.

## Commands

```bash
npm run build     # rebuild docs/index.html
npm run publish   # build, commit, push (GitHub Pages deploys from main:/docs)
npm run offline   # build + drop a dated copy on the Desktop for hand-carrying
```

Source repos are found at `../api-inspector` and `../ascend`; override with
`API_INSPECTOR_DIR` / `ASCEND_DIR`.

## Published at

https://upbeat247.github.io/briefs/

Public but `noindex`. The content is synthetic, role-based professional study
material — no NLNG data, by the same rule the source apps follow.

## Reading state

Which briefs are marked read, and the light/dark choice, live in `localStorage`
on whichever browser you are using — so the work laptop and the Mac keep
separate progress. That is deliberate: nothing about your reading leaves the
machine.

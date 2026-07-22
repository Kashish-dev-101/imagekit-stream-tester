# ImageKit Stream Tester

A lightweight tool for testing video playback through the [ImageKit Video Player SDK](https://imagekit.io/docs/video-player/overview) — built as a replacement for third-party stream-testing tools (like Bitmovin's "Test Your Stream") during customer calls and demos.

Paste any ImageKit video URL and test it live: a plain `.mp4` for progressive playback, or a transformed `.m3u8` / `.mpd` manifest to test adaptive bitrate streaming (ABS).

## Features

- **Format auto-detection** — no manual mode toggle. The tool detects progressive vs. adaptive playback straight from the URL extension.
- **AI-generated subtitles** — optional, with translation checkboxes (Hindi, Spanish, French, German) that appear once enabled.
- **Two-tier player log**:
  - **Simple** (always visible) — plain-language events: loading, playing, quality changes, buffering, errors.
  - **Technical** (toggle-able) — every real network request the player makes (manifest, rendition playlist, individual segments), with byte size and timing, sourced from the browser's Resource Timing API. Same visibility as the DevTools Network tab, without opening it.
- **Fresh player per test** — the player is disposed and recreated on every Play click, so testing different URLs (or switching between progressive and adaptive) back-to-back never carries over stale state from the previous source.
- Styled to match ImageKit's own brand (Poppins, brand blue, rounded cards).

## Usage

Open `index.html` in a browser (or serve the folder with any static file server). No build step — plain HTML/CSS/JS, loading the SDK via `esm.sh`.

1. Paste a video URL in **Video URL** (and optionally a **Poster URL**).
2. Check **Generate AI subtitles** if you want captions, and pick translation languages if needed.
3. Click **Play**.
4. Toggle **Show technical details** in the log panel to see the full request-level breakdown.

## Known limitations

- The native quality-selector menu built into the player's control bar (the gear icon) is currently unreliable in `@imagekit/video-player@1.0.0-beta.5` — clicking a resolution doesn't reliably restrict playback, and its own checkmark state can show more than one rendition selected at once. This was confirmed by direct testing, isolated from this tool's own code, so it's a bug in the SDK's bundled UI, not something fixable from here. Manual quality switching isn't otherwise exposed by this tool — automatic ABR switching still works and is reflected accurately in the log.
- `imagekitId` is currently hardcoded to a personal test account (`Kashish12345`) in `app.js`. Playback of a pasted URL works regardless (it's a full absolute URL), but this would need to change if a feature ever depends on account context (e.g. signed URLs).

## Built with

[ImageKit Video Player SDK](https://imagekit.io/docs/video-player/overview) · [Adaptive Bitrate Streaming docs](https://imagekit.io/docs/adaptive-bitrate-streaming)

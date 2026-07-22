// ─── IMPORT ───────────────────────────────────────────────────────────────
// esm.sh resolves all package dependencies — unpkg does not
// Pinned to 1.0.0-beta.5 — npm's "latest" dist-tag lags behind and lacks
// some functionality on earlier betas. Don't unpin until "latest" catches up.
import { videoPlayer } from "https://esm.sh/@imagekit/video-player@1.0.0-beta.5";

// ─── DOM refs ─────────────────────────────────────────────────────────────
const videoUrlInput = document.querySelector("#video-url");
const posterUrlInput = document.querySelector("#poster-url");
const subtitlesCheckbox = document.querySelector("#subtitles-checkbox");
const translationsFieldEl = document.querySelector("#translations-field");
const translationCheckboxes = document.querySelectorAll(".translation-checkbox");
const translationLabels = { hi: "Hindi", es: "Spanish", fr: "French", de: "German" };
const applyBtn = document.querySelector("#apply-btn");
const resetBtn = document.querySelector("#reset-btn");
const logLinesEl = document.querySelector("#log-lines");
const logSimpleEl = document.querySelector("#log-simple");
const techToggleCheckbox = document.querySelector("#tech-toggle-checkbox");
const logQualityEl = document.querySelector("#log-current-quality");

techToggleCheckbox.addEventListener("change", () => {
  logLinesEl.hidden = !techToggleCheckbox.checked;
});

subtitlesCheckbox.addEventListener("change", () => {
  translationsFieldEl.hidden = !subtitlesCheckbox.checked;
  if (!subtitlesCheckbox.checked) {
    translationCheckboxes.forEach((cb) => (cb.checked = false));
  }
});

// ─── Log panel — two tiers ──────────────────────────────────────────────────
// "Technical" (logPanel) — every event, every fetch, timestamps and byte
// sizes. Useful for us, but overwhelming for a non-technical person watching
// a screen share — it looks like noise/errors even when nothing is wrong.
// "Simple" (logSimple) — a short, plain-language subset of the same events,
// always visible. Technical view is off by default, toggled on when needed.
//
// startTime resets on every Play click (see resetLog), not just once at page
// load — otherwise timestamps keep climbing across repeated tests in the
// same session instead of reading naturally from ~0s each time.
let startTime = performance.now();

function logPanel(msg, cls) {
  const t = ((performance.now() - startTime) / 1000).toFixed(2);
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = `[+${t}s] ${msg}`;
  logLinesEl.appendChild(line);
  logLinesEl.scrollTop = logLinesEl.scrollHeight;
}

function logSimple(msg, cls) {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = msg;
  logSimpleEl.appendChild(line);
  logSimpleEl.scrollTop = logSimpleEl.scrollHeight;
}

function resetLog() {
  logLinesEl.textContent = "";
  logSimpleEl.textContent = "";
  logQualityEl.textContent = "Quality: —";
  startTime = performance.now();
}

// ─── Segment-level network log ─────────────────────────────────────────────
// Uses the Resource Timing API to see every real request the player makes —
// the same segment/manifest URLs you'd see in the DevTools Network tab —
// without needing to open it. Matches on ImageKit's HLS/DASH URL patterns
// (rendition-prefixed .ts/.m4s segments, .m3u8/.mpd playlists).
let segmentObserver = null;

function describeSegmentUrl(url) {
  const path = url.split("?")[0];
  const filename = path.split("/").pop();

  // Check manifest/playlist types first — a rendition playlist like
  // "720p-pl.m3u8" also matches the segment naming prefix below, so it must
  // be excluded before falling through to the segment check.
  if (/master\.m3u8$/i.test(filename)) return "master manifest — " + filename;
  if (/\.m3u8$/i.test(filename)) return "rendition playlist — " + filename;
  if (/\.mpd$/i.test(filename)) return "DASH manifest — " + filename;

  const renditionMatch = filename.match(/^(\d+p)-/);
  if (renditionMatch) {
    return `${renditionMatch[1]} segment — ${filename}`;
  }
  return filename;
}

function startSegmentLogging() {
  if (segmentObserver) segmentObserver.disconnect();

  segmentObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (!/\.(ts|m4s|m3u8|mpd|cmfv|cmfa)(\?|$)/i.test(entry.name)) return;
      if (!entry.name.includes("ik.imagekit.io")) return;

      // transferSize is 0 whenever the response is served from the browser's
      // local disk/memory cache (not the same as ImageKit/CloudFront's own
      // edge cache) — encodedBodySize still reports the real size in that
      // case, so prefer it and only fall back to "size unknown" if both
      // are genuinely zero (e.g. a cross-origin response without proper
      // timing-allow-origin, which ImageKit does set).
      const bytes = entry.transferSize || entry.encodedBodySize;
      const sizeKb = bytes ? (bytes / 1024).toFixed(1) + " KB" : "size unknown";
      const ms = entry.duration.toFixed(0) + "ms";
      logPanel(`fetched: ${describeSegmentUrl(entry.name)} (${sizeKb}, ${ms})`);
    });
  });

  segmentObserver.observe({ type: "resource", buffered: false });
}

// ─── Player setup — recreated fresh on every test ──────────────────────────
// Reusing one player instance across format switches (e.g. an .m3u8 source
// followed by a plain .mp4) left the Video.js quality-selector menu showing
// stale renditions from the previous source — confirmed live, not a
// progressive-playback bug. Disposing and recreating the player on every
// Play click guarantees a clean slate regardless of what was tested before
// it, which matters here since this tool's whole point is testing different
// URLs (and formats) back-to-back on a live call.
const playerContainer = document.querySelector(".player-wrapper");
let player = null;

function createPlayer() {
  if (player) {
    player.dispose();
  }

  startSegmentLogging();

  playerContainer.innerHTML =
    '<video id="video-player" class="video-js vjs-default-skin vjs-fluid" controls></video>';

  player = videoPlayer(
    "video-player",
    { imagekitId: "Kashish12345" },
    { muted: true, preload: "auto" }
  );

  // currentQualityLabel is set by the loadedmetadata/ABS handler below and
  // read here so "playing" can announce quality in the simple log without
  // the two handlers needing to fire in a specific order.
  let currentQualityLabel = null;

  player.on("loadstart", () => logPanel("loadstart — fetching manifest/source"));
  player.on("canplay", () => logPanel("canplay — enough data buffered to start"));
  player.on("playing", () => {
    logPanel("playing — rendering frames");
    logSimple(currentQualityLabel ? "Playing at " + currentQualityLabel : "Playing");
  });
  player.on("waiting", () => {
    logPanel("waiting — buffering");
    logSimple("Buffering…");
  });
  player.on("pause", () => {
    logPanel("paused");
    logSimple("Paused");
  });
  player.on("ended", () => {
    logPanel("ended — playback finished");
    logSimple("Finished playing");
  });
  player.on("error", () => {
    const err = player.error();
    logPanel("ERROR — " + (err ? err.message : "unknown"), "log-error");
    logSimple("Something went wrong — playback couldn't continue", "log-error");
  });

  player.on("loadedmetadata", () => {
    if (typeof player.qualityLevels !== "function") return;

    const qualityLevels = player.qualityLevels();
    if (qualityLevels.length === 0) return; // progressive MP4 — nothing to track

    function describeLevel(level) {
      if (!level) return "unknown";
      const mbps = (level.bitrate / 1_000_000).toFixed(2);
      return `${level.height}p (~${mbps} Mbps)`;
    }

    function updateCurrent() {
      const level = qualityLevels[qualityLevels.selectedIndex];
      currentQualityLabel = describeLevel(level);
      logQualityEl.textContent = "Quality: " + currentQualityLabel;
    }

    updateCurrent();
    logPanel(
      "ABS active — " +
        qualityLevels.length +
        " renditions available, starting at " +
        describeLevel(qualityLevels[qualityLevels.selectedIndex])
    );

    let lastIndex = qualityLevels.selectedIndex;
    qualityLevels.on("change", () => {
      if (qualityLevels.selectedIndex === lastIndex) return;
      lastIndex = qualityLevels.selectedIndex;
      const level = qualityLevels[lastIndex];
      updateCurrent();
      logPanel("ABS switched → " + describeLevel(level), "log-quality");
      logSimple("Quality changed to " + describeLevel(level), "log-quality");
    });

    // Quality is switched entirely through the player's own native gear
    // menu (built into the SDK). A separate custom control here previously
    // mutated `level.enabled` directly, bypassing the native menu's own
    // click handling — that desync was the root cause of the native menu
    // showing two renditions checked at once. Removed; the native menu is
    // now the only thing touching `.enabled`, and this handler purely
    // observes and logs whatever it does.
  });

  window.player = player;
}

createPlayer();

// ─── Format detection — same rule as the native Video.js tester ───────────
// .m3u8 / .mpd → adaptive manifest, already fully built by the pasted URL
// (sr transformation + protocol already applied) — no `abs` config needed,
// the player just plays the manifest directly like any HLS/DASH source.
// anything else → progressive playback.
function isAdaptiveManifest(url) {
  return /\.m3u8(\?|$)/i.test(url) || /\.mpd(\?|$)/i.test(url);
}

// ─── Apply / Reset ──────────────────────────────────────────────────────────
function applySource(videoUrl, posterUrl, wantSubtitles) {
  createPlayer();
  resetLog();
  logPanel("Loading: " + videoUrl);
  logSimple("Loading video…");

  const source = { src: videoUrl };

  if (posterUrl) {
    source.poster = { src: posterUrl };
  }

  if (wantSubtitles) {
    const track = { autoGenerate: true, autoGeneratedLabel: "English (AI)" };

    // maxChars/highlightWords can't be combined with translations (hard SDK
    // error) — this tool only exposes translations, so that conflict never
    // comes up here.
    const translations = Array.from(translationCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => ({ langCode: cb.value, label: translationLabels[cb.value] }));

    if (translations.length > 0) {
      track.translations = translations;
      logPanel("Subtitle translations: " + translations.map((t) => t.label).join(", "));
      logSimple("Also translating subtitles to: " + translations.map((t) => t.label).join(", "));
    }

    source.textTracks = [track];
  }

  if (isAdaptiveManifest(videoUrl)) {
    logPanel("Detected adaptive manifest (.m3u8/.mpd)");
  } else {
    logPanel("Detected progressive source");
  }

  player.src(source);
}

applyBtn.addEventListener("click", () => {
  const videoUrl = videoUrlInput.value.trim();
  const posterUrl = posterUrlInput.value.trim();

  if (!videoUrl) {
    logPanel("Cannot load — paste a video URL first.", "log-error");
    logSimple("Please paste a video URL first.", "log-error");
    return;
  }

  applySource(videoUrl, posterUrl, subtitlesCheckbox.checked);
});

resetBtn.addEventListener("click", () => {
  videoUrlInput.value = "";
  posterUrlInput.value = "";
  subtitlesCheckbox.checked = false;
  translationsFieldEl.hidden = true;
  translationCheckboxes.forEach((cb) => (cb.checked = false));
  createPlayer();
  resetLog();
  logPanel("Ready.");
  logSimple("Ready.");
});

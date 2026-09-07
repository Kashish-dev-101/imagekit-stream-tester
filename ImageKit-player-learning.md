# ImageKit Player Learning Notes

These notes capture the important learnings from this exploration of the ImageKit Video Player SDK.

## High-level understanding

ImageKit Video Player is:

- an advanced player built on top of `Video.js 8.20.0`
- integrated with ImageKit's video delivery and transformation system
- currently marked as a **beta release**

Source:

- https://imagekit.io/docs/video-player/overview

## Important overview points

From the overview page, the main features are:

- video transformations
- adaptive bitrate streaming (HLS and MPEG-DASH)
- subtitles and chapters
- floating player
- seek thumbnails
- custom branding with logo
- playlists and recommendations
- shoppable videos

## Installation options

The overview shows two main ways to use it:

- install with `npm` / `yarn`
- use CDN links in plain HTML

Package:

- `@imagekit/video-player`

The docs also recommend pinning a specific version in production instead of using `@latest`.

## Core mental model

The cleanest way to think about the SDK is:

1. player setup
2. source setup

### Player setup

This defines global player behavior.

Example shape:

```js
const player = videoPlayer(element, ikPlayerOptions, videoJsOptions);
```

This is where global behavior lives, such as:

- `imagekitId`
- floating player
- seek thumbnails
- hide context menu
- logo / branding
- default transformations
- some global ABS behavior
- standard Video.js options

Simple way to remember it:

- player config = how the player behaves

### Source setup

This defines the specific video being played.

Example shape:

```js
player.src(sourceOptions);
```

This is where per-video data lives, such as:

- `src`
- poster
- chapters
- text tracks
- recommendations
- shoppable configuration
- per-video transformations
- per-video ABS config
- title / description metadata

Simple way to remember it:

- source config = what this video needs

## Best mental model sentence

Recommended wording:

- player config defines global behavior and defaults
- source config provides per-video data and overrides

This is more accurate than saying every feature is just "enabled" in one place and "fed data" in another, because some features are purely player-level and some are purely source-level.

## Feature grouping

### Mostly player-level

- `imagekitId`
- `floatingWhenNotVisible`
- `hideContextMenu`
- `logo`
- `seekThumbnails`
- Video.js options like autoplay, fluid, playbackRates

### Mostly source-level

- `src`
- `poster`
- `chapters`
- `textTracks`
- `recommendations`
- `shoppable`
- `info`

### Can appear as global or per-video

- `transformation`
- `abs`

## Transformations

Important learning:

- transformations are configured in code
- the overview does **not** suggest a built-in player UI for end users to change arbitrary transformations

That means:

- player-level transformations apply to all videos in that player
- source-level transformations apply to a specific video

If we want viewers to choose transformations from the UI, we would likely need to build that ourselves.

## Adaptive bitrate streaming (ABS)

ABS is a first-class feature in the player.

The overview shows config like:

```js
abs: {
  protocol: "hls",
  sr: [360, 480, 720, 1080],
}
```

Key idea:

- the player can trigger ImageKit's adaptive streaming setup through config
- ImageKit handles generation of required representations and files

## Chapters understanding

Important learning:

`chapters` behaves like a config that can be:

- off
- enabled with AI
- enabled with provided chapter data

Examples from the docs:

```js
chapters: true
```

This means:

- enable chapters
- auto-generate them using AI

```js
chapters: { url: "chapters.vtt" }
```

This means:

- enable chapters
- load them from a VTT file

```js
chapters: {
  0: "Intro",
  30: "Main Section",
  60: "End",
}
```

This means:

- enable chapters
- use manual time-based chapter data

### Important conclusion

If `chapters` is set to `false`, then chapter data should not be used.

So the safe assumption is:

- `false` = off
- `true` = on with AI-generated chapters
- `object` = on with provided chapter data

## Why this matters for reading config docs

Sometimes a property is not just a simple boolean switch.

A property like `chapters: boolean | object` means:

- it can be used as a feature toggle
- or it can carry the actual config data

That pattern is common in JavaScript configuration objects.

## What goes in player config vs source config

This is one of the most important mental models for using the ImageKit player.

### Player config

Put something in player config when it should stay the same even if you switch videos.

Examples:

- `imagekitId`
- `floatingWhenNotVisible`
- `seekThumbnails`
- `hideContextMenu`
- `logo`
- standard Video.js player options

Simple way to remember it:

- player config = base player setup

### Source config

Put something in source config when it belongs to the specific video currently being played.

Examples:

- `src`
- `poster`
- `chapters`
- `textTracks`
- `recommendations`
- `shoppable`
- `info`

Simple way to remember it:

- source config = current video data

### Best shortcut

Ask:

- if I switch to another video, should this stay the same?

If yes:

- it probably belongs in player config

If no:

- it probably belongs in source config

## Chapters placement

Important clarification:

- `chapters` belongs in the source config, not in the player config

Example:

```js
player.src({
  src: "https://ik.imagekit.io/your-imagekit-id/video.mp4",
  chapters: false,
});
```

This is correct because chapters are tied to the specific video being played.

## ABS as a good example of override behavior

ABS is a useful example because it helps explain the difference between player-level defaults and per-video overrides.

You can think of it like this:

- player config can define the base setup
- source config can change ABS behavior for a particular video

So this is a valid high-level understanding:

- keep the player config the same
- enable ABS for one video
- disable or omit ABS for another video

That means the same player instance can be reused while changing source-level behavior.

Example idea:

```js
const player = videoPlayer("my-video", {
  imagekitId: "YOUR_IMAGEKIT_ID",
  floatingWhenNotVisible: "right",
  seekThumbnails: true,
});
```

Then one video source can use ABS:

```js
player.src({
  src: "video-a.mp4",
  abs: {
    protocol: "hls",
    sr: [360, 720, 1080],
  },
});
```

And another can omit it:

```js
player.src({
  src: "video-b.mp4",
});
```

### Important takeaway

This is accurate to say:

- player config = base player settings that can remain static across videos
- source config = per-video settings that can differ from one video to another

## A useful sentence to remember

- `videoPlayer(...)` sets up the player
- `player.src(...)` sets up the current video

Or even shorter:

- player config = container behavior
- source config = video behavior

## Player instance learning

The player instance still follows the Video.js mental model.

The overview mentions support for standard Video.js events and methods.

Common events:

- `play`
- `pause`
- `ended`
- `timeupdate`
- `ready`

Common methods:

- `play()`
- `pause()`
- `currentTime()`
- `src()`
- `volume()`
- `muted()`

So the ImageKit player is not a completely unrelated API shape. It extends a Video.js-style player.

## Best practices from the overview

- use adaptive bitrate streaming
- use global transformations for consistency
- override per video only when needed
- keep seek thumbnails enabled
- pin package versions in production
- test player events in target browsers
- consider floating player on long pages
- use `signerFn` for private content

## Useful summary for implementation

Before building features, remember:

- this is not a totally custom player from scratch
- it is Video.js-based underneath
- the important starting requirement is `imagekitId`
- we initialize with `videoPlayer(...)`
- we load content with `player.src(...)`
- global behavior and per-video data are intentionally separate

## Notes for our project

For this sandbox, the clean learning order will probably be:

1. basic player initialization
2. basic `src` loading
3. poster handling
4. ABS
5. subtitles and chapters
6. recommendations / playlist
7. shoppable video

## Source used

- https://imagekit.io/docs/video-player/overview

This page was read using browser DevTools because the standard page extraction path did not return the full page body.

# Fork notice

This is a working fork of [streamer45/mattermost-plugin-voice](https://github.com/streamer45/mattermost-plugin-voice). The upstream repo has been in maintenance mode since `v0.3.0` (July 2022), and the plugin no longer functions correctly on **Mattermost 10.x mobile clients**. This fork carries patches that fix that and modernize the web UI.

## What this fork changes vs. upstream

Two independent patches, each open as a PR against upstream:

| Branch | Upstream PR | What it changes |
|---|---|---|
| [`fix/mobile-support`](https://github.com/zainali89/mattermost-plugin-voice/tree/fix/mobile-support) | [streamer45#67](https://github.com/streamer45/mattermost-plugin-voice/pull/67) | Voice messages were invisible / unplayable on Mattermost mobile (iOS, Android). The fix sets `file_ids` on the post so mobile clients render the MP3 with their native inline audio player. Plus a small `:has()` CSS rule to avoid a duplicate file-attachment card on web. |
| [`feat/redesign-player-ui`](https://github.com/zainali89/mattermost-plugin-voice/tree/feat/redesign-player-ui) | [streamer45#68](https://github.com/streamer45/mattermost-plugin-voice/pull/68) | Rewrites the inline web player to match the Mattermost mobile native look — circular play button, draggable scrubber with floating thumb, formatted duration, download icon. Touch-enabled. Screenshots in [`docs/`](https://github.com/zainali89/mattermost-plugin-voice/tree/feat/redesign-player-ui/docs). |

### Related issues

- [streamer45#65](https://github.com/streamer45/mattermost-plugin-voice/issues/65) — Mattermost 10.x compatibility. The mobile-support PR addresses the mobile-rendering side of this.

### Why two branches instead of one

Each branch is PR-shaped (minimal, focused diff against upstream). They are independent — either can be merged first. If you want a single ready-to-build tree with **both** patches combined plus extra ops notes, see the sibling repo:

➡ **[zainali89/mattermost-plugin-voice-metaviz](https://github.com/zainali89/mattermost-plugin-voice-metaviz)** — the patches combined on `master`, used in production on a Mattermost 10.11 deployment.

## Building locally

There are no GitHub releases for the upstream plugin, so you need to build from source. The plugin's `make dist` target is fine on modern systems with two caveats:

```bash
# Node 17+? Set this so webpack 4 doesn't crash on OpenSSL 3's MD4 removal
# (ERR_OSSL_EVP_UNSUPPORTED).
export NODE_OPTIONS=--openssl-legacy-provider

# macOS? Set this so the resulting tarball is free of AppleDouble metadata
# files that Mattermost's plugin extractor chokes on.
export COPYFILE_DISABLE=1

make dist
# -> dist/com.mattermost.voice-0.3.0.tar.gz
```

Install via `mmctl --local plugin add /path/to/<tarball> && mmctl --local plugin enable com.mattermost.voice`. If `mmctl plugin add` still rejects the tarball (some BSD-tar PAX headers can confuse it), extract it directly into the Mattermost server's plugins volume — full notes in the sibling repo above.

## Backfilling existing voice posts (mobile-support patch only)

For voice posts created before the mobile-support patch was applied, `post.file_ids` will still be empty in the database — mobile clients will still see nothing for those historical posts. Backfill with:

```sql
UPDATE posts SET fileids =
  '["' || (props->>'fileId') || '"]'
  WHERE type = 'custom_voice'
  AND fileids = '[]'
  AND props->>'fileId' IS NOT NULL;

UPDATE fileinfo fi SET postid = p.id
  FROM posts p
  WHERE p.type = 'custom_voice'
  AND fi.id = (p.props->>'fileId')
  AND fi.postid IS NULL;
```

---

# Mattermost Voice Plugin

This plugin adds support for basic **voice messaging** in Mattermost.

![](https://i.imgur.com/hPZ3GhG.gif)

## Demo

A demo server running the latest version of this plugin is located [here](https://mm.krad.stream/testing/channels/town-square).  
You can login using the following details:

```
Username: demo
Password: password
```

## Usage

To start sending a voice message you can either use the ```/voice``` slash command or the existing file attachment functionality as shown in the picture above.

## Limitations

This plugin only works on web client and desktop app. Mobile native apps are **not** [supported](https://developers.mattermost.com/extend/plugins/mobile/).

## Installation

1. Download the latest version from the [release page](https://github.com/streamer45/mattermost-plugin-voice/releases).
2. Upload the file through **System Console > Plugins > Plugin Management**, or manually upload it to the Mattermost server under plugin directory. See [documentation](https://docs.mattermost.com/administration/plugins.html#set-up-guide) for more details.

## Development

Use ```make dist``` to build this plugin.

Use `make deploy` to deploy the plugin to your local server.

Before running `make deploy` you need to set a few environment variables:

```
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_USERNAME=admin
export MM_ADMIN_PASSWORD=password
```

For more details on how to develop a plugin refer to the official [documentation](https://developers.mattermost.com/extend/plugins/).

## License

[mattermost-plugin-voice](https://github.com/streamer45/mattermost-plugin-voice) is licensed under [MIT](LICENSE)  
[mp3rec-wasm](https://github.com/streamer45/mp3rec-wasm) is licensed under [MIT](LICENSE)  
[LAME](http://lame.sourceforge.net/) is licensed under [LGPL](vendor/lame/COPYING)  

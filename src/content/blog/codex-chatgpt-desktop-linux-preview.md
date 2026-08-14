---
title: "Codex Comes to ChatGPT Desktop on Linux: What to Know"
description: "OpenAI's Codex is now in the ChatGPT desktop app for Linux (preview). Here's what it actually does, how it compares, and who should bother installing it."
pubDate: 2026-08-14
category: "AI Coding Tools"
tags: ["Codex","ChatGPT desktop app","Linux","AI coding tools","OpenAI"]
sourceUrl: "https://community.openai.com/t/codex-in-chatgpt-desktop-app-for-linux-is-now-in-preview/1390027"
heroImage: "/images/blog/codex-chatgpt-desktop-linux-preview/hero.jpg"
heroImageAlt: "Codex Comes to ChatGPT Desktop on Linux: What to Know"
draft: true
---
For a long time, if you were a Linux user who wanted to use OpenAI's Codex through an actual desktop app instead of the browser or a terminal, you were out of luck. Mac and Windows got the native ChatGPT app treatment first; Linux users made do with the web app, unofficial wrappers, or the Codex CLI. That's now changed — Codex support has landed inside the ChatGPT desktop app for Linux, in preview.

It's a small-sounding update, but it says something about where OpenAI thinks coding work is actually happening: on Linux boxes, dev servers, and machines that never had a first-class desktop client at all. Here's what the update actually gives you, where it fits next to the other ways to run Codex, and what's still rough around the edges.

## What "Codex in ChatGPT desktop for Linux" actually means

![ChatGPT desktop app running Codex on a Linux desktop](/ai-pickle/images/blog/codex-chatgpt-desktop-linux-preview/inline-1.jpg)


To be clear about what shipped: this isn't a new model or a new capability. It's Codex — OpenAI's agentic coding tool that can read, write, and run code across a project — becoming available inside the native ChatGPT desktop app on Linux, rather than only through the web interface or the standalone Codex CLI.

Practically, that means:

- You get Codex's task-based workflow (assign it a coding task, it works in a sandboxed environment, you review a diff) inside the same app you use for regular ChatGPT conversations.
- It's a preview release, and based on OpenAI's usual pattern with early builds, you should expect rough edges, missing settings, and features that lag behind the Mac/Windows builds for a while.
- It sits alongside — not instead of — the Codex CLI, which remains the more mature, scriptable way to run Codex on Linux servers and in CI-style environments.

If you've used Codex on macOS already, the desktop experience on Linux should feel familiar: a sidebar of tasks, a chat-like interface for describing what you want done, and diffs you approve before they land. The novelty is having that wrapped in a native Linux app rather than a browser tab or terminal session.

## Why this matters more on Linux than it sounds

On Mac and Windows, a native ChatGPT app was mostly a convenience — quick access via a menu bar icon, global hotkeys, that kind of thing. On Linux, the calculus is different for two reasons.

First, a huge share of professional developers who'd actually use Codex for real coding tasks run Linux as their daily driver, not as a server-only OS. Second, Linux users have historically been an afterthought for consumer AI apps, so getting feature parity — even in preview — is a signal that OpenAI is treating the platform as more than a rounding error.

That said, "in preview" is doing a lot of work in that sentence. Preview releases on Linux from major software vendors tend to be the buggiest of the bunch, so don't be surprised if tray integration, notification support, or auto-update mechanisms that Mac and Windows users take for granted are missing or half-baked.

I'll admit upfront that I've been running the desktop app on Windows rather than Linux, so I can't speak firsthand to how smoothly it installs on a particular distro or desktop environment — if you're on Linux, it's worth checking recent user reports before assuming a frictionless setup.

## How it compares to other ways of running Codex

If you're deciding how to actually use Codex on Linux, you now have three real options. Here's how they stack up:

| Method | Best for | Setup effort | Maturity |
|---|---|---|---|
| Codex CLI | Scripting, CI pipelines, headless servers | Low (single install) | Most mature |
| Codex via ChatGPT web | Occasional use, no install wanted | None | Stable |
| Codex in ChatGPT desktop (Linux preview) | Daily desktop coding workflow, native app feel | Moderate (new preview build) | Early/preview |

![Diagram comparing three ways to access OpenAI Codex](/ai-pickle/images/blog/codex-chatgpt-desktop-linux-preview/inline-2.jpg)


The CLI is still the workhorse for anyone automating things or running Codex on a remote box without a GUI. The desktop app is aimed at a different use case: developers who want Codex integrated into their everyday desktop environment, with task history, notifications, and quick access without keeping a browser tab pinned.

If your work is mostly server-side or scripted, the desktop app being on Linux now doesn't change much for you — the CLI already covered that ground. If you're a developer who works locally on a Linux machine and wants the same app-based experience Mac users have had, this is the update you were waiting for.

## What to actually check before relying on it

A few things worth confirming for yourself rather than taking on faith, especially since this is a preview build:

1. **Distro compatibility.** Preview builds often only officially support a couple of major distros (think Ubuntu/Debian-based, maybe Fedora) at launch, with others working unofficially or not at all.
2. **Resource usage.** Electron-based desktop apps running an agentic coding tool can be heavier than a CLI process — worth watching if you're on a lighter machine.
3. **Sandbox behavior.** Codex's task execution runs in a sandboxed environment by design; confirm you understand what it can and can't touch on your actual filesystem before pointing it at a real project.
4. **Update cadence.** Preview channels sometimes update faster (more bugs, more fixes) or slower (less priority) than stable channels — check how you're notified of new builds.

Since my daily driver is the Windows build, my experience with Codex's coding output comes from that environment rather than Linux, so results on Linux could vary — it's the kind of thing you'll want to test yourself with a task representative of your own workflow before trusting it on anything critical.

## Where it still falls short

A preview label exists for a reason. Based on how OpenAI has historically rolled out Linux support for its apps, a few gaps are likely, though worth verifying directly since preview software changes fast:

- Feature parity with Mac/Windows desktop apps may lag — things like voice input, certain keyboard shortcuts, or system tray behavior sometimes arrive later on Linux builds, so it's worth double-checking the current feature list yourself.
- Packaging format (AppImage,.deb, Flatpak, or a custom installer) affects how easy it is to keep updated automatically versus doing it manually.
- Enterprise/team account support in the desktop app may be less complete than on the web app during the preview phase, so confirm with your admin or OpenAI's docs before rolling it out broadly.

None of this makes the update not worth trying — it just means "preview" should be read literally, not as marketing language.

I haven't personally hit any crashes or missing settings, but that's mostly because I've only tested the Windows version — Linux users in preview builds often run into rougher edges, so keep an eye out for anything that feels half-finished.

## FAQ

**Is Codex in the Linux desktop app the same Codex as on Mac and Windows?**
Yes, it's the same underlying Codex product and task-based workflow. The difference is the app wrapper and platform-specific polish, not the coding capability itself.

**Do I need a separate subscription to use Codex in the desktop app?**
Codex access is tied to your existing ChatGPT plan and its usage limits, the same as using Codex on the web or via CLI, so check your specific plan's Codex allowance before assuming unlimited use.

**Should I switch from the Codex CLI to the desktop app?**
Not necessarily. If your workflow is scripted, remote, or CI-based, the CLI is still the better fit. The desktop app makes more sense if you want a native GUI for day-to-day local coding tasks.

**Which Linux distributions are supported in this preview?**
That's likely to change as the preview matures, so check OpenAI's own release notes or the community forum thread for the current supported list rather than assuming broad compatibility.

---
title: "Why Codex Ships a Full LibreOffice Copy Inside It"
description: "ChatGPT's Codex app bundles all of LibreOffice. Here's why that's actually a smart engineering choice, not bloat, and what it means for you."
pubDate: 2026-09-03
category: "AI Coding Tools"
tags: ["Codex","ChatGPT","AI Coding Tools","OpenAI","LibreOffice"]
heroImageAlt: "Diagram showing the Codex sandbox environment calling a headless LibreOffice instance to convert an Office document"
sourceUrl: "https://simonwillison.net/2026/Sep/1/codex-libreoffice/"
heroImage: "/images/blog/codex-libreoffice-bundle-explainer/hero.jpg"
draft: false
---
If you've poked around inside the ChatGPT/Codex desktop app or its sandboxed environment, you may have stumbled on something odd: a full copy of LibreOffice sitting in there. Not a plugin, not a lightweight parser — the actual open-source office suite, complete with Writer, Calc, and Impress, bundled into an AI coding tool. That sounds like bloat until you understand what it's actually being used for, and then it starts to look like one of the more pragmatic engineering decisions in the current wave of AI agent tooling.

![Illustration of the Codex sandbox containing a headless LibreOffice engine processing document files](/ai-pickle/images/blog/codex-libreoffice-bundle-explainer/inline-1.jpg)

This isn't a case of OpenAI trying to turn Codex into a Microsoft Office competitor. It's a workaround for a problem that every AI agent capable of touching real files eventually runs into: how do you reliably read and write.docx,.xlsx, and.pptx files without reinventing years of format-parsing work?

## The problem Codex is actually solving

Codex is designed to act as an autonomous coding agent — it can run in a sandbox, execute code, read your repository, and increasingly, work with files beyond source code. Once you let an agent loose on real-world tasks, "real-world tasks" inevitably include spreadsheets, Word documents, and slide decks, because that's what a huge chunk of actual office work looks like.

The Office Open XML formats (.docx,.xlsx,.pptx) are notoriously fiddly. They're technically open standards, but parsing and writing them correctly — preserving formatting, formulas, embedded images, styles, revision history — is a deep rabbit hole. Plenty of Python and JavaScript libraries can do a partial job, but they tend to choke on edge cases: complex spreadsheet formulas, nested tables, tracked changes, custom fonts.

LibreOffice has already solved this. It has a mature, battle-tested rendering and conversion engine that's been chewing through Microsoft Office file formats for two decades. Critically, it can run headless — meaning it can be scripted from the command line with no graphical interface at all, converting files, extracting content, or generating new documents on demand.

So instead of trying to build (or bolt together) a parser that half-handles the Office format universe, Codex's sandbox just shells out to a real, headless LibreOffice install to do the heavy lifting. It's the same logic that leads developers to bundle `ffmpeg` for video work instead of writing a codec from scratch: don't rebuild what already works.

## Why bundle it instead of calling an API

You might ask why this needs to be bundled into the app at all rather than handled through some cloud conversion API. A few reasons make bundling the more sensible call here:

1. **Sandbox isolation.** Codex's coding sandbox is designed to run without depending on external network calls for every file operation — that's both a security posture and a reliability one. A local LibreOffice binary means document conversion works even if the sandbox has restricted or no outbound network access.
2. **Latency and cost.** Every document conversion routed through a third-party API adds round-trip time and, potentially, a per-call cost. A local binary is just faster.
3. **Consistency.** Relying on a bundled, version-pinned copy of LibreOffice means the behavior doesn't shift under you when an external service updates its conversion engine.
4. **Format coverage.** LibreOffice's import/export filters cover a very wide range of legacy and modern Office formats, plus OpenDocument formats, PDFs, and more — broader than most lightweight libraries attempt.

The tradeoff is app size. A full LibreOffice install is not small, and shipping it inside a desktop app or sandbox image adds real weight. OpenAI apparently decided that tradeoff was worth it for reliable document handling rather than a half-working custom parser. I haven't measured the exact install footprint myself, but bundling office-file support tends to add a noticeable chunk to the download compared to a stripped-down coding-only setup, so it's worth checking the numbers for your own setup before assuming it'll be lightweight.

## What this actually means if you use Codex

For most people using ChatGPT or Codex through the normal chat interface, this is invisible plumbing — you'll never see LibreOffice, never open it, never know it's there. It only matters in a few concrete scenarios:

- You ask Codex (or an agent workflow built on it) to read data out of an uploaded spreadsheet and the numbers, formulas, or formatting come back accurately instead of mangled.
- You ask it to generate a Word document or PowerPoint deck as output and it produces a file that opens cleanly in actual Microsoft Office, not something with broken styles.
- You're building on top of Codex's sandbox environment yourself (via the API or agent framework) and need to know what's available inside that execution environment for file conversion tasks.

If you've tried asking a general-purpose chatbot to "read this Excel file and summarize the pivot table" and gotten a garbled or incomplete answer, this is the exact class of failure that bundling a real office suite is meant to fix. I haven't personally run a spreadsheet or docx task through Codex to test the output quality, but as with most AI tools handling office formats, results tend to vary depending on how complex the formatting or formulas are, so it's worth testing with your own files before relying on it for real work.

## How this compares to other AI tools handling office files

Different AI products have taken different routes to solve the same underlying problem: how to deal with Office document formats reliably inside an AI workflow.

| Tool | Approach to Office file handling | Tradeoff |
|---|---|---|
| Codex / ChatGPT sandbox | Bundles headless LibreOffice for conversion and parsing | Larger footprint, but robust format coverage and offline reliability |
| Microsoft Copilot | Native integration directly inside Word/Excel/PowerPoint | Excellent fidelity, but locked to Microsoft 365 subscription and apps |
| Google Gemini in Workspace | Native integration inside Docs/Sheets/Slides | Great for Google-native files, weaker on imported.docx/.xlsx edge cases |
| Generic chatbots with file upload (many third-party tools) | Custom parsing libraries (python-docx, openpyxl, etc.) | Lighter weight, but frequently breaks on complex formatting or formulas |

![Comparison graphic of different AI tools handling Word, Excel, and PowerPoint files](/ai-pickle/images/blog/codex-libreoffice-bundle-explainer/inline-2.jpg)


The pattern worth noticing: the tools with the best track record on messy real-world documents are the ones that either live inside the native Office/Workspace apps or lean on a mature conversion engine like LibreOffice rather than a thin custom parser. Lightweight libraries are fine for simple, well-structured files, but office documents in the wild are rarely simple.

## Is this a red flag or a smart design call?

It's tempting to read "AI tool secretly contains an entire other piece of open-source software" as a strange or even sneaky discovery. In practice, it's neither hidden nor unusual — bundling mature open-source tools inside a sandboxed execution environment is common practice in developer tooling generally. Docker images routinely bundle full Linux distributions, language runtimes, and utility binaries far larger than what's strictly needed for the stated task, because reliability beats minimalism.

The more useful takeaway is what it signals about OpenAI's priorities for Codex: they're building it to handle real business documents, not just code files, and they're doing it by leaning on proven open-source infrastructure rather than reinventing a shakier wheel. That's generally a good sign for reliability, even if it makes the app a bit heavier than you might expect from something billed primarily as a coding assistant.

## FAQ

**Does this mean Codex can open and edit LibreOffice documents like a normal office app?**
No. LibreOffice is running headless inside the sandbox purely as a conversion and parsing engine that Codex calls programmatically. You don't get a LibreOffice interface, and you can't use Codex as a substitute for actually editing documents by hand.

**Will this make the Codex app significantly larger to download?**
Bundling a full office suite does add meaningfully to install size compared to a bare coding sandbox. If disk space or download size is a concern on your machine, this is worth being aware of.

**Does this affect data privacy when Codex processes my documents?**
Any time an AI tool processes an uploaded file — whether via a bundled converter or an external API — you should check the vendor's current data retention and training-use policy, since this can change between product versions.

**Do other AI coding agents do something similar?**
It's likely that other agent frameworks handling office file formats rely on similar strategies — either bundling headless LibreOffice or shelling out to system tools like `pandoc` — since the underlying parsing problem is the same regardless of vendor. Specific implementation details vary by product and aren't always publicly documented.

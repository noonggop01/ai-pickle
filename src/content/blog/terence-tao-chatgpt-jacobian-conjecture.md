---
title: "What Terence Tao's ChatGPT Chat Really Shows Us"
description: "Terence Tao used ChatGPT to explore the Jacobian Conjecture. Here's what it actually reveals about using AI chatbots for real math and research work."
pubDate: 2026-07-23
category: "AI Chatbots & Assistants"
tags: ["ChatGPT","AI for research","Terence Tao","AI math tools","LLM reasoning"]
heroImageAlt: "A mathematician's whiteboard filled with algebraic notation next to a laptop showing a ChatGPT conversation window"
sourceUrl: "https://chatgpt.com/share/6a5fdc7a-d6f8-83e8-bbea-8deb42cfed56"
heroImage: "/images/blog/terence-tao-chatgpt-jacobian-conjecture/hero.jpg"
draft: true
---
A shared ChatGPT conversation attributed to Fields Medalist Terence Tao made the rounds recently, showing him working through territory related to the Jacobian Conjecture — one of the more notorious open problems in algebraic geometry, sitting unsolved since 1939. People passed the link around like it was proof that AI had graduated to doing research mathematics. It hasn't. But the conversation is still one of the more useful public artifacts we have for understanding what a tool like ChatGPT is actually good for when a genuine expert sits down and uses it seriously, rather than asking it to write a poem about cats.

![Comparison of handwritten mathematical notation and an AI chatbot conversation screen](/ai-pickle/images/blog/terence-tao-chatgpt-jacobian-conjecture/inline-1.jpg)

If you're evaluating AI chatbots for anything resembling technical or research work — not just math, but law, engineering, code architecture, whatever requires precision over vibes — this transcript is worth studying for the pattern it reveals, not for the specific conjecture.

## What was actually happening in that conversation

The Jacobian Conjecture asks whether a certain type of polynomial map with a specific property (a constant, non-zero Jacobian determinant) must always be invertible. It's deceptively simple to state and has resisted proof for over 80 years, generating a graveyard of retracted proofs along the way. In the shared chat, Tao is not asking ChatGPT to "solve" the conjecture. He's using it as a sounding board — probing specific algebraic constructions, checking whether certain counterexample strategies hold up, and testing edge cases in the kind of exploratory back-and-forth a mathematician might otherwise do on a whiteboard with a very well-read but unreliable colleague.

That distinction matters enormously. The conversation reads less like "AI discovers new math" and more like "expert uses AI as a fast, tireless, occasionally wrong research assistant to accelerate a manual process he already knows how to do." Tao has said in other public commentary that current models are useful for this kind of scaffolding work but still make basic errors that a domain expert catches instantly — errors a non-expert might not catch at all. [SOURCE NEEDED]

## Why this matters for anyone using ChatGPT for serious work

The gap between "Tao uses ChatGPT productively" and "you can use ChatGPT productively for hard problems" is the expertise gap, not a tool gap. Tao can use the model well precisely because he can instantly spot when it's confidently wrong. Most users evaluating AI chatbots for technical work don't have that safety net.

This is the single biggest thing to understand before you pay for a chatbot subscription expecting it to do your hard thinking for you:

1. **The model is a fast idea generator, not a verifier.** It will produce plausible-looking algebra, code, or legal reasoning at high speed. Plausible is not the same as correct.
2. **Expert use looks like rapid rejection, not rapid acceptance.** Tao's exchange involves a lot of "no, that doesn't work because..." — the value isn't the AI being right, it's the AI being wrong quickly enough that a human can redirect it in seconds instead of hours.
3. **Domain knowledge is what makes the tool safe to use.** Without it, you can't tell a genuinely novel algebraic trick from a hallucinated one that merely looks like real math notation.

[EXPERIENCE: describe a time you asked ChatGPT a technical question in your own field and had to correct a subtly wrong step]

## How this compares across tools people actually use for technical reasoning

If you're picking a chatbot specifically for research-adjacent, math-adjacent, or highly technical reasoning tasks, here's roughly how the major options stack up based on their design intent and commonly reported behavior, not on any single conversation going viral.

| Tool | Strength for technical reasoning | Known weak spot | Best fit |
|---|---|---|---|
| ChatGPT (GPT-4o / o1-class models) | Strong step-by-step exploration, good at holding long threads of algebraic or logical argument | Can be confidently wrong on subtle proof steps; needs expert supervision | Domain experts sounding out ideas |
| Claude (Opus/Sonnet models) | Often praised for careful, hedged reasoning and admitting uncertainty | Can be overly cautious, sometimes refuses to commit to a specific claim | Users who want more conservative, caveat-heavy answers |
| Gemini | Tight integration with search and Google's own math/research tooling | Less battle-tested in public for pure proof-style reasoning | Users already inside Google's ecosystem |
| Specialized math tools (Wolfram Alpha, Lean/proof assistants) | Actual formal verification, not just plausible text | Narrow scope, steep learning curve, no natural conversation | Anyone who needs a checked answer, not a discussion |

![Icons representing different AI chatbots alongside a formal verification tool](/ai-pickle/images/blog/terence-tao-chatgpt-jacobian-conjecture/inline-2.jpg)


The honest takeaway from that table: no general chatbot currently replaces formal verification. What they replace is the tedious first draft of exploration — the "let me just try fifteen small cases by hand" work that used to eat an afternoon.

## The counterexample question everyone skips

A lot of the online reaction treated the shared link as if it showed ChatGPT constructing or confirming a counterexample to the Jacobian Conjecture. That's not what a careful read of the transcript supports, and it's worth being blunt about why that distinction got lost: headlines and screenshots travel faster than transcripts. A conjecture standing since 1939 is not going to fall in a single chat window, and treating any AI-assisted exploration as a "the AI cracked it" moment is exactly the kind of hype that makes people distrust AI reporting generally, even when there's something genuinely interesting underneath.

What's genuinely interesting is narrower and, frankly, more useful to you as a reader: a world-class mathematician found value in using ChatGPT as an interactive scratchpad. That's a real, usable signal about the tool's design — not evidence that unsolved problems are about to fall like dominoes.

[EXPERIENCE: note any pricing surprise when upgrading to a higher-tier model for longer technical conversations, like context limits or throttling]

## What this means if you're choosing a chatbot for your own technical work

If your use case is "help me think through a hard problem I already partly understand," ChatGPT-style tools are genuinely useful, provided you keep verification in your own hands or route final answers through something that actually checks (a compiler, a proof assistant, a colleague, a calculation you redo by hand). If your use case is "give me an answer I can trust without checking," none of the current generation of general chatbots are there yet for genuinely hard technical problems, and treating them that way is how errors slip into real work.

[EXPERIENCE: mention a specific verification step you now always do after getting a technical answer from an AI chatbot]

## FAQ

**Did ChatGPT solve or help solve the Jacobian Conjecture?**
No. The shared conversation shows exploratory back-and-forth about constructions related to the conjecture, not a proof or a confirmed counterexample. The conjecture remains open.

**Is this evidence that AI can now do research-level mathematics?**
It's evidence that AI can be a useful assistant for a research-level mathematician who already knows what to look for and can catch mistakes instantly. That's meaningfully different from AI generating reliable research on its own.

**Which chatbot is best if I want to use AI for serious technical reasoning?**
There isn't a single winner — ChatGPT tends to be strong for iterative exploration, Claude for cautious, hedged answers, and dedicated tools like Wolfram Alpha or proof assistants for anything that actually needs to be verified rather than just plausible. Match the tool to whether you need speed or certainty.

**Should I trust AI-generated math or code without checking it myself?**
No. Even expert users treat these outputs as drafts to be checked, not final answers. The more specialized and consequential the domain, the more that checking step matters.

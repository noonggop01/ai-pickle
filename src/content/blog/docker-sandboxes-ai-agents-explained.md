---
title: "Docker Sandboxes for AI Agents: What Is Actually Isolated?"
description: "Docker Sandboxes put coding agents inside dedicated microVMs. Here is what they protect, what remains exposed, and who should use them."
pubDate: 2026-08-13
category: "AI Coding Tools"
tags: ["Docker Sandboxes","AI agents","AI coding tools","sandboxing","developer tools"]
heroImageAlt: "A stylized illustration of an AI coding agent working inside an isolated microVM"
sourceUrl: "https://docs.docker.com/ai/sandboxes/"
heroImage: "/images/blog/docker-sandboxes-ai-agents-explained/hero.jpg"
draft: false
---
AI coding agents are most useful when they can install packages, run tests, start services, and fix their own mistakes. Those are also the permissions that make unattended agents risky. Docker Sandboxes addresses that tension by running a coding agent inside a dedicated microVM instead of directly on your host operating system.

That sounds simple, but the details matter. A sandbox protects more than a normal container, yet it does not automatically make your project files untouchable. Here is the practical version of what Docker currently offers, based on its [product documentation](https://docs.docker.com/ai/sandboxes/) and [security model](https://docs.docker.com/ai/sandboxes/security/).

![Diagram illustrating an AI agent isolated inside a disposable microVM away from most host system resources](/ai-pickle/images/blog/docker-sandboxes-ai-agents-explained/inline-1.jpg)

## What Docker Sandboxes Actually Are

Each Docker Sandbox runs as its own lightweight microVM with a separate Linux kernel. Inside that VM, the agent gets its own filesystem, network, and Docker Engine. It can install packages, run services, build images, and start containers without gaining access to the Docker daemon on your host.

That is a stronger boundary than putting an agent in a regular container. Ordinary containers share the host kernel, and mounting the host Docker socket can effectively hand a process broad control over the machine. Docker Sandboxes instead uses the hypervisor as the main trust boundary.

Docker currently supports popular coding agents including Claude Code, Gemini CLI, GitHub Copilot CLI, Codex, OpenCode, and Kiro. You launch one from a project directory with a command such as:

```bash
sbx run claude
```

Docker Desktop is not required. The `sbx` CLI is available for macOS, Windows, and supported Linux setups.

## What Is Protected

Docker documents five important layers of separation:

- **Process isolation:** the sandbox uses a separate kernel, so its processes are not visible to your host or other sandboxes.
- **Docker isolation:** the agent gets a private Docker Engine and cannot control the host Docker daemon.
- **Network controls:** outbound HTTP and HTTPS traffic passes through a host-side proxy. Raw TCP, UDP, and ICMP traffic is blocked.
- **Credential handling:** supported credentials can be injected by the proxy instead of being stored as raw secrets inside the VM.
- **Filesystem boundaries:** the agent cannot browse the rest of your host filesystem outside the locations Docker explicitly shares.

Those controls make Sandboxes a sensible fit for agents that need broad permissions inside a development environment but should not receive broad permissions on your actual machine.

## The Important Catch: Your Workspace

The default workspace mode is a direct, read-write mount. That means the agent can edit the project files in your working directory, and those changes appear on the host immediately. The microVM protects the rest of the machine, but it does not protect the mounted project from unwanted edits.

Docker also offers a safer Git-oriented clone mode:

```bash
sbx run --clone claude
```

In clone mode, the agent works in a private clone inside the sandbox while the host repository is mounted read-only. Changes stay isolated until you intentionally fetch or push them. For unattended work on an important repository, clone mode is the option I would examine first.

## Persistent Until You Remove It

The word “sandbox” can suggest a temporary environment that disappears as soon as the agent stops. Docker Sandboxes does not work that way by default.

Installed packages, Docker images, containers, agent state, and other VM files remain available across stops and restarts. That persistence is convenient for longer tasks because the agent does not rebuild its environment every time. It also means disk use can grow as you create images and install dependencies.

The environment is deleted when you explicitly remove it with `sbx rm`. Workspace files on the host remain, and in direct mode any edits the agent already made remain too.

## Docker Sandboxes vs. Other Options

| Approach | Main boundary | Host Docker access | Best fit |
|---|---|---|---|
| Docker Sandboxes | Dedicated microVM | Separate in-VM daemon | Autonomous coding agents that need Docker |
| Regular container | Shared host kernel | None unless exposed | Packaging trusted tools and lightweight tasks |
| Container with host socket | Shared host kernel | Broad host-daemon access | Trusted automation only |
| Full cloud VM | Separate virtual machine | Configurable | Remote or multi-user workloads needing stronger infrastructure controls |
| Direct host execution | None | Whatever the user has | Closely supervised work in a disposable machine |

Docker Sandboxes sits between a basic development container and a manually managed VM. Its main advantage is that the agent receives a useful development environment and private Docker daemon without exposing the host daemon.

![Chart comparing isolation boundaries across AI code execution approaches](/ai-pickle/images/blog/docker-sandboxes-ai-agents-explained/inline-2.jpg)

## What It Costs

The `sbx` CLI is currently free for personal, professional, and commercial use. Docker says there is no per-seat fee for the core sandbox tool. A free Docker account is required to sign in.

The paid component is organization governance: centrally managed network and filesystem policies, sign-in enforcement, monitoring, and audit logs. Teams that need enforceable company-wide controls should evaluate that subscription separately.

Because pricing and product packaging can change, verify the [current Docker FAQ](https://docs.docker.com/ai/sandboxes/faq/) before making a procurement decision.

## Practical Limitations

Docker Sandboxes removes several dangerous forms of host access, but it does not remove the need for judgment.

- **Direct mode can still alter your project.** Use version control, keep backups, or choose clone mode for less trusted tasks.
- **The microVM uses more resources than a basic container.** Each sandbox maintains its own VM, Docker daemon, images, and package installations.
- **Network policy can break tools.** Raw protocols are blocked, and HTTP or HTTPS destinations must fit the active allow rules.
- **Persistence needs cleanup.** Old sandboxes can accumulate disk usage until they are removed.
- **Isolation is not proof of correct output.** A safe environment prevents some damage; it does not make generated code accurate, secure, or maintainable.

AI Pickle has not completed a controlled hands-on benchmark of Docker Sandboxes yet, so this article does not claim measured startup times or resource use. Those numbers would depend heavily on the machine, project, images, and agent involved.

## Who Should Consider It?

Docker Sandboxes is most relevant if you let coding agents execute multi-step tasks with minimal supervision, especially when they need to install dependencies or run Docker themselves. It is less important if you only ask an AI assistant for suggestions and manually review every command before execution.

For an individual developer, the strongest pitch is straightforward: give an agent room to work without giving it your entire computer. For a team, the harder question is whether local policies are enough or whether centralized governance and auditability justify the paid layer.

## Bottom Line

Docker Sandboxes is not merely a renamed container. Its dedicated microVM and private Docker Engine create a meaningful boundary between an autonomous coding agent and the host system.

The most important detail is also the easiest to miss: the default workspace is still writable. Use direct mode when immediate edits are convenient and the repository is well protected. Use clone mode when you want the agent’s changes separated until review. That choice matters at least as much as the sandbox label itself.

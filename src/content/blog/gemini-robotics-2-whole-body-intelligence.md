---
title: "Gemini Robotics 2: Whole-Body AI, Explained"
description: "Google DeepMind's three-model robotics update adds whole-body control, longer task planning, and faster adaptation. Here's what is proven so far."
pubDate: 2026-08-10
category: "AI News & Analysis"
tags: ["Gemini Robotics","Google DeepMind","AI Robotics","Whole Body Control","AI News"]
sourceUrl: "https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/"
heroImage: "/images/blog/gemini-robotics-2-whole-body-intelligence/hero.jpg"
heroImageAlt: "A humanoid robot using coordinated whole-body movement"
draft: false
---

Google DeepMind describes Gemini Robotics 2 as an intelligence layer for robots that can coordinate movement from feet to fingertips. The headline is easy to overread: this is not one all-purpose model that replaces every part of a robot's software, and it is not a consumer product ready to install on any machine.

The announcement is a three-model system. One model handles physical action, another handles high-level reasoning, and a smaller version is designed to run locally on robot hardware. That distinction matters when judging what Google has actually demonstrated.

![Humanoid robot bending and reaching to move an object, illustrating whole body coordination](/ai-pickle/images/blog/gemini-robotics-2-whole-body-intelligence/inline-1.jpg)

## The three models Google announced

| Model | Main job | Availability |
|---|---|---|
| Gemini Robotics 2 | Vision-language-action model that converts visual and language input into motor control, including full humanoid movement | Early-access partners |
| Gemini Robotics ER 2 | Embodied reasoning model for communication, physical-world understanding, and multi-step task planning | Google AI Studio and private preview on Gemini Enterprise Agent Platform |
| Gemini Robotics On-Device 2 | Efficient action model designed to run locally without depending on a constant network connection | Early-access partners |

Gemini Robotics ER 2 acts as the higher-level planner. It interprets the request, reasons about the room, breaks the job into steps, communicates with people, and tracks progress. The vision-language-action model turns that plan into movement. In other words, DeepMind is connecting specialized models more tightly rather than claiming that one network does everything.

## What whole-body control means

Earlier Gemini robotics work focused heavily on upper-body and tabletop tasks. Gemini Robotics 2 expands control to walking, bending, balancing, reaching, and manipulating an object as part of one continuous task.

DeepMind's example asks an Apptronik Apollo 2 humanoid to put a watering can into a bin on a lower shelf. The robot walks to the object, picks it up, moves to the shelf, crouches, and places it in the requested location. Coordinating those actions is harder than controlling a stationary arm because each movement changes the robot's balance and the position of every other joint.

The company also says the same model checkpoint controlled three different setups: Apollo 2 robots with two types of hands and a Franka Duo with a standard gripper. That is evidence of multi-body generalization inside DeepMind's test environment, but it does not yet prove plug-and-play compatibility with commercial robot fleets.

## What DeepMind's own numbers show

DeepMind published task success rates instead of relying only on demo footage. On an Apollo robot with Inspire hands, the reported success rates were 68.4% for picking an object up from a table, 45.7% from the floor, and 76.3% from a shelf.

Results for a five-fingered SharpaWave hand varied much more:

- unscrewing a bulb: 92%;
- tying a trash bag: 44%;
- sealing a ziplock bag: 40%;
- screwing in a bulb: 36%;
- using a dustpan: 32%.

The Franka Duo gripper performed better on its tested categories, ranging from 74.2% for general pick-and-place to 89.6% for precise insertion tasks.

These are DeepMind's internal results, not independent testing. They still reveal an important limitation: whole-body and conventional gripper tasks can work reasonably often in the tested setup, while fine multi-finger manipulation remains inconsistent.

![Diagram comparing single-arm robot manipulation to whole body robot movement](/ai-pickle/images/blog/gemini-robotics-2-whole-body-intelligence/inline-2.jpg)

## Longer tasks and robot teamwork

Gemini Robotics ER 2 is designed to manage task sequences lasting several minutes and involving hundreds of decisions. DeepMind says it can recognize when a step fails, revise the plan, and keep track of when important events begin and end.

The update also introduces multi-robot collaboration. Different robots can divide a larger workflow and communicate through the reasoning layer. This is promising for warehouses or industrial environments, but the announcement does not provide enough independent evidence to judge how reliably that coordination works under real production pressure.

## Why the on-device model matters

Robots cannot always wait for a cloud response. Network delay, poor connectivity, and privacy requirements can make local inference essential. Gemini Robotics On-Device 2 is optimized for this situation.

DeepMind says it can adapt the model to a new two-arm robot body with a few hours of data, typically using fewer than 200 examples. If partners can reproduce that result, it could reduce the amount of custom training required for each hardware platform. For now, it remains a vendor-reported early-access capability rather than a generally available setup process.

## What is still unproven

Several questions remain before this becomes a product buyers can evaluate normally:

- **Independent reliability:** The published results come from DeepMind's own environments and hardware partners.
- **Movement speed:** DeepMind explicitly says the robots still need to improve their movement speed.
- **Fine hand control:** Several multi-finger tasks succeeded less than half the time.
- **Integration effort:** Fast adaptation does not necessarily mean existing industrial hardware works without calibration and engineering.
- **Safety in messy environments:** DeepMind published safety work and says the reasoning model can trigger a safe stop, but real deployments will still require hardware safeguards and extensive validation.

AI Pickle has not tested Gemini Robotics 2 hardware. This article evaluates DeepMind's announcement, published results, and availability details rather than presenting the demos as an independent hands-on review.

## Who should care now

Robotics developers and companies planning future automation should watch the early-access program and the ER 2 model in AI Studio. The most significant development is not that a humanoid completed one chore; it is that Google is combining task reasoning, full-body action, local inference, and multi-robot coordination under one Gemini robotics platform.

For a company buying robots today, this is still a research and partner-platform announcement. It is a signal to monitor, not a reason to replace deployed equipment immediately.

## FAQ

**Can anyone use Gemini Robotics 2?**

The ER 2 reasoning model is available through Google AI Studio, with another private preview for enterprise users. The physical-action and on-device models are limited to early-access partners.

**Is it one model controlling everything?**

No. DeepMind announced three connected models with different roles: physical action, high-level embodied reasoning, and efficient on-device action.

**Does it work on every robot?**

DeepMind demonstrated one checkpoint across several robot setups and says the on-device model can adapt to new bodies quickly. That is not the same as universal compatibility with existing commercial hardware.

**Are humanoid robots now ready for everyday work?**

Not yet. The published success rates vary widely, fine hand tasks remain difficult, and the company says movement speed still needs improvement.

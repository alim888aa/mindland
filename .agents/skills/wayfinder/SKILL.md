---
name: wayfinder
description: Guide a large or uncertain Mindland effort by turning unclear product questions into decisions, ADRs, phase plans, and local task files. Use when work spans several tasks, needs user interviews, or has an unclear route to a defined outcome.
---

# Wayfinder

Treat Wayfinder as the project map for work whose route is still unclear. Use local project files. Do not require GitHub Issues or another external tracker.

## Load the map

Read `context.md`, `standards.md`, the current `docs/phases/<phase>/README.md`, its task files, and related files in `docs/adr/`.

Use the current phase README as the map. It should show the destination, boundaries, finish line, progress, open questions, and links to its tasks.

## Clear uncertainty

Interview the user conversationally. During V1 planning, ask five related questions at a time unless the user requests a different amount. Explain unfamiliar choices simply.

Ask before settling product, visual, or architectural decisions. Record lasting choices and their reasoning in `docs/adr/`. Keep uncertain choices clearly marked as open questions until the user decides.

Create a task file only when the work is clear enough to describe its outcome and completion check. Leave vague future work in the phase README’s open-questions section until it becomes clear.

## Work through the phase

Choose an unblocked task from the current phase. Set its status to `in-progress` and record its owner before work starts.

Use subagents for small, isolated jobs when helpful. Give each subagent one task file and clear file ownership. The primary agent reviews, integrates, and verifies all delegated work.

When a task is complete, keep its file. Record the result, verification evidence, and commit when available. Mark it `completed`, update phase progress, and update the current status in `context.md`.

When work reveals a durable decision, create or update an ADR. When it reveals a new task, add it to the phase. When it reveals distant or unclear work, add it to open questions instead of guessing its shape.

## Finish the map

The phase finishes when its stated finish line is demonstrably satisfied and every required task is completed or consciously moved out of the phase with the user’s approval.

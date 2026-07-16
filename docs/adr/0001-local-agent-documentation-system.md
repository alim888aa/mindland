# ADR 0001: Local agent documentation system

Status: accepted

Date: 2026-07-16

## Context

The user expects agents to manage planning, documentation, delegation, and Git because they do not want to maintain those systems manually. The work also needs to survive across agent sessions without depending on a hosted issue tracker.

## Decision

Use `context.md` for the product mission and current status, `standards.md` for approved build standards, phase READMEs for scoped milestones, phase task files as the local issue-ticket system, and `docs/adr/` for lasting decisions and their reasoning.

Keep completed task files as history. Update `context.md` after each completed task. Require user approval before changing `standards.md`.

## Reason

This keeps the project understandable from the repository alone and lets agents maintain progress without asking the user to manage GitHub Issues or another external system.

## Consequences

Agents must keep these files current as part of completing work. GitHub Issues may be added later if collaboration needs change, but they are not required by the workflow.

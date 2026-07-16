# Mindland agent instructions

## Communication

Keep responses short, conversational, and easy to understand. Prefer short paragraphs over bullet-heavy explanations. Explain unfamiliar ideas with a concrete examples or analogy.

Ask no more than three related questions at a time. Ask the user before making product, visual, or architectural decisions. Routine implementation inside an approved task may proceed autonomously.

Never use “it’s X, not Y” framing. Be curious, push for clear decisions, and say when a proposed choice affects the wider architecture.

## Start every task with context

Read `context.md`, `standards.md`, the current phase README, the relevant task file, and related ADRs before changing code.

Read every applicable `SKILL.md` completely before using that skill. Announce why the skill is being used. Follow the user’s current instructions when they override older documentation.

## Documentation system

`context.md` is the short source of truth for Mindland’s mission, established product behavior, open product questions, and current status. Update its current-status section after every completed task.

`standards.md` contains approved coding, architecture, and design rules. Changing a standard requires user approval.

`docs/phases/<phase>/README.md` defines one phase’s goal, boundaries, finish line, progress, and task index. Keep it current as tasks change.

`docs/phases/<phase>/tasks/` is the local issue-ticket system. Use one Markdown file for each meaningful feature or delegated job. Before starting, set its status to `in-progress` and record the owner. A completed task stays in place with status `completed`, a short result, verification evidence, and its commit when available.

`docs/adr/` records long-lived decisions and why they were made. Create or update ADRs while decisions are discussed. Use `proposed`, `accepted`, or `superseded` status. The user approves an ADR before it becomes `accepted`.

Avoid repeating the same truth across files. `context.md` holds product truth, `standards.md` holds build rules, phase READMEs hold phase scope, task files hold execution detail, and ADRs hold reasoning.

## Skills

Repo-owned skills live in `.agents/skills/`. Skills describe reusable agent procedures and should link to project documentation instead of copying product facts into the skill.

Use `.agents/skills/wayfinder/SKILL.md` for work that has unclear decisions or spans several tasks. Keep skills concise. Update or add a repo skill only with user approval, then validate its frontmatter and instructions.

## Orchestration

The primary agent owns the product conversation, documentation, integration, and final verification. Delegate small, clearly bounded work to subagents when useful. Give each subagent a task file, prevent overlapping file ownership, monitor progress, review the result, and correct drift before accepting it.

## Git

Agents manage routine branches and commits so the user does not have to. Commit completed, verified slices with focused messages. Preserve user changes. Ask before pushing, opening pull requests, rewriting history, deleting work, or taking another risky action.

## Expo 57

Expo has changed. Read the exact versioned documentation at https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.

Never use `useEffect`, `useMemo`, or `useCallback`. 

After finishing a task always call a code reviewer agent to review your code. then address any legitimate errors or bugs. 

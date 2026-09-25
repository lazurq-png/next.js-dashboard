# `docs/ai/` — durable task state

Agent work that spans many files, sessions or an unattended night keeps its state
here, one directory per branch: `docs/ai/<branch>/`. It is committed on the
branch it describes, so the reasoning stays attached to the diff it explains.

| File | Written by | Holds |
| ---- | ---------- | ----- |
| `plan.md` | **a human** | The goal and the tasks. An agent never creates, edits or ticks it off. |
| `progress.md` | the agent | What happened, as it happens: per task, the base SHA, what the code does, why it was added, and the verification actually run. An unattended run's morning report goes at the top. |
| `decisions.md` | the agent | Non-obvious choices, numbered `D1`, `D2`, …, each with its reason, including acceptance criteria derived for an underspecified task. |
| `questions.md` | the agent | What needed a human: the question, the options and their consequences, the recommendation, and what was done meanwhile. |

## Unattended runs

`.claude/skills/night-run/SKILL.md` reads `docs/ai/night-<YYYY-MM-DD>/plan.md`,
where the date is the night the run starts. The run has no goal of its own: it
works toward the plan's `## Goal` and nothing else, and it **stops without doing
anything** if the plan, its goal or its tasks are missing.

Write the plan before starting the run:

```markdown
# Night run <YYYY-MM-DD>

## Goal

<One short paragraph: the outcome you want by morning, in terms you could
check. This is what the run judges every task, fork and its own success
against.>

## Tasks

1. <task> — <what "done" looks like, if it is not obvious>
2. <task>
```

- **The goal is the objective; the tasks are your route to it.** Work the goal
  needs but no task names is not built. It comes back as a proposed task in the
  morning report.
- **Lifting a rule** of the protocol for one task must be written explicitly,
  naming the rule and the task. No plan lifts the push rules or the database
  rule.
- The plan can stay uncommitted. The run's first task commits it exactly as you
  left it.

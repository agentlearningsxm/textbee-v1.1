---
type: project-log-index
project: my_textbee
date: 2026-07-04
created_at: 2026-07-04T10:11:29+02:00
status: active
tags: [logs, project-history, convention]
---

# logs/ - daily work log for my_textbee

This is the project history for `my_textbee`. Use it to understand what changed, when it changed, what passed, what failed, and what still needs work.

## Folder Structure

```text
logs/
  README.md
  YYYY-MM/
    README.md
    YYYY-MM-DD/
      README.md
      YYYY-MM-DD-short-title.md
```

Example:

```text
logs/
  2026-07/
    2026-07-04/
      2026-07-04-v280-merge-review-fixes.md
```

## Rules

- One folder per month: `YYYY-MM`.
- One folder per day inside the month: `YYYY-MM-DD`.
- One or more titled Markdown files inside each day folder.
- Each log file needs YAML frontmatter.
- Filename should explain what happened, not just say `session`.
- Do not rewrite old logs as history changes. Add a new log for the new work.
- Generated machine logs stay out of Git; Markdown project logs are intentional records.
- For long or interrupted work, add a `continue-prompt-<topic>.md` file inside that day's folder so another AI can resume without guessing.
- After any failure, update the current log before the next fix attempt with: command, exact error, research done, chosen fix, and next verification command.

## What A Log Must Include

- Goal
- Outcome
- What was done
- What worked
- What failed or is deferred
- Suggestions and insights
- Next steps
- Files touched
- Verification commands
- Continuation prompt path, when work is not finished

## Index

- [2026-07](./2026-07/) - TextBee v2.8.0 merge, reviewer fixes, Android build verification.

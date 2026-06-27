# Evergreen Report Template

Keep comments short and evidence-backed.

Use this shape:

```markdown
### Evergreen status

| Gate | State | Evidence |
| --- | --- | --- |
| Test & Lint | passing | current head SHA |

**Result:** ready | blocked | human-needed | exhausted | continuing

Next action: one sentence.
```

Include at most three workflow run links. Do not paste long logs; summarize the failure signature and link to the run.

# Claude Code Workflows — Cost & Context Management

## When to Use Fast Mode

Toggle with `/fast` — same model (Opus 4.6), faster output, lower cost.

**Use fast mode for:**
- Visual/styling tweaks (spacing, colors, layout)
- Iterative refinements ("make it bolder", "adjust padding")
- Quick fixes to obvious bugs
- Documentation updates
- Multiple similar changes

**Use regular mode for:**
- Complex logic or algorithms
- Debugging mysterious issues
- Architecture decisions
- First time implementing a feature

## Session Break Strategy

**Break sessions after:**
- 3-5 commits in a row
- Completing a feature
- Before switching to a different area of the codebase
- When you notice output getting verbose

**Why?** Each message adds to context. Long sessions accumulate overhead. Fresh sessions = clean slate = lower cost.

**How?** Just exit Claude and come back. Your work is committed, you can always reference it.

## Starting a New Session

### Quick Context Setup (< 30s)

Start with the knowledge base:
```bash
cat docs/project-context.md
```

Then scan the relevant area:
```bash
# For UI work
cat docs/ui-patterns.md
ls -la src/components/

# For model work
cat docs/model-context.md
cat src/domain/intent-model/README.md
```

### What NOT to Load

- Don't read entire files upfront "just in case"
- Don't dump full git history
- Don't scan all of `docs/` or `src/`
- Only read what's directly relevant to the current task

## Cost Red Flags

If you see these patterns, stop and reset:

- **Same fix attempted 3+ times** → step away, fresh session
- **Output > 2000 tokens per response** → too verbose, be more direct
- **Reading files you already read** → context already loaded, you're duplicating
- **"Let me also check..."** → scope creep, finish current task first

## General Rules

1. **Commit early, commit often** — smaller chunks = easier to exit and resume
2. **Test yourself first** — dev server is on :4444, make a change and verify locally
3. **Be specific** — "Fix card overlap" not "Can you improve the cards?"
4. **One thing at a time** — resist the urge to also refactor/improve/optimize

---

*Estimated savings: 60-80% reduction in cost for typical iterative work*

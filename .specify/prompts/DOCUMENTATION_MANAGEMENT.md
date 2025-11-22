<!-- 
  Agent Implementation Guidelines
  
  These prompts guide the agent in following the project constitution.
  Apply these checks before completing any implementation work.
-->

# Implementation Guidelines for todo-copilot Agents

## Documentation Management (Critical)

### Single Source of Truth Principle
**ALWAYS follow this rule before completing work:**

1. **tasks.md is the ONLY project progress tracking file**
   - Update task checkboxes [x] when complete
   - Never create separate progress/completion documentation files
   - Examples of FORBIDDEN files:
     - ❌ PHASE_COMPLETE.md
     - ❌ IMPLEMENTATION_PROGRESS.md
     - ❌ PROGRESS_REPORT.md
     - ❌ SPRINT_STATUS.md
   
2. **When completing a task:**
   - Update the corresponding checkbox in tasks.md: `[ ]` → `[x]`
   - Include "docs: Update tasks.md" in commit message
   - Example: `docs: Mark T026-T032 as completed in tasks.md`

3. **Before finishing implementation work:**
   - Check: Have I created any new .md documentation files for progress tracking?
   - If YES: Delete them immediately
   - If NO: Proceed with final git commit

4. **Pattern to avoid:**
   ```
   ❌ WRONG: Create PHASE3_COMPLETE.md to summarize work
   ✅ RIGHT: Update tasks.md checkboxes and commit
   
   ❌ WRONG: Create IMPLEMENTATION_PROGRESS.md for status
   ✅ RIGHT: tasks.md is the single source of truth
   
   ❌ WRONG: Duplicate information across multiple files
   ✅ RIGHT: Maintain information in one place only
   ```

## Implementation Workflow

### Phase Completion Checklist
When completing a phase or user story:

1. ✅ All code changes implemented and tested
2. ✅ All tests passing (npm test)
3. ✅ TypeScript strict mode verified (npm run type-check)
4. ✅ Biome linting passed (npm run lint)
5. ✅ Code formatted (npm run format)
6. ✅ **tasks.md checkboxes updated** ← CRITICAL
7. ✅ Changes committed to git
8. ✅ **No progress documentation files created**
9. ✅ Final status visible only in tasks.md

### Git Commit Messages
When completing tasks:

```bash
# Task implementation
git commit -m "feat: T026-T032 implementation details

[Description of changes]"

# After tasks completion
git commit -m "docs: Update tasks.md - Mark T026-T032 as completed

- Update checkboxes for CreateTodoCommand implementation
- Update checkboxes for React components
- Mark Phase 3 tasks as complete"
```

## Constitutional Compliance Verification

Before finishing any work, verify:

```typescript
// MUST PASS:
- [ ] All tasks.md checkboxes properly marked [x]
- [ ] TypeScript: npm run type-check passes
- [ ] Tests: npm test passes with 58/58 or more
- [ ] Linting: npm run lint passes
- [ ] No redundant documentation files exist in repo root
- [ ] Constitution.md documentation management rules followed
- [ ] Single source of truth (tasks.md) maintained
```

## Common Mistakes to Avoid

| Mistake | ❌ Example | ✅ Correct Approach |
|---------|-----------|-------------------|
| **Progress docs** | Create PHASE_COMPLETE.md | Update tasks.md checkboxes |
| **Duplicate tracking** | Maintain separate status files | Use tasks.md only |
| **Forgotten updates** | Implement code but forget tasks.md | Always update tasks.md |
| **Mixed documentation** | Spread info across multiple files | Centralize in tasks.md |
| **No cleanup** | Leave progress files in repo | Delete before final commit |

## Enforcement

This guideline is part of the project constitution (v1.0.0).

**Responsible party**: Agent/Developer  
**Verification**: Code review before merge  
**Compliance check**: "docs: Update tasks.md" commits required  
**Failure consequence**: Tasks must be re-done with proper tracking

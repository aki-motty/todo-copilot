# .specify Directory - Project Constitution & Guidelines

This directory contains project-wide standards and guidelines that must be followed by all developers and agents.

## Files

### `/memory/constitution.md`
**The definitive project constitution (v1.0.0)**

Contains:
- ✅ Core principles (8 core architectural principles)
- ✅ Technical constraints (tech stack, code quality, performance)
- ✅ Development workflow (feature cycle, code review, deployment)
- ✅ **Governance including documentation management rules**

**Key Rule**: `tasks.md` is the ONLY project progress tracking file. No separate progress documentation files should be created.

### `/prompts/DOCUMENTATION_MANAGEMENT.md`
**Agent/Developer implementation guidelines**

Contains:
- 📋 Single source of truth principle
- ✅ Implementation workflow checklist
- ✅ Git commit message conventions
- ✅ Common mistakes to avoid
- ✅ Enforcement expectations

**When to use**: Before completing any phase, task, or feature work

### `/scripts/`
**Automated scripts for project setup and verification**

Contains scripts for:
- Project setup validation
- Constitution compliance checks
- Build and test automation

## Usage

### For Developers/Agents
1. Read `/memory/constitution.md` for project principles
2. Refer to `/prompts/DOCUMENTATION_MANAGEMENT.md` before completing work
3. Always update `tasks.md` checkboxes when tasks are complete
4. Never create separate progress tracking .md files
5. Use `/scripts/` for automated verification

### For Project Leads
- Update `constitution.md` for major policy changes (requires team consensus)
- Review and update prompts if workflow changes
- Use scripts for compliance audits

## Critical Rule (Documentation Management)

**tasks.md is the single source of truth for project progress.**

- ✅ Use tasks.md for tracking all task completion
- ✅ Update checkboxes: `[ ]` → `[x]`
- ❌ Do NOT create PHASE_COMPLETE.md, IMPLEMENTATION_PROGRESS.md, etc.
- ❌ Do NOT duplicate progress information across multiple files

Rationale: Single source of truth prevents confusion, reduces maintenance cost, and ensures information consistency.

## Recent Updates

### v1.0.0 (2025-11-22)
- Added documentation management principle to constitution
- Created DOCUMENTATION_MANAGEMENT.md for agent guidance
- Established tasks.md as single source of truth
- Prohibited redundant progress documentation files

---

**Last Updated**: 2025-11-22  
**Maintained by**: Project Team  
**Questions**: Refer to constitution.md governance section

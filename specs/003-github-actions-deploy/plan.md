# Implementation Plan: GitHub Actions AWS Deployment Automation

**Branch**: `003-github-actions-deploy` | **Date**: 2025-11-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-github-actions-deploy/spec.md`

**Note**: This plan is filled in by the `/speckit.plan` command following clarification phase completion (5/5 questions resolved).

## Summary

**Primary Requirement**: GitHub Actions ワークフロー (terraform-ci.yml) の修正・最適化により、AWS への自動デプロイパイプラインを確立。

**Current State Issues**:
1. `develop` ブランチ参照 (存在しない)
2. AWS OIDC プロバイダー未設定
3. GitHub Environment 定義欠落
4. Manual Approval 機構の脆弱性

**Technical Approach**:
- **GitHub Environment Protection Rules**: UI ベース承認で staging/prod を制御
- **AWS OIDC**: 短期トークン認証で Secret 管理を最小化
- **PR ラベル**: deploy-staging / deploy-prod ラベルでトリガー制御
- **段階別タイムアウト**: validate (5分) / test (10分) / deploy (15分) で効率化

**Scope**: GitHub Actions ワークフロー修正、AWS OIDC セットアップガイド統合。Lambda ハンドラー実装は別フィーチャー。

**Success Metrics**: 
- ワークフロー実行時間 15 分以内
- テスト 338/338 PASS (0 FAIL)
- OIDC 認証成功率 100%
- セキュリティ警告 0 件 (CRITICAL/HIGH)

## Technical Context

**Language/Version**: YAML (GitHub Actions) + Bash + HCL (Terraform 1.5+)  
**Primary Dependencies**: GitHub Actions, AWS IAM OIDC, Terraform AWS Provider 5.0+  
**Storage**: Terraform State (S3 + DynamoDB Lock) - already implemented (feature 002)  
**Testing**: Terraform validate, TFLint, Checkov, Jest (338 tests), Playwright E2E  
**Target Platform**: GitHub Actions Runners (ubuntu-latest) → AWS ap-northeast-1  
**Project Type**: Infrastructure CI/CD (no source code)  
**Performance Goals**: Pipeline completion < 15 minutes (validate < 5min, test < 10min, deploy < 15min)  
**Constraints**: AWS account permissions (admin required), GitHub org admin rights, OIDC setup time (~5 min)  
**Scale/Scope**: 3 environments (dev/staging/prod), 7 jobs, 68+ tasks  

**Clarifications Resolved** (Session 2025-11-22):
- ✅ Approval mechanism: GitHub Environment Protection Rules (UI-based)
- ✅ Secrets scope: Minimal (AWS_ROLE_*, TF_STATE_BUCKET, TF_LOCK_TABLE only)
- ✅ Deploy trigger: PR labels (deploy-staging, deploy-prod)
- ✅ Timeout strategy: Stage-specific (5/10/10/15 min)
- ✅ Lambda scope: Separate feature (003 = pipeline only)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **No violations detected**

**Architectural Principles**:
- **Immutability**: Terraform state locked (DynamoDB), no manual changes
- **Separation of Concerns**: GitHub Actions (orchestration) ← Terraform (IaC) ← AWS (infrastructure)
- **Security**: OIDC-based auth (no long-lived credentials), minimal secrets, audit logs
- **Scalability**: 3 environments, stage-specific timeouts, parallel job execution where possible
- **Testability**: Validation, testing, security-scan jobs before any deployment
- **Compliance**: GitHub Environment Protection Rules for approval workflows, audit trail

**Constitution Alignment** (from `.specify/memory/constitution.md`):
- ✅ Separate concerns (GitHub/Terraform/AWS layers)
- ✅ No circular dependencies
- ✅ Immutable infrastructure state
- ✅ Security-first (OIDC, minimal secrets)
- ✅ Auditability (GitHub Issue/Action logs)

**GATE RESULT**: ✅ **PASS** - Ready for Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-github-actions-deploy/
├── spec.md                      # Feature specification ✅
├── plan.md                      # This file (implementation plan) ✅
├── research.md                  # Phase 0: Research findings (TBD)
├── data-model.md                # Phase 1: Data model / entities (TBD)
├── quickstart.md                # Phase 1: Quick-start guide (TBD)
├── contracts/                   # Phase 1: API contracts (TBD)
│   └── workflow-spec.md         # GitHub Actions workflow definition
├── checklists/
│   └── requirements.md          # Quality checklist ✅
└── tasks.md                     # Phase 2: Task breakdown (TBD)
```

### Source Code (repository root)

```text
.github/
├── workflows/
│   ├── terraform-ci.yml         # PRIMARY FILE (修正対象)
│   └── (existing workflows preserved)
├── agents/
│   └── copilot-instructions.md  # Agent context ✅ (updated)
└── prompts/
    └── speckit.plan.prompt.md   # This command reference

infrastructure/
├── docs/
│   ├── GITHUB_ACTIONS_SETUP.md  # Phase 0: OIDC setup guide ✅
│   ├── ENVIRONMENTS.md          # Environment config
│   ├── QUICKSTART_DEPLOYMENT.md # Deployment guide ✅
│   └── (7 other docs)
├── terraform/
│   ├── main.tf                  # Root orchestration
│   ├── variables.tf             # Root variables
│   ├── environments/
│   │   ├── dev.tfvars           # Dev config ✅
│   │   ├── staging.tfvars       # Staging config ✅
│   │   └── prod.tfvars          # Prod config ✅
│   └── modules/
│       ├── iam/                 # Lambda execution role ✅
│       ├── compute/             # Lambda + API Gateway ✅
│       ├── data/                # DynamoDB ✅
│       └── backend/             # S3 + DynamoDB Lock ✅
└── scripts/
    ├── init.sh                  # Terraform init script ✅
    ├── validate.sh              # Validation script ✅
    ├── plan.sh                  # Plan script ✅
    └── apply.sh                 # Apply script ✅

tests/
├── integration/
│   ├── terraform-modules.spec.ts    # Terraform tests ✅
│   └── aws-integration.spec.ts      # AWS integration tests ✅
└── e2e/
    └── aws-deployment.spec.ts       # E2E deployment tests ✅
```

**Structure Decision**: GitHub Actions workflow + Terraform modules (existing structure from feature 002). No new source directories needed. Focus on `.github/workflows/terraform-ci.yml` modifications and documentation updates.

## Complexity Tracking

> **No violations to justify** - Architecture clean and straightforward

| Aspect | Justification | Alternative Rejected |
|--------|---------------|---------------------|
| GitHub Environment Protection Rules | Explicit approval UI, audit trail, aligned with GitHub's direction | Manual approval actions (deprecated path) |
| PR label-based deploy trigger | Clear intent in UI, flexible control, easy to audit | Commit message pattern (less discoverable) |
| Stage-specific timeouts | Early failure detection, resource efficiency | Global timeout (wastes resources on partial failures) |
| Minimal secrets (4 only) | Reduced rotation burden, lower attack surface | Environment-specific vars as secrets (over-complicates) |
| Separate Lambda feature | Focused scope, independent testability, clear responsibility | Bundled handler (scope creep, mixed concerns) |

**Outcome**: ✅ **No complexity violations** - Clean architecture, security-first design

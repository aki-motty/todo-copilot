# Implementation Plan: AWS Terraform デプロイ準備

**Branch**: `002-aws-terraform-deploy` | **Date**: 2025-11-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-aws-terraform-deploy/spec.md`

## Summary

Todo アプリケーションをAWS上にサーバーレスアーキテクチャ（Lambda、API Gateway、DynamoDB）でデプロイするためのTerraform インフラストラクチャ準備。単一のAWSアカウント内で3つの環境（dev/staging/prod）を分離管理し、S3+DynamoDBを使用した状態管理とCloudWatchによる監視を備える。

## Technical Context

**Language/Version**: HashiCorp Configuration Language (HCL) 2.0 / Terraform CLI 1.6+  
**Primary Dependencies**: AWS Provider, Terraform AWS modules, AWS CLI v2  
**Storage**: DynamoDB（アプリケーションデータ）、S3（Terraform状態ファイル）、CloudWatch Logs  
**Testing**: Terraform validate, terraform plan, tfplan parser for validation, Terratest for advanced scenarios  
**Target Platform**: AWS (Lambda, API Gateway, DynamoDB, S3, IAM, CloudWatch)  
**Project Type**: Infrastructure as Code (IaC) - single project with multi-environment support  
**Performance Goals**: terraform plan < 5秒、デプロイ時間 < 10分（環境ごと）、API レスポンス P99 < 500ms  
**Constraints**: 本番環境へのdestroy操作保護、状態ロック100%確保、開発者認証はIAMロールベース  
**Scale/Scope**: 3環境（dev/staging/prod）、Lambda関数（〜100個可能）、DynamoDBテーブル（〜50個可能）、単一リージョン初期版

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **I. テスト駆動開発（TDD）**  
- 適用性: 該当。すべてのTerraform設定はterraform validate、terraform planで先行検証される。
- 準拠: terraform-compliance、tfplanparserで構成検証テストを実装予定。

✅ **II. ドメイン駆動設計（DDD）**  
- 適用性: 限定的。IaC層では直接適用されないが、アプリケーション層（Lambda関数）はDDDに従う。
- 準拠: Terraformモジュール設計ではドメイン概念（Environment、Infrastructure、ResourceGroup）を反映。

✅ **III. 関数型ドメインモデリング**  
- 適用性: 限定的。Terraformはデータフロー言語だが、不変性原則は状態ファイル管理に反映。
- 準拠: すべてのリソース定義は宣言的（不変的）。副作用は明示的に管理（lifecycle、depends_onで制御）。

✅ **IV. クリーンアーキテクチャ**  
- 適用性: 該当。IaC層とアプリケーション層の関心分離を実装。
- 準拠: terraform/modules/ でレイヤー分離。backend、networking、compute、data layerを区別。

✅ **V. CQRS アーキテクチャ**  
- 適用性: 限定的。IaC層では直接適用されないが、Lambda関数はCQRSパターンを採用。
- 準拠: API Gateway → Lambda → DynamoDB の読み取り/書き込み分離パス。

✅ **VI. インフラストラクチャ・アズ・コード（IaC）- Terraform**  
- 適用性: **完全に適用**。これが本フィーチャーの中核。
- 準拠: ✅ すべてのインフラはTerraformで定義。✅ 状態管理はS3+DynamoDBリモートバックエンド。✅ 秘密はAWS Secrets Managerで管理。

✅ **VII. サーバーレス AWS アーキテクチャ**  
- 適用性: **完全に適用**。AWS Lambda、API Gateway、DynamoDB、CloudWatchの採用を規定。
- 準拠: ✅ EC2なし。✅ すべてのコンピュートはLambda。✅ データベースはDynamoDB。✅ ロギングはCloudWatch。

✅ **VIII. Google ToDo 連携**  
- 適用性: 将来のオプション。本フェーズでは統合スコープ外。
- 準拠: Lambda関数がGoogle OAuth認証をサポートする基盤を用意。

**⚠️ 潜在的な制約**:
- 本番環境のdestroy操作に対する明示的な保護メカニズムが必要（terraform -protect-destroyed-state の実装）
- チーム規模に応じた自動デプロイゲート戦略の確立が必要

**GATE RESULT**: ✅ **PASS** - 本フィーチャーはすべてのコア憲法原則（特にVI、VII）と強く整合。潜在的な制約は実装計画で対処予定。

## Project Structure

### Documentation (this feature)

```text
specs/002-aws-terraform-deploy/
├── plan.md              # Implementation plan (this file) ✅
├── research.md          # Phase 0 research output (TODO)
├── data-model.md        # Phase 1 data model output (TODO)
├── quickstart.md        # Phase 1 quickstart guide (TODO)
├── contracts/           # Phase 1 API contracts (TODO)
│   ├── terraform-api.md
│   ├── lambda-api.md
│   └── aws-resource-spec.md
├── checklists/
│   └── requirements.md   # ✅ Spec quality checklist (completed)
└── tasks.md             # Phase 2 task list (TODO - created by /speckit.tasks)
```

### Source Code (repository root)

```text
infrastructure/
├── terraform/
│   ├── backend.tf           # S3 + DynamoDB backend configuration
│   ├── variables.tf         # Input variables for all environments
│   ├── outputs.tf           # Infrastructure outputs (Lambda ARNs, API endpoints, etc.)
│   ├── versions.tf          # Terraform and provider versions
│   ├── main.tf              # AWS provider configuration
│   │
│   ├── modules/
│   │   ├── backend/         # S3 bucket for state, DynamoDB lock table
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   │
│   │   ├── networking/      # VPC (if needed), security groups, API Gateway base
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   │
│   │   ├── compute/         # Lambda functions, IAM roles, execution environments
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   │
│   │   ├── data/            # DynamoDB tables, indexes, provisioning
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   │
│   │   └── monitoring/      # CloudWatch logs, metrics, alarms
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   │
│   ├── environments/
│   │   ├── dev.tfvars       # Development environment variables
│   │   ├── staging.tfvars   # Staging environment variables
│   │   └── prod.tfvars      # Production environment variables
│   │
│   ├── terraform.tfvars     # Common variables (fallback)
│   └── .terraform/          # (gitignored) Terraform cache
│
├── scripts/
│   ├── init.sh              # Initialize backend and workspace
│   ├── plan.sh              # Generate and display plan for review
│   ├── apply.sh             # Apply infrastructure changes
│   ├── destroy.sh           # Destroy infrastructure (with safeguards)
│   ├── validate.sh          # Validate Terraform configuration
│   └── import.sh            # Import existing AWS resources
│
└── docs/
    ├── SETUP.md             # Initial AWS account setup
    ├── ENVIRONMENTS.md      # Environment-specific configurations
    ├── BACKEND.md           # State backend management
    ├── DISASTER_RECOVERY.md # Recovery procedures
    └── TROUBLESHOOTING.md   # Common issues and fixes

src/
├── application/
│   ├── commands/
│   ├── handlers/
│   ├── queries/
│   └── services/
├── domain/
│   ├── entities/
│   ├── events/
│   ├── repositories/
│   └── value-objects/
├── infrastructure/
│   ├── config/
│   ├── persistence/
│   └── aws-integration/     # NEW: Lambda, DynamoDB, CloudWatch clients
├── presentation/
│   ├── components/
│   ├── controllers/
│   ├── hooks/
│   └── pages/
└── shared/
    └── types.ts

tests/
├── integration/
│   └── terraform-deployment.spec.ts  # NEW: Terraform output validation
├── e2e/
│   ├── create-todo.spec.ts
│   ├── display-todos.spec.ts
│   ├── toggle-completion.spec.ts
│   └── aws-integration.spec.ts       # NEW: AWS Lambda/DynamoDB integration
├── unit/
│   └── [existing structure]
└── performance/
    └── performance.spec.ts
```

**Structure Decision**: 

1. **Infrastructure-as-Code層（独立）**: `infrastructure/terraform/` で完全に分離。再利用可能なモジュール化構造。
2. **アプリケーション層**: `src/` に既存構造を維持し、新規セクション `aws-integration/` でAWS固有クライアント統合。
3. **テスト層**: 既存の unit/integration/e2e テストに加えて、Terraform検証テストとAWS統合テストを追加。
4. **スクリプト層**: `infrastructure/scripts/` に運用スクリプトを集約（初期化、デプロイ、復旧）。
5. **ドキュメント層**: `infrastructure/docs/` に詳細な運用ガイドを含める。

## Complexity Tracking

> **Constitution Check: PASSED** - No violations requiring justification. All principles align with IaC and serverless architecture goals.

---

## Phase 0: Research & Knowledge Consolidation

**Objective**: 技術的な未解決事項を明確化し、実装ベストプラクティスを確立する

### Research Tasks (実行予定)

1. **Terraform Backend Optimization** (2-3 時間)
   - 既知: S3 + DynamoDB リモートバックエンド
   - 研究対象: 状態ロック戦略、リカバリ手順、コスト最適化
   - 成果物: backend-strategy.md

2. **AWS Lambda TypeScript Runtime Best Practices** (2-3 時間)
   - 既知: Node.js Lambda ランタイム使用
   - 研究対象: コールドスタート最小化、依存関係管理、バンドリング戦略
   - 成果物: lambda-runtime-guide.md

3. **Terraform Modules Design Patterns** (3-4 時間)
   - 既知: モジュール化構造が必要
   - 研究対象: 環境別設定の管理、変数の命名規則、出力の公開範囲
   - 成果物: module-design-patterns.md

4. **Multi-Environment Terraform Strategy** (2-3 時間)
   - 既知: dev/staging/prod の3環境
   - 研究対象: Workspaces vs. tfvars の比較、環境固有化の粒度、CI/CD 統合戦略
   - 成果物: multi-env-strategy.md

5. **AWS IAM Role & Policy Strategy** (2-3 時間)
   - 既知: IAM ロールベースの認証
   - 研究対象: 最小権限原則の実装、チーム別のロール設計、Terraform管理ロール
   - 成果物: iam-strategy.md

**Estimated Total Research Time**: 11-16 時間

### Research Output
結果は `research.md` に統合。各研究トピックの decision/rationale/alternatives を記録。

---

## Phase 1: Design & Contracts

**Objective**: インフラ構成のデータモデルを定義し、API契約を確立する

### 1.1 Data Model Definition (`data-model.md`)

**Terraform State Model**:
- Resource Catalog: すべてのAWSリソース定義の中央リポジトリ
- Environment State: 各環境のリソース状態（dev/staging/prod）
- Variable Registry: 環境別変数の定義と値

**DynamoDB Application Model**:
- Todo Entity: id, title, description, completed, createdAt, updatedAt
- User Entity: userId, email, preferences, createdAt
- Indexes: GSI on userId for queries, LSI on createdAt for time-series

**Configuration Model**:
- Backend Config: S3 bucket, DynamoDB table, state lock settings
- Provider Config: AWS region, profile, assume_role settings
- Tag Strategy: Environment, Project, Owner, CostCenter tags

### 1.2 API Contracts (`contracts/`)

**`terraform-api.md`**: Terraform実行インターフェース
- Input: tfvars 変数スキーマ（environment, region, resource_prefix）
- Output: Lambda ARNs, API Gateway endpoints, DynamoDB table names
- Commands: init, plan, apply, destroy

**`lambda-api.md`**: Lambda関数署名
- HTTP API Gateway integration
- Request/Response models
- Environment variables (DB_TABLE_NAME, ENVIRONMENT, LOG_LEVEL)

**`aws-resource-spec.md`**: AWSリソース定義スペック
- Lambda functions: memory, timeout, environment variables
- API Gateway: stages, throttling, CORS
- DynamoDB: billing mode, ttl, gsi/lsi

### 1.3 Quick Start Guide (`quickstart.md`)

**セクション**:
1. 前提条件（AWS CLI、Terraform CLI インストール）
2. AWS アカウント初期設定（IAM ユーザー、ロール作成）
3. Terraform 初期化（バックエンド作成、ワークスペース設定）
4. 開発環境デプロイ（最初の apply）
5. ステージング・本番環境への昇格
6. よくあるトラブルシューティング

---

## Phase 2: Implementation & Delivery

**Objective**: Terraform コード、Lambda関数、テストの生成と統合

### 2.1 Terraform Infrastructure Code (Phase 2)

**ディレクトリ構造（実装予定）**:
- `infrastructure/terraform/modules/backend/`: リモート状態管理
- `infrastructure/terraform/modules/compute/`: Lambda関数、IAMロール
- `infrastructure/terraform/modules/data/`: DynamoDBテーブル、インデックス
- `infrastructure/terraform/modules/monitoring/`: CloudWatch ログ・メトリクス・アラーム
- `infrastructure/terraform/environments/`: dev.tfvars, staging.tfvars, prod.tfvars

**主要な実装タスク** (詳細は `tasks.md`):
- [ ] Terraform modules の実装（各module 2-3 時間）
- [ ] 環境別設定ファイル作成（1-2 時間）
- [ ] Lambda関数ハンドラの実装（TypeScript、3-5 時間）
- [ ] CloudWatch ログ・メトリクス統合（1-2 時間）
- [ ] 統合テスト実装（terraform plan 検証、2-3 時間）

### 2.2 Lambda Functions (TypeScript)

**実装予定**:
- `src/infrastructure/aws-integration/lambda-client.ts`: Lambda invoke ユーティリティ
- `src/infrastructure/aws-integration/dynamodb-client.ts`: DynamoDB操作ラッパー
- `src/infrastructure/aws-integration/cloudwatch-client.ts`: CloudWatch Logs出力

### 2.3 Testing Strategy

**Terraform Tests**:
- `terraform validate`: 構文チェック
- `terraform plan`: 変更検証（プラン出力の解析）
- terraform-compliance: ポリシーベースの検証

**Application Tests**:
- Unit tests: AWS SDK モック
- Integration tests: LocalStack を使用したローカルAWS環境
- E2E tests: AWS へのデプロイ後の実装テスト

---

## Success Metrics (Phase 完了時の確認項目)

- [ ] Phase 0: `research.md` 完成（すべての研究トピック記録）
- [ ] Phase 1: `data-model.md`, `contracts/*`, `quickstart.md` 完成
- [ ] Phase 1: Agent context 更新完了（Terraform, AWS Lambda, DynamoDB）
- [ ] Phase 2: `tasks.md` 作成完了（すべてのタスク列挙）
- [ ] Phase 2: 最初のTerraformモジュール実装完了
- [ ] Phase 2: terraform init/validate/plan 実行成功
- [ ] Constitution Check: Phase 1 再確認で PASS


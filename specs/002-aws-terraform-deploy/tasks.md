# Task Breakdown: AWS Terraform デプロイ準備

**Feature**: AWS上でTerraformを利用してTodo アプリケーションをデプロイするための準備  
**Feature Branch**: `002-aws-terraform-deploy`  
**Plan Reference**: [plan.md](plan.md)  
**Created**: 2025-11-22  
**Status**: Ready for Implementation

---

## Implementation Overview

このフィーチャーは3つの主要フェーズで構成されます：

- **Phase 0**: 調査と知識統合（11-16時間）
- **Phase 1**: 設計と契約（8-10時間）  
- **Phase 2**: 実装とコード生成（20-25時間）

**推定総期間**: 39-51時間（約1週間のスプリント）

---

## Phase 0: Research & Knowledge Consolidation

> **目標**: Terraform、AWS Lambda、multi-environment管理のベストプラクティスを調査・文書化

### Research Tasks

- [x] T001 Terraform Backend Strategy 調査 `specs/002-aws-terraform-deploy/research.md`
  - S3 + DynamoDB バックエンド最適化方法を研究
  - 状態ロック戦略、リカバリ手順、コスト最適化を記録
  - 見積もり時間：2-3時間

- [x] T002 Lambda TypeScript Runtime Best Practices 調査 `specs/002-aws-terraform-deploy/research.md`
  - Node.js Lambdaのコールドスタート最小化方法を研究
  - 依存関係管理、バンドリング戦略を記録
  - 見積もり時間：2-3時間

- [x] T003 Terraform Modules Design Patterns 調査 `specs/002-aws-terraform-deploy/research.md`
  - 環境別設定管理、変数命名規則、出力公開範囲を研究
  - 再利用可能モジュール設計パターンを記録
  - 見積もり時間：3-4時間

- [x] T004 Multi-Environment Terraform Strategy 調査 `specs/002-aws-terraform-deploy/research.md`
  - Workspaces vs. tfvars の比較
  - 環境固有化の粒度、CI/CD統合戦略を研究
  - 見積もり時間：2-3時間

- [x] T005 AWS IAM Role & Policy Strategy 調査 `specs/002-aws-terraform-deploy/research.md`
  - 最小権限原則の実装方法を研究
  - チーム別ロール設計、Terraform管理ロールを記録
  - 見積もり時間：2-3時間

- [x] T006 研究成果のまとめ `specs/002-aws-terraform-deploy/research.md`
  - 5つの研究トピックを1つの統合ドキュメントにまとめる
  - 各トピックのdecision/rationale/alternativesを記録
  - 見積もり時間：1-2時間

---

## Phase 1: Design & Contracts

> **目標**: インフラストラクチャのデータモデル、API契約、クイックスタートを確立

### 1.1 Data Model Definition

- [x] T007 Terraform State Model 設計 `specs/002-aws-terraform-deploy/data-model.md`
  - Resource Catalog、Environment State、Variable Registry の構造を定義
  - 見積もり時間：1-2時間

- [x] T008 DynamoDB Application Model 設計 `specs/002-aws-terraform-deploy/data-model.md`
  - Todo Entity、User Entity、Indexes の仕様を定義
  - 見積もり時間：1-2時間

- [x] T009 Configuration Model 設計 `specs/002-aws-terraform-deploy/data-model.md`
  - Backend Config、Provider Config、Tag Strategy を定義
  - 見積もり時間：1時間

### 1.2 API Contracts

- [x] T010 Terraform API Contract 定義 `specs/002-aws-terraform-deploy/contracts/terraform-api.md`
  - Input (tfvars スキーマ)、Output (リソース情報)、Commands (init/plan/apply/destroy) を定義
  - 見積もり時間：2時間

- [x] T011 Lambda API Contract 定義 `specs/002-aws-terraform-deploy/contracts/lambda-api.md`
  - Lambda関数署名、HTTP API Gateway統合、環境変数を定義
  - 見積もり時間：1-2時間

- [x] T012 AWS Resource Specification 定義 `specs/002-aws-terraform-deploy/contracts/aws-resource-spec.md`
  - Lambda、API Gateway、DynamoDB のリソース定義スペックを作成
  - 見積もり時間：1-2時間

### 1.3 Quick Start Guide

- [x] T013 前提条件セクション作成 `specs/002-aws-terraform-deploy/quickstart.md`
  - AWS CLI、Terraform CLI インストール手順
  - 見積もり時間：1時間

- [x] T014 初期設定セクション作成 `specs/002-aws-terraform-deploy/quickstart.md`
  - AWS アカウント初期設定、IAM ユーザー作成、ロール設定
  - 見積もり時間：1-2時間

- [x] T015 Terraform初期化セクション作成 `specs/002-aws-terraform-deploy/quickstart.md`
  - バックエンド作成、ワークスペース設定
  - 見積もり時間：1時間

- [x] T016 デプロイメントセクション作成 `specs/002-aws-terraform-deploy/quickstart.md`
  - dev環境デプロイ、staging/prod環境への昇格、トラブルシューティング
  - 見積もり時間：1-2時間

### 1.4 Agent Context Update

- [x] T017 Copilot Agent Context 更新確認 `.github/agents/copilot-instructions.md`
  - Terraform、AWS Lambda、DynamoDB の技術情報が正しく追加されたか確認
  - 見積もり時間：0.5時間

---

## Phase 2: Implementation & Code Generation

> **目標**: Terraform コード、Lambda 関数、テストの実装と統合

### 2.1 Infrastructure Setup & Backend

- [x] T018 [P] AWS IAM ロール定義 `infrastructure/terraform/modules/backend/main.tf`
  - Terraform 実行用 IAM ロール、ポリシー作成
  - 見積もり時間：1-2時間

- [x] T019 [P] S3 Backend 構成 `infrastructure/terraform/modules/backend/main.tf`
  - S3 バケット作成（暗号化、バージョニング有効）
  - 見積もり時間：1時間

- [x] T020 [P] DynamoDB Lock Table 構成 `infrastructure/terraform/modules/backend/main.tf`
  - DynamoDB テーブル作成（状態ロック用）
  - 見積もり時間：1時間

- [x] T021 Backend Terraform Module 完成 `infrastructure/terraform/modules/backend/`
  - variables.tf、outputs.tf の作成
  - 見積もり時間：1時間

### 2.2 Terraform Base Configuration

- [x] T022 [P] Terraform Provider 設定 `infrastructure/terraform/main.tf`
  - AWS Provider 設定、リージョン設定
  - 見積もり時間：0.5時間

- [x] T023 [P] Backend Configuration 統合 `infrastructure/terraform/backend.tf`
  - S3 + DynamoDB バックエンド参照設定
  - 見積もり時間：0.5時間

- [x] T024 [P] Variables Schema 定義 `infrastructure/terraform/variables.tf`
  - environment, aws_region, resource_prefix 等のグローバル変数
  - 見積もり時間：1時間

- [x] T025 [P] Outputs 定義 `infrastructure/terraform/outputs.tf`
  - Lambda ARNs、API Gateway endpoints、DynamoDB table names
  - 見積もり時間：1時間

- [ ] T026 Terraform Versions 定義 `infrastructure/terraform/versions.tf`
  - Terraform CLI、AWS Provider バージョン要件
  - 見積もり時間：0.5時間

### 2.3 Compute Layer (Lambda & API Gateway)

- [x] T027 [P] Compute Module 構造作成 `infrastructure/terraform/modules/compute/`
  - ディレクトリ、main.tf、variables.tf、outputs.tf テンプレート
  - 見積もり時間：1時間

- [x] T028 [P] Lambda IAM Role 定義 `infrastructure/terraform/modules/compute/main.tf`
  - Execution Role with DynamoDB、CloudWatch Logs アクセス権限
  - 見積もり時間：1-2時間

- [x] T029 [P] Lambda Function Base 定義 `infrastructure/terraform/modules/compute/main.tf`
  - ハンドラー、環境変数、タイムアウト設定
  - 見積もり時間：1-2時間

- [x] T030 [P] API Gateway Base 定義 `infrastructure/terraform/modules/compute/main.tf`
  - REST API、ステージ、ロギング設定
  - 見積もり時間：1-2時間

- [x] T031 Lambda<->API Gateway Integration `infrastructure/terraform/modules/compute/main.tf`
  - Lambda プロキシ統合設定
  - 見積もり時間：1時間

### 2.4 Data Layer (DynamoDB)

- [x] T032 [P] Data Module 構造作成 `infrastructure/terraform/modules/data/`
  - ディレクトリ、main.tf、variables.tf、outputs.tf テンプレート
  - 見積もり時間：1時間

- [x] T033 [P] DynamoDB Todo Table 定義 `infrastructure/terraform/modules/data/main.tf`
  - テーブル名、主キー (id)、ソートキー (createdAt)
  - 見積もり時間：1時間

- [ ] T034 [P] DynamoDB User Table 定義 `infrastructure/terraform/modules/data/main.tf`
  - テーブル名、主キー (userId)
  - 見積もり時間：0.5時間

- [ ] T035 [P] DynamoDB Global Secondary Indexes 定義 `infrastructure/terraform/modules/data/main.tf`
  - Todo GSI on userId、User LSI on createdAt
  - 見積もり時間：1時間

- [ ] T036 [P] DynamoDB TTL 設定 `infrastructure/terraform/modules/data/main.tf`
  - TTL属性の有効化（オプション）
  - 見積もり時間：0.5時間

### 2.5 Monitoring Layer

- [ ] T037 [P] Monitoring Module 構造作成 `infrastructure/terraform/modules/monitoring/`
  - ディレクトリ、main.tf、variables.tf、outputs.tf テンプレート
  - 見積もり時間：0.5時間

- [ ] T038 [P] CloudWatch Log Groups 定義 `infrastructure/terraform/modules/monitoring/main.tf`
  - Lambda、API Gateway ロググループ
  - 見積もり時間：1時間

- [ ] T039 [P] CloudWatch Metrics & Alarms 定義 `infrastructure/terraform/modules/monitoring/main.tf`
  - Lambda 呼び出し、エラー、DynamoDB スロットリング
  - 見積もり時間：1-2時間

### 2.6 Environment Configuration

- [x] T040 [P] Development Environment Variables `infrastructure/terraform/environments/dev.tfvars`
  - dev 環境用の tfvars （低スペック設定）
  - 見積もり時間：0.5時間

- [x] T041 [P] Staging Environment Variables `infrastructure/terraform/environments/staging.tfvars`
  - staging 環境用の tfvars （中程度スペック設定）
  - 見積もり時間：0.5時間

- [x] T042 [P] Production Environment Variables `infrastructure/terraform/environments/prod.tfvars`
  - prod 環境用の tfvars （高スペック設定、保護機能）
  - 見積もり時間：0.5時間

- [ ] T043 terraform.tfvars (Common) `infrastructure/terraform/terraform.tfvars`
  - 共通変数（プロジェクト名、リージョン等）
  - 見積もり時間：0.5時間

### 2.7 Operational Scripts

- [ ] T044 [P] init.sh スクリプト `infrastructure/scripts/init.sh`
  - バックエンド初期化、ワークスペース作成
  - 見積もり時間：1時間

- [ ] T045 [P] plan.sh スクリプト `infrastructure/scripts/plan.sh`
  - Terraform plan 実行、出力解析
  - 見積もり時間：1時間

- [ ] T046 [P] apply.sh スクリプト `infrastructure/scripts/apply.sh`
  - Terraform apply 実行、デプロイメント確認
  - 見積もり時間：1時間

- [ ] T047 [P] destroy.sh スクリプト `infrastructure/scripts/destroy.sh`
  - 本番保護機構を持つ destroy スクリプト
  - 見積もり時間：1-2時間

- [ ] T048 [P] validate.sh スクリプト `infrastructure/scripts/validate.sh`
  - Terraform validate、terraform-compliance チェック
  - 見積もり時間：1時間

- [ ] T049 [P] import.sh スクリプト `infrastructure/scripts/import.sh`
  - 既存 AWS リソースのインポート
  - 見積もり時間：1時間

### 2.8 Documentation

- [ ] T050 SETUP.md 作成 `infrastructure/docs/SETUP.md`
  - AWS アカウント初期設定、IAM設定詳細
  - 見積もり時間：1-2時間

- [ ] T051 ENVIRONMENTS.md 作成 `infrastructure/docs/ENVIRONMENTS.md`
  - 環境別設定の詳細説明
  - 見積もり時間：1時間

- [ ] T052 BACKEND.md 作成 `infrastructure/docs/BACKEND.md`
  - 状態バックエンド管理、トラブルシューティング
  - 見積もり時間：1時間

- [ ] T053 DISASTER_RECOVERY.md 作成 `infrastructure/docs/DISASTER_RECOVERY.md`
  - リカバリ手順、 rollback 方法
  - 見積もり時間：1-2時間

- [ ] T054 TROUBLESHOOTING.md 作成 `infrastructure/docs/TROUBLESHOOTING.md`
  - よくある問題と解決方法
  - 見積もり時間：1時間

### 2.9 Lambda Functions & Application Integration

- [ ] T055 [P] Lambda Client ユーティリティ `src/infrastructure/aws-integration/lambda-client.ts`
  - Lambda invoke 機能の実装
  - 見積もり時間：1時間

- [ ] T056 [P] DynamoDB Client ユーティリティ `src/infrastructure/aws-integration/dynamodb-client.ts`
  - DynamoDB 操作ラッパー（CRUD、クエリ）
  - 見積もり時間：2時間

- [ ] T057 [P] CloudWatch Client ユーティリティ `src/infrastructure/aws-integration/cloudwatch-client.ts`
  - CloudWatch Logs 出力
  - 見積もり時間：1時間

- [ ] T058 TodoApplicationService Lambda 統合 `src/application/services/TodoApplicationService.ts`
  - DynamoDB クライアント統合
  - 見積もり時間：2-3時間

### 2.10 Testing

- [ ] T059 Terraform Validation Tests `tests/integration/terraform-deployment.spec.ts`
  - terraform plan 出力の構文検証
  - 見積もり時間：1-2時間

- [ ] T060 Terraform-Compliance Checks `infrastructure/terraform/compliance/`
  - ポリシーベースの検証ルール
  - 見積もり時間：2時間

- [ ] T061 Lambda/DynamoDB Integration Tests `tests/integration/aws-integration.spec.ts`
  - LocalStack を使用したローカルテスト
  - 見積もり時間：2-3時間

- [ ] T062 E2E: AWS Deployment Tests `tests/e2e/aws-deployment.spec.ts`
  - 実際のAWS環境でのE2Eテスト
  - 見積もり時間：2-3時間

- [ ] T063 [P] Unit Tests: AWS Clients `tests/unit/infrastructure/aws-integration/`
  - DynamoDB、CloudWatch クライアントのユニットテスト
  - 見積もり時間：2時間

### 2.11 Final Integration & Validation

- [ ] T064 すべての Terraform Module テスト `infrastructure/terraform/`
  - terraform validate、terraform plan で全環境テスト
  - 見積もり時間：1-2時間

- [ ] T065 CI/CD パイプライン統合 `.github/workflows/`
  - GitHub Actions で Terraform plan/apply の自動実行
  - 見積もり時間：2-3時間

- [ ] T066 デプロイメント検証チェック `infrastructure/scripts/`
  - デプロイ後の Lambda、DynamoDB、API Gateway 動作確認
  - 見積もり時間：1-2時間

- [ ] T067 Constitution Check 再確認 `specs/002-aws-terraform-deploy/plan.md`
  - Phase 1 完了時に再度憲法確認
  - 見積もり時間：1時間

- [ ] T068 ドキュメント最終確認 `specs/002-aws-terraform-deploy/`
  - すべてのドキュメント確認、リンク確認
  - 見積もり時間：1時間

---

## Task Dependencies & Execution Order

### Dependency Graph

```
Phase 0: Research (全タスク並列実行可能)
  T001-T005 → T006 (研究まとめ)
     ↓
Phase 1: Design & Contracts (並列実行可能)
  T007-T009 (Data Model)  ┐
  T010-T012 (Contracts)   ├→ T017 (Agent Context更新)
  T013-T016 (Quickstart)  ┘
     ↓
Phase 2: Implementation (段階的実行、一部並列)
  T018-T021 (Backend)              [並列：T022-T026]
  T027-T031 (Compute Layer)        [並列：T032-T036, T037-T039]
  T040-T043 (Environment Vars)     [並列に実行]
  T044-T049 (Scripts)              [並列に実行]
  T050-T054 (Documentation)        [並列に実行]
  T055-T063 (Application & Tests)  [T058は T056/T057後]
  T064-T068 (Final Validation)     [最後に順序実行]
```

### Parallelization Opportunities

**Phase 0**: すべてのリサーチタスク（T001-T005）は独立して並列実行可能

**Phase 1**: 
- Data Model（T007-T009）と Contracts（T010-T012）と Quickstart（T013-T016）は並列実行可能
- Agent Context 更新（T017）は全タスク完了後

**Phase 2**:
- Backend（T018-T021）と Base Config（T022-T026）は並列実行可能
- Compute（T027-T031）と Data（T032-T036）と Monitoring（T037-T039）は並列実行可能
- Environment vars（T040-T043）と Scripts（T044-T049）と Docs（T050-T054）は並列実行可能
- Application Integration（T055-T058）は AWS Clients（T055-T057）の後に実行
- Tests（T059-T063）は Infrastructure コード完成後に並列実行可能
- Final Validation（T064-T068）は最終確認用に順序実行

---

## Task Status Tracking

### Phase 0: Research
- [ ] T001 - [ ] T002 - [ ] T003 - [ ] T004 - [ ] T005 - [ ] T006

### Phase 1: Design & Contracts
- [ ] T007 - [ ] T008 - [ ] T009 - [ ] T010 - [ ] T011 - [ ] T012
- [ ] T013 - [ ] T014 - [ ] T015 - [ ] T016 - [ ] T017

### Phase 2: Implementation
- [ ] T018-T049 (Infrastructure)
- [ ] T050-T054 (Docs)
- [ ] T055-T063 (Application & Tests)
- [ ] T064-T068 (Final)

---

## Success Criteria per Phase

### Phase 0 Complete ✅ When:
- [ ] `research.md` に 5 つのリサーチトピック全てが記録されている
- [ ] 各トピックの decision/rationale/alternatives が明確に文書化されている
- [ ] Git commit が完了している

### Phase 1 Complete ✅ When:
- [ ] `data-model.md` で Terraform, DynamoDB, Configuration モデルが定義されている
- [ ] `contracts/` ディレクトリに3つの API 契約ファイルが存在している
- [ ] `quickstart.md` に 4 つのセクション全てが記載されている
- [ ] GitHub Copilot Agent Context に Terraform 情報が反映されている
- [ ] Git commit が完了している

### Phase 2 Complete ✅ When:
- [ ] `infrastructure/terraform/` に全ての module と configuration が存在している
- [ ] `infrastructure/scripts/` に 6 つの運用スクリプトが存在している
- [ ] `infrastructure/docs/` に 5 つのドキュメントが存在している
- [ ] `src/infrastructure/aws-integration/` に 3 つの AWS クライアントが実装されている
- [ ] `tests/integration/` と `tests/e2e/` に Terraform/AWS 統合テストが実装されている
- [ ] すべてのテストが合格している
- [ ] `terraform validate` と `terraform plan` が全環境で成功している
- [ ] Constitution Check が再度 PASS している
- [ ] Git commit が完了している

---

## Notes

- **MVP Scope**: Phase 0 + Phase 1 (必須) + Phase 2 の基本インフラストラクチャ部分（T018-T043, T064-T068）
- **Full Scope**: すべてのタスク（T001-T068）
- **推定実装速度**: 経験者で 39-51 時間、初心者で 60-80 時間
- **推奨スプリント**: 1 スプリント（1 週間の開発サイクル）
- **並列処理推奨**: Phase 0 と Phase 1 は高度な並列化が可能。Phase 2 も多くの部分で並列化可能

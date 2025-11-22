# Feature Specification: GitHub Actions AWS Deployment Automation

**Feature Branch**: `003-github-actions-deploy`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "GitHub Actions で AWS へのデプロイを自動化したいです。現状のワークフローは正常に動いていないのでそこを解消したいです。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - GitHub Actions OIDC 認証セットアップ (Priority: P1)

DevOps エンジニアが GitHub Actions から AWS へセキュアに認証できるよう、OIDC (OpenID Connect) プロバイダーを設定・統合する。認証情報をシークレットに保存せず、短期の IAM トークンを使用してセキュリティを向上させる。

**Why this priority**: セキュアなデプロイメントの基盤。ワークフロー実行の前提条件。シークレット管理のベストプラクティス実装。

**Independent Test**: AWS アカウントで OIDC プロバイダーが登録され、GitHub Actions で `aws-actions/configure-aws-credentials@v4` が正常に認証できることで検証可能。単独実装時点で他のデプロイステップの基盤を提供。

**Acceptance Scenarios**:

1. **Given** AWS アカウントにアクセス可能, **When** OIDC プロバイダー設定スクリプト実行, **Then** プロバイダーが登録され ARN が出力される
2. **Given** GitHub Actions ワークフロー実行, **When** AWS 認証ステップ実行, **Then** 一時的な STS トークンが発行され認証成功
3. **Given** 設定完了, **When** AWS CLI コマンド実行, **Then** 認証情報なしで AWS リソースへアクセス可能

---

### User Story 2 - GitHub Secrets 統合・最適化 (Priority: P1)

GitHub リポジトリシークレットを整理し、環境別 (dev, staging, prod) の最小限のシークレットを設定。環境変数管理を改善し、秘密情報の暴露リスクを低減する。

**Why this priority**: OIDC 設定と並行する基盤。ワークフロー実行に必須。環境別デプロイの前提条件。

**Independent Test**: GitHub リポジトリ設定でシークレット登録確認、ワークフロー内で正常に参照・使用できることを検証。シークレットの漏洩がないこと確認。

**Acceptance Scenarios**:

1. **Given** リポジトリシークレット設定画面, **When** 必要なシークレット登録, **Then** すべてシークレットが登録され、一覧に表示される
2. **Given** ワークフロー実行, **When** シークレット参照, **Then** 正常に値が渡され、ログに秘密情報が表示されない
3. **Given** 環境別設定, **When** dev/staging/prod シークレット設定, **Then** 各環境で異なるシークレット値が正しく使用される

---

### User Story 3 - Develop ブランチ→Main への変更・ワークフロー修正 (Priority: P1)

現在 `develop` ブランチにトリガーされているデプロイ条件を `main` ブランチに修正。`develop` ブランチは検証用に保持しつつ、本番デプロイ構成を main で実行するよう修正。

**Why this priority**: ワークフロー動作の根本的問題。現在動作していないパイプラインの核。すべてのデプロイケース (dev/staging/prod) に影響。

**Independent Test**: ワークフロー構文検証、main へのプッシュ時にワークフロー実行、パイプラインが正常に進行することで検証。

**Acceptance Scenarios**:

1. **Given** main ブランチへプッシュ, **When** terraform-ci.yml トリガー, **Then** terraform-validate ジョブが実行開始
2. **Given** develop ブランチ存在, **When** develop へプッシュ, **Then** ワークフロー実行されず (オプション検証環境として)
3. **Given** ワークフロー実行, **When** 全ジョブ完了, **Then** dev 環境に自動デプロイ、staging/prod は手動承認待ちの状態

---

### User Story 4 - 環境別デプロイパイプラインの動作確認・修正 (Priority: P2)

Dev 環境への自動デプロイ、Staging 環境への手動承認デプロイ、Prod 環境への複数承認デプロイが正常に動作することを確認。環境変数の渡し方、承認フロー、Terraform Apply の実行を検証。

**Why this priority**: ワークフロー修正後の検証フェーズ。P1 修正後に実施される。実際のデプロイメント成功を確認。

**Independent Test**: 各環境へのデプロイ実行、AWS リソース作成確認、ロールバック可能な状態で検証。

**Acceptance Scenarios**:

1. **Given** main へのプッシュ, **When** ワークフロー実行, **Then** dev 環境に Lambda/API Gateway/DynamoDB が自動デプロイされる
2. **Given** staging デプロイ条件満たす, **When** 承認ジョブ実行, **Then** GitHub Issue で承認待ちが通知され、1 承認後にデプロイ実行
3. **Given** prod デプロイ条件満たす, **When** 承認ジョブ実行, **Then** GitHub Issue で複数承認待ちが通知され、2 承認後にデプロイ実行

---

### User Story 5 - ワークフロー失敗・エラーハンドリング改善 (Priority: P2)

Terraform Apply 失敗時、Terraform Plan 構文エラー時など、詳細なエラーメッセージをログ出力。失敗時の Slack 通知改善、実行ログのアーティファクト保存。

**Why this priority**: 運用効率化。トラブルシューティング高速化。P1 修正実施後のサポート機能。

**Independent Test**: 意図的なエラーケースで検証、エラーログ確認、Slack 通知内容確認。

**Acceptance Scenarios**:

1. **Given** Terraform Plan エラー発生, **When** ジョブ実行, **Then** 詳細なエラーメッセージが表示され、Slack で通知される
2. **Given** Apply 失敗, **When** ワークフロー終了, **Then** 失敗ジョブのログがアーティファクトで保存され、後で参照可能

---

### User Story 6 - CI/CD 統合テスト・検証 (Priority: P3)

ワークフロー全体の統合テスト。Terraform 検証、ユニットテスト、セキュリティスキャン、デプロイが一体で動作することを確認。本番環境での実運用準備。

**Why this priority**: ワークフロー完成後の最終検証。P1/P2 完了後。本番利用前の確認作業。

**Independent Test**: 実際のパイプライン実行、複数回の push/deploy サイクル実行、結果確認。

**Acceptance Scenarios**:

1. **Given** ワークフロー実装完成, **When** main へのプッシュ, **Then** validate → test → security-scan → deploy-dev が順序良く実行
2. **Given** すべてのステップ実行, **When** パイプライン完了, **Then** dev 環境に正常にデプロイされ、API が応答する

---

### Edge Cases

- develop ブランチが存在しない場合、ワークフローのトリガー条件が未定義状態になる可能性 → main 優先で設定
- AWS OIDC プロバイダー未設定の場合、認証ステップで失敗 → 事前セットアップ必須
- Terraform State Lock が残っている場合、Apply が失敗する → Lock 削除スクリプト準備
- GitHub Secrets に誤った値が設定された場合、デプロイが途中失敗 → Validation ステップで早期検出
- Manual Approval ジョブで no one approves の場合、デプロイが無期限待機 → タイムアウト設定検討
- main ブランチへのプッシュ権限がないユーザーの場合、PR からのマージのみ → GitHub ルール設定確認

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GitHub Actions ワークフロー (terraform-ci.yml) は main ブランチへのプッシュをトリガーとして実行開始する
- **FR-002**: AWS OIDC プロバイダーを GitHub リポジトリと統合し、IAM ロール認証可能な状態に設定する
- **FR-003**: GitHub リポジトリシークレットに以下を登録: AWS_ROLE_TO_ASSUME_*, TF_STATE_BUCKET, TF_LOCK_TABLE, (SLACK_WEBHOOK_URL)
- **FR-004**: Terraform Validate ジョブは format、validate、plan (dev/staging/prod) をすべて実行し、結果を PR コメントで報告する
- **FR-005**: テストジョブ (Jest) は Terraform モジュールテストおよび AWS 統合テストを実行し、カバレッジレポートを Codecov にアップロードする
- **FR-006**: セキュリティスキャン (TFLint、Checkov) は Terraform コード品質を検査し、SARIF 形式で GitHub に報告する
- **FR-007**: dev 環境へのデプロイは main ブランチプッシュ時に自動実行 (approve 不要)
- **FR-008**: staging 環境へのデプロイは manual approval (1 承認) で実行、GitHub Issue 通知機能付き
- **FR-009**: prod 環境へのデプロイは manual approval (2 承認, 複数チーム) で実行、GitHub Issue 通知機能付き
- **FR-010**: デプロイ成功時・失敗時に Slack 通知が送信される (SLACK_WEBHOOK_URL 登録済みの場合)
- **FR-011**: ワークフロー実行ログは 90 日間保持され、履歴参照可能な状態を保つ
- **FR-012**: Terraform Apply 前に plan 結果ファイル (tfplan) が生成され、apply はそのプランに基づいて実行される (auto-approve なし)

### Key Entities *(include if feature involves data)*

- **GitHub Actions Workflow**: terraform-ci.yml 内で定義される複数ジョブ (validate, test, security-scan, deploy-dev, deploy-staging, deploy-prod, notify)
- **AWS OIDC Provider**: GitHub リポジトリ (Sub Claim: `repo:aki-motty/todo-copilot:*`) にマッピングされ、3 環境用 IAM ロール (role-to-assume-dev, -staging, -prod) に信頼関係設定
- **Environment Secrets**: リポジトリレベルで登録される 6 個の文字列シークレット (環境別)
- **Deployment State**: Terraform tfstate ファイル (S3 + DynamoDB Lock) が環境別 (dev/staging/prod) に分離保持
- **Approval Records**: GitHub Issues コメント・Action ログとして承認情報が記録される

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AWS OIDC プロバイダー設定完了後、GitHub Actions で AWS リソースへの認証が 100% 成功 (0 認証エラー)
- **SC-002**: ワークフロー実行時間が 15 分以内で完了 (validate + test + security-scan + dev deploy)
- **SC-003**: Dev 環境へのデプロイが main プッシュから 10 分以内に完了し、AWS リソースが ACTIVE 状態に到達
- **SC-004**: Staging/Prod への manual approval プロセスが正常に動作し、承認から 5 分以内にデプロイ実行開始
- **SC-005**: Terraform Validate ジョブが format/validate/plan をすべて実行し、エラーがない場合 100% 成功率で通過
- **SC-006**: Test ジョブで 338 個以上のテストが実行され、PASS 率が 100% (0 FAIL)
- **SC-007**: セキュリティスキャン (TFLint + Checkov) が完了し、CRITICAL/HIGH レベルのセキュリティ警告が 0 件
- **SC-008**: 本番環境デプロイで 2 名以上の承認が記録され、監査ログに履歴が残る
- **SC-009**: ワークフロー失敗時に Slack 通知が送信され、デプロイ担当者が 5 分以内に気づける
- **SC-010**: CI/CD パイプライン導入後、手動デプロイ時間が 50% 削減 (手動: 20 分 → 自動: 10 分)

## Implementation Notes

### Current Issues in terraform-ci.yml

1. **Branch トリガー問題**: `develop` ブランチをトリガーとしているが、develop ブランチが現在存在しない
   - `on.push.branches` に develop が記載されており、これが PR コメント機能などで問題を起こす可能性
   - 修正: main を優先、develop は optional に変更

2. **OIDC 未設定**: AWS 認証で `role-to-assume` シークレット使用しているが、OIDC プロバイダー未登録状態
   - 修正: OIDC セットアップガイド作成、AWS IAM ロール設定スクリプト提供

3. **Environment 定義欠落**: workflow_dispatch の environment パラメータが定義されているが、environment ブロック未設定
   - 修正: develop/staging/production environment を定義、各環境で異なるシークレット設定

4. **Manual Approval アクション問題**: `trstringer/manual-approval@v1` では GitHub team 指定が難しい
   - 修正: より新しい方式 (GitHub Environment Protection Rules) への移行検討

5. **Terraform Wrapper 設定**: `terraform_wrapper: false` が inconsistent に設定
   - 修正: すべての Terraform Setup ステップで統一

### Assumptions

- AWS アカウント (446713282258) に管理者アクセス権限がある
- GitHub Organization (aki-motty) の admin 権限でシークレット・環境設定可能
- Terraform State 用 S3 バケット、DynamoDB Lock テーブルが既に存在 (別フィーチャー 002 で実装)
- Lambda handler コード (dist-lambda/index.js) が準備されている
- Slack Webhook URL は オプショナル (設定しなければ通知スキップ)

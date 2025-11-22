# Feature Specification: AWS Terraform デプロイ準備

**Feature Branch**: `002-aws-terraform-deploy`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "AWS上でterraformを利用してデプロイをしていきたいです。そのための準備を行いたいです。"

## Clarifications

### Session 2025-11-22

- Q: デプロイ対象アプリケーション → A: 本アプリケーション（Todo アプリ）
- Q: AWSアカウント構成 → A: 単一のAWSアカウント（dev/staging/prod は環境で分離）
- Q: 主要AWSリソース構成 → A: Lambda + API Gateway + DynamoDB（サーバーレス）
- Q: 状態ファイル管理バックエンド → A: S3 + DynamoDB + IAM ロール（チーム対応）
- Q: 監視・ロギング戦略レベル → A: 基本的な監視のみ（CloudWatch ログ、メトリクス）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - インフラ構成の定義と管理 (Priority: P1)

開発者として、Terraformを使用してAWS上の Todo アプリケーション用インフラストラクチャ（Lambda、API Gateway、DynamoDB、IAMロール）を定義・管理し、バージョン管理されたコードとしてインフラを維持したい。これにより、手動設定によるエラーを防ぎ、環境の再現性を確保できる。

**Why this priority**: インフラをコード化することは、デプロイメントパイプライン全体の基盤となる最も重要な要素です。これがなければ、他のすべてのデプロイ作業が手動になり、エラーが発生しやすくなります。

**Independent Test**: Terraformの設定ファイルを作成し、`terraform plan`コマンドを実行することで、AWS Lambdaなどのリソース作成計画が正しく生成されることを確認できます。実際のリソース作成は行わずに、構成の妥当性を検証できます。

**Acceptance Scenarios**:

1. **Given** プロジェクトルートディレクトリに移動した状態で、**When** Terraform設定ファイル（Lambda、API Gateway、DynamoDB用）を作成して`terraform init`を実行すると、**Then** 必要なプロバイダーとモジュールが正常に初期化される
2. **Given** Terraform設定ファイルが存在する状態で、**When** `terraform validate`を実行すると、**Then** 構文エラーがなく設定が有効であることが確認される
3. **Given** 有効なTerraform設定がある状態で、**When** `terraform plan`を実行すると、**Then** 作成されるAWS Lambdaなどのリソースの詳細な計画が表示される

---

### User Story 2 - デプロイ環境の分離管理 (Priority: P2)

開発者として、単一のAWSアカウント内で開発環境、ステージング環境、本番環境を分離して管理し、各環境に適したLambda設定やDynamoDBキャパシティで安全にデプロイしたい。これにより、本番環境への影響なしにテストを行える。

**Why this priority**: 環境分離は安全なデプロイメントプロセスに不可欠ですが、まずは基本的なインフラ定義（P1）が完了してから実装できます。

**Independent Test**: 環境ごとの変数ファイル（dev.tfvars、staging.tfvars、prod.tfvars）を作成し、それぞれの環境で`terraform plan -var-file=env.tfvars`を実行することで、環境固有のLambdaメモリやDynamoDBキャパシティが正しく計画されることを確認できます。

**Acceptance Scenarios**:

1. **Given** 複数の環境設定ファイルが存在する状態で、**When** 開発環境用の設定でplanを実行すると、**Then** 開発環境固有のリソース名とタグが適用された計画が生成される
2. **Given** 本番環境用の設定ファイルがある状態で、**When** 本番環境でplanを実行すると、**Then** 本番環境に適したLambdaメモリサイズとDynamoDBキャパシティが反映される
3. **Given** ステージング環境が既にデプロイされている状態で、**When** 本番環境へのデプロイを実行すると、**Then** ステージング環境のリソースに影響を与えずに本番環境のリソースが作成される

---

### User Story 3 - デプロイ状態の追跡と管理 (Priority: P3)

開発者として、Terraformの状態ファイルをS3とDynamoDBを使用して安全に管理し、チームメンバー間で状態を共有して、競合を防ぎながら協働でインフラを管理したい。

**Why this priority**: 状態管理はチーム開発では重要ですが、まずは個人での基本的なデプロイ（P1, P2）が確立してから実装できます。

**Independent Test**: S3バケットとDynamoDBテーブルを使用したリモート状態管理を設定し、`terraform init -backend-config`を実行することで、状態ファイルがS3に保存され、ロックがDynamoDBで管理されることを確認できます。

**Acceptance Scenarios**:

1. **Given** リモートバックエンド（S3 + DynamoDB）が設定されている状態で、**When** `terraform apply`を実行すると、**Then** 状態ファイルがS3バケットに自動的に保存される
2. **Given** 複数の開発者が同じプロジェクトで作業している状態で、**When** 一人がterraform操作を実行中に別の開発者が操作を試みると、**Then** ロックエラーが表示され同時実行が防止される
3. **Given** リモート状態ファイルが存在する状態で、**When** 新しいマシンから`terraform init`を実行すると、**Then** 既存の状態が取得され、現在のインフラ状態が認識される

---

### Edge Cases

- Terraformの実行中にネットワーク障害が発生した場合はどうなるか？（部分的に作成されたリソースの扱い）
- AWS APIのレート制限に達した場合、どのように処理されるか？
- 手動で変更されたAWSリソースとTerraformの状態ファイルが不整合になった場合、どのように検出・修正するか？
- 本番環境へのデプロイ中に誤って`terraform destroy`を実行してしまった場合の保護メカニズムはあるか？
- 複数のAWSアカウントやリージョンにまたがるデプロイが必要な場合、どのように管理するか？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムは、Terraformを使用してAWS上の必要なインフラストラクチャリソース（Lambda、API Gateway、DynamoDB、IAM ロールなど）を定義できなければならない
- **FR-002**: システムは、開発（dev）、ステージング（staging）、本番（prod）の各環境を単一のAWSアカウント内で独立して管理できなければならない
- **FR-003**: システムは、環境ごとに異なる変数（Lambda メモリサイズ、API スロットル設定、DynamoDB キャパシティなど）を適用できなければならない
- **FR-004**: システムは、Terraformの状態ファイルをS3に保存し、DynamoDBを使用した状態ロック機構を備えてチーム間で共有できなければならない
- **FR-005**: システムは、同時実行を防ぐためにDynamoDBを使用した状態ロックを実装しなければならない
- **FR-006**: システムは、AWS認証情報を安全に管理し、IAMロールまたはAWS CLIプロファイルを使用して認証できなければならない
- **FR-007**: システムは、デプロイ前に変更内容を確認できる（terraform plan）機能を提供しなければならない
- **FR-008**: システムは、デプロイされたリソースに環境タグ、プロジェクトタグ（todo-copilot）、管理者情報タグを自動的に付与しなければならない
- **FR-009**: システムは、Terraformモジュールを使用して再利用可能なインフラコンポーネント（Lambda関数、API Gateway、DynamoDB テーブルなど）を定義できなければならない
- **FR-010**: システムは、CloudWatch Logs と CloudWatch Metrics を使用した基本的な監視・ロギング機能を備えなければならない
- **FR-011**: システムは、既存のAWSリソース（既に作成されたLambda関数など）をTerraformの管理下にインポートできなければならない

### Key Entities *(include if feature involves data)*

- **Terraform State File**: 現在デプロイされているInfra as Code（Lambda、API Gateway、DynamoDBなど）の状態を記録するファイル。S3に保存され、リソースのIDや属性情報を保持し、次回のデプロイ時に差分を計算するために使用される
- **Environment Configuration**: 各環境（dev/staging/prod）固有の設定値（Lambda メモリサイズ、API Gateway スロットル、DynamoDB キャパシティ、AWS リージョン、タグなど）を保持する変数ファイル
- **AWS Resource Definitions**: Terraform HCLで定義されるAWSリソース（Lambda関数、API Gateway、DynamoDBテーブル、IAMロール、CloudWatch ロググループなど）の宣言的な設定
- **Backend Configuration**: 状態ファイルの保存場所とロックメカニズムを定義する設定（S3バケット名、DynamoDBテーブル名、リージョンなど）
- **Module**: 再利用可能なインフラコンポーネントの定義（例：標準的なLambda関数セットアップ、標準的なDynamoDBテーブル構成、標準的なAPI Gatewayエンドポイント）
- **IAM Role**: Terraformやアプリケーションが使用するAWSリソースへのアクセス権限を定義するロール。チームメンバーやCI/CDパイプラインに割り当てられる

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 開発者は、Terraformの設定ファイルを作成してから10分以内に、最初のAWSリソースをデプロイできる
- **SC-002**: 開発者は、`terraform plan`を実行してから5秒以内に、変更内容の完全な差分レポートを取得できる
- **SC-003**: 複数の開発者が同時にデプロイを試みた場合、100%の確率で状態ロックが機能し、データの整合性が保たれる
- **SC-004**: 環境間でのインフラ構成の切り替え（dev → staging → prod）が、5分以内に完了する
- **SC-005**: デプロイされた全てのAWSリソースに、適切な環境識別タグが100%付与される
- **SC-006**: チームの90%以上のメンバーが、ドキュメントを参照しながら初回デプロイを成功させられる
- **SC-007**: 本番環境へのデプロイ前に、ステージング環境で同じインフラ構成のテストが完了し、95%以上の信頼性が確保される

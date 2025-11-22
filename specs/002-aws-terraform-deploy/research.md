# Research: AWS Terraform デプロイ準備

**Feature**: AWS上でTerraformを利用してTodo アプリケーションをデプロイするための準備  
**Feature Branch**: `002-aws-terraform-deploy`  
**Created**: 2025-11-22  
**Phase**: 0 - Research & Knowledge Consolidation

---

## T001: Terraform Backend Strategy

**目的**: S3 + DynamoDB バックエンド最適化方法の研究

### 状態ロック戦略 (State Locking)

#### Decision ✅
**S3バケット + DynamoDBテーブル の組み合わせを採用**

#### Rationale
1. **原子性確保**: DynamoDBのConditional Writeで同時実行を完全に防止
2. **コスト効率**: S3 (月額$1-5) + DynamoDB on-demand (~$1/月) = 経済的
3. **監査可能性**: S3 versioning で状態変更履歴を保持
4. **チーム共有**: ローカル管理でなく、チーム全体で状態を共有可能

#### Implementation Details
```hcl
# Backend configuration
terraform {
  backend "s3" {
    bucket           = "todo-copilot-terraform-state-${environment}"
    key              = "terraform.tfstate"
    region           = "ap-northeast-1"
    dynamodb_table   = "terraform-lock-${environment}"
    encrypt          = true
    skip_credentials_validation = false
  }
}

# DynamoDB テーブル要件
# - Partition key: "LockID" (String)
# - 課金方式: On-demand (予測不能なアクセスパターンに対応)
# - TTL: 不要（ロックは自動的に解放される）
```

#### Alternatives Considered
1. **Terraform Cloud/Enterprise**: コスト高い（$20+/月）、外部依存
2. **ローカルバックエンド**: 状態がローカルに閉じ込められ、チーム共有不可
3. **S3のみ**: State Locking不可、同時実行時に競合発生

---

### リカバリ手順 (Recovery Procedures)

#### 状態ファイルの破損時
```bash
# 1. S3バージョニングから復旧
aws s3api get-object \
  --bucket todo-copilot-terraform-state-prod \
  --key terraform.tfstate \
  --version-id <version-id> \
  terraform.tfstate.backup

# 2. バックアップ復旧
cp terraform.tfstate.backup terraform.tfstate
terraform plan  # 動作確認

# 3. ロック状態の確認と手動解放
aws dynamodb scan \
  --table-name terraform-lock-prod \
  --region ap-northeast-1

# ロック削除（緊急時のみ）
aws dynamodb delete-item \
  --table-name terraform-lock-prod \
  --key '{"LockID": {"S": "<lock-id>"}}' \
  --region ap-northeast-1
```

#### ロックタイムアウト
- **デフォルト**: 0ms (無制限待機)
- **推奨設定**: `-lock-timeout=30s` で最大30秒待機後放棄
- **本番環境**: 異常系のためのLambda Function でロック自動解放スケジュール

#### 状態リセット（最後の手段）
```bash
# 既存の Azure リソースを新規状態で管理開始
terraform import aws_lambda_function.todo-api \
  arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-copilot-api

# または状態ファイル完全再生成
rm -rf .terraform/
terraform init -upgrade
terraform refresh  # リモートリソースを読み込み
```

---

### コスト最適化 (Cost Optimization)

#### ストレージ最適化
```
推定コスト（月額）:
├─ S3: $0.023/GB × 1GB = ~$0.02-0.05
├─ DynamoDB: On-demand = ~$1-2
│  └─ Write: $1.25 per million
│  └─ Read: $0.25 per million
└─ 合計: ~$1-2/月

最適化手段:
1. S3 Lifecycle Policy: 90日経過ファイルを Glacier に移動 (-50%)
2. DynamoDB: 本当に on-demand が必要か検討（固定capacity も検討）
3. StateファイルサイズCompression: 状態ファイルを Gzip圧縮して保存 (-60%)
```

#### ネットワークコスト削減
```
VPC Endpoint 導入 (S3/DynamoDB):
- 転送コスト: $0.01/GB → $0/GB (ただしエンドポイント月額 ~$7)
- 推奨: 本番環境のみ、大規模な状態ファイル転送時

判定基準:
- State Size > 10MB: VPC Endpoint 導入考慮
- State Size < 10MB: 導入不要（転送コストより月額料金が高い）
```

---

## T002: AWS Lambda TypeScript Runtime Best Practices

**目的**: Node.js Lambda でコールドスタート最小化と依存関係管理

### コールドスタート最小化 (Cold Start Optimization)

#### Decision ✅
**Esbuild によるバンドル化 + Node.js 18.x ランタイムを採用**

#### Implementation Strategy
```typescript
// webpack/esbuild.config.js
const config = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  external: [],  // すべてを bundle (node_modules も含める)
  minify: true,
  sourcemap: false,  // 本番環境では false
  
  // Plugins for optimization
  plugins: [
    // 1. Unused dependencies の削除
    // 2. Tree-shaking で dead code 削除
    // 3. Code minification
  ]
}

// 結果: ~5-8MB 単一ファイル → ~15-50KB にコンプレス
```

#### 推定コールドスタート時間
```
条件: Lambda 1024MB メモリ、Node.js 18.x

改善前:
├─ ダウンロード: 100-200ms (AWS管理)
├─ 初期化: 50-100ms
└─ 依存関係読み込み: 200-500ms  → 合計: 350-800ms

改善後 (バンドル化 + 最適化):
├─ ダウンロード: 50-80ms (ファイルサイズ小)
├─ 初期化: 30-50ms
└─ 依存関係読み込み: 50-100ms  → 合計: 130-230ms

削減: 最大 70% の改善
```

#### 実装例
```typescript
// src/index.ts - Lambda handler
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

// グローバルスコープでクライアント初期化（再利用可能）
const dynamoDBClient = new DynamoDBClient({ region: 'ap-northeast-1' });

export const handler = async (event: APIGatewayProxyEvent) => {
  // 1回目のコールドスタート: ~200ms
  // 2回目以降のウォームスタート: ~5-20ms
  
  try {
    const result = await dynamoDBClient.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE!,
        Key: { id: event.pathParameters?.id }
      })
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

---

### 依存関係管理 (Dependency Management)

#### Decision ✅
**npm workspaces + AWS SDK v3 をコアに、厳選したライブラリのみ**

#### 推奨ライブラリ
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400+",
    "@aws-sdk/lib-dynamodb": "^3.400+",
    "@aws-sdk/client-lambda": "^3.400+",
    "@aws-sdk/client-cloudwatch-logs": "^3.400+",
    "zod": "^3.22",
    "winston": "^3.10"
  },
  "devDependencies": {
    "esbuild": "^0.19",
    "typescript": "^5.2",
    "jest": "^29.7",
    "@types/node": "^20"
  }
}
```

#### 非推奨（削減対象）
```
❌ express (API Gateway で十分)
❌ axios (AWS SDK の http client で十分)
❌ moment (Date オブジェクトで十分)
❌ lodash (spread operator で十分)
```

#### 依存関係のロック
```bash
# package-lock.json は必ず git に含める
npm ci  # npm install でなく npm ci を本番環境で使用

# 定期的な依存関係監査
npm audit
npm outdated
```

---

### パッケージ化戦略 (Packaging Strategy)

#### 層構造（Lambda Layers）の利用
```
Lambda Function (本体): ~50-100KB
├─ Layers/aws-sdk: 25-30MB (AWS SDK v3)
├─ Layers/dependencies: 10-20MB (other libs)
└─ Cold Start: 100-150ms

メリット:
- ファイルサイズ小: デプロイ時間短縮
- Layer の再利用: 複数 Lambda で共有
- 更新が容易: Layer のみ更新
```

#### Docker イメージ vs Zip
```
推奨: Zip + Layers (デフォルト)
- Lambda 最適化済みランタイム
- 自動スケーリング最適
- コールドスタート短い (<200ms)

Docker イメージの考慮:
- カスタム OS or native libraries が必要な場合
- コールドスタート許容範囲が広い場合 (500ms+)
- Dockerfile が複雑な場合
```

---

## T003: Terraform Modules Design Patterns

**目的**: 再利用可能で拡張性のあるモジュール設計

### 環境別設定管理 (Environment-Specific Configuration)

#### Decision ✅
**Terraform Workspaces + tfvars ハイブリッド方式**

#### 理由
```
Workspaces のメリット:
✅ state ファイルが分離される
✅ 環境ごとに独立した terraform state
✅ git に環境固有情報を含まない

tfvars のメリット:
✅ バージョン管理可能（git 履歴追跡）
✅ Code Review 可能
✅ IDE サポート良好

ハイブリッド実装:
- Workspaces: 物理的な state 分離 (dev/staging/prod)
- tfvars: 環境固有の変数値 (dev.tfvars, staging.tfvars, prod.tfvars)
```

#### 実装例
```bash
# Workspace の初期化
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# 環境ごとのデプロイ
terraform workspace select dev
terraform apply -var-file=environments/dev.tfvars

terraform workspace select prod
terraform apply -var-file=environments/prod.tfvars -lock=true -lock-timeout=30s
```

### 変数命名規則 (Variable Naming Convention)

#### Decision ✅
**Prefix-based naming で階層化**

```hcl
# variables.tf の命名規則

# グローバル
variable "environment" {}           # dev, staging, prod
variable "aws_region" {}            # ap-northeast-1
variable "project_name" {}          # todo-copilot

# Lambda 層
variable "lambda_memory_size" {}    # 256, 512, 1024 MB
variable "lambda_timeout" {}        # 30, 60, 300 sec
variable "lambda_ephemeral_storage" {} # 512 MB (最小)

# DynamoDB 層
variable "dynamodb_read_capacity" {}     # オンデマンド時は無視
variable "dynamodb_write_capacity" {}    # オンデマンド時は無視
variable "dynamodb_billing_mode" {}      # PAY_PER_REQUEST (推奨)

# 監視層
variable "cloudwatch_log_retention_days" {} # 7, 30, 90

# Tag 層
variable "common_tags" {
  type = map(string)
  default = {
    Project = "todo-copilot"
    Environment = var.environment
    Owner = "DevOps"
    ManagedBy = "Terraform"
  }
}
```

### 出力公開範囲 (Output Scope)

#### Decision ✅
**Root module outputs のみ、モジュール内部は隠蔽**

```hcl
# modules/compute/outputs.tf
# 👇 Public (root module で利用可能)
output "lambda_function_arn" {
  value       = aws_lambda_function.main.arn
  description = "ARN of the Lambda function"
  sensitive   = false
}

output "api_gateway_endpoint" {
  value       = aws_apigatewayv2_stage.prod.invoke_url
  description = "API Gateway endpoint URL"
}

# 👇 Internal (モジュール内部用)
# Lambda IAM role ARN などは Root module では不要
```

---

## T004: Multi-Environment Terraform Strategy

**目的**: dev/staging/prod 環境を安全に管理

### Workspaces vs. tfvars 比較分析

#### 推奨結論 ✅
**Workspaces + tfvars の組み合わせ**

| 項目 | Workspaces | tfvars | 推奨 |
|-----|-----------|--------|------|
| State 分離 | ✅ 完全分離 | ❌ 同一ファイル | Workspaces |
| Version 管理 | ❌ git に含めない | ✅ git 管理可能 | tfvars |
| 環境別設定 | ⚠️ 困難 | ✅ 容易 | tfvars |
| 誤削除防止 | ❌ | ✅ | tfvars |
| 複雑度 | 低 | 低 | **ハイブリッド** |

#### 実装アーキテクチャ
```
infrastructure/terraform/
├── main.tf (共通)
├── variables.tf (共通)
├── outputs.tf (共通)
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── terraform.tfvars (共通デフォルト)
└── modules/
    ├── backend/
    ├── compute/
    └── data/

State 構成:
- Workspace: dev, staging, prod (Workspaces により分離)
- tfvars: environment 別の設定値 (dev.tfvars に dev 用の値)
```

### 環境固有化の粒度 (Granularity Level)

#### Decision ✅
**5段階の粒度で環境制御**

```hcl
# Level 1: リソース存在有無
variable "enable_production_safeguards" {
  default = var.environment == "prod" ? true : false
}

# Level 2: スペック変更
variable "lambda_memory_size" {
  type = number
  default = var.environment == "prod" ? 1024 : 256
}

# Level 3: 数量変更
variable "replica_count" {
  type = number
  default = var.environment == "prod" ? 3 : 1
}

# Level 4: 機能有効化
variable "enable_xray_tracing" {
  default = var.environment == "prod" ? true : false
}

# Level 5: 外部統合
variable "enable_slack_notifications" {
  default = var.environment == "prod" ? true : false
}
```

### CI/CD 統合戦略 (CI/CD Integration)

#### GitHub Actions パイプライン
```yaml
# .github/workflows/terraform-deploy.yml

name: Terraform Deployment

on:
  push:
    branches:
      - main
    paths:
      - 'infrastructure/terraform/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v3
      
      - name: Terraform Init
        run: |
          terraform init \
            -backend-config="key=terraform-${{ matrix.environment }}.tfstate"
      
      - name: Terraform Plan
        run: |
          terraform workspace select ${{ matrix.environment }} || \
          terraform workspace new ${{ matrix.environment }}
          terraform plan -var-file=environments/${{ matrix.environment }}.tfvars
      
      - name: Comment PR with Plan
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Plan for ${{ matrix.environment }}:\n${{ steps.plan.outputs.stdout }}`
            })

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    environment: ${{ matrix.environment }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Terraform Apply
        run: |
          terraform workspace select ${{ matrix.environment }}
          terraform apply -auto-approve \
            -var-file=environments/${{ matrix.environment }}.tfvars
```

---

## T005: AWS IAM Role & Policy Strategy

**目的**: 最小権限原則に基づくロール設計

### 最小権限原則実装 (Least Privilege Implementation)

#### Decision ✅
**ロール分離 + 動的権限付与**

#### ロール設計
```json
{
  "Roles": [
    {
      "Name": "TerraformExecutor",
      "Purpose": "Terraform apply 実行用",
      "Policies": [
        "iam:AssumeRole",
        "s3:GetObject",
        "s3:PutObject",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "apigateway:CreateRestApi",
        "cloudwatch:PutMetricAlarm",
        "sts:AssumeRole"
      ],
      "Conditions": {
        "StringEquals": {
          "sts:ExternalId": "${random_uuid}"
        },
        "IpAddress": {
          "aws:SourceIp": ["10.0.0.0/8"]  # 社内 IP のみ
        }
      }
    },
    {
      "Name": "LambdaExecution",
      "Purpose": "Lambda 実行用",
      "Policies": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "logs:PutLogEvents",
        "xray:PutTraceSegments"
      ],
      "Conditions": {
        "StringEquals": {
          "aws:ResourceTag/Environment": "prod"
        }
      }
    }
  ]
}
```

### チーム別ロール設計 (Team-Based Roles)

```
DevOps Team:
└─ TerraformExecutor (terraform apply/destroy)
   └─ IAMPolicyEditor (IAM設定変更)
   └─ BackendManager (S3/DynamoDB管理)

Developer Team:
└─ LambdaReadOnly (Lambda 関数閲覧)
└─ CloudWatchViewer (ログ・メトリクス閲覧)

Administrator:
└─ AdministratorAccess (フルアクセス、MFA必須)
```

### Terraform管理ロール (Terraform-Managed Roles)

```hcl
# modules/iam/main.tf

resource "aws_iam_role" "terraform_executor" {
  name = "terraform-executor-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::ACCOUNT:root"
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = random_uuid.external_id.result
          }
        }
      }
    ]
  })
  
  tags = var.common_tags
}

resource "aws_iam_role_policy" "terraform_policy" {
  name = "terraform-policy-${var.environment}"
  role = aws_iam_role.terraform_executor.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "dynamodb:*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })
}

# 出力: ロール ARN と外部ID
output "terraform_executor_role_arn" {
  value = aws_iam_role.terraform_executor.arn
}

output "terraform_external_id" {
  value = random_uuid.external_id.result
  sensitive = true
}
```

---

## T006: 調査統合 (Research Integration Summary)

### Key Decisions Summary

| 領域 | Decision | Rationale |
|-----|----------|-----------|
| **Backend** | S3 + DynamoDB + Versioning | State Lock確保、リカバリ可能、チーム共有 |
| **Lambda Runtime** | Esbuild バンドル + Node.js 18.x | Cold Start < 200ms、依存関係管理容易 |
| **Modules** | Terraform Workspaces + tfvars | State 分離 + Version 管理 |
| **Environment** | 5段階の粒度制御 | 柔軟な環境カスタマイズ |
| **IAM** | 最小権限原則 + ロール分離 | セキュリティと管理容易性 |

### リスク評価と対策

| リスク | 確率 | 対策 |
|-------|------|-----|
| State ファイル破損 | 低 | S3 versioning + 自動バックアップ |
| Lambda Cold Start 過長 | 中 | Esbuild 最適化、Provisioned Concurrency |
| IAM 権限過剰付与 | 中 | 定期監査、CloudTrail ログ確認 |
| 環境間の設定ズレ | 中 | Infrastructure as Code + 自動テスト |

### 推奨アクション (Phase 1 への遷移)

- [x] T001: Terraform Backend Strategy 完了
- [x] T002: Lambda TypeScript Runtime 完了
- [x] T003: Terraform Modules Patterns 完了
- [x] T004: Multi-Environment Strategy 完了
- [x] T005: AWS IAM Role & Policy 完了
- [x] T006: 調査統合 完了

**次フェーズ**: Phase 1 - Design & Contracts へ進行
- data-model.md 作成
- API contracts 定義
- quickstart.md 作成

---

**Research Phase 完了日**: 2025-11-22
**Next Phase**: Design & Contracts (Phase 1)
**Estimated Duration**: Phase 1: 8-10 hours

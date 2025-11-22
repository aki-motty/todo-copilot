# AWS Setup & Initialization Guide

**Document**: AWS アカウント初期設定ガイド  
**Target Audience**: DevOps エンジニア、チーム リーダー  
**Last Updated**: 2025-11-22  
**Version**: 1.0

---

## 概要

本ドキュメントは、Todo Copilot アプリケーションを AWS にデプロイするための初期セットアップ手順を説明します。

### 前提条件

- AWS アカウント（本番環境用の独立したアカウント推奨）
- 管理者またはパワーユーザー権限
- AWS CLI v2 がインストールされていること
- Terraform CLI 1.6+ がインストールされていること
- Git がインストールされていること
- 基本的な Unix/Linux コマンド操作の知識

### 推定所要時間

- **初回セットアップ**: 30-45 分
- **各環境への展開**: 10-15 分

---

## 第 1 ステップ: AWS アカウント構築

### 1.1 IAM ユーザーの作成

本番デプロイメント用に専用 IAM ユーザーを作成します。

#### 手順

1. **AWS Management Console にサインイン**
   ```bash
   # AWS CLI を使用する場合
   aws configure
   ```

2. **IAM ユーザーを作成**
   ```bash
   aws iam create-user --user-name terraform-deployer
   ```

3. **プログラムアクセスキーを生成**
   ```bash
   aws iam create-access-key --user-name terraform-deployer
   ```

   出力で以下を安全に保管してください：
   - AccessKeyId
   - SecretAccessKey

4. **ユーザーを IAM グループに追加**（または直接ポリシーをアタッチ）
   ```bash
   aws iam create-group --group-name terraform-deployments
   aws iam add-user-to-group --user-name terraform-deployer --group-name terraform-deployments
   ```

### 1.2 IAM ロール（Terraform Executor）の作成

Terraform が AWS リソースを管理するためのロールを作成します。

```bash
# バックエンドロール（S3 & DynamoDB アクセス）
aws iam create-role \
  --role-name terraform-executor \
  --assume-role-policy-document file://assume-role-policy.json

# 内容: assume-role-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:user/terraform-deployer"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 1.3 IAM ポリシーの作成

Terraform Executor ロールに必要な権限をアタッチします。

```bash
# Terraform 実行に必要な権限
aws iam put-role-policy \
  --role-name terraform-executor \
  --policy-name terraform-execution-policy \
  --policy-document file://terraform-policy.json
```

**terraform-policy.json** の内容:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "lambda:*",
        "apigateway:*",
        "iam:*",
        "logs:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**セキュリティに関する注記**:
- 本番環境では、より細かい権限制御が推奨されます
- `Resource` を特定のARNに限定してください
- 定期的に権限を見直してください

---

## 第 2 ステップ: AWS リージョンの選択

### 2.1 推奨リージョン

| リージョン | 推奨用途 | コスト | レイテンシ |
|----------|--------|------|---------|
| ap-northeast-1（東京）| 日本ユーザー向けデフォルト | 中 | 低 |
| us-east-1（バージニア）| グローバル展開時 | 低 | 中 |
| eu-west-1（アイルランド）| EU ユーザー向け | 中 | 中 |

### 2.2 リージョンの設定

```bash
# 環境変数で設定
export AWS_REGION=ap-northeast-1

# または AWS CLI 設定
aws configure set region ap-northeast-1
```

---

## 第 3 ステップ: S3 バックエンド準備

### 3.1 手動での S3 バックエンド作成

Terraform 状態管理用の S3 バケットを初期化します。

```bash
# 変数設定
ENVIRONMENT=dev
AWS_REGION=ap-northeast-1
BUCKET_NAME=todo-copilot-terraform-state-${ENVIRONMENT}

# S3 バケット作成
aws s3api create-bucket \
  --bucket "${BUCKET_NAME}" \
  --region "${AWS_REGION}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}"

# バージョニング有効化
aws s3api put-bucket-versioning \
  --bucket "${BUCKET_NAME}" \
  --versioning-configuration Status=Enabled

# 暗号化有効化
aws s3api put-bucket-encryption \
  --bucket "${BUCKET_NAME}" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# パブリックアクセスをブロック
aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 3.2 DynamoDB ロックテーブル作成

```bash
# 変数設定
TABLE_NAME=terraform-lock-${ENVIRONMENT}

# DynamoDB テーブル作成
aws dynamodb create-table \
  --table-name "${TABLE_NAME}" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${AWS_REGION}"

# テーブルが作成されるまで待機
aws dynamodb wait table-exists \
  --table-name "${TABLE_NAME}" \
  --region "${AWS_REGION}"
```

---

## 第 4 ステップ: 環境変数の設定

### 4.1 認証情報の設定

```bash
# AWS CLI 認証情報
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=ap-northeast-1
```

### 4.2 Terraform 環境変数

```bash
# .bashrc または .zshrc に追加
export AWS_REGION=ap-northeast-1
export TF_VAR_environment=dev

# または .env ファイルを作成
echo "export AWS_REGION=ap-northeast-1" > infrastructure/.env
```

---

## 第 5 ステップ: プロジェクト初期化

### 5.1 リポジトリのクローン

```bash
git clone https://github.com/your-org/todo-copilot.git
cd todo-copilot
```

### 5.2 Terraform 初期化スクリプトの実行

```bash
# 開発環境
./infrastructure/scripts/init.sh dev

# ステージング環境
./infrastructure/scripts/init.sh staging

# 本番環境（追加の確認が必要）
./infrastructure/scripts/init.sh prod
```

### 5.3 初期化スクリプトの詳細

`init.sh` スクリプトが自動的に以下を実行します：

1. 前提条件のチェック（AWS CLI、Terraform）
2. AWS アカウント ID の確認
3. S3 バックエンドバケットの作成
4. DynamoDB ロックテーブルの作成
5. Terraform ワークスペースの初期化
6. Terraform 設定の検証

---

## 第 6 ステップ: デプロイメント検証

### 6.1 Terraform Plan の実行

```bash
./infrastructure/scripts/plan.sh dev
```

出力内容を確認してください：
- 作成されるリソース数
- リソースの設定内容
- 予想される変更

### 6.2 Terraform Apply の実行

```bash
./infrastructure/scripts/apply.sh dev
```

プロンプトで確認を求められたら `yes` を入力します。

### 6.3 デプロイメント結果の確認

```bash
# Terraform 出力の表示
cd infrastructure/terraform
terraform workspace select dev
terraform output -json

# AWS リソースの確認
aws lambda list-functions --region ap-northeast-1
aws dynamodb list-tables --region ap-northeast-1
aws apigatewayv2 get-apis --region ap-northeast-1
```

---

## トラブルシューティング

### 認証エラー

**問題**: `UnauthorizedOperation` または `AccessDenied` エラー

**解決策**:
```bash
# 認証情報の再設定
aws configure

# 認証情報の確認
aws sts get-caller-identity

# 権限の確認
aws iam get-user
aws iam list-attached-user-policies --user-name terraform-deployer
```

### S3 バケット作成エラー

**問題**: `BucketAlreadyExists` エラー

**解決策**:
```bash
# グローバル一意の名前を使用
# 既存バケトの確認
aws s3 ls | grep terraform-state

# 既存バケトを使用するか、別の名前で作成
```

### DynamoDB テーブル作成エラー

**問題**: `ResourceInUseException` エラー

**解決策**:
```bash
# 既存テーブルの確認
aws dynamodb describe-table --table-name terraform-lock-dev

# テーブルが不要な場合は削除
aws dynamodb delete-table --table-name terraform-lock-dev
```

### Terraform init エラー

**問題**: バックエンド初期化失敗

**解決策**:
```bash
# .terraform ディレクトリをリセット
rm -rf infrastructure/terraform/.terraform
rm -f infrastructure/terraform/.terraform.lock.hcl

# init スクリプトを再実行
./infrastructure/scripts/init.sh dev
```

---

## セキュリティベストプラクティス

### 1. IAM 権限の最小化

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::todo-copilot-state-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/terraform-lock-*"
    }
  ]
}
```

### 2. 状態ファイルの保護

- S3 バージョニング: 有効 ✓
- S3 暗号化: 有効 ✓
- パブリックアクセス: ブロック ✓
- DynamoDB ロック: 有効 ✓

### 3. 認証情報の管理

```bash
# 環境変数の使用（推奨）
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...

# 1Password または AWS Secrets Manager を使用
op run -- terraform apply
```

### 4. 監査ログ

```bash
# CloudTrail でのモニタリング
aws cloudtrail enable-logging --trail-name terraform-audit

# S3 アクセスログの有効化
aws s3api put-bucket-logging \
  --bucket todo-copilot-terraform-state-prod \
  --bucket-logging-status file://logging.json
```

---

## 次のステップ

1. ✓ AWS アカウント初期化
2. ✓ IAM ユーザー作成
3. ✓ S3 & DynamoDB バックエンド作成
4. → **ENVIRONMENTS.md** で環境別設定を確認
5. → **BACKEND.md** で状態管理の詳細を学習
6. → `./infrastructure/scripts/plan.sh` でリソース計画を確認

---

## 参考リソース

- [AWS ドキュメント - IAM](https://docs.aws.amazon.com/iam/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/s3/latest/dev/BestPractices.html)
- [本プロジェクト - quickstart.md](../quickstart.md)

---

**作成者**: DevOps チーム  
**最終更新**: 2025-11-22

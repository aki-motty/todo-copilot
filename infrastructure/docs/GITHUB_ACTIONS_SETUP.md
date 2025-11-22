# GitHub Actions AWS OIDC Setup Guide

**Last Updated**: 2025-11-22  
**Feature**: GitHub Actions AWS Deployment Automation (003-github-actions-deploy)  
**Audience**: DevOps Engineers, AWS Administrators

---

## Overview

This guide provides step-by-step instructions to configure AWS OpenID Connect (OIDC) provider for GitHub Actions. This enables secure, short-lived token authentication without storing long-lived AWS credentials in GitHub secrets.

### Architecture

```
GitHub Actions Job
  ↓ (Issues OIDC Token)
AWS STS
  ↓ (Validates Token)
AWS OIDC Provider (token.actions.githubusercontent.com)
  ↓ (Trusts)
IAM Role (github-actions-role-{dev|staging|prod})
  ↓ (Grants Permissions)
AWS Services (Terraform, Lambda, etc.)
```

### Benefits

- ✅ **Short-lived tokens**: 15-minute expiration (no long-lived credentials)
- ✅ **Audit trail**: All token usage logged in CloudTrail
- ✅ **No secret rotation**: GitHub Actions auto-refreshes tokens
- ✅ **Least privilege**: Each job uses specific environment role
- ✅ **Zero-trust**: Token includes job metadata (repo, branch, workflow)

---

## Prerequisites

**Required Access**:
- AWS Account ID: `446713282258` (ap-northeast-1)
- AWS IAM permissions: `iam:CreateOpenIDConnectProvider`, `iam:CreateRole`, `iam:AttachRolePolicy`
- GitHub Organization: `aki-motty` (admin access to repository settings)
- Repository: `todo-copilot`

**Already Completed** (Feature 002):
- S3 bucket: `TODO_STATE_BUCKET` (stores Terraform state)
- DynamoDB table: `terraform-locks` (state locking)
- Terraform backend configured

---

## Step 1: Create AWS OIDC Provider

### 1.1 Get OIDC Provider Information

GitHub Actions OIDC provider details:
- **Provider URL**: `https://token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`
- **Thumbprint**: `6938FD4D98BAB503D5EB8D237B44B7D5ABD7BED4` (as of 2025-11)

### 1.2 Create OIDC Provider in AWS

**Using AWS CLI**:

```bash
# 信頼ポリシー JSON ファイルを作成
cat > /tmp/trust-policy-dev.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::446713282258:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:aki-motty/todo-copilot:ref:refs/heads/develop"
        }
      }
    }
  ]
}
EOF

# ロール作成
aws iam create-role \
  --role-name github-actions-terraform-deploy-dev \
  --assume-role-policy-document file:///tmp/trust-policy-dev.json \
  --profile terraform-dev
```

#### Staging 環境用ロール

```bash
# 信頼ポリシー JSON ファイルを作成
cat > /tmp/trust-policy-staging.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::446713282258:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:aki-motty/todo-copilot:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# ロール作成
aws iam create-role \
  --role-name github-actions-terraform-deploy-staging \
  --assume-role-policy-document file:///tmp/trust-policy-staging.json \
  --profile terraform-dev
```

#### 本番環境用ロール

```bash
# 信頼ポリシー JSON ファイルを作成
cat > /tmp/trust-policy-prod.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::446713282258:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:aki-motty/todo-copilot:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# ロール作成
aws iam create-role \
  --role-name github-actions-terraform-deploy-prod \
  --assume-role-policy-document file:///tmp/trust-policy-prod.json \
  --profile terraform-dev
```

### Step 3: ポリシーをロールにアタッチ

各ロールに Terraform 実行権限を付与します。

```bash
# Dev ロール用ポリシー
cat > /tmp/policy-dev.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::todo-copilot-terraform-state-dev-446713282258",
        "arn:aws:s3:::todo-copilot-terraform-state-dev-446713282258/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:DescribeTable",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:446713282258:table/todo-copilot-terraform-locks-dev"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "iam:*",
        "logs:*",
        "ec2:*",
        "cloudformation:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-northeast-1"
        }
      }
    }
  ]
}
EOF

# ポリシー作成・アタッチ
aws iam put-role-policy \
  --role-name github-actions-terraform-deploy-dev \
  --policy-name terraform-deploy-policy \
  --policy-document file:///tmp/policy-dev.json \
  --profile terraform-dev
```

### Step 4: ロール ARN を確認

```bash
# Dev ロール ARN
aws iam get-role \
  --role-name github-actions-terraform-deploy-dev \
  --query 'Role.Arn' \
  --output text \
  --profile terraform-dev
# Output: arn:aws:iam::446713282258:role/github-actions-terraform-deploy-dev

# Staging ロール ARN
aws iam get-role \
  --role-name github-actions-terraform-deploy-staging \
  --query 'Role.Arn' \
  --output text \
  --profile terraform-dev

# Prod ロール ARN
aws iam get-role \
  --role-name github-actions-terraform-deploy-prod \
  --query 'Role.Arn' \
  --output text \
  --profile terraform-dev
```

---

## 2️⃣ GitHub 側の設定

### Step 1: リポジトリ Secrets を設定

GitHub リポジトリの **Settings** → **Secrets and variables** → **Actions** で以下を設定：

#### AWS OIDC ロール ARN

| Secret 名 | 値 | 例 |
|-----------|-----|-----|
| `AWS_ROLE_TO_ASSUME_DEV` | Dev 環境ロール ARN | `arn:aws:iam::446713282258:role/github-actions-terraform-deploy-dev` |
| `AWS_ROLE_TO_ASSUME_STAGING` | Staging 環境ロール ARN | `arn:aws:iam::446713282258:role/github-actions-terraform-deploy-staging` |
| `AWS_ROLE_TO_ASSUME_PROD` | 本番環境ロール ARN | `arn:aws:iam::446713282258:role/github-actions-terraform-deploy-prod` |

#### Terraform State 管理

| Secret 名 | 値 | 例 |
|-----------|-----|-----|
| `TF_STATE_BUCKET` | S3 バケット名 | `todo-copilot-terraform-state-dev-446713282258` |
| `TF_LOCK_TABLE` | DynamoDB テーブル名 | `todo-copilot-terraform-locks-dev` |

#### 通知設定（オプション）

| Secret 名 | 値 | 取得方法 |
|-----------|-----|---------|
| `SLACK_WEBHOOK_URL` | Slack ウェブフック | Slack App 管理画面から取得 |

### Step 2: Environment を作成（オプション・推奨）

**Settings** → **Environments** で各環境を作成し、required reviewers を設定：

**Development 環境:**
- Required reviewers: 1 人以上

**Staging 環境:**
- Required reviewers: 1 人以上

**Production 環境:**
- Required reviewers: 2 人以上

---

## 3️⃣ デプロイ手順

### Dev 環境（自動デプロイ）

```bash
# develop ブランチへマージしプッシュすると自動デプロイ
git checkout -b feature/xxx
git commit -m "feat: add new feature"
git push origin feature/xxx

# PR 作成・マージ
# → PR マージ時に develop へ自動反映
# → GitHub Actions が自動実行
# → Dev 環境に自動デプロイ
```

### Staging 環境（手動承認）

```bash
# main ブランチへマージ
git checkout main
git pull origin main
git merge feature/xxx
git push origin main

# コミットメッセージに [deploy-staging] を含める
git commit -m "[deploy-staging] Deploy to staging environment"

# または、手動トリガー:
# GitHub Actions ページから workflow_dispatch で実行
```

**流れ:**
1. Terraform plan が実行される
2. devops-team のメンバーが承認ボタンをクリック
3. Terraform apply が実行される

### 本番環境（ダブル承認）

```bash
# main ブランチで作成
git checkout main
git pull origin main

# コミットメッセージに [deploy-prod] を含める
git commit -m "[deploy-prod] Deploy to production"
git push origin main

# または、タグでデプロイ（推奨）:
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

**流れ:**
1. Terraform plan が実行される
2. devops-team のメンバーが承認
3. security-team のメンバーが承認
4. Terraform apply が実行される

---

## 🔍 デプロイ状況確認

### GitHub Actions ページで確認

1. **Workflow を確認**: `.github/workflows/terraform-ci.yml` が成功しているか
2. **Job ログを確認**: 各 job のログで詳細を確認
3. **Deployment タブ**: Environment ごとの デプロイ履歴

### AWS リソース確認

```bash
# Dev 環境リソース確認
export AWS_PROFILE=terraform-dev
export AWS_REGION=ap-northeast-1
terraform workspace select dev
terraform output

# Lambda ログ確認
aws logs tail /aws/lambda/todo-copilot-api-dev --follow

# 状態ロック確認（デプロイ中の場合）
aws dynamodb scan \
  --table-name todo-copilot-terraform-locks-dev \
  --profile terraform-dev
```

---

## 🚨 トラブルシューティング

### 問題 1: "AssumeRole failed" エラー

**原因**: GitHub OIDC プロバイダーが AWS に登録されていない

**解決:**
```bash
# OIDC プロバイダーを確認
aws iam list-open-id-connect-providers --profile terraform-dev

# 登録されていない場合は、Step 1 を実行
```

### 問題 2: Secrets が未設定

**原因**: GitHub Secrets に値が入っていない

**確認**:
```bash
# GitHub の Settings → Secrets で確認
# 各 Secret の値が正しく設定されているか確認
```

### 問題 3: Terraform State ロック

**原因**: 前回のデプロイが完了せず、ロックが残っている

**解決:**
```bash
# ロック確認
aws dynamodb scan \
  --table-name todo-copilot-terraform-locks-dev \
  --profile terraform-dev

# ロック解除（手動）
terraform force-unlock <LOCK_ID>
```

### 問題 4: OIDC トークン有効期限切れ

**原因**: GitHub Actions セッション期限切れ

**解決**: ワークフローを再実行（自動的にリセット）

---

## 📚 参考資料

- [GitHub - Configure OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [AWS - Using OpenID Connect with GitHub](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- [Terraform - AWS Provider Authentication](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#authentication-and-configuration)

---

## ✅ チェックリスト

**AWS 側の設定:**
- [ ] GitHub OIDC プロバイダーを作成
- [ ] Dev 環境用 IAM ロールを作成
- [ ] Staging 環境用 IAM ロールを作成
- [ ] 本番環境用 IAM ロールを作成
- [ ] 各ロールにポリシーをアタッチ
- [ ] ロール ARN を記録

**GitHub 側の設定:**
- [ ] `AWS_ROLE_TO_ASSUME_DEV` Secret を設定
- [ ] `AWS_ROLE_TO_ASSUME_STAGING` Secret を設定
- [ ] `AWS_ROLE_TO_ASSUME_PROD` Secret を設定
- [ ] `TF_STATE_BUCKET` Secret を設定
- [ ] `TF_LOCK_TABLE` Secret を設定
- [ ] `SLACK_WEBHOOK_URL` Secret を設定（オプション）
- [ ] Development Environment を作成
- [ ] Staging Environment を作成
- [ ] Production Environment を作成

**テスト:**
- [ ] Dev 環境へのデプロイテスト
- [ ] Staging 環境へのデプロイテスト
- [ ] 本番環境へのデプロイテスト（ドライラン）

---

**Last Updated**: 2025-11-22  
**Next Step**: AWS OIDC プロバイダーの設定実施  
**Maintainer**: DevOps Team

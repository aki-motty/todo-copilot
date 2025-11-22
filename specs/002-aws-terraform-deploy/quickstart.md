# Quick Start Guide: AWS Terraform デプロイ

**Feature**: AWS上でTerraformを利用してTodo アプリケーションをデプロイするための準備  
**Feature Branch**: `002-aws-terraform-deploy`  
**Created**: 2025-11-22  
**Target Audience**: DevOps engineers, cloud architects

---

## 1. Prerequisites

### 1.1 AWS Account Setup

#### Requirements
- AWS Account (single account, assumed)
- Appropriate IAM permissions (Administrator or custom role)
- AWS CLI configured with credentials

#### AWS CLI Installation & Configuration

```bash
# Step 1: Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
# Expected: aws-cli/2.13.x Python/x.x.x

# Step 2: Configure AWS credentials
aws configure --profile todo-copilot

# When prompted, enter:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: ap-northeast-1
# Default output format: json

# Step 3: Verify configuration
aws s3 ls --profile todo-copilot
# Should list your S3 buckets
```

#### Create IAM User for Terraform

```bash
# Create IAM user
aws iam create-user --user-name terraform-executor --profile todo-copilot

# Attach policy (inline or managed)
aws iam put-user-policy \
  --user-name terraform-executor \
  --policy-name terraform-policy \
  --policy-document file://terraform-policy.json \
  --profile todo-copilot

# Create access keys
aws iam create-access-key --user-name terraform-executor --profile todo-copilot
# Save the Access Key ID and Secret Access Key
```

### 1.2 Terraform Installation

#### Requirements
- Terraform CLI 1.6.x or later
- HCL2 support
- AWS Provider 5.x

#### Installation Steps

```bash
# Option 1: Using Terraform official installer
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Option 2: Using package manager (Ubuntu/Debian)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update
sudo apt install terraform

# Verify installation
terraform -version
# Expected: Terraform v1.6.0 on linux_amd64
```

### 1.3 Git & Node.js

#### Git Setup
```bash
# Verify Git installation
git --version
# Expected: git version 2.x.x

# Configure Git (first time)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### Node.js Setup (for Lambda development)
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 1.4 Verification Checklist

```bash
# Run all checks
echo "AWS CLI:"        && aws --version
echo "Terraform:"      && terraform -version
echo "Git:"            && git --version
echo "Node.js:"        && node --version
echo "npm:"            && npm --version

# AWS Connectivity
aws ec2 describe-regions --profile todo-copilot | head -5
# Should return JSON with regions

# Expected output:
# AWS CLI: aws-cli/2.13.x Python/x.x.x Linux/x.x.x
# Terraform: Terraform v1.6.0
# Git: git version 2.x.x
# Node.js: v18.x.x
# npm: x.x.x
```

---

## 2. AWS Account Initialization

### 2.1 Create S3 Backend Bucket

S3 バケットを Terraform state 保存用に作成します。

```bash
# Variables
AWS_REGION="ap-northeast-1"
ENVIRONMENT="prod"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create S3 bucket (bucket name must be globally unique)
S3_BUCKET_NAME="todo-copilot-terraform-state-${ENVIRONMENT}-${ACCOUNT_ID}"

aws s3api create-bucket \
  --bucket ${S3_BUCKET_NAME} \
  --region ${AWS_REGION} \
  --create-bucket-configuration LocationConstraint=${AWS_REGION}

# Enable versioning (for state recovery)
aws s3api put-bucket-versioning \
  --bucket ${S3_BUCKET_NAME} \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket ${S3_BUCKET_NAME} \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket ${S3_BUCKET_NAME} \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "S3 bucket created: ${S3_BUCKET_NAME}"
```

### 2.2 Create DynamoDB Lock Table

DynamoDB テーブルを state locking 用に作成します。

```bash
DYNAMODB_TABLE_NAME="terraform-lock-${ENVIRONMENT}"

aws dynamodb create-table \
  --table-name ${DYNAMODB_TABLE_NAME} \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}

# Wait for table to be created
aws dynamodb wait table-exists \
  --table-name ${DYNAMODB_TABLE_NAME} \
  --region ${AWS_REGION}

echo "DynamoDB lock table created: ${DYNAMODB_TABLE_NAME}"
```

### 2.3 Store Backend Configuration

バックエンド設定を保存します（後の初期化で使用）。

```bash
# Create backend config file
cat > infrastructure/terraform/backend-config.hcl << EOF
bucket         = "${S3_BUCKET_NAME}"
key            = "terraform.tfstate"
region         = "${AWS_REGION}"
dynamodb_table = "${DYNAMODB_TABLE_NAME}"
encrypt        = true
EOF

echo "Backend configuration saved to backend-config.hcl"
```

---

## 3. Project Initialization

### 3.1 Clone Repository & Setup

```bash
# Clone or navigate to repository
cd /workspaces/todo-copilot

# Verify branch (should be 002-aws-terraform-deploy)
git branch --show-current
# Expected output: 002-aws-terraform-deploy

# Setup project structure
mkdir -p infrastructure/terraform/{modules,environments}
mkdir -p infrastructure/terraform/modules/{compute,data,iam}

# Copy starter files (pre-created in Phase 0)
# - Plan: specs/002-aws-terraform-deploy/plan.md
# - Research: specs/002-aws-terraform-deploy/research.md
# - Data Model: specs/002-aws-terraform-deploy/data-model.md
# - Contracts: specs/002-aws-terraform-deploy/contracts/
```

### 3.2 Terraform Initialization

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform (downloads AWS provider)
terraform init \
  -backend-config=backend-config.hcl

# Expected output:
# Initializing the backend...
# Successfully configured the backend "s3"!
# Initializing provider plugins...
# - Installing hashicorp/aws v5.x.x...
# Terraform has been successfully initialized!

# Verify state
terraform workspace list
# Expected: 
#   default
# * (no workspace created yet)

# Create workspaces for environments
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# List workspaces
terraform workspace list
# Expected:
#   default
# * dev
#   prod
#   staging

# Switch to prod workspace
terraform workspace select prod
```

### 3.3 Verify Configuration

```bash
# Check Terraform files
terraform validate

# Expected output:
# Success! The configuration is valid.

# Create plan (dry-run)
terraform plan -var-file=environments/prod.tfvars -out=tfplan

# Expected output:
# Plan: X to add, 0 to change, 0 to destroy.
```

---

## 4. Environment Configuration

### 4.1 Create tfvars Files

環境別の変数ファイルを作成します。

```bash
# Create dev environment
cat > environments/dev.tfvars << 'EOF'
environment                = "dev"
aws_region                 = "ap-northeast-1"
project_name               = "todo-copilot"
lambda_memory_size         = 256
lambda_timeout             = 30
cloudwatch_log_retention_days = 7

common_tags = {
  Project     = "todo-copilot"
  Environment = "dev"
  Owner       = "devops@example.com"
}
EOF

# Create staging environment
cat > environments/staging.tfvars << 'EOF'
environment                = "staging"
aws_region                 = "ap-northeast-1"
project_name               = "todo-copilot"
lambda_memory_size         = 512
lambda_timeout             = 60
cloudwatch_log_retention_days = 30

common_tags = {
  Project     = "todo-copilot"
  Environment = "staging"
  Owner       = "devops@example.com"
}
EOF

# Create prod environment
cat > environments/prod.tfvars << 'EOF'
environment                = "prod"
aws_region                 = "ap-northeast-1"
project_name               = "todo-copilot"
lambda_memory_size         = 1024
lambda_timeout             = 300
cloudwatch_log_retention_days = 365

common_tags = {
  Project     = "todo-copilot"
  Environment = "prod"
  Owner       = "devops@example.com"
}
EOF

echo "Environment files created"
```

### 4.2 Verify tfvars

```bash
# Validate each environment
for env in dev staging prod; do
  echo "=== $env ==="
  terraform validate -var-file=environments/${env}.tfvars
done
```

---

## 5. Deployment Workflow

### 5.1 Development Environment

```bash
# Select dev workspace
terraform workspace select dev

# Create plan
terraform plan \
  -var-file=environments/dev.tfvars \
  -out=tfplan-dev

# Review plan output
terraform show tfplan-dev

# Apply (development only - usually automatic)
terraform apply tfplan-dev

# Verify deployment
terraform output -json

# Expected outputs:
# - api_gateway_endpoint
# - lambda_function_arn
# - dynamodb_table_name
```

### 5.2 Staging Environment

```bash
# Select staging workspace
terraform workspace select staging

# Create plan
terraform plan \
  -var-file=environments/staging.tfvars \
  -out=tfplan-staging

# Review in PR (if using CI/CD)
# Create PR with plan output

# Approve and apply
terraform apply tfplan-staging
```

### 5.3 Production Environment (with Safeguards)

```bash
# Select prod workspace
terraform workspace select prod

# Create plan (locked)
terraform plan \
  -var-file=environments/prod.tfvars \
  -lock=true \
  -lock-timeout=30s \
  -out=tfplan-prod

# Manual review
terraform show tfplan-prod

# Require human approval (via Slack/email)
# Once approved:

terraform apply \
  -lock=true \
  -lock-timeout=30s \
  tfplan-prod

# Verify deployment
terraform output -json
```

---

## 6. Validation & Testing

### 6.1 Verify Deployed Resources

```bash
# Check Lambda function
aws lambda get-function \
  --function-name todo-copilot-api-prod \
  --query 'Configuration.[FunctionName,Runtime,MemorySize,Timeout]' \
  --output table

# Check DynamoDB table
aws dynamodb describe-table \
  --table-name todo-copilot-prod \
  --query 'Table.[TableName,TableStatus,BillingModeSummary]' \
  --output table

# Check API Gateway
aws apigatewayv2 get-apis \
  --query 'Items[?Name==`todo-copilot-api-prod`].[Name,ProtocolType]' \
  --output table
```

### 6.2 Test API Endpoint

```bash
# Get API endpoint from Terraform outputs
API_ENDPOINT=$(terraform output -raw api_gateway_endpoint)

# Test GET /todos
curl ${API_ENDPOINT}/todos \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# Test POST /todos
curl ${API_ENDPOINT}/todos \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Todo",
    "description": "This is a test",
    "priority": "high"
  }' \
  -w "\nStatus: %{http_code}\n"
```

### 6.3 Monitor CloudWatch Logs

```bash
# View recent logs
aws logs tail /aws/lambda/todo-copilot-api-prod \
  --follow \
  --format short

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/todo-copilot-api-prod \
  --filter-pattern "ERROR" \
  --query 'events[*].[timestamp,message]' \
  --output table
```

---

## 7. Troubleshooting

### 7.1 Common Issues

#### Issue: "Error: Error acquiring the state lock"
**Cause**: Another terraform operation is in progress  
**Solution**:
```bash
# Check lock status
aws dynamodb get-item \
  --table-name terraform-lock-prod \
  --key '{"LockID": {"S": "todo-copilot-terraform-state-prod/terraform.tfstate"}}'

# Force unlock (last resort)
aws dynamodb delete-item \
  --table-name terraform-lock-prod \
  --key '{"LockID": {"S": "..."}}'
```

#### Issue: "Error: Invalid provider version constraint"
**Cause**: AWS provider version mismatch  
**Solution**:
```bash
# Remove local Terraform cache
rm -rf .terraform/

# Reinitialize
terraform init -upgrade
```

#### Issue: "Access Denied" when accessing DynamoDB
**Cause**: Lambda IAM permissions missing  
**Solution**: Verify IAM role policy in `modules/iam/`

### 7.2 Recovery Procedures

```bash
# Restore from S3 version history
aws s3api get-object \
  --bucket ${S3_BUCKET_NAME} \
  --key terraform.tfstate \
  --version-id <version-id> \
  terraform.tfstate.backup

# State refresh
terraform refresh
```

---

## 8. Next Steps

### 8.1 Post-Deployment

1. **Monitor**: Set up CloudWatch dashboards
2. **Backup**: Enable DynamoDB backups
3. **Scaling**: Configure Lambda concurrency
4. **Security**: Review IAM policies, enable MFA

### 8.2 CI/CD Integration

- Set up GitHub Actions for automated deployment
- Configure approve/apply workflow
- Add pre-deployment tests

### 8.3 Documentation

- Document custom modifications
- Keep tfvars secrets in AWS Secrets Manager
- Maintain runbook for manual interventions

---

## 9. Useful Commands Reference

```bash
# Planning & Deployment
terraform fmt -recursive           # Format all HCL files
terraform validate                # Validate configuration
terraform plan -var-file=...      # Create plan
terraform apply -auto-approve     # Auto-apply plan
terraform destroy                 # Destroy all resources

# State Management
terraform state list              # List all resources
terraform state show <resource>   # Show resource details
terraform state rm <resource>     # Remove from state
terraform import <resource> <id>  # Import AWS resource

# Debugging
terraform console                 # Interactive console
terraform graph | dot -Tpng > graph.png  # Dependency graph
terraform debug                   # Enable debug logs
TF_LOG=DEBUG terraform apply      # Full debug output

# Workspace Management
terraform workspace list          # List workspaces
terraform workspace new <name>    # Create workspace
terraform workspace select <name> # Switch workspace
terraform workspace delete <name> # Delete workspace
```

---

**Version**: 1.0  
**Last Updated**: 2025-11-22  
**Estimated Time to Complete**: 1-2 hours  
**Next Phase**: Phase 2 - Infrastructure Implementation

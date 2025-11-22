aws_region        = "ap-northeast-1"
project_name      = "todo-copilot"
state_bucket_name = "todo-copilot-terraform-state-dev-446713282258"
lock_table_name   = "todo-copilot-terraform-locks-dev"

common_tags = {
  Environment = "dev"
  Team        = "DevOps"
  CreatedDate = "2025-11-22"
}

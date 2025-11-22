environment         = "staging"
aws_region          = "ap-northeast-1"
project_name        = "todo-copilot"
lambda_memory_size  = 512
lambda_timeout      = 60

common_tags = {
  Project     = "todo-copilot"
  Environment = "staging"
  Owner       = "devops@example.com"
}

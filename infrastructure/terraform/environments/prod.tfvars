environment         = "prod"
aws_region          = "ap-northeast-1"
project_name        = "todo-copilot"
lambda_memory_size  = 1024
lambda_timeout      = 300

common_tags = {
  Project     = "todo-copilot"
  Environment = "prod"
  Owner       = "devops@example.com"
}

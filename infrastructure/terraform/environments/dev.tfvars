environment        = "dev"
aws_region         = "ap-northeast-1"
project_name       = "todo-copilot"
lambda_memory_size = 256
lambda_timeout     = 30

common_tags = {
  Project     = "todo-copilot"
  Environment = "dev"
  Owner       = "devops@example.com"
}

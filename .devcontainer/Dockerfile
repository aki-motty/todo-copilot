# Devcontainer for AWS Lambda (Rust & TypeScript) + Terraform
FROM mcr.microsoft.com/vscode/devcontainers/base:ubuntu-22.04


# Install Node.js (for TypeScript)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs


# Install Terraform
RUN apt-get update && \
    apt-get install -y gnupg software-properties-common curl && \
    curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update && apt-get install -y terraform


# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    apt-get install -y unzip && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws


# Install Python 3.11+ and pip, then uv (Python package manager)
RUN apt-get update && \
    apt-get install -y python3.11 python3.11-venv python3.11-distutils python3-pip && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    pip3 install --upgrade pip && \
    pip3 install uv

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Set default shell
SHELL ["/bin/bash", "-c"]

# Data Model & Workflow Design

## Entities

### CI Workflow (`app-ci.yml`)

The workflow will be defined with the following structure:

```yaml
name: Application CI

on:
  push:
    branches: [ "main" ]
    paths: [ "src/**", "package.json", "biome.json" ]
  pull_request:
    branches: [ "main" ]
    paths: [ "src/**", "package.json", "biome.json" ]

jobs:
  lint:
    name: Lint & Format (Biome)
    steps:
      - Checkout
      - Setup Node
      - Install Dependencies
      - Run Biome Check

  test:
    name: Unit Tests
    steps:
      - Checkout
      - Setup Node
      - Install Dependencies
      - Run Jest

  security:
    name: Security Scan (CodeQL)
    steps:
      - Checkout
      - Initialize CodeQL
      - Build (if necessary)
      - Perform Analysis
```

### Lint Report
- **Source**: Biome
- **Format**: Console output (standard), potentially SARIF if configured (but console is fine for MVP).
- **Failure Condition**: Any lint error or formatting violation.

### Security Alert
- **Source**: CodeQL
- **Format**: SARIF (uploaded to GitHub Security tab).
- **Severity**: Low, Medium, High, Critical.

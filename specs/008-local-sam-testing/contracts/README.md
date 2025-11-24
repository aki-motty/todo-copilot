# API Contracts: Local SAM Testing

**Feature**: Local SAM Testing
**Date**: 2025-11-23

## Overview

The local SAM environment mirrors the production API contract exactly. No new API endpoints or contract changes are introduced by this feature.

## Reference

Please refer to the main API documentation or the existing OpenAPI specification for the project.

## Local Deviations

The only deviation in the local environment is the **Authentication** mechanism:

- **Production**: Google OAuth 2.0 (Bearer Token)
- **Local**: Mock Authentication (Accepts any token, injects `test-user-1` identity)

This deviation is transparent to the API contract (endpoints, request/response bodies remain the same).

# expense-claim-policy-assistant
# Expense Claim Policy Review Assistant

An AI-assisted expense claim review system that combines deterministic policy validation, RAG-based policy retrieval, and Gemini-powered reasoning to help reviewers evaluate employee expense claims.

The system follows a **Human-in-the-Loop** approach: AI provides policy-grounded analysis and recommendations, while the final decision always remains with the human reviewer.

---

## Overview

The Expense Claim Policy Review Assistant helps organizations review employee expense claims against predefined expense policies.

Each claim goes through:

1. Deterministic validation
2. Policy retrieval using RAG
3. AI-powered compliance review
4. Human reviewer decision
5. Audit logging
6. Employee tracking and clarification workflow

The system is designed so that AI does not independently approve or reject claims.

---

## Key Features

- Employee and reviewer authentication
- Role-based access control
- Expense claim creation and management
- Deterministic policy validation
- Category-based spending limits
- Receipt validation
- Future-date validation
- Duplicate claim detection
- RAG-based policy retrieval
- Local HuggingFace embeddings
- Gemini-powered claim review
- AI confidence scoring
- Policy evidence attached to AI reviews
- Human reviewer approval/rejection
- Reviewer override of AI recommendations
- Clarification request and response workflow
- Complete audit history
- Employee claim tracking
- Reviewer dashboard with filtering and search

---

## System Workflow

```text
                Employee
                   |
                   v
            Submit Expense Claim
                   |
                   v
        +-------------------------+
        | Deterministic Validator |
        +-------------------------+
                   |
          Validation Results
                   |
                   v
        +-------------------------+
        |   Policy Retrieval RAG  |
        +-------------------------+
                   |
          Relevant Policy Sections
                   |
                   v
        +-------------------------+
        |     Gemini AI Review    |
        +-------------------------+
                   |
        AI Classification
        + Confidence
        + Reasoning
        + Policy Evidence
                   |
                   v
           Human Reviewer
                   |
        +----------+----------+
        |          |          |
      Approve    Reject   Clarification
        |          |          |
        +----------+----------+
                   |
                   v
              Audit History

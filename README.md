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


The employee can view the clarification request and submit the required information from the claim details page.
📜 Audit Trail
The system maintains an audit history for important claim lifecycle events.
Tracked actions include:
- Claim creation
- Claim validation
- AI review
- Reviewer decisions
- Clarification responses
Reviewer decisions also record relevant status transitions, notes, and timestamps.
🛠️ Tech Stack
Frontend
- React
- Vite
- Tailwind CSS
- React Router
- Axios
Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
AI / RAG
- Google Gemini
- @google/genai
- HuggingFace Transformers
- Xenova/all-MiniLM-L6-v2
- MongoDB-based vector storage
- Cosine similarity retrieval
📁 Project Structure
ExpenseClaimAssistant/
│
├── client/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── ...
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── data/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
│
├── .env.example
├── .gitignore
└── README.md

🔐 Environment Variables
Create a .env file inside the server directory.
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

Never commit actual API keys, database credentials, passwords, or JWT secrets to the repository.
⚙️ Installation & Setup
1. Clone the repository
git clone <repository-url>
cd ExpenseClaimAssistant

2. Install backend dependencies
cd server
npm install

3. Configure environment variables
Create:
server/.env

and add the required environment variables.
4. Install frontend dependencies
cd ../client
npm install

5. Start the backend
cd ../server
npm run dev

6. Start the frontend
Open another terminal:
cd client
npm run dev

📚 Policy Ingestion
The expense policy can be processed and stored for semantic retrieval using:
cd server
npm run ingest-policy

This loads the policy document, creates embeddings, and stores the policy chunks in MongoDB.
🔄 Example Review Flow
Example Claim
Category: Travel
Amount: ₹12,000
Currency: INR
Receipt: Available
Description: Business travel expense

Rule Validation
The configured Travel policy limit is ₹10,000.
The deterministic validation engine therefore identifies the claim as exceeding the applicable limit.
RAG Retrieval
The system retrieves the relevant Travel policy section from the policy knowledge base.
AI Review
Gemini receives the claim, validation result, and retrieved policy evidence and generates a structured review.
The reviewer can then inspect:
- Validation results
- AI classification
- Confidence
- Reasoning
- Retrieved policy evidence
before making the final decision.
🔒 Security
The application includes:
- JWT-based authentication
- Password hashing using bcrypt
- Role-based authorization
- Employee claim ownership checks
- Reviewer-only decision endpoints
- Environment-based secret management
- Protected reviewer workflows
Sensitive credentials are excluded from version control using .gitignore.
🎯 Project Objective
The goal of this project is to demonstrate how traditional business rules, Retrieval-Augmented Generation, LLM reasoning, and human review can be combined into a practical enterprise AI workflow.
The architecture intentionally avoids making the LLM the final authority and instead uses AI as an assistant to support human decision-making.
🚀 Future Improvements
Potential future improvements include:
- Advanced analytics and reporting
- Production deployment
- Policy versioning
- More configurable organizational policies
- Notification system
- Advanced reviewer analytics


👨‍💻 Author
Dhruv Rana
B.Tech Information Technology
IIIT Una

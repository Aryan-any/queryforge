# QueryForge
**Autonomous Conversational Business Intelligence Platform**

QueryForge is a production-level text-to-SQL platform that dynamically translates natural language into secure PostgreSQL queries. It auto-generates responsive chart visualizations and provides users with an ad-hoc dashboard sharing environment.

---

## Overview

QueryForge acts as a bridge between complex relational databases and non-technical stakeholders. By securely mounting PostgreSQL schemas, it introspects metadata and allows users to ask analytical questions in plain English. The platform utilizes frontier language models to compile secure SQL queries, executes them against the database, and automatically routes the returned numerical and categorical data into visual Recharts components configured for custom dashboarding.

---

## Key Features

- **Natural Language Queries**: Pass complex English business questions into dynamic SQL without relying on third-party analytical wrappers.
- **Database Connection Pooling**: Securely connect to custom PostgreSQL instances or utilize the platform’s localized, read-only demo database.
- **One-Click Schema Analysis**: Automatically introspects schema metadata, extracting tables, column data types, and foreign key relationships for reference.
- **Auto-Generated Visualizations**: A heuristic React charting engine intercepts JSON result arrays and autonomously renders the most accurate chart type (bar, line, pie, scatter, table).
- **Shareable Ad-Hoc Dashboards**: Persist SQL widget snapshots natively within the backend. Dashboards can be securely shared across the internet as stateless read-only links.

---

## Architecture

- **Frontend Layer**: A React 18 application scaffolded with Vite. It relies on Zustand for global client state synchronization and React-Grid-Layout for resolving responsive widget dimensions.
- **Backend API**: A Node.js Express server establishing authenticated REST endpoints, guarding the SQL compilation pipeline through express-session mechanisms.
- **LLM Flow**: The backend interfaces safely with OpenAI, Anthropic, or Gemini through raw SDK initialization. It injects the context of the user’s database schemas and three rows of sample data directly into the system prompt payload.
- **Database Engine**: The schema introspector and query executor utilize `pg` (node-postgres) to manage robust connection pooling, isolating connections effectively against concurrent load.

---

## Tech Stack

**Backend**
- Node.js
- Express
- TypeScript
- node-postgres (`pg`)

**Frontend**
- React
- Vite
- Zustand
- React-Grid-Layout

**Charts**
- Recharts

**LLM integrations**
- OpenAI
- Anthropic
- Gemini

---

## Project Structure

**`/backend`**  
- `controllers`
- `db`
- `llm`
- `middleware`
- `services`
- `utils`
- `validators`

**`/frontend`**  
- `components`
- `pages`
- `services`
- `stores`
- `utils`

---

## Setup Instructions

1. Clone the repository to your local machine.
2. Open two dedicated terminal windows. In the first terminal, navigate to the `/backend` directory and install dependencies via `npm install`. In the second terminal, navigate to the `/frontend` directory and run `npm install`.
3. Duplicate the `.env.example` file in the backend folder, rename it to `.env`, and populate your database and authentication configuration strings. Ensure you also configure the `.env` file within the frontend directory.
4. In the backend terminal, initialize the mock database data by running the script `npm run seed`. 
5. Start the local development instances sequentially:
   - In the backend terminal, execute `npm run dev`. 
   - In the frontend terminal, execute `npm run dev`. 
6. Connect to the platform using the localhost GUI path provided by Vite.

---

## Environment Variables

- **`PORT`**: The dedicated network port for the backend Express router.
- **`NODE_ENV`**: Determines the operational mode, primarily switching between development and production configurations.
- **`SESSION_SECRET`**: The cryptographic key required to successfully sign Express authentication cookies.
- **`DEMO_DATABASE_URL`**: The connection string defining the primary PostgreSQL database used for the platform's isolated mock environment.
- **`QUERYFORGE_ADMIN_USER`**: The root username required to access the application state.
- **`QUERYFORGE_ADMIN_PASS`**: The root password required to access the central intelligence dashboard.
- **`VITE_API_URL`**: The client-side path referencing the backend, ensuring Vite connects the React UI to the correct Express ports.

---

## Demo Database

The repository includes a backend seeding module utilizing `faker.js` to simulate a robust e-commerce environment. Running the seed script constructs over 10,000 distinct records spanning tables for customers, distinct products, transactional orders, relational order items, nested categories, and user reviews. This environment allows users to instantly test complex join queries without exposing proprietary data.

---

## Example Usage

- *"What were the top 5 products by revenue last month?"*
- *"Show me order count by day for the past 30 days."*
- *"Which customers have placed more than 10 orders but never left a review?"*
- *"Compare revenue by category this quarter vs last quarter."*
- *"What is the average order value by customer segment?"*

---

## Deployment

- **Vercel**: The React frontend layer can be statically hosted utilizing Vercel by executing the `npx vercel` CLI command.
- **Node Environments (Railway / Render)**: The Express backend builds effectively within containerized Node runtimes through executing `npm run build` followed by `npm start`.
- **LocalTunnel**: Both environments native package registers contain custom `npm run tunnel` proxy mappings, simplifying secure public HTTPs tunneling directly out of the local development terminal.

---

## Limitations

- **Read-Only Queries**: Evaluated strictly through an Abstract Syntax Tree (AST) and Regex parser prior to PostgreSQL routing.
- **SQL Safety Filters**: Evaluates and drops any compiled command that attempts to invoke `DELETE`, `DROP`, `TRUNCATE`, `INSERT`, `UPDATE`, or `ALTER` keywords.
- **Process Bounds**: Establishes an absolute runtime execution timeout at 30 seconds for complex table aggregations.
- **Row Limits**: Automatically injects an overarching `LIMIT 100` restraint against overly broad SQL arrays.

---

## Future Improvements

- Implement WebSocket connections between the Express server and React client to stream incremental SQL LLM compilations directly to the user interface in real-time. 
- Expand the visualization heuristic payload router to organically support geographic mapping layouts based on distinct spatial SQL returns.

---

## License
MIT

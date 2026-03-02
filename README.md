# Bitespeed Identity Reconciliation Service

This project is a Node.js backend that implements the Bitespeed "identity reconciliation" problem. Given an email address and/or phone number, it looks up existing contact records, links them into a single identity, and returns the **primary contact** together with all related emails, phone numbers, and secondary contact IDs.

The service is built with:

* **Node.js**
* **Express.js** for the HTTP API
* **Sequelize** and **PostgreSQL** for persistence
* A simple `Contact` table that models primary/secondary links between records

---

## How it works

When a request hits `POST /identify` with an `email`, `phoneNumber`, or both:

1. The service looks up all existing `Contact` records that share that email or phone number.
2. If nothing is found, it creates a **new primary** contact.
3. If matches exist:
    * It chooses the oldest contact (by `createdAt`) as the **primary** root.
    * Any other primary contact in the matched cluster is converted to a **secondary** that points to the root primary via `linkedId`.
    * If the incoming email/phone introduces new information, it creates an additional **secondary** contact for it.
4. It returns a normalized view:
    * `primaryContactId`
    * unique list of `emails`
    * unique list of `phoneNumbers`
    * list of `secondaryContactIds`

The `sequelize.sync()` helper is called at startup so the `Contact` table is created automatically if it does not already exist.

---

## Project layout

High-level directory structure:

* **`server.js`**
  Application entrypoint. Reads `DATABASE_URL`, initializes the Express app, ensures the DB schema exists, wires the routes, and starts the HTTP server.

* **`routes/identify.js`**
  Routing layer. Registers the `POST /identify` endpoint.

* **`controllers/identifyController.js`**
  HTTP transport layer. Defines the JSON request validation, handles the response formatting, and delegates core tasks to the identity service.

* **`services/identityService.js`**
  Core business logic for identity reconciliation. Encapsulates the algorithm for finding matches, selecting a primary contact, and merging clusters using database transactions.

* **`models/Contact.js`**
  Data model for the `Contact` table, including the schema structure and `linkPrecedence` enum (`primary` or `secondary`).

* **`config/database.js`**
  Lightweight configuration wrapper around `Sequelize` that manages the connection to the PostgreSQL database.

---

## Testing the service

The service is currently deployed at:

* **Base URL:** `https://bitespeed-identity-reconciliation-sjiz.onrender.com`
* **Endpoint:** `POST /identify`
* **Database:** PostgreSQL instance hosted on **Neon**

To exercise the live deployment with all parameters set (both email and phone number), you can run:

```bash
curl -s -X POST [https://bitespeed-identity-reconciliation-sjiz.onrender.com/identify](https://bitespeed-identity-reconciliation-sjiz.onrender.com/identify) \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mcfly@hillvalley.edu",
    "phoneNumber": "123456"
  }'
```

You can send additional requests with overlapping and non-overlapping emails and phone numbers to observe how the service merges contacts and updates the primary/secondary relationships in the database.

The same endpoint can also be tested using tools like **Postman** by configuring a `POST` request to `/identify` with a **JSON** body (raw) in the format shown above. Do not use `form-data`.

---

## Installation

To run this project locally on your machine:

1. **Clone the repository:**
```bash
git clone [https://github.com/vineesh23/bitespeed-identity-reconciliation.git](https://github.com/vineesh23/bitespeed-identity-reconciliation.git)
cd bitespeed-identity-reconciliation
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up Environment Variables:**
Create a `.env` file in the root directory and add your PostgreSQL connection string:
```env
PORT=3000
DATABASE_URL=postgresql://[user]:[password]@[neon_hostname]/[dbname]?sslmode=require
```

4. **Start the server:**
```bash
npm start
```
The server will boot up on `http://localhost:3000` and automatically synchronize the database models.

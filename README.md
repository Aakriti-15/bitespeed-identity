# BITESPEED IDENTITY RECONCILIATION

a web service that identifies and links customer contacts across multiple purchases.(deployed on render)

## Live Endpoint - `https://bitespeed-identity-tiu5.onrender.com`

**POST** `https://bitespeed-identity-tiu5.onrender.com/identify`

## TECH STACK
- Node.js + express
- SQLite (via sql.js)

## RUN LOCALLY
```bash
npm install
npm start
```

Server runs on `http://localhost:3000`

## API
**POST /identify**

Request:
```json
{
  "email": "user@example.com",
  "phoneNumber": "123456"
}
```

Response:
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["user@example.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

At least one of `email` or `phoneNumber` must be provided.

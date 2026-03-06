const express = require("express");
const { identifyContact } = require("./identifyService");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Bitespeed Identity Service is running!" });
});

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    const hasEmail = email !== undefined && email !== null && email !== "";
    const hasPhone = phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "";

    if (!hasEmail && !hasPhone) {
      return res.status(400).json({ error: "At least one of email or phoneNumber must be provided" });
    }

    const result = await identifyContact(hasEmail ? email : null, hasPhone ? String(phoneNumber) : null);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Error in /identify:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  await require("./database").getDb();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
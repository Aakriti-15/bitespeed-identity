const { getDb, saveDb } = require("./database");

async function identifyContact(email, phoneNumber) {
  const db = await getDb();
  const now = new Date().toISOString();

  function all(sql, params = []) {
    const results = db.exec(sql, params);
    if (!results || results.length === 0) return [];
    const { columns, values } = results[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }

  function run(sql, params = []) {
    db.run(sql, params);
    saveDb();
  }

  function getLastId() {
    const res = db.exec("SELECT last_insert_rowid() as id");
    return res[0].values[0][0];
  }

  const conditions = [];
  const params = [];
  if (email) { conditions.push("email = ?"); params.push(email); }
  if (phoneNumber) { conditions.push("phoneNumber = ?"); params.push(String(phoneNumber)); }

  const matched = all(
    `SELECT * FROM Contact WHERE (${conditions.join(" OR ")}) AND deletedAt IS NULL`,
    params
  );

  if (matched.length === 0) {
    run(
      `INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
       VALUES (?, ?, NULL, 'primary', ?, ?)`,
      [phoneNumber ? String(phoneNumber) : null, email || null, now, now]
    );
    const newId = getLastId();
    const newContact = all("SELECT * FROM Contact WHERE id = ?", [newId])[0];
    return buildResponse(newContact, []);
  }

  const primaryIds = new Set();
  for (const c of matched) {
    if (c.linkPrecedence === "primary") primaryIds.add(c.id);
    else primaryIds.add(c.linkedId);
  }

  let allContacts = [];
  for (const pid of primaryIds) {
    const cluster = all(
      `SELECT * FROM Contact WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL`,
      [pid, pid]
    );
    allContacts = allContacts.concat(cluster);
  }

  const seen = new Set();
  allContacts = allContacts.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const primaries = allContacts
    .filter(c => c.linkPrecedence === "primary")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const truePrimary = primaries[0];

  if (primaries.length > 1) {
    for (let i = 1; i < primaries.length; i++) {
      run(
        `UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = ? WHERE id = ?`,
        [truePrimary.id, now, primaries[i].id]
      );
      run(
        `UPDATE Contact SET linkedId = ?, updatedAt = ? WHERE linkedId = ? AND id != ?`,
        [truePrimary.id, now, primaries[i].id, truePrimary.id]
      );
    }
  }

  const allEmails = new Set(allContacts.map(c => c.email).filter(Boolean));
  const allPhones = new Set(allContacts.map(c => c.phoneNumber).filter(Boolean));

  if ((email && !allEmails.has(email)) || (phoneNumber && !allPhones.has(String(phoneNumber)))) {
    run(
      `INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
       VALUES (?, ?, ?, 'secondary', ?, ?)`,
      [phoneNumber ? String(phoneNumber) : null, email || null, truePrimary.id, now, now]
    );
  }

  const finalCluster = all(
    `SELECT * FROM Contact WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL`,
    [truePrimary.id, truePrimary.id]
  );

  const freshPrimary = all("SELECT * FROM Contact WHERE id = ?", [truePrimary.id])[0];
  const secondaries = finalCluster.filter(c => c.linkPrecedence === "secondary");

  return buildResponse(freshPrimary, secondaries);
}

function buildResponse(primary, secondaries) {
  const emails = [];
  if (primary.email) emails.push(primary.email);
  for (const s of secondaries)
    if (s.email && !emails.includes(s.email)) emails.push(s.email);

  const phoneNumbers = [];
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const s of secondaries)
    if (s.phoneNumber && !phoneNumbers.includes(s.phoneNumber)) phoneNumbers.push(s.phoneNumber);

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map(s => s.id),
    },
  };
}

module.exports = { identifyContact };
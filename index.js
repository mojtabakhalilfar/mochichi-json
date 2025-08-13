const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Load JSON once at startup
const DATA_PATH = path.join(__dirname, "data.json");
let DATA = null;
try {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  DATA = JSON.parse(raw);
} catch (e) {
  console.error("Failed to read data.json:", e);
  process.exit(1);
}

// Helpers
function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function toId(v) {
  // keep numeric ids numeric, others as strings
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(v)) return Number(v);
  return v;
}

// Routes
app.get("/", (req, res) => {
  res.json({ ok: true, routes: ["/all", "/sections", "/:section", "/:section/:id"] });
});

app.get("/all", (req, res) => {
  res.json(DATA);
});

app.get("/sections", (req, res) => {
  if (!isObject(DATA)) return res.json([]);
  res.json(Object.keys(DATA));
});

// GET /:section and GET /:section/:id
app.get("/:section", (req, res) => {
  const { section } = req.params;
  if (!isObject(DATA) || !(section in DATA)) {
    return res.status(404).json({ error: "Section not found" });
  }
  const value = DATA[section];

  // Optional query filter by id, e.g., /products?id=3
  const qid = req.query.id;
  if (qid !== undefined) {
    if (Array.isArray(value)) {
      const wanted = toId(qid);
      const found = value.find((item) => isObject(item) && ("id" in item) && item.id === wanted);
      if (!found) return res.status(404).json({ error: "Item with id not found" });
      return res.json(found);
    } else if (isObject(value) && ("id" in value) && value.id === toId(qid)) {
      return res.json(value);
    } else {
      return res.status(400).json({ error: "Section is not filterable by id" });
    }
  }

  res.json(value);
});

app.get("/:section/:id", (req, res) => {
  const { section, id } = req.params;
  if (!isObject(DATA) || !(section in DATA)) {
    return res.status(404).json({ error: "Section not found" });
  }
  const value = DATA[section];
  if (!Array.isArray(value)) {
    return res.status(400).json({ error: "Section is not a list" });
  }
  const wanted = toId(id);
  const found = value.find((item) => isObject(item) && ("id" in item) && item.id === wanted);
  if (!found) return res.status(404).json({ error: "Item not found" });
  res.json(found);
});

// Health check
app.get("/healthz", (req, res) => res.json({ ok: true }));

// Render sets PORT env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

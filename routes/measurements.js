const express = require("express");
const router = express.Router();
const Measurement = require("../models/Measurement");

const validFields = ["field1", "field2", "field3"];

function isValidDate(d) {
  return !isNaN(new Date(d).getTime());
}

// GET /api/measurements?field=field1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { field, start_date, end_date } = req.query;

    if (!field || !validFields.includes(field)) {
      return res.status(400).json({ error: "Invalid or missing field (field1/field2/field3)" });
    }

    const query = {};

    if (start_date || end_date) {
      if (!start_date || !end_date) {
        return res.status(400).json({ error: "Provide both start_date and end_date" });
      }
      if (!isValidDate(start_date) || !isValidDate(end_date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      query.timestamp = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const data = await Measurement.find(query)
      .select(`timestamp ${field} -_id`)
      .sort({ timestamp: 1 });

    if (!data.length) {
      return res.status(404).json({ error: "No data found for this range/field" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/measurements/metrics?field=field1&start_date=...&end_date=...
router.get("/metrics", async (req, res) => {
  try {
    const { field, start_date, end_date } = req.query;

    if (!field || !validFields.includes(field)) {
      return res.status(400).json({ error: "Invalid or missing field (field1/field2/field3)" });
    }

    const query = {};
    if (start_date || end_date) {
      if (!start_date || !end_date) {
        return res.status(400).json({ error: "Provide both start_date and end_date" });
      }
      if (!isValidDate(start_date) || !isValidDate(end_date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      query.timestamp = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const docs = await Measurement.find(query).select(`${field} -_id`);
    const values = docs.map(d => d[field]).filter(v => typeof v === "number");

    if (!values.length) {
      return res.status(404).json({ error: "No values found for metrics" });
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    res.json({
      count: values.length,
      average: avg,
      min,
      max,
      stdDev
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

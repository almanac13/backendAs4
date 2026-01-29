const express = require("express");
const router = express.Router();
const Measurement = require("../models/Measurement");

const validFields = ["field1", "field2", "field3"];

function isValidISODate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}

function buildRangeQuery(start_date, end_date) {
  if (!start_date && !end_date) return {};

  if (!start_date || !end_date) {
    return { error: "Provide both start_date and end_date" };
  }
  if (!isValidISODate(start_date) || !isValidISODate(end_date)) {
    return { error: "Invalid date format. Use YYYY-MM-DD" };
  }

  const start = new Date(`${start_date}T00:00:00.000Z`);
  const end = new Date(`${end_date}T23:59:59.999Z`);

  if (start > end) {
    return { error: "start_date must be <= end_date" };
  }

  return { timestamp: { $gte: start, $lte: end } };
}

// GET /api/measurements?field=field1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&page=1&limit=200
router.get("/", async (req, res) => {
  try {
    const { field, start_date, end_date } = req.query;

    if (!field || !validFields.includes(field)) {
      return res.status(400).json({ error: "Invalid or missing field (field1/field2/field3)" });
    }

    const rangeQuery = buildRangeQuery(start_date, end_date);
    if (rangeQuery.error) return res.status(400).json({ error: rangeQuery.error });

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 1), 1000);
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      Measurement.countDocuments(rangeQuery),
      Measurement.find(rangeQuery)
        .select(`timestamp ${field} -_id`)
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(limit)
    ]);

    if (!data.length) {
      return res.status(404).json({ error: "No data found for this range/field" });
    }

    res.json({
      field,
      page,
      limit,
      total,
      data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/measurements/metrics?field=field1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get("/metrics", async (req, res) => {
  try {
    const { field, start_date, end_date } = req.query;

    if (!field || !validFields.includes(field)) {
      return res.status(400).json({ error: "Invalid or missing field (field1/field2/field3)" });
    }

    const rangeQuery = buildRangeQuery(start_date, end_date);
    if (rangeQuery.error) return res.status(400).json({ error: rangeQuery.error });

    // Aggregate metrics in MongoDB
    const result = await Measurement.aggregate([
      { $match: rangeQuery },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          average: { $avg: `$${field}` },
          min: { $min: `$${field}` },
          max: { $max: `$${field}` },
          stdDev: { $stdDevPop: `$${field}` }
        }
      }
    ]);

    if (!result.length || result[0].count === 0) {
      return res.status(404).json({ error: "No values found for metrics" });
    }

    const m = result[0];
    res.json({
      field,
      count: m.count,
      average: m.average,
      min: m.min,
      max: m.max,
      stdDev: m.stdDev ?? 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

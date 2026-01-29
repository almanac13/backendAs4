let chartInstance = null;

// ✅ Field meaning mapping (what each field represents)
const fieldMeta = {
  field1: { label: "Temperature", unit: "°C" },
  field2: { label: "Humidity", unit: "%" },
  field3: { label: "Website Traffic", unit: "visits" }
};

function showError(msg) {
  document.getElementById("errorBox").textContent = msg || "";
}

function clearUI(message = "No data.") {
  if (chartInstance) chartInstance.destroy();
  chartInstance = null;

  document.getElementById("metricsContent").innerHTML = message;
}

function buildQuery(field, start, end) {
  const params = new URLSearchParams();
  params.set("field", field);
  if (start && end) {
    params.set("start_date", start);
    params.set("end_date", end);
  }
  params.set("page", "1");
  params.set("limit", "500");
  return params.toString();
}

async function loadAll() {
  try {
    showError("");

    const field = document.getElementById("field").value;
    const start = document.getElementById("start_date").value;
    const end = document.getElementById("end_date").value;
    const chartType = document.getElementById("chartType").value;

    const meta = fieldMeta[field] || { label: field, unit: "" };

    // validation: both dates or none
    if ((start && !end) || (!start && end)) {
      showError("Select BOTH start date and end date (or leave both empty).");
      clearUI("Metrics cleared.");
      return;
    }

    const q = buildQuery(field, start, end);

    // 1) fetch data
    const res = await fetch(`/api/measurements?${q}`);
    const payload = await res.json();

    if (!res.ok) {
      showError(payload.error || "Failed to load data");
      clearUI("No metrics.");
      return;
    }

    const rows = payload.data; // backend returns { data: [...] }

    const labels = rows.map(d => new Date(d.timestamp).toLocaleDateString());
    const values = rows.map(d => d[field]);

    // 2) draw chart
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(document.getElementById("chart"), {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: `${meta.label} (${meta.unit})`,
          data: values,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: meta.unit ? meta.unit : "Value"
            }
          }
        }
      }
    });

    // 3) fetch metrics
    const mres = await fetch(`/api/measurements/metrics?${q}`);
    const metrics = await mres.json();

    if (!mres.ok) {
      showError(metrics.error || "Failed to load metrics");
      document.getElementById("metricsContent").innerHTML = "No metrics.";
      return;
    }

    document.getElementById("metricsContent").innerHTML = `
      <p><b>Field:</b> ${meta.label} ${meta.unit ? `(${meta.unit})` : ""}</p>
      <p><b>Count:</b> ${metrics.count}</p>
      <p><b>Average:</b> ${Number(metrics.average).toFixed(2)} ${meta.unit}</p>
      <p><b>Min:</b> ${metrics.min} ${meta.unit}</p>
      <p><b>Max:</b> ${metrics.max} ${meta.unit}</p>
      <p><b>Std Dev:</b> ${Number(metrics.stdDev).toFixed(2)} ${meta.unit}</p>
    `;
  } catch (e) {
    showError("Unexpected error. Check console + server terminal.");
    clearUI("No metrics.");
    console.error(e);
  }
}

document.getElementById("loadBtn").addEventListener("click", loadAll);

let chartInstance = null;

function showError(msg) {
  document.getElementById("errorBox").textContent = msg || "";
}

function buildQuery(field, start, end) {
  let q = `field=${encodeURIComponent(field)}`;
  if (start && end) q += `&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
  return q;
}

async function loadAll() {
  try {
    showError("");

    const field = document.getElementById("field").value;
    const start = document.getElementById("start_date").value;
    const end = document.getElementById("end_date").value;
    const chartType = document.getElementById("chartType").value;

    // validation: both dates or none
    if ((start && !end) || (!start && end)) {
      showError("Select BOTH start date and end date (or leave both empty).");
      return;
    }

    const q = buildQuery(field, start, end);

    // 1) fetch data
    const res = await fetch(`/api/measurements?${q}`);
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Failed to load data");
      return;
    }

    const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
    const values = data.map(d => d[field]);

    // 2) draw chart
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(document.getElementById("chart"), {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: field,
          data: values,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // 3) fetch metrics
    const mres = await fetch(`/api/measurements/metrics?${q}`);
    const metrics = await mres.json();

    if (!mres.ok) {
      showError(metrics.error || "Failed to load metrics");
      return;
    }

    document.getElementById("metricsContent").innerHTML = `
      <p><b>Count:</b> ${metrics.count}</p>
      <p><b>Average:</b> ${Number(metrics.average).toFixed(2)}</p>
      <p><b>Min:</b> ${metrics.min}</p>
      <p><b>Max:</b> ${metrics.max}</p>
      <p><b>Std Dev:</b> ${Number(metrics.stdDev).toFixed(2)}</p>
    `;
  } catch (e) {
    showError("Unexpected error. Check console + server terminal.");
    console.error(e);
  }
}

// IMPORTANT: button click triggers load
document.getElementById("loadBtn").addEventListener("click", loadAll);

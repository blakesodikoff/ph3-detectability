const PH3_REF_PPB = 96.0;
const D_REF_M = 6.5;
const ETA_REF = 0.30;
const T_REF_S = 10000.0;
const DIST_REF_PC = 10.0;
const RP_REF_REARTH = 0.95;
const SNR_REF = 5.0;

function ph3Detectability(telescopeDiameterM, throughput, exposureTimeS, distancePc, planetRadiusRearth, ph3Ppb = null) {
  const refCollectingPower = (D_REF_M ** 2) * ETA_REF * T_REF_S;
  const userCollectingPower = (telescopeDiameterM ** 2) * throughput * exposureTimeS;

  const ph3ThresholdPpb = PH3_REF_PPB
    * (RP_REF_REARTH / planetRadiusRearth)
    * (distancePc / DIST_REF_PC)
    * Math.sqrt(refCollectingPower / userCollectingPower);

  let snr = null;
  let detectable = null;

  if (ph3Ppb !== null) {
    snr = SNR_REF * (ph3Ppb / ph3ThresholdPpb);
    detectable = snr >= SNR_REF;
  }

  return {
    ph3ThresholdPpb,
    snrAtInputPpb: snr,
    detectableAt5sigma: detectable,
  };
}

const pairs = [
  ["diameter", "diameterNumber"],
  ["throughput", "throughputNumber"],
  ["exposure", "exposureNumber"],
  ["distance", "distanceNumber"],
  ["radius", "radiusNumber"],
  ["ph3", "ph3Number"],
];

pairs.forEach(([rangeId, numberId]) => {
  const rangeEl = document.getElementById(rangeId);
  const numberEl = document.getElementById(numberId);

  rangeEl.addEventListener("input", () => {
    numberEl.value = rangeEl.value;
    updateAll();
  });

  numberEl.addEventListener("input", () => {
    rangeEl.value = numberEl.value;
    updateAll();
  });
});

function getInputs() {
  return {
    diameter: parseFloat(document.getElementById("diameter").value),
    throughput: parseFloat(document.getElementById("throughput").value),
    exposure: parseFloat(document.getElementById("exposure").value),
    distance: parseFloat(document.getElementById("distance").value),
    radius: parseFloat(document.getElementById("radius").value),
    ph3: parseFloat(document.getElementById("ph3").value),
  };
}

function updateMetrics(result) {
  document.getElementById("thresholdValue").textContent = `${result.ph3ThresholdPpb.toFixed(2)} ppb`;
  document.getElementById("snrValue").textContent = result.snrAtInputPpb.toFixed(2);

  const statusBox = document.getElementById("statusBox");
  if (result.detectableAt5sigma) {
    statusBox.textContent = "Detectable at 5σ";
    statusBox.className = "status detectable";
  } else {
    statusBox.textContent = "Not detectable at 5σ";
    statusBox.className = "status not-detectable";
  }
}

function drawPlot(ppbValues, snrValues, thresholdPpb, inputPpb, inputSnr) {
  const canvas = document.getElementById("plotCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const padding = { left: 70, right: 24, top: 28, bottom: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xMin = 1;
  const xMax = 200;
  const yMin = 0;
  const yMax = Math.max(10, Math.ceil(Math.max(...snrValues) * 1.1));

  function xToPx(x) {
    return padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yToPx(y) {
    return height - padding.bottom - ((y - yMin) / (yMax - yMin)) * plotHeight;
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.font = "12px Inter, sans-serif";
  ctx.fillStyle = "rgba(233,238,252,0.85)";

  for (let i = 0; i <= 5; i++) {
    const yVal = yMin + (i / 5) * (yMax - yMin);
    const y = yToPx(yVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(yVal.toFixed(0), 16, y + 4);
  }

  for (let xVal = 0; xVal <= 200; xVal += 25) {
    const x = xToPx(xVal);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
    ctx.fillText(String(xVal), x - 8, height - 25);
  }

  ctx.strokeStyle = "#d6defa";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.strokeStyle = "#79a7ff";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ppbValues.forEach((ppb, index) => {
    const x = xToPx(ppb);
    const y = yToPx(snrValues[index]);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "#ffcf66";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, yToPx(5));
  ctx.lineTo(width - padding.right, yToPx(5));
  ctx.stroke();

  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = "#7ef0c3";
  ctx.beginPath();
  ctx.moveTo(xToPx(thresholdPpb), padding.top);
  ctx.lineTo(xToPx(thresholdPpb), height - padding.bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ff7c7c";
  ctx.beginPath();
  ctx.arc(xToPx(inputPpb), yToPx(inputSnr), 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#e9eefc";
  ctx.font = "13px Inter, sans-serif";
  ctx.fillText("PH₃ Mixing Ratio (ppb)", width / 2 - 55, height - 10);

  ctx.save();
  ctx.translate(20, height / 2 + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Signal-to-Noise Ratio", 0, 0);
  ctx.restore();

  ctx.font = "bold 16px Inter, sans-serif";
  ctx.fillText("PH₃ Detectability in Venus-Analog Atmospheres", padding.left, 18);
}
function drawHeatmap(throughput, exposure, radius, currentDistance, currentDiameter) {
  const canvas = document.getElementById("heatmapCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const padding = { left: 80, right: 70, top: 35, bottom: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const distances = [];
  const diameters = [];

  for (let d = 2; d <= 50; d += 1) distances.push(d);
  for (let D = 2; D <= 40; D += 1) diameters.push(D);

  const values = [];
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let j = 0; j < diameters.length; j++) {
    const row = [];
    for (let i = 0; i < distances.length; i++) {
      const result = ph3Detectability(
        diameters[j],
        throughput,
        exposure,
        distances[i],
        radius,
        null
      );
      const threshold = result.ph3ThresholdPpb;
      row.push(threshold);

      if (threshold < minVal) minVal = threshold;
      if (threshold > maxVal) maxVal = threshold;
    }
    values.push(row);
  }

  function getColor(value) {
    const t = (value - minVal) / (maxVal - minVal || 1);

    const r = Math.floor(255 * Math.min(1, Math.max(0, 2 * t)));
    const g = Math.floor(255 * (1 - Math.abs(t - 0.5) * 2));
    const b = Math.floor(255 * (1 - t));

    return `rgb(${r}, ${g}, ${b})`;
  }

  const cellWidth = plotWidth / distances.length;
  const cellHeight = plotHeight / diameters.length;

  for (let j = 0; j < diameters.length; j++) {
    for (let i = 0; i < distances.length; i++) {
      const x = padding.left + i * cellWidth;
      const y = padding.top + (diameters.length - 1 - j) * cellHeight;

      ctx.fillStyle = getColor(values[j][i]);
      ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
    }
  }

  // Axes
  ctx.strokeStyle = "#d6defa";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  // Labels
  ctx.fillStyle = "#e9eefc";
  ctx.font = "13px Inter, sans-serif";
  ctx.fillText("Distance (pc)", width / 2 - 35, height - 15);

  ctx.save();
  ctx.translate(22, height / 2 + 25);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Telescope Diameter (m)", 0, 0);
  ctx.restore();

  // X ticks
  ctx.font = "12px Inter, sans-serif";
  for (let d = 10; d <= 50; d += 10) {
    const frac = (d - 2) / (50 - 2);
    const x = padding.left + frac * plotWidth;

    ctx.beginPath();
    ctx.moveTo(x, height - padding.bottom);
    ctx.lineTo(x, height - padding.bottom + 6);
    ctx.stroke();

    ctx.fillText(String(d), x - 8, height - padding.bottom + 22);
  }

  // Y ticks
  for (let D = 10; D <= 40; D += 10) {
    const frac = (D - 2) / (40 - 2);
    const y = height - padding.bottom - frac * plotHeight;

    ctx.beginPath();
    ctx.moveTo(padding.left - 6, y);
    ctx.lineTo(padding.left, y);
    ctx.stroke();

    ctx.fillText(String(D), padding.left - 28, y + 4);
  }

  // Title
  ctx.font = "bold 16px Inter, sans-serif";
  ctx.fillText("PH₃ 5σ Detectability Threshold Heatmap", padding.left, 22);

  // Current selection marker
  const markerX = padding.left + ((currentDistance - 2) / (50 - 2)) * plotWidth;
  const markerY = height - padding.bottom - ((currentDiameter - 2) / (40 - 2)) * plotHeight;

  ctx.beginPath();
  ctx.arc(markerX, markerY, 6, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#000000";
  ctx.stroke();

  ctx.font = "12px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Current selection", markerX + 10, markerY - 10);
  
  // Color bar
  const barX = width - 42;
  const barY = padding.top;
  const barW = 16;
  const barH = plotHeight;

  for (let k = 0; k < barH; k++) {
    const frac = 1 - k / barH;
    const value = minVal + frac * (maxVal - minVal);
    ctx.fillStyle = getColor(value);
    ctx.fillRect(barX, barY + k, barW, 1);
  }

  ctx.strokeStyle = "#d6defa";
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = "#e9eefc";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText(`${maxVal.toFixed(0)} ppb`, barX - 10, barY - 8);
  ctx.fillText(`${minVal.toFixed(0)} ppb`, barX - 10, barY + barH + 18);
  
  ctx.save();
  ctx.translate(barX + 42, barY + barH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "12px Inter, sans-serif";
  ctx.fillStyle = "#e9eefc";
  ctx.fillText("PH₃ Threshold (ppb)", 0, 0);
  ctx.restore();
}
function updateAll() {
  const inputs = getInputs();
  const result = ph3Detectability(
    inputs.diameter,
    inputs.throughput,
    inputs.exposure,
    inputs.distance,
    inputs.radius,
    inputs.ph3,
  );

  updateMetrics(result);

  const ppbValues = [];
  const snrValues = [];
  for (let ppb = 1; ppb <= 200; ppb += 1) {
    const r = ph3Detectability(
      inputs.diameter,
      inputs.throughput,
      inputs.exposure,
      inputs.distance,
      inputs.radius,
      ppb,
    );
    ppbValues.push(ppb);
    snrValues.push(r.snrAtInputPpb);
  }

  drawPlot(ppbValues, snrValues, result.ph3ThresholdPpb, inputs.ph3, result.snrAtInputPpb);
  drawHeatmap(
    inputs.throughput,
    inputs.exposure,
    inputs.radius,
    inputs.distance,
    inputs.diameter
  );
}

updateAll();

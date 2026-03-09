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
}

updateAll();

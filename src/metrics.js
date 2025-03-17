const config = require("./config");
const source = config.metrics.source;
const url = config.metrics.url;
const apiKey = config.metrics.apiKey;

const os = require("os");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

const requests = {};

function trackEndpointUsage(endpoint) {
  return (req, res, next) => {
    requests[endpoint] = (requests[endpoint] || 0) + 1;
    requests["total"] = (requests["total"] || 0) + 1;
    next();
  };
}

// This will periodically send metrics to Grafana
setInterval(() => {
  // send acrued request metrics
  Object.keys(requests).forEach((endpoint) => {
    sendMetricToGrafana(
      "requests",
      requests[endpoint],
      { endpoint },
      "sum",
      "1"
    );
  });

  // send current system usage
  sendMetricToGrafana("CPU usage", getCpuUsagePercentage(), {}, "gauge", "%");
  sendMetricToGrafana(
    "Memory usage",
    getMemoryUsagePercentage(),
    {},
    "gauge",
    "%"
  );
}, 10000);

function sendMetricToGrafana(metricName, metricValue, attributes, type, unit) {
  attributes = { ...attributes, source: source };

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [
                    {
                      asInt: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  Object.keys(attributes).forEach((key) => {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push(
      {
        key: key,
        value: { stringValue: attributes[key] },
      }
    );
  });

  if (type === "sum") {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][
      type
    ].aggregationTemporality = "AGGREGATION_TEMPORALITY_CUMULATIVE";
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][
      type
    ].isMonotonic = true;
  }

  fetch(`${url}`, {
    method: "POST",
    body: JSON.stringify(metric),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to push metrics data to Grafana");
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

module.exports = { trackEndpointUsage };

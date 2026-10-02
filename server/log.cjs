function logError(error, { requestId, event = "request_failed" } = {}) {
  // Never log URLs, bodies, headers, or upstream messages containing credentials.
  console.error(
    JSON.stringify({
      level: "error",
      event,
      requestId,
      name: error?.name,
      code: error?.code,
      status: error?.status,
    }),
  );
}
module.exports = { logError };

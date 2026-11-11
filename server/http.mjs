export async function bodyJSON(req) {
  if (req.body && typeof req.body === "object") {
    if (JSON.stringify(req.body).length > 2000000)
      throw Object.assign(
        new Error("This pocket is too large. Remove a photo and try again."),
        { status: 413 },
      );
    return req.body;
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2000000)
      throw Object.assign(
        new Error("This upload is too large. Please choose a smaller photo."),
        { status: 413 },
      );
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw Object.assign(new Error("Invalid request."), { status: 400 });
  }
}
export function send(res, status, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  try {
    if (new URL(origin).host === host) return;
  } catch {}
  throw Object.assign(new Error("This request is not allowed."), {
    status: 403,
  });
}
export function handleError(res, error) {
  send(res, error.status || 503, {
    error: error.status
      ? error.message
      : "The cloud service is temporarily unavailable. Your saved pocket is still on this device; please try again.",
  });
}

export function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

/** eslint-disable no-unused-vars */
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Server error";
  const details = err.details || undefined;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ message, details });
}

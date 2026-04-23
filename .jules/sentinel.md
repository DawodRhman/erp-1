## 2024-04-23 - Error Message Information Leakage
**Vulnerability:** The global error handler in `server.js` was returning the raw `err.message` for all errors, including 500 Internal Server Errors.
**Learning:** Raw error messages can contain sensitive information like database schema details, SQL queries, or internal file paths, which helps attackers map the system.
**Prevention:** Always mask 500 status code errors with a generic "Internal Server Error" message while logging the full error details (including stack trace) to the server console or a logging service for debugging.

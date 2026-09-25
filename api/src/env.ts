// Loads variables from a local .env file into process.env for local development. In Docker,
// environment variables are provided directly by the container runtime and no .env file exists,
// so a missing file is not an error.
try {
  process.loadEnvFile();
} catch {
  // No .env file present - rely on already-set process.env (e.g. from Docker Compose).
}

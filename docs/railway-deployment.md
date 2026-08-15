# Railway deployment

InkOS Studio persists books, sessions, task snapshots, uploads, prompt overrides, and provider secrets in its project directory. The Railway service must therefore run as one replica with a volume mounted at `/data`.

## Service contract

- Build from the repository root with `Dockerfile`.
- Mount a dedicated Railway volume at `/data`.
- Set `INKOS_STUDIO_AUTH_USERNAME` and `INKOS_STUDIO_AUTH_PASSWORD`.
- Railway supplies `PORT`; Studio also accepts `INKOS_STUDIO_PORT` for non-Railway deployments.
- Use `/healthz` for readiness. This endpoint does not expose project or provider data.

On the first boot, the container creates a minimal Chinese-language InkOS project only when `inkos.json` is absent and prepares the root-owned Railway volume for the unprivileged `node` process. Subsequent boots never overwrite the persisted project.

PostgreSQL, Redis, and S3 are intentionally not part of this deployment. InkOS has no adapter for them in its project storage path, so adding those services would not make the actual books or task snapshots durable.

The service must not be scaled horizontally. File-backed state and active task controllers are process-local, so multiple replicas could race on the same project files and cannot coordinate running tasks.

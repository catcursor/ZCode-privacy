# Privacy fork contract

This fork removes product reporting and optional publication while preserving the coding agent.

- Custom model providers, arbitrary user-configured model API origins, proxies, certificates, API-key storage, terminal execution, MCP, hooks, workflows, browser tools, SSH and existing permissions keep their upstream behavior. There is no local-only network policy or additional credential encryption requirement.
- ARMS desktop/browser instrumentation, service event reporting, CLI OTLP traces/metrics, renderer action traces and TTFT exports are unavailable. Old settings, environment variables, build defines and injected telemetry owners cannot enable them. Disabled entry points do not initialize exporters, read reporting identities, serialize batches or schedule export retries.
- Automatic application updates, manual/forced updater network entry points and startup force-update checks and background vendor model-registry refreshes are disabled. Existing settings cannot re-enable them. Installing a new version is an explicit action outside the application.
- Conversation cloud publication and support-feedback uploads are disabled before token access, file reads or network transmission. Model attachments, file transfer to a selected workspace and user-requested tool networking remain normal functionality.
- Local diagnostic logs and local session storage remain functional. No automatic upload of those files is available through the removed features.

Owners: reporting adapters own inert compatibility interfaces; updater owns its disabled state; publication adapters reject optional upload capabilities with a stable error. No global network interception, tool-admission changes or mirrored configuration.

Acceptance: test disabled reporting despite injected endpoints/exporters/owners, blocked optional uploads before authentication/file access, disabled updater despite enabled options, and preserved model transport/proxy, credential and terminal behavior. Existing telemetry tests must describe the fork's disabled contract; pure local telemetry data-format helpers may retain their original tests.

Scope: application-owned automatic uploads and reporting. A model chosen by the user receives prompts and attachments; terminal commands and configured extensions retain their existing network capabilities. This is not an OS network sandbox or a claim that every dependency is vulnerability-free.

# Privacy edition

The privacy fork removes CLI telemetry bootstrap and OTLP export capabilities. Environment endpoints, telemetry enable flags and injected runtime owners are ignored. Bootstrap returns disabled no-op ports and creates no reporting identity or export timers. Direct exporter-factory calls also return a disabled no-op owner.

Model endpoints and API-key configuration keep upstream behavior for non-Zhipu providers, including custom domains, proxies and certificates. The shared vendor network policy maps all Zhipu/Z.ai URL hosts to 127.0.0.1, including historical configuration and redirects, before network/proxy dispatch. Static model gateway rerouting is unavailable. Domain roots, boundary owners and acceptance cases are specified in the root privacy contract. Bash, PowerShell, terminal sessions, JavaScript tools, MCP, hooks, workflows and their original approval checks remain available; arbitrary external programs are not placed inside an OS network sandbox. No new credential-secret environment variable is required.

The full fork contract is in `specs/privacy-hardening.md` at the repository root. Local diagnostic and session records remain local application data. Explicit model/tool networking is part of normal agent operation.

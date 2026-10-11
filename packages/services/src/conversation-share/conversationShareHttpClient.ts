import { denyPrivacyCapability } from "@zcode/shared/privacy";
import type {
  ApiClient,
  ConversationShareApiErrorCode,
  ConversationShareArtifactDescriptor,
  ConversationShareArtifactUpload,
  ConversationShareCapabilities,
  ConversationShareConfirmRequest,
  ConversationShareContinuation,
  ConversationShareContinuationRequest,
  ConversationSharePreparation,
  ConversationSharePreparationRequest,
  ConversationSharePreview,
  ConversationShareRecord,
} from "@zcode/shared";

export type ConversationShareClientErrorKind =
  | "authentication_required"
  | "feature_disabled"
  | "invalid_contract"
  | "invalid_conversation"
  | "disclosure_required"
  | "unsafe_structure"
  | "artifact_not_allowed"
  | "limit_exceeded"
  | "upload_incomplete"
  | "not_found"
  | "expired"
  | "import_not_allowed"
  | "rate_limited"
  | "network"
  | "safety_check_pending"
  | "unsupported_schema_version"
  | "unknown";

export class ConversationShareClientError extends Error {
  readonly kind: ConversationShareClientErrorKind;
  readonly status?: number;
  readonly code?: ConversationShareApiErrorCode;
  /** 服务端响应的请求 ID，用于和后端日志对账。 */
  readonly requestId?: string;
  /** 复用现有 RPC details 字段，把安全诊断信息传到 Renderer。 */
  readonly details?: {
    requestId?: string;
    clientRequestId?: string;
    status?: number;
    code?: number;
  };
  declare readonly retryAfterMs?: number;

  constructor(options: {
    kind: ConversationShareClientErrorKind;
    message: string;
    status?: number;
    code?: ConversationShareApiErrorCode;
    retryAfterMs?: number;
    requestId?: string;
    clientRequestId?: string;
    cause?: unknown;
  }) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ConversationShareClientError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    const requestId = options.requestId?.trim();
    if (requestId && /^[A-Za-z0-9._:-]{1,128}$/u.test(requestId)) {
      this.requestId = requestId;
    }
    const clientRequestId = normalizeRequestId(options.clientRequestId);
    if (
      this.requestId ||
      clientRequestId ||
      options.status !== undefined ||
      options.code !== undefined
    ) {
      this.details = {
        ...(this.requestId ? { requestId: this.requestId } : {}),
        ...(clientRequestId ? { clientRequestId } : {}),
        ...(options.status === undefined ? {} : { status: options.status }),
        ...(options.code === undefined ? {} : { code: options.code }),
      };
    }
    if (options.retryAfterMs !== undefined) this.retryAfterMs = options.retryAfterMs;
  }
}

function normalizeRequestId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /^[A-Za-z0-9._:-]{1,128}$/u.test(trimmed) ? trimmed : undefined;
}

export interface ConversationShareHttpClientOptions {
  apiClient: ApiClient;
  baseUrl: string;
  tokenProvider: () => Promise<string | null>;
  timeoutMs?: number;
  /** confirm 单次请求超时；缺省 2min。 */
  confirmTimeoutMs?: number;
}

export class ConversationShareHttpClient {
  constructor(_options: ConversationShareHttpClientOptions) {}

  async getCapabilities(): Promise<ConversationShareCapabilities> {
    return denyPrivacyCapability();
  }

  async createPreparation(
    _input: ConversationSharePreparationRequest,
  ): Promise<ConversationSharePreparation> {
    return denyPrivacyCapability();
  }

  async uploadArtifact(
    _preparationId: string,
    _descriptor: ConversationShareArtifactDescriptor,
    _file: Blob,
  ): Promise<ConversationShareArtifactUpload> {
    return denyPrivacyCapability();
  }

  async confirm(
    _preparationId: string,
    _input: ConversationShareConfirmRequest,
  ): Promise<ConversationShareRecord> {
    return denyPrivacyCapability();
  }

  async getPreview(_shareCode: string): Promise<ConversationSharePreview> {
    return denyPrivacyCapability();
  }

  async getContinuation(
    _shareCode: string,
    _input: ConversationShareContinuationRequest,
  ): Promise<ConversationShareContinuation> {
    return denyPrivacyCapability();
  }
}

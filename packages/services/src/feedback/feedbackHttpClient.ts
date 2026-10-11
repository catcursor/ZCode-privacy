import { denyPrivacyCapability } from "@zcode/shared/privacy";
import type {
  ApiClient,
  CreateFeedbackTicketInput,
  FeedbackAttachment,
  FeedbackAttachmentKind,
  FeedbackComment,
  FeedbackListQuery,
  FeedbackListResult,
  FeedbackTicketDetail,
} from "@zcode/shared";
import type { ServiceLogger } from "#src/logger/serviceLogger.js";

interface FeedbackHttpClientOptions {
  baseUrl: string;
  apiClient: ApiClient;
  getAuthHeaders: () => Promise<Record<string, string>>;
  logger?: ServiceLogger;
}

interface FeedbackUploadProgressEvent {
  uploadedBytes: number;
  totalBytes: number;
}

interface FeedbackUploadFileOptions {
  messageId?: string;
  onUploadProgress?: (event: FeedbackUploadProgressEvent) => void;
  signal?: AbortSignal;
}

interface FeedbackCreateRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class FeedbackUploadCanceledError extends Error {
  constructor() {
    super("Feedback upload canceled");
    this.name = "FeedbackUploadCanceledError";
  }
}

export class FeedbackHttpClient {
  constructor(_options: FeedbackHttpClientOptions) {}

  async create(
    _input: CreateFeedbackTicketInput,
    _options: FeedbackCreateRequestOptions = {},
  ): Promise<FeedbackTicketDetail> {
    return denyPrivacyCapability();
  }

  async list(_query: FeedbackListQuery = {}): Promise<FeedbackListResult> {
    return denyPrivacyCapability();
  }

  async get(_id: string): Promise<FeedbackTicketDetail> {
    return denyPrivacyCapability();
  }

  async comment(_id: string, _body: string): Promise<FeedbackComment> {
    return denyPrivacyCapability();
  }

  async uploadFile(
    _ticketId: string,
    _kind: FeedbackAttachmentKind,
    _filePath: string,
    _filename: string,
    _contentType: string,
    _options?: FeedbackUploadFileOptions,
  ): Promise<FeedbackAttachment> {
    return denyPrivacyCapability();
  }
}

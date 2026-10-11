export const PRIVACY_DISABLED_MESSAGE = "This upload capability is disabled in the privacy edition";

export class PrivacyRestrictionError extends Error {
  readonly code = "PRIVACY_RESTRICTION";
  constructor() {
    super(PRIVACY_DISABLED_MESSAGE);
    this.name = "PrivacyRestrictionError";
  }
}

export function denyPrivacyCapability(): never {
  throw new PrivacyRestrictionError();
}

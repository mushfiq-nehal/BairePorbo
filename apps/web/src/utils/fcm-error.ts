/**
 * Classify an FCM HTTP v1 error as "this token is gone forever" vs "retry".
 *
 * A previous version treated any `INVALID_ARGUMENT` as a dead token. That
 * string also appears when the *payload* is wrong (image URL, data types,
 * channel), so a single bad scholarship thumbnail would disable every device
 * the fan-out reached. Only the token-specific errors are permanent.
 */

interface FcmErrorBody {
  error?: {
    status?: string;
    message?: string;
    details?: Array<{ errorCode?: string }>;
  };
}

const TOKEN_INVALID_ARGUMENT =
  /registration token|not a valid fcm|invalid registration/i;

export function isPermanentFcmTokenError(status: number, body: string): boolean {
  if (status === 404) return true;

  let parsed: FcmErrorBody | null = null;
  try {
    parsed = JSON.parse(body) as FcmErrorBody;
  } catch {
    return /UNREGISTERED|SENDER_ID_MISMATCH/.test(body);
  }

  const statusName = parsed.error?.status ?? "";
  const message = parsed.error?.message ?? body;
  const fcmCode = parsed.error?.details?.find((d) => d.errorCode)?.errorCode ?? "";

  if (fcmCode === "UNREGISTERED" || fcmCode === "SENDER_ID_MISMATCH") return true;
  if (statusName === "NOT_FOUND" || statusName === "UNREGISTERED") return true;
  if (statusName === "INVALID_ARGUMENT" || fcmCode === "INVALID_ARGUMENT") {
    return TOKEN_INVALID_ARGUMENT.test(message);
  }
  return /UNREGISTERED|SENDER_ID_MISMATCH/.test(message);
}

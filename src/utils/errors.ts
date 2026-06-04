const ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: 'This email is already registered. Try logging in instead.',
  INVALID_CREDENTIALS: 'Email or password is incorrect. Please try again.',
  TOKEN_MISSING: 'Please log in to continue.',
  TOKEN_INVALID: 'Session is invalid. Please log in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_INPUT: 'Please check your input and try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  BILL_NOT_FOUND: 'Bill not found. It may have been deleted.',
  MISSING_ID: 'Something went wrong. Please try again.',
  UNAUTHORIZED: 'Please log in to continue.',
  PREMIUM_REQUIRED: 'This feature requires a premium subscription.',
  INVALID_FILE: 'Please upload a valid receipt image.',
  INVALID_FILE_FORMAT: 'Unsupported image format. Please use JPEG, PNG, or WebP (max 10MB).',
  FILE_READ_ERROR: 'Failed to read the image file. Please try again.',
  OCR_ERROR: 'We couldn\'t scan your receipt. Please try a clearer photo.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
};

interface ErrorArg {
  code?: string;
  message?: string;
}

export function getErrorMessage(err: ErrorArg | null | undefined): string {
  if (!err) return 'Something went wrong. Please try again.';

  const code = err?.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  return err?.message || 'Something went wrong. Please try again.';
}

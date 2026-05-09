export interface RequestWithContext {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
  deviceId?: string;
}

export function getRequestId(request: RequestWithContext): string {
  return request.requestId ?? 'unknown';
}

export function getHeaderValue(
  request: RequestWithContext,
  name: string,
): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

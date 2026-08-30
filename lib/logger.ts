const sensitiveKey = /email|phone|password|token|secret|authorization|customer/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{8,}\d)/g;

function redactText(value: string) {
  return value
    .replace(emailPattern, "[correo oculto]")
    .replace(phonePattern, "[teléfono oculto]");
}

export function safeErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactText(error.message),
    };
  }

  if (error && typeof error === "object") {
    return Object.fromEntries(
      Object.entries(error).map(([key, value]) => [
        key,
        sensitiveKey.test(key)
          ? "[dato oculto]"
          : typeof value === "string"
            ? redactText(value)
            : value,
      ])
    );
  }

  return { message: redactText(String(error ?? "Error desconocido")) };
}

export function reportError(context: string, error: unknown) {
  console.error(`[MeriShop] ${context}`, safeErrorDetails(error));
}

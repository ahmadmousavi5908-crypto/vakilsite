export class MavisError extends Error {
  constructor(code, message, status = 500, options = {}) {
    super(message, options);
    this.name = "MavisError";
    this.code = code;
    this.status = status;
    this.expose = options.expose ?? status < 500;
  }
}

export function toPublicError(error, requestId) {
  const known = error instanceof MavisError;
  return {
    status: known ? error.status : 500,
    body: {
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known && error.expose
          ? error.message
          : "در پردازش درخواست خطایی رخ داد. لطفاً بعداً دوباره تلاش کنید.",
        requestId,
      },
    },
  };
}

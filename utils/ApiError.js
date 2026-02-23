class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors,
        stack = '',
        cause = undefined
    ) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        this.stack = stack;
        this.cause = cause;
        this.data = null
        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
export { ApiError }
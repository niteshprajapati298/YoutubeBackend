class ApiResponse {
    constructor(statusCode, message = 'Success', data, success) {
        this.statusCode = statusCode < 400;
        this.message = message;
        this.data = data;
        this.success = success;
    }
}
export { ApiResponse }

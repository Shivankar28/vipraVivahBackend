class ApiResponse {
  constructor(statusCode, message, data = null, error = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.error = error;
    this.success = statusCode < 400;
  }
}

module.exports = ApiResponse;
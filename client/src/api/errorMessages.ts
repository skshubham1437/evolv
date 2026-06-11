/**
 * API Error Message Mapper
 * Converts HTTP status codes and raw server errors into user-friendly notifications.
 */

export function getFriendlyErrorMessage(status: number, serverMessage?: string): string {
  // If the server provided a specific validation/business logic error, use it
  if (serverMessage && serverMessage.trim() !== '' && serverMessage !== 'Request failed' && serverMessage !== 'Internal Server Error') {
    return serverMessage;
  }

  switch (status) {
    case 400:
      return 'Invalid request parameters. Please verify your inputs.';
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'The requested resource could not be found.';
    case 429:
      return 'Circadian load warning: Too many requests. Please slow down.';
    case 500:
      return 'Evolv core system crash. Internal server error.';
    case 502:
    case 503:
    case 504:
      return 'Evolv server is currently offline. Please try again later.';
    default:
      return 'A network error occurred. Please check your connection.';
  }
}

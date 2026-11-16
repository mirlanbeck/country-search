/** A non-OK HTTP response (other than "no matches"). Keeps the status for the UI and logs. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message = `Request failed with status ${status}`) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

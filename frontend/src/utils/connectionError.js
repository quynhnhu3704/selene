// Do not classify HTTP/business errors or cancelled requests as lost connections.
export function isConnectionError(error) {
  return Boolean(
    error?.isAxiosError &&
      ((!error.response &&
        ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error.code)) ||
        error.response?.headers?.["x-selene-connection-error"] === "1"),
  );
}

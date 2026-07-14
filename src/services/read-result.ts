export type ReadFailure = {
  code?: string;
  message: string;
};

export type RepositoryReadResult<Value> = {
  data: Value | null;
  error: ReadFailure | null;
};

export function readFailureKind(error: ReadFailure): "forbidden" | "error" {
  return error.code === "42501" ? "forbidden" : "error";
}

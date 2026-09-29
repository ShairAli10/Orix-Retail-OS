export const reportRendererError = (
  kind: "error" | "unhandled-rejection" | "react",
  value: unknown
): void => {
  const error = value instanceof Error ? value : undefined;
  // Send only technical code locations. Never send raw messages or arbitrary filenames.
  const frames =
    error?.stack
      ?.match(/(?:index(?:-[A-Za-z0-9_-]+)?\.js|preload\.cjs):\d{1,7}:\d{1,7}/g)
      ?.slice(0, 12)
      .join("\n") ?? "";
  const name =
    error &&
    ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError"].includes(error.name)
      ? error.name
      : "Error";
  void window.orix.diagnostics.report({ kind, name, stack: frames }).catch(() => undefined);
};

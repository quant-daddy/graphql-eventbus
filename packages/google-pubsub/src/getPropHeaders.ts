const propHeadersString =
  "x-request-id x-b3-traceid x-b3-spanid x-b3-parentspanid x-b3-sampled x-b3-flags x-ot-span-context x-cloud-trace-context traceparent grpc-trace-bin";
export const getPropHeaders = (headers: {
  [header: string]: string | string[] | undefined;
}) => {
  const propagateHeaders = propHeadersString
    .split(" ")
    .map((a) => a.toLowerCase());
  const result: { [key: string]: string } = {};
  Object.entries(headers).forEach(([key, val]) => {
    if (propagateHeaders.indexOf(key) > -1) {
      if (val && typeof val === "string") {
        result[key] = val;
      }
    }
    if (key.startsWith("x-prop-")) {
      if (val && typeof val === "string") {
        result[key] = val;
      }
    }
  });
  return result;
};

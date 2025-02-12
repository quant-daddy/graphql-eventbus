import { S3 } from "@aws-sdk/client-s3";
import { Config } from "./config";

let s3: S3 | null = null;

export const getS3 = () => {
  if (s3) {
    return s3;
  }
  s3 = new S3({
    region: Config.region,
    credentials: {
      accessKeyId: Config.accessKeyId,
      secretAccessKey: Config.secretAccessKey,
    },
  });
  return s3;
};

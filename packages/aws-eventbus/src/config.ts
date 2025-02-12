export const Config = {
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  bucket: process.env.AWS_S3_BUCKET || "ask2ai",
  s3Prefix: process.env.AWS_S3_PREFIX || "graphql-eventbus",
};

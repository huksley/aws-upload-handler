# AWS Upload handler

[![Sponsored](https://img.shields.io/badge/chilicorn-sponsored-brightgreen.svg)](http://spiceprogram.org/oss-sponsorship)

Typescript AWS Lambda to detect faces using [AWS Rekognition](https://docs.aws.amazon.com/rekognition/)

  * Typescript
  * Unit and e2e tests
  * Configuration
  * Caches Rekognition responses in S3 along with the object
  * Deployment using [Serverless framework](https://serverless.com)
  * Connect to API Gateway and [S3 events](https://serverless.com/framework/docs/providers/aws/events/s3#setting-filter-rules)
  * Payload testing using [io-ts](https://github.com/gcanti/io-ts)

## Installing && running

  * Create bucket
  * `> yarn`
  * `> yarn lint && yarn format && yarn test && yarn build`
  * IMAGE_BUCKET=my-image-bucket yarn deploy
  * Invoke Lambda via url (provide payload for example `{ "s3Url": "s3://my-image-bucket/image.jpg" }`)
  * Invoke Lambda by saving .jpg file to S3 bucket
  * Check CloudWatch logs for processing journal
  * Check S3 bucket for .face.json cached rekognition results
  * To run e2e test run `TEST_RUN_E2E=1 E2E_IMAGE_URL=s3://test-bucket/img.jpg yarn test`

## Links

  * https://medium.com/@aakashbanerjee/upload-files-to-amazon-s3-from-the-browser-using-pre-signed-urls-4602a9a90eb5
  * https://stackoverflow.com/questions/44888301/upload-file-to-s3-with-post

## Assertion

  * curl works
  * curl with invalid parameters gives error
  * serverless invoke -f handlePost -d "{ \"s3Url\": \"s3://dsads/1.jpg\" }"
  * serverless invoke local -f handlePost -d "{ \"s3Url\": \"s3://dsads/1.jpg\" }"
  * Lambda invoke from UI with test payload { "s3Url": "s3://dsdss/1.jpg" } works
  * API GW endpoint invoke from AWS Console UI
  
import { S3 } from 'aws-sdk'
import * as t from 'io-ts'
import { decode, urlToBucketName, urlToKeyName, ext, apiResponse, findPayload } from './util'
import { Context as LambdaContext, APIGatewayEvent, Callback as LambdaCallback } from 'aws-lambda'
import { logger as log, logger } from './logger'
import { config } from './config'
import * as mime from 'mime'

/**
 * ACL for newly created objects
 */
export const PRESIGNED_ACL = 'public-read'

/**
 * Expiration for presigned links, in seconds
 */
export const PRESIGNED_EXPIRATION = 60 * 5

/**
 * Minimum object size, in bytes
 */
export const PRESIGNED_MIN_SIZE = 100

/**
 * Maximum object size, in bytes
 */
export const PRESIGNED_MAX_SIZE = 1024 * 1024 * 10

export const InputPayload = t.type({
  s3Url: t.string,
})

export type Input = t.TypeOf<typeof InputPayload>

export const OutputPayload = t.intersection([
  InputPayload,
  t.type({
    expirationTime: t.number,
  }),
])

export type Output = t.TypeOf<typeof OutputPayload>

const s3 = new S3({
  signatureVersion: 'v4',
  region: config.AWS_REGION,
})

/** Invoked on API Gateway call */
export const postHandler = (
  event: APIGatewayEvent,
  context: LambdaContext,
  callback: LambdaCallback,
) => {
  logger.info(
    'event(' +
      typeof event +
      ') ' +
      JSON.stringify(event, null, 2) +
      ' context ' +
      JSON.stringify(context, null, 2),
  )

  const payload = findPayload(event)
  logger.info(`Using payload`, payload)

  try {
    const input = decode<Input>(InputPayload, payload)
    return generatePresignedUrl(input)
      .then(result => {
        logger.info(`Got result: ${JSON.stringify(result, null, 2)}`)
        apiResponse(event, context, callback).success(result)
      })
      .catch(err => {
        log.warn('Failed to generate presigned URL form data', err)
        apiResponse(event, context, callback).failure(
          'Failed to generate presigned URL form data: ' + err,
        )
      })
  } catch (err) {
    logger.warn('Failed to generate presigned URL', err)
    apiResponse(event, context, callback).failure(
      'Exception when generating presigned URL: ' + err.message,
    )
  }
}

export const generatePresignedUrl = (input: Input) => {
  return new Promise<{
    url: string
    fields: { [key: string]: any }
    expirationTime: number
    s3Url: string
  }>((resolve, reject) =>
    s3.createPresignedPost(
      {
        Bucket: urlToBucketName(input.s3Url),
        Fields: {
          Key: urlToKeyName(input.s3Url),
          // S3 specifically wants lower-case header
          'content-type': mime.getType(ext(input.s3Url)) || 'application/octet-stream',
        },
        Expires: PRESIGNED_EXPIRATION,
        Conditions: [
          ['content-length-range', PRESIGNED_MIN_SIZE, PRESIGNED_MAX_SIZE],
          { acl: PRESIGNED_ACL },
        ],
      },
      (err, data) => {
        if (err) {
          reject(err)
        }

        // fix newest policy of DNS name buckets
        // The bucket you are attempting to access must be addressed using the specified endpoint.
        // Please send all future requests to this endpoint.
        const url = `https://${urlToBucketName(input.s3Url)}.s3-${config.AWS_REGION}.amazonaws.com/`
        logger.info(`Replacing ${data.url} with ${url}`)
        data.url = url

        resolve({
          ...data,
          fields: {
            ...data.fields,
            // add requested ACL so fields will be complete for form
            acl: PRESIGNED_ACL,
          },
          s3Url: data.url,
          // FIXME: might be less due to delay
          expirationTime: Math.floor(new Date().getTime() / 1000) + PRESIGNED_EXPIRATION,
        })
      },
    ),
  )
}

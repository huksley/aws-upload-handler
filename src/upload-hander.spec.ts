import * as fetch from 'node-fetch'
import * as FormData from 'form-data'
import * as fs from 'fs'
import * as path from 'path'
import { generatePresignedUrl } from './upload-handler'
import { config } from './config'
import { logger } from './logger'

describe('upload-handler.ts', () => {
  const e2e = config.TEST_E2E ? it : it.skip
  e2e('generate signed and upload sample image', () => {
    const filePath = 'test-assets/michael-dam-258165-unsplash.jpg'
    const s3Url = 's3://' + config.E2E_IMAGE_BUCKET + '/' + path.basename(filePath)
    logger.info(`Generating presigned URL for ${s3Url}`)
    generatePresignedUrl({
      s3Url,
    })
      .then(presigned => {
        logger.info(`Create presigned url for ${s3Url}`, presigned)
        const form = new FormData()
        for (const field in presigned.fields) {
          if (presigned.fields.hasOwnProperty(field)) {
            logger.info('field ' + field + ' = ' + presigned.fields[field])
            form.append(field, presigned.fields[field])
          }
        }
        form.append('file', fs.createReadStream(filePath))
        form.getLength((err, length) => {
          if (err) {
            logger.error('Failed to create post', err)
            throw err
          }
          logger.info(`Sending form to ${presigned.url}, length: ${length}`)
          fetch(presigned.url, {
            method: 'POST',
            body: form,
            headers: {
              'Content-Length': length,
            },
          })
            .then(response => {
              logger.info('Response status: ' + response.status + ' ' + response.statusText)
              return response.text()
            })
            .then(payload => {
              logger.info('Response payload: ' + payload, form.getHeaders())
            })
            .catch(fetchErr => logger.warn(`Fetch error: ${fetchErr}`, fetchErr))
        })
      })
      .catch(genErr => logger.error('Failed to generate presigned url', genErr))
  })
})

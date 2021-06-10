const { Storage } = require('@google-cloud/storage')

const storage = new Storage()

module.exports = (gsUrl) => {
  const regex = /^gs:\/\/(?<bucket>[^/]*)\/(?<path>.*\/(?<filename>.*))$/
  const parsed = gsUrl.match(regex)
  if (!parsed || !parsed.groups) {
    return Promise.reject(new Error('Invalid GCS URL'))
  }

  const { filename, bucket, path } = parsed.groups
  const download = storage.bucket(bucket).file(path).download()

  return download.then(contents => ({ name: filename, content: contents.toString() }))
}

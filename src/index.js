import fs from 'fs'
import fg from 'fast-glob'
import isImage from 'is-image'
import ora from 'ora'
import chalk from 'chalk'
import crypto from 'crypto'
import buildHtml from './build-html.js'

const messages = []
const inboxes = []

export default async ({ templates, source, output, name, dev, port }) => {
  const spinner = ora({
    spinner: 'boxBounce',
    text: 'Parsing Front files',
  }).start()

  if (!fs.existsSync(`${output}/attachments/`)) {
    fs.mkdirSync(`${output}/attachments/`, { recursive: true })
  }

  const files = await fg([`${source}/inboxes/shared_inboxes/**/*.*`])

  spinner.text = `Parsing ${files.length} Front files`

  files
    .filter((file) => file.search('.json') > -1)
    .forEach((file) => {
      const path = file
        .replace(`${source}/inboxes/shared_inboxes/`, '')
        .split('/')
      const inbox = path[0].replace('_inbox', '')
      const id = path[1]
      const filename = path[2]
      if (inboxes.indexOf(inbox) === -1) {
        inboxes.push(inbox)
      }
      if (messages.findIndex((message) => message.id === id) === -1) {
        messages.push({
          id,
          inboxes: [inbox],
          messages: [],
          top: false,
        })
      }
      const key = messages.findIndex((message) => message.id === id)
      const type = filename.search('msg_') > -1 ? 'message' : 'comment'
      const fileParts = filename.replace('.json', '').split('_')
      const typeId = fileParts[1]
      const contents = fs.readFileSync(file)
      const hash = crypto.createHash('sha1').update(contents).digest('hex')
      /*
       * Because messages can be duplicated across inboxes, we hash them and skip
       * if they already exist.
       */
      if (messages[key].messages.find((message) => message._hash === hash)) {
        if (messages[key].inboxes.indexOf(inbox) === -1) {
          messages[key].inboxes.push(inbox)
        }
        return
      }

      messages[key].messages.push({
        _id: typeId,
        _type: type,
        _hash: hash,
        attachments: [],
        ...JSON.parse(contents),
      })
      messages[key].top = messages[key].messages.filter(
        (message) => message._type === 'message'
      )
        ? messages[key].messages
            .filter((message) => message._type === 'message')
            .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))[0]
        : null
      messages[key].messages.forEach((message, index) => {
        if (typeof message.recipients === 'undefined') {
          return
        }
        messages[key].messages[index]._author = message.recipients.find(
          (recipient) => recipient.role === 'from'
        )
      })
    })

  files
    .filter(
      (file) => file.search('.json') === -1 && file.search('_attachment') > -1
    )
    .forEach((file) => {
      const path = file
        .replace(`${source}/inboxes/shared_inboxes/`, '')
        .split('/')
      const id = path[1]
      const filename = path[2]
      const key = messages.findIndex((message) => message.id === id)
      const type = filename.search('msg_') > -1 ? 'message' : 'comment'
      const fileParts = filename.split('_')
      const attachId = messages[key].messages.findIndex(
        (message) => message._id === fileParts[1] && message._type === type
      )
      if (typeof messages[key].messages[attachId] !== 'undefined') {
        messages[key].messages[attachId].attachments.push({
          isImage: isImage(filename),
          file: filename,
        })
        if (!fs.existsSync(`${output}/attachments/${filename}`)) {
          fs.copyFileSync(file, `${output}/attachments/${filename}`)
        }
      }
    })

  spinner.stopAndPersist({
    symbol: chalk.green('✔️'),
    text: `Loaded ${files.length.toLocaleString()} Front files`,
  })

  buildHtml({ templates, output, name, dev, port, messages, inboxes })
}

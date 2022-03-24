import fs from 'fs'
import fg from 'fast-glob'
import isImage from 'is-image'
import Eleventy from '@11ty/eleventy'
import { DateTime } from 'luxon'

const messages = []
const inboxes = []

export default async ({ source, output }) => {
  if (!fs.existsSync(`${output}/attachments/`)) {
    fs.mkdirSync(`${output}/attachments/`, { recursive: true })
  }
  const files = await fg([`${source}/inboxes/shared_inboxes/**/*.*`])
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
          inbox,
          messages: [],
        })
      }
      const key = messages.findIndex((message) => message.id === id)
      const type = filename.search('msg_') > -1 ? 'message' : 'comment'
      const fileParts = filename.replace('.json', '').split('_')
      const typeId = fileParts[1]
      messages[key].messages.push({
        _id: typeId,
        _type: type,
        top: false,
        attachments: [],
        ...JSON.parse(fs.readFileSync(file)),
      })
      messages[key].messages = messages[key].messages.sort((a, b) => {
        a.created_at > b.created_at ? 1 : -1
      })
      messages[key].top = messages[key].messages[0]
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
  const elev = new Eleventy('./src/templates', output, {
    config: function (eleventyConfig) {
      eleventyConfig.addGlobalData('messages', messages)
      eleventyConfig.addGlobalData(
        'inboxes',
        inboxes.map((name) => ({
          name,
          messages: messages.filter((message) => message.inbox === name),
        }))
      )

      eleventyConfig.addFilter('date', (str) =>
        DateTime.fromMillis(str).toLocaleString(DateTime.DATETIME_FULL)
      )
    },
  })
  await elev.write()
}

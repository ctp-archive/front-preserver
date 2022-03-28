import fs from 'fs'
import Eleventy from '@11ty/eleventy'
import ora from 'ora'
import chalk from 'chalk'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { DateTime } from 'luxon'

export default async ({
  templates,
  output,
  name,
  dev,
  port,
  messages,
  inboxes,
}) => {
  const spinner = ora({
    spinner: 'boxBounce',
    text: 'Building HTML files',
  }).start()

  const elev = new Eleventy(templates, output, {
    quietMode: true,
    config: (eleventyConfig) => {
      eleventyConfig.on('eleventy.after', async () => {
        spinner.stopAndPersist({
          symbol: chalk.green('✔️'),
          text: `Built  HTML files`,
        })
      })

      eleventyConfig.addWatchTarget(`${templates}/style.css`)
      eleventyConfig.addGlobalData('name', name)
      eleventyConfig.addGlobalData(
        'messages',
        messages.map((message) => {
          message.messages.sort((a, b) =>
            a.created_at > b.created_at ? 1 : -1
          )
          return message
        })
      )

      eleventyConfig.addGlobalData(
        'inboxes',
        inboxes
          .map((name) => ({
            name,
            messages: messages.filter(
              (message) => message.inboxes.indexOf(name) > -1
            ),
          }))
          .sort((a, b) => (a.name > b.name ? 1 : -1))
      )

      eleventyConfig.addGlobalData(
        'style',
        fs.readFileSync(`${templates}/style.css`).toString()
      )

      eleventyConfig.addGlobalData(
        'now',
        DateTime.now().toLocaleString(DateTime.DATETIME_FULL)
      )

      eleventyConfig.addFilter('date', (str) =>
        DateTime.fromMillis(str).toLocaleString(DateTime.DATETIME_FULL)
      )

      eleventyConfig.addFilter('markdown', (str) => marked(str))

      eleventyConfig.addFilter('sanitize', (str) => sanitizeHtml(str))
    },
  })

  if (dev) {
    let startBrowsersync = true
    elev
      .watch()
      .catch((e) => {
        startBrowsersync = false
      })
      .then(function () {
        if (startBrowsersync) {
          elev.serve(port)
        }
      })
  } else {
    await elev.write()
  }
}

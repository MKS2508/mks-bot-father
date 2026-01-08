import chalk from 'chalk'
import { getConfigManager, CONFIG_FILE } from '../../config/index.js'

export async function handleConfig(
  action: string,
  key?: string,
  value?: string
): Promise<void> {
  const config = getConfigManager()

  switch (action) {
    case 'get': {
      if (!key) {
        console.log(chalk.red('Key required for get action'))
        console.log(chalk.gray('Usage: mbf config get <key>'))
        process.exit(1)
      }

      const data = config.get()
      const keys = key.split('.')
      let current: unknown = data

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = (current as Record<string, unknown>)[k]
        } else {
          current = undefined
          break
        }
      }

      if (current !== undefined) {
        if (typeof current === 'object') {
          console.log(JSON.stringify(current, null, 2))
        } else {
          console.log(current)
        }
      } else {
        console.log(chalk.gray('(not set)'))
      }
      break
    }

    case 'set': {
      if (!key || value === undefined) {
        console.log(chalk.red('Key and value required for set action'))
        console.log(chalk.gray('Usage: mbf config set <key> <value>'))
        process.exit(1)
      }

      let parsedValue: unknown = value

      if (value === 'true') parsedValue = true
      else if (value === 'false') parsedValue = false
      else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10)

      config.set(key, parsedValue)
      console.log(chalk.green(`✓ Set ${key}`))
      break
    }

    case 'list': {
      const data = config.get()
      console.log()
      console.log(chalk.cyan.bold('Configuration'))
      console.log()

      if (Object.keys(data).length === 0) {
        console.log(chalk.gray('  (empty)'))
      } else {
        const printObj = (obj: unknown, prefix = ''): void => {
          if (obj && typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
              if (v && typeof v === 'object' && !Array.isArray(v)) {
                console.log(`${prefix}${chalk.white(k)}:`)
                printObj(v, prefix + '  ')
              } else {
                let displayValue: string
                if (typeof v === 'string' && (k === 'token' || k === 'apiHash')) {
                  displayValue = chalk.gray(v.slice(0, 8) + '...')
                } else {
                  displayValue = chalk.cyan(String(v))
                }
                console.log(`${prefix}${chalk.white(k)}: ${displayValue}`)
              }
            }
          }
        }
        printObj(data, '  ')
      }
      console.log()
      break
    }

    case 'path': {
      console.log(CONFIG_FILE)
      break
    }

    default: {
      console.log(chalk.red(`Unknown action: ${action}`))
      console.log()
      console.log('Available actions:')
      console.log(chalk.gray('  get <key>         Get a configuration value'))
      console.log(chalk.gray('  set <key> <value> Set a configuration value'))
      console.log(chalk.gray('  list              List all configuration'))
      console.log(chalk.gray('  path              Show config file path'))
      console.log()
      console.log('Example keys:')
      console.log(chalk.gray('  github.token        GitHub personal access token'))
      console.log(chalk.gray('  github.defaultOrg   Default GitHub organization'))
      console.log(chalk.gray('  coolify.url         Coolify instance URL'))
      console.log(chalk.gray('  coolify.token       Coolify API token'))
      console.log(chalk.gray('  telegram.apiId      Telegram API ID'))
      console.log(chalk.gray('  telegram.apiHash    Telegram API Hash'))
      process.exit(1)
    }
  }
}

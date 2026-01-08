#!/usr/bin/env node
/**
 * Bot Manager Agent CLI.
 *
 * Interactive REPL for the Bot Manager Agent.
 */

import 'dotenv/config'
import { createInterface } from 'readline'
import chalk from 'chalk'
import ora from 'ora'
import { runAgent, runInteractiveAgent } from './agent.js'
import { logger } from './utils/logger.js'

const BANNER = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('Bot Manager Agent')}                                      ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('Powered by Claude Agent SDK')}                             ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`

const HELP = `
${chalk.bold('Commands:')}
  ${chalk.cyan('/help')}     - Show this help message
  ${chalk.cyan('/clear')}    - Clear conversation (start new session)
  ${chalk.cyan('/session')}  - Show current session ID
  ${chalk.cyan('/exit')}     - Exit the agent

${chalk.bold('Example prompts:')}
  ${chalk.gray('• "Create a bot called my-awesome-bot and deploy it"')}
  ${chalk.gray('• "List all my bots"')}
  ${chalk.gray('• "Clone MKS2508/mks-telegram-bot and run the tests"')}
  ${chalk.gray('• "Deploy my-bot to Coolify"')}
`

function checkEnvironment(): boolean {
  const required = ['ANTHROPIC_API_KEY']
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error(chalk.red(`\nMissing required environment variables:`))
    missing.forEach(key => console.error(chalk.red(`  - ${key}`)))
    console.error(chalk.gray('\nCreate a .env file with these variables or export them.'))
    return false
  }

  return true
}

async function startInteractiveMode() {
  console.log(BANNER)

  if (!checkEnvironment()) {
    process.exit(1)
  }

  console.log(chalk.green('Agent ready! Type your request or /help for commands.\n'))

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('You > ')
  })

  const agent = await runInteractiveAgent({
    onAssistantMessage: () => {
      // Messages are logged by the agent
    },
    onToolCall: () => {
      // Tool calls are logged by the agent
    }
  })

  rl.prompt()

  rl.on('line', async (line) => {
    const input = line.trim()

    if (!input) {
      rl.prompt()
      return
    }

    if (input.startsWith('/')) {
      switch (input.toLowerCase()) {
        case '/help':
          console.log(HELP)
          break
        case '/clear':
          console.log(chalk.yellow('Starting new session...'))
          break
        case '/session':
          console.log(chalk.gray(`Session ID: ${agent.getSessionId() || 'Not started'}`))
          break
        case '/exit':
        case '/quit':
          console.log(chalk.gray('Goodbye!'))
          process.exit(0)
        default:
          console.log(chalk.red(`Unknown command: ${input}`))
          console.log(chalk.gray('Type /help for available commands'))
      }
      rl.prompt()
      return
    }

    const spinner = ora('Processing...').start()

    try {
      const result = await agent.sendMessage(input)

      spinner.stop()

      if (result.success) {
        console.log(chalk.green('\n✓ Task completed'))
        if (result.result) {
          console.log(chalk.white(result.result))
        }
      } else {
        console.log(chalk.red('\n✗ Task failed'))
        result.errors.forEach(err => console.log(chalk.red(`  - ${err}`)))
      }

      console.log(chalk.gray(
        `\n[Tokens: ${result.usage.inputTokens}/${result.usage.outputTokens} | ` +
        `Cost: $${result.usage.totalCostUsd.toFixed(4)} | ` +
        `Duration: ${(result.durationMs / 1000).toFixed(1)}s]`
      ))

    } catch (error) {
      spinner.stop()
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
    }

    console.log()
    rl.prompt()
  })

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye!'))
    process.exit(0)
  })
}

async function runSingleCommand(prompt: string) {
  if (!checkEnvironment()) {
    process.exit(1)
  }

  const spinner = ora('Processing...').start()

  try {
    const result = await runAgent(prompt, {
      onMessage: (msg) => {
        const typedMsg = msg as { type: string; content?: string }
        if (typedMsg.type === 'assistant' && typeof typedMsg.content === 'string') {
          spinner.text = typedMsg.content.slice(0, 50) + '...'
        }
      }
    })

    spinner.stop()

    if (result.success) {
      console.log(chalk.green('✓ Success'))
      if (result.result) {
        console.log(result.result)
      }
    } else {
      console.log(chalk.red('✗ Failed'))
      result.errors.forEach(err => console.log(chalk.red(err)))
      process.exit(1)
    }
  } catch (error) {
    spinner.stop()
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
    process.exit(1)
  }
}

const args = process.argv.slice(2)

if (args.length > 0 && !args[0].startsWith('-')) {
  runSingleCommand(args.join(' '))
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(BANNER)
  console.log(HELP)
  console.log(`
${chalk.bold('Usage:')}
  ${chalk.cyan('bun run start')}                    - Start interactive mode
  ${chalk.cyan('bun run start "your prompt"')}      - Run single command
  ${chalk.cyan('bun run start:telegram')}           - Start Telegram bot mode
`)
} else {
  startInteractiveMode()
}

/**
 * Create command for mks-bot-father CLI.
 *
 * @module
 */

import ora from 'ora'
import chalk from 'chalk'
import { isErr } from '@mks2508/no-throw'
import { getPipeline } from '../../pipeline/index.js'
import type { IPipelineOptions } from '../../types/index.js'

interface ICreateOptions {
  description?: string
  github?: boolean
  githubOrg?: string
  deploy?: boolean
  coolifyServer?: string
  coolifyDest?: string
  skipBotfather?: boolean
  full?: boolean
}

export async function handleCreate(
  name: string,
  options: ICreateOptions
): Promise<void> {
  console.log()
  console.log(chalk.cyan.bold('🤖 MKS Bot Father'))
  console.log(chalk.gray('Complete Telegram Bot Pipeline'))
  console.log()

  const pipeline = getPipeline()

  const pipelineOptions: IPipelineOptions = {
    botName: name,
    botDescription: options.description,
    createGitHubRepo: options.full || options.github,
    deployToCoolify: options.full || options.deploy,
    skipBotFather: options.skipBotfather,
    githubOrg: options.githubOrg,
    coolifyServer: options.coolifyServer,
    coolifyDestination: options.coolifyDest,
  }

  console.log(chalk.white('Pipeline steps:'))
  console.log(
    `  ${pipelineOptions.skipBotFather ? chalk.gray('○') : chalk.green('●')} BotFather automation`
  )
  console.log(`  ${chalk.green('●')} Project scaffolding`)
  console.log(
    `  ${pipelineOptions.createGitHubRepo ? chalk.green('●') : chalk.gray('○')} GitHub repository`
  )
  console.log(
    `  ${pipelineOptions.deployToCoolify ? chalk.green('●') : chalk.gray('○')} Coolify deployment`
  )
  console.log()

  const spinner = ora('Starting pipeline...').start()

  try {
    const result = await pipeline.run(pipelineOptions)

    if (isErr(result)) {
      spinner.fail(chalk.red('Pipeline error'))
      console.log()
      console.log(`  Error: ${chalk.red(result.error.message)}`)
      console.log()
      process.exit(1)
    }

    const pipelineResult = result.value

    if (pipelineResult.success) {
      spinner.succeed(chalk.green('Pipeline completed successfully!'))
      console.log()

      if (pipelineResult.botUsername) {
        console.log(chalk.white('Bot:'))
        console.log(`  Username: ${chalk.cyan(`@${pipelineResult.botUsername}`)}`)
        if (pipelineResult.botToken) {
          console.log(
            `  Token: ${chalk.gray(pipelineResult.botToken.slice(0, 20) + '...')}`
          )
        }
        console.log()
      }

      if (pipelineResult.githubRepoUrl) {
        console.log(chalk.white('GitHub:'))
        console.log(`  Repository: ${chalk.cyan(pipelineResult.githubRepoUrl)}`)
        console.log()
      }

      if (pipelineResult.coolifyAppUuid) {
        console.log(chalk.white('Coolify:'))
        console.log(`  App UUID: ${chalk.cyan(pipelineResult.coolifyAppUuid)}`)
        if (pipelineResult.deploymentUrl) {
          console.log(`  Dashboard: ${chalk.cyan(pipelineResult.deploymentUrl)}`)
        }
        console.log()
      }

      console.log(chalk.green('Next steps:'))
      console.log(`  cd ${name}`)
      console.log(`  bun run dev`)
      console.log()
    } else {
      spinner.fail(chalk.red('Pipeline failed'))
      console.log()

      if (pipelineResult.errors.length > 0) {
        console.log(chalk.red('Errors:'))
        for (const error of pipelineResult.errors) {
          console.log(`  ${chalk.red('•')} ${error}`)
        }
        console.log()
      }

      process.exit(1)
    }
  } catch (error) {
    spinner.fail(chalk.red('Pipeline error'))
    console.error(error)
    process.exit(1)
  }
}

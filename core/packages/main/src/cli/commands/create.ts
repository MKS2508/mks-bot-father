import ora from 'ora'
import chalk from 'chalk'
import { getPipeline } from '../../pipeline.js'
import type { IPipelineOptions } from '../../types.js'

interface CreateOptions {
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
  options: CreateOptions
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
  console.log(
    `  ${chalk.green('●')} Project scaffolding`
  )
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

    if (result.success) {
      spinner.succeed(chalk.green('Pipeline completed successfully!'))
      console.log()

      if (result.botUsername) {
        console.log(chalk.white('Bot:'))
        console.log(`  Username: ${chalk.cyan(`@${result.botUsername}`)}`)
        if (result.botToken) {
          console.log(`  Token: ${chalk.gray(result.botToken.slice(0, 20) + '...')}`)
        }
        console.log()
      }

      if (result.githubRepoUrl) {
        console.log(chalk.white('GitHub:'))
        console.log(`  Repository: ${chalk.cyan(result.githubRepoUrl)}`)
        console.log()
      }

      if (result.coolifyAppUuid) {
        console.log(chalk.white('Coolify:'))
        console.log(`  App UUID: ${chalk.cyan(result.coolifyAppUuid)}`)
        if (result.deploymentUrl) {
          console.log(`  Dashboard: ${chalk.cyan(result.deploymentUrl)}`)
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

      if (result.errors.length > 0) {
        console.log(chalk.red('Errors:'))
        for (const error of result.errors) {
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

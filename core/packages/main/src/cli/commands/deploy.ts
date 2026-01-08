/**
 * Deploy command for mks-bot-father CLI.
 *
 * @module
 */

import ora from 'ora'
import chalk from 'chalk'
import { isOk, isErr } from '@mks2508/no-throw'
import { getCoolifyService } from '../../services/coolify.service.js'

interface IDeployOptions {
  force?: boolean
  tag?: string
}

export async function handleDeploy(
  name: string,
  options: IDeployOptions
): Promise<void> {
  console.log()
  console.log(chalk.cyan.bold('🚀 Deploy to Coolify'))
  console.log()

  const coolify = getCoolifyService()
  const initResult = await coolify.init()

  if (isErr(initResult)) {
    console.log(chalk.red('Coolify not configured'))
    console.log()
    console.log('Configure with:')
    console.log(chalk.gray('  mbf config set coolify.url https://your-coolify.com'))
    console.log(chalk.gray('  mbf config set coolify.token <your-api-token>'))
    console.log()
    process.exit(1)
  }

  const spinner = ora(`Deploying ${name}...`).start()

  try {
    const result = await coolify.deploy({
      uuid: options.tag ? undefined : name,
      tag: options.tag,
      force: options.force,
    })

    if (isOk(result)) {
      spinner.succeed(chalk.green('Deployment started!'))
      console.log()
      console.log(`  Deployment UUID: ${chalk.cyan(result.value.deploymentUuid)}`)
      console.log(`  Resource UUID: ${chalk.cyan(result.value.resourceUuid)}`)
      console.log()
    } else {
      spinner.fail(chalk.red('Deployment failed'))
      console.log()
      console.log(`  Error: ${chalk.red(result.error.message)}`)
      console.log()
      process.exit(1)
    }
  } catch (error) {
    spinner.fail(chalk.red('Deployment error'))
    console.error(error)
    process.exit(1)
  }
}

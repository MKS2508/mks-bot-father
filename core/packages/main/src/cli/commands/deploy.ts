import ora from 'ora'
import chalk from 'chalk'
import { getCoolifyManager } from '../../coolify/index.js'

interface DeployOptions {
  force?: boolean
  tag?: string
}

export async function handleDeploy(
  name: string,
  options: DeployOptions
): Promise<void> {
  console.log()
  console.log(chalk.cyan.bold('🚀 Deploy to Coolify'))
  console.log()

  const coolify = getCoolifyManager()
  const initialized = await coolify.init()

  if (!initialized) {
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

    if (result.success) {
      spinner.succeed(chalk.green('Deployment started!'))
      console.log()
      console.log(`  Deployment UUID: ${chalk.cyan(result.deploymentUuid)}`)
      console.log(`  Resource UUID: ${chalk.cyan(result.resourceUuid)}`)
      console.log()
    } else {
      spinner.fail(chalk.red('Deployment failed'))
      console.log()
      console.log(`  Error: ${chalk.red(result.error)}`)
      console.log()
      process.exit(1)
    }
  } catch (error) {
    spinner.fail(chalk.red('Deployment error'))
    console.error(error)
    process.exit(1)
  }
}

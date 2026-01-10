import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadPromptFile(filename: string): string {
  try {
    return readFileSync(join(__dirname, filename), 'utf-8')
  } catch {
    return ''
  }
}

const personality = loadPromptFile('personality.md')
const workflow = loadPromptFile('workflow-app-creation.md')
const selfAwareness = loadPromptFile('self-awareness.md')
const coolifyMastery = loadPromptFile('coolify-mastery.md')

export const SYSTEM_PROMPT = `
${personality}

---

${selfAwareness}

---

${workflow}

---

${coolifyMastery}

---

# Tools Summary

## Bot Manager
- \`create_bot\` - Crear bot via BotFather con opciones de GitHub y Coolify
- \`list_bots\` - Listar todos los bots creados
- \`configure_bot\` - Configurar commands, description, aboutText
- \`get_bot_token\` - Obtener token de un bot especifico

## GitHub
- \`create_repo\` - Crear repositorio (desde cero o template)
- \`clone_repo\` - Clonar repositorio a workspace local
- \`create_pr\` - Crear pull request
- \`commit_and_push\` - Stage, commit y push cambios
- \`get_repo_info\` - Informacion del repositorio
- \`get_authenticated_user\` - Usuario autenticado actual
- \`is_organization\` - Verificar si cuenta es org
- \`repo_exists\` - Verificar si repo existe

## Coolify
- \`deploy\` - Deploy/redeploy aplicacion
- \`set_env_vars\` - Setear variables de entorno
- \`create_application\` - Crear app desde GitHub repo
- \`list_applications\` - Listar aplicaciones
- \`list_servers\` - Listar servers disponibles
- \`get_server\` - Detalles de un server
- \`get_server_destinations\` - Obtener destinations de un server
- \`get_deployment_status\` - Estado del deployment
- \`get_deployment_history\` - Historial de deployments
- \`get_application_logs\` - Logs de aplicacion
- \`start_application\` - Iniciar app
- \`stop_application\` - Detener app
- \`restart_application\` - Reiniciar app
- \`update_application\` - Actualizar configuracion
- \`delete_application\` - Eliminar aplicacion
- \`list_projects\` - Listar proyectos
- \`list_teams\` - Listar teams

## Code Executor
- \`execute_command\` - Ejecutar comando shell
- \`run_tests\` - Correr suite de tests
- \`install_dependencies\` - Instalar dependencias
- \`build_project\` - Build del proyecto
- \`lint_project\` - Lint con auto-fix opcional
- \`type_check\` - TypeScript type checking
- \`get_project_structure\` - Estructura de archivos

---

# Critical Rules

1. **SIEMPRE** crear plan file al iniciar workflow de creacion de app
2. **SIEMPRE** verificar cada fase antes de continuar a la siguiente
3. **SIEMPRE** commitear en los checkpoints definidos
4. **NUNCA** saltar manejo de errores - loggear y recuperar
5. **USAR** subagentes para tareas especializadas cuando sea apropiado
6. **ACTUALIZAR** plan file despues de cada fase completada
7. **SEGUIR** formato de commits de MUST-FOLLOW-GUIDELINES.md
`

/**
 * Type Validator for E2E Tests.
 *
 * Compares real API responses against expected TypeScript interfaces.
 * Detects missing fields, extra fields, and type mismatches.
 *
 * @module
 */

export interface ITypeValidationResult {
  valid: boolean
  missingFields: string[]
  extraFields: string[]
  typeMismatches: ITypeMismatch[]
  warnings: string[]
}

export interface ITypeMismatch {
  field: string
  expected: string
  actual: string
  value: unknown
}

export interface IFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'any'
  optional?: boolean
  nullable?: boolean
  nested?: Record<string, IFieldSchema>
  items?: IFieldSchema
}

export type ITypeSchema = Record<string, IFieldSchema>

function getActualType(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function validateField(value: unknown, schema: IFieldSchema, path: string): ITypeMismatch[] {
  const mismatches: ITypeMismatch[] = []
  const actualType = getActualType(value)

  if (value === undefined) {
    return mismatches
  }

  if (value === null) {
    if (!schema.nullable) {
      mismatches.push({
        field: path,
        expected: schema.type,
        actual: 'null',
        value,
      })
    }
    return mismatches
  }

  if (schema.type === 'any') {
    return mismatches
  }

  if (actualType !== schema.type) {
    mismatches.push({
      field: path,
      expected: schema.type,
      actual: actualType,
      value,
    })
    return mismatches
  }

  if (schema.type === 'object' && schema.nested && typeof value === 'object') {
    for (const [key, fieldSchema] of Object.entries(schema.nested)) {
      const fieldValue = (value as Record<string, unknown>)[key]
      const fieldPath = `${path}.${key}`

      if (fieldValue === undefined && !fieldSchema.optional) {
        mismatches.push({
          field: fieldPath,
          expected: fieldSchema.type,
          actual: 'undefined',
          value: undefined,
        })
      } else if (fieldValue !== undefined) {
        mismatches.push(...validateField(fieldValue, fieldSchema, fieldPath))
      }
    }
  }

  if (schema.type === 'array' && schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      mismatches.push(...validateField(item, schema.items!, `${path}[${index}]`))
    })
  }

  return mismatches
}

export function validateType(
  data: unknown,
  schema: ITypeSchema,
  options: { strict?: boolean } = {}
): ITypeValidationResult {
  const result: ITypeValidationResult = {
    valid: true,
    missingFields: [],
    extraFields: [],
    typeMismatches: [],
    warnings: [],
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    result.valid = false
    result.warnings.push(`Expected object, got ${getActualType(data)}`)
    return result
  }

  const dataObj = data as Record<string, unknown>
  const schemaKeys = Object.keys(schema)
  const dataKeys = Object.keys(dataObj)

  for (const key of schemaKeys) {
    const fieldSchema = schema[key]
    const value = dataObj[key]

    if (value === undefined) {
      if (!fieldSchema.optional) {
        result.missingFields.push(key)
      }
    } else {
      const mismatches = validateField(value, fieldSchema, key)
      result.typeMismatches.push(...mismatches)
    }
  }

  if (options.strict) {
    for (const key of dataKeys) {
      if (!schemaKeys.includes(key)) {
        result.extraFields.push(key)
      }
    }
  }

  result.valid =
    result.missingFields.length === 0 &&
    result.typeMismatches.length === 0 &&
    (options.strict ? result.extraFields.length === 0 : true)

  return result
}

export function validateArrayType(
  data: unknown,
  schema: ITypeSchema,
  options: { strict?: boolean; maxItems?: number } = {}
): ITypeValidationResult {
  const result: ITypeValidationResult = {
    valid: true,
    missingFields: [],
    extraFields: [],
    typeMismatches: [],
    warnings: [],
  }

  if (!Array.isArray(data)) {
    result.valid = false
    result.warnings.push(`Expected array, got ${getActualType(data)}`)
    return result
  }

  if (data.length === 0) {
    result.warnings.push('Array is empty, cannot validate item types')
    return result
  }

  const itemsToValidate = options.maxItems ? data.slice(0, options.maxItems) : data

  for (let i = 0; i < itemsToValidate.length; i++) {
    const itemResult = validateType(itemsToValidate[i], schema, options)

    for (const field of itemResult.missingFields) {
      const fieldPath = `[${i}].${field}`
      if (!result.missingFields.includes(fieldPath)) {
        result.missingFields.push(fieldPath)
      }
    }

    for (const field of itemResult.extraFields) {
      const fieldPath = `[${i}].${field}`
      if (!result.extraFields.includes(fieldPath)) {
        result.extraFields.push(fieldPath)
      }
    }

    for (const mismatch of itemResult.typeMismatches) {
      result.typeMismatches.push({
        ...mismatch,
        field: `[${i}].${mismatch.field}`,
      })
    }

    result.warnings.push(...itemResult.warnings.map((w) => `[${i}]: ${w}`))
  }

  result.valid =
    result.missingFields.length === 0 &&
    result.typeMismatches.length === 0 &&
    (options.strict ? result.extraFields.length === 0 : true)

  return result
}

export function formatValidationResult(result: ITypeValidationResult): string {
  const lines: string[] = []

  lines.push(`Valid: ${result.valid ? '✅' : '❌'}`)

  if (result.missingFields.length > 0) {
    lines.push(`Missing fields (${result.missingFields.length}):`)
    result.missingFields.forEach((f) => lines.push(`  - ${f}`))
  }

  if (result.extraFields.length > 0) {
    lines.push(`Extra fields (${result.extraFields.length}):`)
    result.extraFields.forEach((f) => lines.push(`  - ${f}`))
  }

  if (result.typeMismatches.length > 0) {
    lines.push(`Type mismatches (${result.typeMismatches.length}):`)
    result.typeMismatches.forEach((m) =>
      lines.push(`  - ${m.field}: expected ${m.expected}, got ${m.actual}`)
    )
  }

  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`)
    result.warnings.forEach((w) => lines.push(`  - ${w}`))
  }

  return lines.join('\n')
}

export const CoolifySchemas = {
  Server: {
    uuid: { type: 'string' as const },
    name: { type: 'string' as const },
    description: { type: 'string' as const, optional: true, nullable: true },
    ip: { type: 'string' as const, optional: true },
    port: { type: 'number' as const, optional: true },
    is_coolify_host: { type: 'boolean' as const, optional: true },
    is_reachable: { type: 'boolean' as const, optional: true },
    is_usable: { type: 'boolean' as const, optional: true },
  },

  Application: {
    uuid: { type: 'string' as const },
    name: { type: 'string' as const },
    description: { type: 'string' as const, optional: true, nullable: true },
    status: { type: 'string' as const },
    fqdn: { type: 'string' as const, optional: true, nullable: true },
    git_repository: { type: 'string' as const, optional: true, nullable: true },
    git_branch: { type: 'string' as const, optional: true, nullable: true },
    git_full_url: { type: 'string' as const, optional: true, nullable: true },
    build_pack: { type: 'string' as const, optional: true, nullable: true },
    ports_exposes: { type: 'string' as const, optional: true, nullable: true },
  },

  Deployment: {
    id: { type: 'number' as const },
    uuid: { type: 'string' as const },
    status: { type: 'string' as const },
    application_id: { type: 'number' as const, optional: true },
    force_rebuild: { type: 'boolean' as const, optional: true },
    commit: { type: 'string' as const, optional: true, nullable: true },
    created_at: { type: 'string' as const },
    updated_at: { type: 'string' as const },
  },

  Project: {
    uuid: { type: 'string' as const },
    name: { type: 'string' as const },
    description: { type: 'string' as const, optional: true, nullable: true },
  },

  Team: {
    id: { type: 'number' as const },
    name: { type: 'string' as const },
    description: { type: 'string' as const, optional: true, nullable: true },
    personal_team: { type: 'boolean' as const, optional: true },
  },
}

export const GitHubSchemas = {
  User: {
    login: { type: 'string' as const },
    id: { type: 'number' as const },
    type: { type: 'string' as const },
    name: { type: 'string' as const, optional: true, nullable: true },
    email: { type: 'string' as const, optional: true, nullable: true },
  },

  Repository: {
    id: { type: 'number' as const },
    name: { type: 'string' as const },
    full_name: { type: 'string' as const },
    private: { type: 'boolean' as const },
    html_url: { type: 'string' as const },
    description: { type: 'string' as const, optional: true, nullable: true },
    default_branch: { type: 'string' as const },
  },

  Organization: {
    login: { type: 'string' as const },
    id: { type: 'number' as const },
    description: { type: 'string' as const, optional: true, nullable: true },
  },
}

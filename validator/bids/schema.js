const semver = require('semver')
const { buildSchemas } = require('../schema/init')
const { generateIssue } = require('../../common/issues/issues')
const { SchemaSpec, SchemasSpec } = require('../../common/schema/types')
const { getCharacterCount } = require('../../utils/string')

function buildBidsSchemas(dataset, schemaDefinition) {
  let schemasSpec
  let issues
  if (schemaDefinition) {
    ;[schemasSpec, issues] = validateSchemasSpec(schemaDefinition)
  } else if (dataset.datasetDescription.jsonData && dataset.datasetDescription.jsonData.HEDVersion) {
    ;[schemasSpec, issues] = parseSchemasSpec(dataset.datasetDescription.jsonData.HEDVersion)
  } else {
    ;[schemasSpec, issues] = [null, [generateIssue('invalidSchemaSpecification', { spec: 'no schema available' })]]
  }
  if (issues.length > 0) {
    return Promise.resolve([null, issues])
  } else {
    return buildSchemas(schemasSpec).then(([schemas]) => [schemas, issues])
  }
}

function validateSchemasSpec(schemasSpec) {
  // ToDO: implement
  if (!(schemasSpec instanceof SchemasSpec)) {
    return [null, generateIssue('invalidSchemaSpecification', { spec: JSON.stringify(schemasSpec) })]
  }
  return [schemasSpec, []]
}

function parseSchemasSpec(hedVersion) {
  const schemasSpec = new SchemasSpec()
  let processVersion
  if (Array.isArray(hedVersion)) {
    processVersion = hedVersion
  } else {
    processVersion = [hedVersion]
  }
  const issues = []
  for (const schemaVersion of processVersion) {
    const [schemaSpec, verIssues] = parseSchemaSpec(schemaVersion)
    if (verIssues.length > 0) {
      issues.concat(verIssues)
    } else if (schemasSpec.isDuplicate(schemaSpec)) {
      issues.push(generateIssue('invalidSchemaNickname', { spec: schemaVersion, nickname: schemaSpec.nickname }))
    } else {
      schemasSpec.addSchemaSpec(schemaSpec)
    }
  }
  return [schemasSpec, issues]
}

function parseSchemaSpec(schemaVersion) {
  if (getCharacterCount(schemaVersion, ':') > 1 || getCharacterCount(schemaVersion, '_') > 1) {
    return [null, [generateIssue('invalidSchemaSpecification', { spec: schemaVersion })]]
  }
  const nicknameSplit = schemaVersion.split(':')
  let nickname = ''
  let schema
  if (nicknameSplit.length > 1) {
    ;[nickname, schema] = nicknameSplit
    if (nickname === '') {
      // ToDo:  put in regular expression check instead of this one
      return [null, [generateIssue('invalidSchemaNickname', { nickname: nickname, version: schemaVersion })]]
    }
  } else {
    schema = nicknameSplit[0]
  }
  const versionSplit = schema.split('_')
  let library = ''
  let version
  if (versionSplit.length > 1) {
    ;[library, version] = versionSplit
  } else {
    version = versionSplit[0]
  }
  if (!semver.valid(version)) {
    return [null, [generateIssue('invalidSchemaSpecification', { spec: schemaVersion })]]
  }
  const schemaSpec = new SchemaSpec(nickname, version, library)
  return [schemaSpec, []]
}

function validateSchemaSpec(schemaSpec) {
  // ToDO: implement
  if (!(schemaSpec instanceof SchemaSpec)) {
    return [null, generateIssue('invalidSchemaSpecification', { spec: JSON.stringify(schemaSpec) })]
  }
  return [schemaSpec, []]
}

module.exports = {
  buildBidsSchemas,
  validateSchemaSpec,
  validateSchemasSpec,
  parseSchemaSpec,
  parseSchemasSpec,
}

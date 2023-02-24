import { validateHedEventWithDefinitions } from './event'
import { parseHedStrings } from './parser/main'

import { generateIssue } from '../common/issues/issues'
import { filterNonEqualDuplicates } from '../utils/map'

/**
 * Parse the dataset's definitions and evaluate labels in the dataset.
 *
 * @param {ParsedHedString[]} parsedHedStrings The dataset's parsed HED strings.
 * @return {[Map, Issue[]]} The definition map and any issues found.
 */
export const parseDefinitions = function (parsedHedStrings) {
  const issues = []
  const parsedHedStringDefinitions = parsedHedStrings.flatMap((parsedHedString) => {
    return parsedHedString.definitions
  })
  const [definitionMap, definitionDuplicates] = filterNonEqualDuplicates(
    parsedHedStringDefinitions,
    (definition, other) => {
      return definition.equivalent(other)
    },
  )
  for (const [duplicateKey, duplicateValue] of definitionDuplicates) {
    issues.push(
      generateIssue('duplicateDefinition', {
        definition: duplicateKey,
        tagGroup: duplicateValue.originalTag,
      }),
    )
  }
  return [definitionMap, issues]
}

/**
 * Check a parsed HED group for its onset and offset ordering.
 *
 * @param {ParsedHedGroup} parsedGroup A parsed HED group.
 * @param {Set<string>} activeScopes The active duration scopes, represented by the groups' canonical Def tags.
 * @returns {Issue[]} Any issues found.
 */
const checkGroupForOnsetOffsetOrder = (parsedGroup, activeScopes) => {
  if (parsedGroup.isOnsetGroup) {
    activeScopes.add(parsedGroup.definitionTag.canonicalTag)
  }
  if (parsedGroup.isOffsetGroup && !activeScopes.delete(parsedGroup.definitionTag.canonicalTag)) {
    return [
      generateIssue('inactiveOnset', {
        definition: parsedGroup.definitionNameAndValue,
      }),
    ]
  }
  return []
}

/**
 * Validate onset and offset ordering.
 *
 * @param {ParsedHedString[]} hedStrings The dataset's HED strings.
 * @param {Schemas} hedSchemas The HED schema container object.
 * @return {Issue[]} Any issues found.
 */
export const validateOnsetOffsetOrder = function (hedStrings, hedSchemas) {
  const issues = []
  const activeScopes = new Set()
  for (const hedString of hedStrings) {
    for (const parsedGroup of hedString.tagGroups) {
      issues.push(...checkGroupForOnsetOffsetOrder(parsedGroup, activeScopes))
    }
  }
  return issues
}

/**
 * Perform dataset-level validation on a HED dataset.
 *
 * @param {Definitions} definitions The parsed dataset definitions.
 * @param {ParsedHedString[]} hedStrings The dataset's HED strings.
 * @param {Schemas} hedSchemas The HED schema container object.
 * @return {Issue[]} Whether the HED dataset is valid and any issues found.
 */
export const validateDataset = function (definitions, hedStrings, hedSchemas) {
  // TODO: Implement
  const onsetOffsetOrderIssues = validateOnsetOffsetOrder(hedStrings, hedSchemas)
  return onsetOffsetOrderIssues
}

/**
 * Validate a group of HED strings.
 *
 * @param {(string|ParsedHedString)[]} parsedHedStrings The dataset's parsed HED strings.
 * @param {Schemas} hedSchemas The HED schema container object.
 * @param {Map<string, ParsedHedGroup>} definitions The dataset's parsed definitions.
 * @param {boolean} checkForWarnings Whether to check for warnings or only errors.
 * @return {[boolean, Issue[]]} Whether the HED strings are valid and any issues found.
 */
export const validateHedEvents = function (parsedHedStrings, hedSchemas, definitions, checkForWarnings) {
  let stringsValid = true
  let stringIssues = []
  for (const hedString of parsedHedStrings) {
    const [valid, issues] = validateHedEventWithDefinitions(hedString, hedSchemas, definitions, checkForWarnings)
    stringsValid = stringsValid && valid
    stringIssues = stringIssues.concat(issues)
  }
  return [stringsValid, stringIssues]
}

/**
 * Validate a HED dataset.
 *
 * @param {string[]} hedStrings The dataset's HED strings.
 * @param {Schemas} hedSchemas The HED schema container object.
 * @param {boolean} checkForWarnings Whether to check for warnings or only errors.
 * @return {[boolean, Issue[]]} Whether the HED dataset is valid and any issues found.
 */
export const validateHedDataset = function (hedStrings, hedSchemas, checkForWarnings = false) {
  if (hedStrings.length === 0) {
    return [true, []]
  }
  const [parsedHedStrings, parsingIssues] = parseHedStrings(hedStrings, hedSchemas)
  const [definitions, definitionIssues] = parseDefinitions(parsedHedStrings)
  const [stringsValid, stringIssues] = validateHedEvents(parsedHedStrings, hedSchemas, definitions, checkForWarnings)
  const datasetIssues = validateDataset(definitions, parsedHedStrings, hedSchemas)
  const issues = stringIssues.concat(...Object.values(parsingIssues), definitionIssues, datasetIssues)

  return [issues.length === 0, issues]
}

/**
 * Validate a HED dataset with additional context.
 *
 * @param {string[]} hedStrings The dataset's HED strings.
 * @param {string[]} contextHedStrings The dataset's context HED strings.
 * @param {Schemas} hedSchemas The HED schema container object.
 * @param {boolean} checkForWarnings Whether to check for warnings or only errors.
 * @return {[boolean, Issue[]]} Whether the HED dataset is valid and any issues found.
 */
export const validateHedDatasetWithContext = function (
  hedStrings,
  contextHedStrings,
  hedSchemas,
  checkForWarnings = false,
) {
  if (hedStrings.length + contextHedStrings.length === 0) {
    return [true, []]
  }
  const [parsedHedStrings, parsingIssues] = parseHedStrings(hedStrings, hedSchemas)
  const [parsedContextHedStrings, contextParsingIssues] = parseHedStrings(contextHedStrings, hedSchemas)
  const combinedParsedHedStrings = parsedHedStrings.concat(parsedContextHedStrings)
  const [definitions, definitionIssues] = parseDefinitions(combinedParsedHedStrings)
  const [stringsValid, stringIssues] = validateHedEvents(parsedHedStrings, hedSchemas, definitions, checkForWarnings)
  const datasetIssues = validateDataset(definitions, parsedHedStrings, hedSchemas)
  const issues = stringIssues.concat(
    ...Object.values(parsingIssues),
    ...Object.values(contextParsingIssues),
    definitionIssues,
    datasetIssues,
  )

  return [issues.length === 0, issues]
}

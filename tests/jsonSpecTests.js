import chai from 'chai'
const assert = chai.assert

import { readHTTPSFile } from '../utils/files'
import { parseSchemasSpec } from '../bids/schema'
import { buildSchemas } from '../validator'
import { validateHedEventWithDefinitions } from '../validator/event'
import { parseHedStrings } from '../validator/parser/main'
import { parseDefinitions } from '../validator/dataset'

function readIssueCodes() {
  const issueCodesUrl =
    'https://raw.githubusercontent.com/hed-standard/hed-specification/develop/tests/hed_error_codes.json'
  return readHTTPSFile(issueCodesUrl).then((issueCodeContents) => {
    const issueCodes = JSON.parse(issueCodeContents)
    const validationIssueCodes = issueCodes.hed_validation_errors
    assert.isArray(validationIssueCodes, 'Validation issue list is not an array')
    return validationIssueCodes
  })
}

function testIssueCode(issueCode) {
  const issueCodeUrl = `https://raw.githubusercontent.com/hed-standard/hed-specification/develop/tests/json_tests/${issueCode}.json`
  return readHTTPSFile(issueCodeUrl).then((issueCodeContents) => {
    const issueCodeData = JSON.parse(issueCodeContents)
    let testPromise = Promise.resolve(true)
    for (const issueCodeTest of issueCodeData) {
      testPromise = testPromise.then((previousTestsValid) => {
        return runIssueCodeTest(issueCodeTest).then((testIsValid) => previousTestsValid && testIsValid)
      })
    }
    return testPromise
  })
}

function runIssueCodeTest(issueCodeTest) {
  const { error_code, name, description, schema, definitions, tests, warning } = issueCodeTest
  const issues = []
  const [schemasSpec, schemaParsingIssues] = parseSchemasSpec(schema)
  issues.push(...schemaParsingIssues)
  console.log(`Test for error code ${error_code} "${name}": ${description}`)
  let passes = true
  return buildSchemas(schemasSpec).then(([hedSchemas, schemaCreationIssues]) => {
    issues.push(...schemaCreationIssues)
    const [parsedDefinitionStrings, parsingIssues] = parseHedStrings(definitions, hedSchemas)
    const [defs, definitionIssues] = parseDefinitions(parsedDefinitionStrings)
    issues.push(...Object.values(parsingIssues), ...definitionIssues)
    for (const stringTest of tests.string_tests.passes) {
      const [isValid, testIssues] = validateHedEventWithDefinitions(stringTest, hedSchemas, defs, {
        checkForWarnings: warning,
      })
      issues.push(...testIssues)
      if (!isValid) {
        console.log(`Test failed on string "${stringTest}" (incorrect error).`)
        passes = false
      }
    }
    for (const stringTest of tests.string_tests.fails) {
      const [isValid, testIssues] = validateHedEventWithDefinitions(stringTest, hedSchemas, defs, {
        checkForWarnings: warning,
      })
      issues.push(...testIssues)
      if (isValid) {
        console.log(`Test failed on string "${stringTest}" (missing error).`)
        passes = false
      }
    }
    if (passes) {
      console.log(`Test passed.`)
    }
    return passes
  })
}

readIssueCodes().then((issueCodes) => {
  let testPromise = Promise.resolve(true)
  for (const issueCode of issueCodes) {
    testPromise = testPromise.then((previousCodesPassed) => {
      return testIssueCode(issueCode).then((issueCodePassed) => previousCodesPassed && issueCodePassed)
    })
  }
  return testPromise.then((allTestsPassed) => {
    if (!allTestsPassed) {
      assert.fail('Tests failed.')
    }
  })
})

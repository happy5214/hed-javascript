import chai from 'chai'
const assert = chai.assert

import { readHTTPSFile } from '../utils/files'
import { parseSchemasSpec } from '../bids/schema'
import { buildSchemas } from '../validator'
import { validateHedEventWithDefinitions } from '../validator/event'
import { parseHedStrings } from '../parser/main'
import { parseDefinitions } from '../validator/dataset'

describe('HED', () => {
  let validationIssueCodes

  beforeAll(async () => {
    const issueCodesUrl =
      'https://raw.githubusercontent.com/hed-standard/hed-specification/develop/tests/hed_error_codes.json'
    const issueCodeContents = await readHTTPSFile(issueCodesUrl)
    const issueCodes = JSON.parse(issueCodeContents)
    validationIssueCodes = issueCodes.hed_validation_errors
  })

  describe.each(validationIssueCodes)(`HED issue code %s`, (issueCode) => {
    let issueCodeData

    beforeAll(async () => {
      const issueCodeUrl = `https://raw.githubusercontent.com/hed-standard/hed-specification/develop/tests/json_tests/${issueCode}.json`
      const issueCodeContents = await readHTTPSFile(issueCodeUrl)
      issueCodeData = JSON.parse(issueCodeContents)
    })

    describe.each(issueCodeData)(
      '$name: $description',
      async ({ error_code, name, description, schema, definitions, tests, warning }) => {
        let hedSchemas
        let definitionMap

        beforeAll(async () => {
          let schemasSpec
          try {
            schemasSpec = parseSchemasSpec(schema)
          } catch (err) {
            assert.fail('Bad schema version')
          }
          try {
            hedSchemas = await buildSchemas(schemasSpec)
          } catch (err) {
            assert.fail('Bad schema')
          }
          const [parsedDefinitionStrings, parsingIssues] = parseHedStrings(definitions, hedSchemas)
          assert.isEmpty(Object.values(parsingIssues).flat(), 'Parsing issues found')
          const [defs, definitionIssues] = parseDefinitions(parsedDefinitionStrings)
          assert.isEmpty(definitionIssues, 'Definition parsing issues found')
          definitionMap = defs
        })

        describe('Passing string tests', () => {
          it.each(tests.string_tests.passes)('$description', (stringTest) => {
            const [isValid, testIssues] = validateHedEventWithDefinitions(stringTest, hedSchemas, definitionMap, {
              checkForWarnings: warning,
            })
            assert.isTrue(isValid, 'Validation failed')
            assert.isEmpty(testIssues, 'Validation had issues')
          })
        })

        describe('Failing string tests', () => {
          it.each(tests.string_tests.fails)('$description', (stringTest) => {
            const [isValid, testIssues] = validateHedEventWithDefinitions(stringTest, hedSchemas, definitionMap, {
              checkForWarnings: warning,
            })
            assert.isFalse(isValid, 'Validation passed')
            assert.isNotEmpty(testIssues, 'Validation did not have issues')
          })
        })
      },
    )
  })
})

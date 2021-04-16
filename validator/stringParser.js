const utils = require('../utils')
const { convertHedStringToLong } = require('../converter/converter')

const openingGroupCharacter = '('
const closingGroupCharacter = ')'

/**
 * A parsed HED tag.
 *
 * @param {string} originalTag The original HED tag.
 * @param {int[]} originalBounds The bounds of the HED tag in the original HED string.
 * @param {Schemas} hedSchemas The collection of HED schemas.
 * @constructor
 */
const ParsedHedTag = function (originalTag, originalBounds, hedSchemas) {
  /**
   * The original form of the HED tag.
   * @type {string}
   */
  this.originalTag = originalTag
  /**
   * The bounds of the HED tag in the original HED string.
   * @type {int[]}
   */
  this.originalBounds = originalBounds
  /**
   * The formatted canonical version of the HED tag.
   *
   * The empty string default value should be replaced during formatting. Failure to do so
   * signals an error, as an empty tag should never happen.
   * @type {string}
   */
  this.formattedTag = ''
  if (hedSchemas.isHed3) {
    const [canonicalTag, conversionIssues] = convertHedStringToLong(
      hedSchemas,
      originalTag,
    )
    /**
     * The canonical form of the HED tag.
     * @type {string}
     */
    this.canonicalTag = canonicalTag
    /**
     * Any issues encountered during tag conversion.
     * @type {Array}
     */
    this.conversionIssues = conversionIssues
  } else {
    this.canonicalTag = originalTag
    this.conversionIssues = []
  }
}

/**
 * A parsed HED string.
 *
 * @param {string} hedString The original HED string.
 * @constructor
 */
const ParsedHedString = function (hedString) {
  /**
   * The original HED string.
   * @type {string}
   */
  this.hedString = hedString
  /**
   * All of the tags in the string.
   * @type ParsedHedTag[]
   */
  this.tags = []
  /**
   * The tag groups in the string, split into arrays.
   * @type ParsedHedTag[][]
   */
  this.tagGroups = []
  /**
   * The tag groups, kept in their original parenthesized form.
   * @type ParsedHedTag[]
   */
  this.tagGroupStrings = []
  /**
   * All of the top-level tags in the string.
   * @type ParsedHedTag[]
   */
  this.topLevelTags = []
}

/**
 * Determine whether a HED string is a group (surrounded by parentheses).
 *
 * @param {string} hedString A HED string.
 */
const hedStringIsAGroup = function (hedString) {
  const trimmedHedString = hedString.trim()
  return (
    trimmedHedString.startsWith(openingGroupCharacter) &&
    trimmedHedString.endsWith(closingGroupCharacter)
  )
}

/**
 * Return a copy of a group tag with the surrounding parentheses removed.
 *
 * @param {string} tagGroup A tag group string.
 */
const removeGroupParentheses = function (tagGroup) {
  return tagGroup.slice(1, -1)
}

/**
 * Split a full HED string into tags.
 *
 * @param {string} hedString The full HED string.
 * @param {Schemas} hedSchemas The collection of HED schemas.
 * @returns {[ParsedHedTag[], Array]} An array of HED tags (top-level relative to the passed string) and any issues found.
 */
const splitHedString = function (hedString, hedSchemas) {
  const delimiter = ','
  const doubleQuoteCharacter = '"'
  const invalidCharacters = ['{', '}', '[', ']', '~']

  const hedTags = []
  let issues = []
  let groupDepth = 0
  let currentTag = ''
  let startingIndex = 0
  let resetStartingIndex = false
  // Loop a character at a time.
  for (let i = 0; i < hedString.length; i++) {
    if (resetStartingIndex) {
      startingIndex = i
      resetStartingIndex = false
    }
    const character = hedString.charAt(i)
    if (character === doubleQuoteCharacter) {
      // Skip double quotes
      continue
    } else if (character === openingGroupCharacter) {
      // Count group characters
      groupDepth++
    } else if (character === closingGroupCharacter) {
      groupDepth--
    }
    if (groupDepth === 0 && character === delimiter) {
      // Found the end of a tag, so push the current tag.
      if (!utils.string.stringIsEmpty(currentTag)) {
        const parsedHedTag = new ParsedHedTag(
          currentTag.trim(),
          [startingIndex, i],
          hedSchemas,
        )
        hedTags.push(parsedHedTag)
        issues = issues.concat(parsedHedTag.conversionIssues)
      }
      resetStartingIndex = true
      currentTag = ''
    } else if (invalidCharacters.includes(character)) {
      // Found an invalid character, so push an issue.
      issues.push(
        utils.issues.generateIssue('invalidCharacter', {
          character: character,
          index: i,
          string: hedString,
        }),
      )
      if (!utils.string.stringIsEmpty(currentTag)) {
        const parsedHedTag = new ParsedHedTag(
          currentTag.trim(),
          [startingIndex, i],
          hedSchemas,
        )
        hedTags.push(parsedHedTag)
        issues = issues.concat(parsedHedTag.conversionIssues)
      }
      resetStartingIndex = true
      currentTag = ''
    } else {
      currentTag += character
      if (utils.string.stringIsEmpty(currentTag)) {
        resetStartingIndex = true
        currentTag = ''
      }
    }
  }
  if (!utils.string.stringIsEmpty(currentTag)) {
    // Push last HED tag.
    const parsedHedTag = new ParsedHedTag(
      currentTag.trim(),
      [startingIndex, hedString.length],
      hedSchemas,
    )
    hedTags.push(parsedHedTag)
    issues = issues.concat(parsedHedTag.conversionIssues)
  }
  return [hedTags, issues]
}

/**
 * Find and parse the group tags in a provided list.
 *
 * @param {ParsedHedTag[]} groupTagsList The list of possible group tags.
 * @param {Schemas} hedSchemas The collection of HED schemas.
 * @param {ParsedHedString} parsedString The object to store parsed output in.
 * @return {Issue[]} The array of issues.
 */
const findTagGroups = function (groupTagsList, hedSchemas, parsedString) {
  let issues = []
  for (const tagOrGroup of groupTagsList) {
    if (hedStringIsAGroup(tagOrGroup.originalTag)) {
      const tagGroupString = removeGroupParentheses(tagOrGroup.originalTag)
      // Split the group tag and recurse.
      const [nestedGroupTagList, nestedGroupIssues] = splitHedString(
        tagGroupString,
        hedSchemas,
      )
      const nestedIssues = findTagGroups(
        nestedGroupTagList,
        hedSchemas,
        parsedString,
      )
      parsedString.tagGroupStrings.push(tagOrGroup)
      parsedString.tagGroups.push(nestedGroupTagList)
      issues = issues.concat(nestedGroupIssues, nestedIssues)
    } else if (!parsedString.tags.includes(tagOrGroup)) {
      parsedString.tags.push(tagOrGroup)
    }
  }
  return issues
}

/**
 * Find top-level tags in a split HED tag list.
 *
 * @param {ParsedHedTag[]} hedTags A list of split HED tags.
 * @param {Schemas} hedSchemas The collection of HED schemas.
 * @param {ParsedHedString} parsedString The object to store sorted output in.
 * @returns {ParsedHedTag[]} The top-level tags from a HED string.
 */
const findTopLevelTags = function (hedTags, hedSchemas, parsedString) {
  const topLevelTags = []
  for (const tagOrGroup of hedTags) {
    if (!hedStringIsAGroup(tagOrGroup.originalTag)) {
      topLevelTags.push(tagOrGroup)
      if (!parsedString.tags.includes(tagOrGroup)) {
        parsedString.tags.push(tagOrGroup)
      }
    }
  }
  return topLevelTags
}

/**
 * Format the HED tags in a list.
 *
 * @param {ParsedHedTag[]|ParsedHedTag[][]} hedTagList An array of unformatted HED tags.
 * @returns {Array} An array of formatted HED tags corresponding to hedTagList.
 */
const formatHedTagsInList = function (hedTagList) {
  for (const hedTag of hedTagList) {
    if (hedTag instanceof Array) {
      // Recurse
      formatHedTagsInList(hedTag)
    } else {
      formatHedTag(hedTag)
    }
  }
}

/**
 * Format an individual HED tag by removing newlines, double quotes, and slashes.
 *
 * @param {ParsedHedTag} hedTag The HED tag to format.
 */
const formatHedTag = function (hedTag) {
  hedTag.originalTag = hedTag.originalTag.replace('\n', ' ')
  let hedTagString = hedTag.canonicalTag.trim()
  if (hedTagString.startsWith('"')) {
    hedTagString = hedTagString.slice(1)
  }
  if (hedTagString.endsWith('"')) {
    hedTagString = hedTagString.slice(0, -1)
  }
  if (hedTagString.startsWith('/')) {
    hedTagString = hedTagString.slice(1)
  }
  if (hedTagString.endsWith('/')) {
    hedTagString = hedTagString.slice(0, -1)
  }
  hedTag.formattedTag = hedTagString.toLowerCase()
}

/**
 * Parse a full HED string into a object of tag types.
 *
 * @param {string} hedString The full HED string to parse.
 * @param {Schemas} hedSchemas The collection of HED schemas.
 * @returns {[ParsedHedString, Issue[]]} The parsed HED tag data and list of issues.
 */
const parseHedString = function (hedString, hedSchemas) {
  const parsedString = new ParsedHedString(hedString)
  const [hedTagList, splitIssues] = splitHedString(hedString, hedSchemas)
  parsedString.topLevelTags = findTopLevelTags(
    hedTagList,
    hedSchemas,
    parsedString,
  )
  const tagGroupIssues = findTagGroups(hedTagList, hedSchemas, parsedString)
  formatHedTagsInList(parsedString.tags)
  formatHedTagsInList(parsedString.tagGroups)
  formatHedTagsInList(parsedString.topLevelTags)
  const issues = [].concat(splitIssues, tagGroupIssues)
  return [parsedString, issues]
}

module.exports = {
  ParsedHedTag: ParsedHedTag,
  ParsedHedString: ParsedHedString,
  hedStringIsAGroup: hedStringIsAGroup,
  removeGroupParentheses: removeGroupParentheses,
  splitHedString: splitHedString,
  formatHedTag: formatHedTag,
  parseHedString: parseHedString,
}

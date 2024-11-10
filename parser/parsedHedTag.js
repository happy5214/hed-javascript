import { IssueError } from '../common/issues/issues'
import { getParentTag, getTagLevels, getTagName } from '../utils/hedStrings'
import ParsedHedSubstring from './parsedHedSubstring'
import { SchemaValueTag } from '../schema/entries'
import TagConverter from './tagConverter'
import { getRegExp } from './tempRegex'

import RegexClass from '../schema/regExps'

/**
 * A parsed HED tag.
 */
export default class ParsedHedTag extends ParsedHedSubstring {
  /**
   * The formatted canonical version of the HED tag.
   * @type {string}
   */
  formattedTag
  /**
   * The canonical form of the HED tag.
   * @type {string}
   */
  canonicalTag
  /**
   * The HED schema this tag belongs to.
   * @type {Schema}
   */
  schema
  /**
   * The schema's representation of this tag.
   *
   * @type {SchemaTag}
   * @private
   */
  _schemaTag
  /**
   * The remaining part of the tag after the portion actually in the schema.
   *
   * @type {string}
   * @private
   */
  _remainder

  /**
   * The extension if any
   *
   * @type {string}
   * @private
   */
  _extension

  /**
   * The value if any
   *
   * @type {string}
   * @private
   */
  _value

  /**
   * The units if any
   *
   * @type {string}
   * @private
   */
  _units

  /**
   * Constructor.
   *
   * @param {TagSpec} tagSpec The token for this tag.
   * @param {Schemas} hedSchemas The collection of HED schemas.
   * @param {string} hedString The original HED string.
   * @throws {IssueError} If tag conversion or parsing fails.
   */
  constructor(tagSpec, hedSchemas, hedString) {
    super(tagSpec.tag, tagSpec.bounds) // Sets originalTag and originalBounds
    this._convertTag(hedSchemas, hedString, tagSpec) // Sets various forms of the tag.
    this._handleRemainder()
    //this._checkTagAttributes()  // Checks various aspects like requireChild or extensionAllowed.
    //this.formattedTag = this._formatTag()
    //this.formattedTag = this.canonicalTag.toLowerCase()
  }

  /**
   * Convert this tag to its various forms
   *
   * @param {Schemas} hedSchemas The collection of HED schemas.
   * @param {string} hedString The original HED string.
   * @param {TagSpec} tagSpec The token for this tag.
   * @throws {IssueError} If tag conversion or parsing fails.
   */
  _convertTag(hedSchemas, hedString, tagSpec) {
    const schemaName = tagSpec.library
    this.schema = hedSchemas.getSchema(schemaName)
    if (this.schema === undefined) {
      if (schemaName !== '') {
        IssueError.generateAndThrow('unmatchedLibrarySchema', {
          tag: this.originalTag,
          library: schemaName,
        })
      } else {
        IssueError.generateAndThrow('unmatchedBaseSchema', {
          tag: this.originalTag,
        })
      }
    }

    const [schemaTag, remainder] = new TagConverter(tagSpec, hedSchemas).convert()
    this._schemaTag = schemaTag
    this._remainder = remainder
    this.canonicalTag = this._schemaTag.longExtend(remainder)
    this.formattedTag = this.canonicalTag.toLowerCase()
  }

  /**
   * Handle the remainder portion
   *
   * @throws {IssueError} If parsing the remainder section fails.
   */
  _handleRemainder() {
    if (this._remainder === '') {
      return
    }
    // if (this.allowsExtensions) {
    //   this._handleExtension()
    // } else if (this.takesValue) { // Its a value tag
    //   return
    // } else {
    //   //IssueError.generateAndThrow('invalidTag', {tag: this.originalTag})
    // }
  }

  /**
   * Handle potential extensions
   *
   * @throws {IssueError} If parsing the remainder section fails.
   */
  _handleExtension() {
    this._extension = this._remainder
    const testReg = getRegExp('nameClass')
    if (!testReg.test(this._extension)) {
      IssueError.generateAndThrow('invalidExtension', { tag: this.originalTag })
    }
  }

  /**
   * Nicely format this tag.
   *
   * @param {boolean} long Whether the tags should be in long form.
   * @returns {string} The nicely formatted version of this tag.
   */
  format(long = true) {
    let tagName
    if (long) {
      tagName = this._schemaTag?.longExtend(this._remainder)
    } else {
      tagName = this._schemaTag?.extend(this._remainder)
    }
    if (tagName === undefined) {
      tagName = this.originalTag
    }
    if (this.schema?.prefix) {
      return this.schema.prefix + ':' + tagName
    } else {
      return tagName
    }
  }

  /**
   * Override of {@link Object.prototype.toString}.
   *
   * @returns {string} The original form of this HED tag.
   */
  toString() {
    if (this.schema?.prefix) {
      return this.schema.prefix + ':' + this.originalTag
    } else {
      return this.originalTag
    }
  }

  /**
   * Determine whether this tag has a given attribute.
   *
   * @param {string} attribute An attribute name.
   * @returns {boolean} Whether this tag has the named attribute.
   */
  hasAttribute(attribute) {
    return this.schema?.tagHasAttribute(this.formattedTag, attribute)
  }

  /**
   * Determine whether this tag's parent tag has a given attribute.
   *
   * @param {string} attribute An attribute name.
   * @returns {boolean} Whether this tag's parent tag has the named attribute.
   */
  parentHasAttribute(attribute) {
    return this.schema?.tagHasAttribute(this.parentFormattedTag, attribute)
  }

  /**
   * Get the last part of a HED tag.
   *
   * @param {string} tagString A HED tag.
   * @returns {string} The last part of the tag using the given separator.
   */
  static getTagName(tagString) {
    const lastSlashIndex = tagString.lastIndexOf('/')
    if (lastSlashIndex === -1) {
      return tagString
    } else {
      return tagString.substring(lastSlashIndex + 1)
    }
  }

  /**
   * The trailing portion of {@link canonicalTag}.
   *
   * @returns {string} The "name" portion of the canonical tag.
   */
  get canonicalTagName() {
    return this._memoize('canonicalTagName', () => {
      return ParsedHedTag.getTagName(this.canonicalTag)
    })
  }

  /**
   * The trailing portion of {@link formattedTag}.
   *
   * @returns {string} The "name" portion of the formatted tag.
   */
  get formattedTagName() {
    return this._memoize('formattedTagName', () => {
      return ParsedHedTag.getTagName(this.formattedTag)
    })
  }

  /**
   * The trailing portion of {@link originalTag}.
   *
   * @returns {string} The "name" portion of the original tag.
   */
  get originalTagName() {
    return this._memoize('originalTagName', () => {
      return ParsedHedTag.getTagName(this.originalTag)
    })
  }

  /**
   * Get the HED tag prefix (up to the last slash).
   *
   * @param {string} tagString A HED tag.
   * @returns {string} The portion of the tag up to the last slash.
   */
  static getParentTag(tagString) {
    const lastSlashIndex = tagString.lastIndexOf('/')
    if (lastSlashIndex === -1) {
      return tagString
    } else {
      return tagString.substring(0, lastSlashIndex)
    }
  }

  /**
   * The parent portion of {@link canonicalTag}.
   *
   * @returns {string} The "parent" portion of the canonical tag.
   */
  get parentCanonicalTag() {
    return this._memoize('parentCanonicalTag', () => {
      return ParsedHedTag.getParentTag(this.canonicalTag)
    })
  }

  /**
   * The parent portion of {@link formattedTag}.
   *
   * @returns {string} The "parent" portion of the formatted tag.
   */
  get parentFormattedTag() {
    return this._memoize('parentFormattedTag', () => {
      return ParsedHedTag.getParentTag(this.formattedTag)
    })
  }

  /**
   * The parent portion of {@link originalTag}.
   *
   * @returns {string} The "parent" portion of the original tag.
   */
  get parentOriginalTag() {
    return this._memoize('parentOriginalTag', () => {
      return ParsedHedTag.getParentTag(this.originalTag)
    })
  }

  /**
   * Iterate through a tag's ancestor tag strings.
   *
   * @param {string} tagString A tag string.
   * @yields {string} The tag's ancestor tags.
   */
  static *ancestorIterator(tagString) {
    while (tagString.lastIndexOf('/') >= 0) {
      yield tagString
      tagString = ParsedHedTag.getParentTag(tagString)
    }
    yield tagString
  }

  /**
   * Determine whether this tag is a descendant of another tag.
   *
   * @param {ParsedHedTag|string} parent The possible parent tag.
   * @returns {boolean} Whether {@link parent} is the parent tag of this tag.
   */
  isDescendantOf(parent) {
    if (parent instanceof ParsedHedTag) {
      if (this.schema !== parent.schema) {
        return false
      }
      parent = parent.formattedTag
    }
    for (const ancestor of ParsedHedTag.ancestorIterator(this.formattedTag)) {
      if (ancestor === parent) {
        return true
      }
    }
    return false
  }

  /**
   * Check if any level of this HED tag allows extensions.
   *
   * @returns {boolean} Whether any level of this HED tag allows extensions.
   */
  get allowsExtensions() {
    return this._memoize('allowsExtensions', () => {
      if (this.originalTagName === '#') {
        return false
      }
      const extensionAllowedAttribute = 'extensionAllowed'
      if (this.hasAttribute(extensionAllowedAttribute)) {
        return true
      }
      return getTagLevels(this.formattedTag).some((tagSubstring) =>
        this.schema?.tagHasAttribute(tagSubstring, extensionAllowedAttribute),
      )
    })
  }

  /**
   * Determine if this HED tag is equivalent to another HED tag.
   *
   * HED tags are deemed equivalent if they have the same schema and formatted tag string.
   *
   * @param {ParsedHedTag} other A HED tag.
   * @returns {boolean} Whether {@link other} is equivalent to this HED tag.
   */
  equivalent(other) {
    return other instanceof ParsedHedTag && this.formattedTag === other.formattedTag && this.schema === other.schema
  }

  /**
   * Determine if this HED tag is in the linked schema.
   *
   * @returns {boolean} Whether this HED tag is in the linked schema.
   */
  get existsInSchema() {
    return this._memoize('existsInSchema', () => {
      return this.schema?.entries?.tags?.hasLongNameEntry(this.formattedTag)
    })
  }

  /**
   * Get the schema tag object for this tag.
   *
   * @returns {SchemaTag} The schema tag object for this tag.
   */
  get schemaTag() {
    return this._memoize('takesValueTag', () => {
      if (this._schemaTag instanceof SchemaValueTag) {
        return this._schemaTag.parent
      } else {
        return this._schemaTag
      }
    })
  }

  /**
   * Get the schema tag object for this tag's value-taking form.
   *
   * @returns {SchemaValueTag} The schema tag object for this tag's value-taking form.
   */
  get takesValueTag() {
    return this._memoize('takesValueTag', () => {
      if (this._schemaTag instanceof SchemaValueTag) {
        return this._schemaTag
      } else {
        return undefined
      }
    })
  }

  /**
   * Checks if this HED tag has the {@code takesValue} attribute.
   *
   * @returns {boolean} Whether this HED tag has the {@code takesValue} attribute.
   */
  get takesValue() {
    return this._memoize('takesValue', () => {
      return this.takesValueTag !== undefined
    })
  }

  /**
   * Checks if this HED tag has the {@code unitClass} attribute.
   *
   * @returns {boolean} Whether this HED tag has the {@code unitClass} attribute.
   */
  get hasUnitClass() {
    return this._memoize('hasUnitClass', () => {
      if (!this.takesValueTag) {
        return false
      }
      return this.takesValueTag.hasUnitClasses
    })
  }

  /**
   * Get the unit classes for this HED tag.
   *
   * @returns {SchemaUnitClass[]} The unit classes for this HED tag.
   */
  get unitClasses() {
    return this._memoize('unitClasses', () => {
      if (this.hasUnitClass) {
        return this.takesValueTag.unitClasses
      } else {
        return []
      }
    })
  }

  /**
   * Get the default unit for this HED tag.
   *
   * @returns {string} The default unit for this HED tag.
   */
  get defaultUnit() {
    return this._memoize('defaultUnit', () => {
      const defaultUnitsForUnitClassAttribute = 'defaultUnits'
      if (!this.hasUnitClass) {
        return ''
      }
      const tagDefaultUnit = this.takesValueTag.getNamedAttributeValue(defaultUnitsForUnitClassAttribute)
      if (tagDefaultUnit) {
        return tagDefaultUnit
      }
      const firstUnitClass = this.unitClasses[0]
      return firstUnitClass.getNamedAttributeValue(defaultUnitsForUnitClassAttribute)
    })
  }

  /**
   * Get the legal units for this HED tag.
   *
   * @returns {Set<SchemaUnit>} The legal units for this HED tag.
   */
  get validUnits() {
    return this._memoize('validUnits', () => {
      const tagUnitClasses = this.unitClasses
      const units = new Set()
      for (const unitClass of tagUnitClasses) {
        const unitClassUnits = this.schema?.entries.unitClasses.getEntry(unitClass.name).units
        for (const unit of unitClassUnits.values()) {
          units.add(unit)
        }
      }
      return units
    })
  }

  /**
   * Validate a unit and strip it from the value.
   *
   * @param {ParsedHedTag} tag A HED tag.
   * @returns {[boolean, boolean, string]} Whether a unit was found, whether it was valid, and the stripped value.
   */
  validateUnits(tag) {
    const originalTagUnitValue = tag.originalTagName
    const tagUnitClassUnits = tag.validUnits
    const validUnits = tag.schema.entries.allUnits
    const unitStrings = Array.from(validUnits.keys())
    unitStrings.sort((first, second) => {
      return second.length - first.length
    })
    let actualUnit = getTagName(originalTagUnitValue, ' ')
    let noUnitFound = false
    if (actualUnit === originalTagUnitValue) {
      actualUnit = ''
      noUnitFound = true
    }
    let foundUnit, foundWrongCaseUnit, strippedValue
    for (const unitName of unitStrings) {
      const unit = validUnits.get(unitName)
      const isPrefixUnit = unit.isPrefixUnit
      const isUnitSymbol = unit.isUnitSymbol
      for (const derivativeUnit of unit.derivativeUnits()) {
        if (isPrefixUnit && originalTagUnitValue.startsWith(derivativeUnit)) {
          foundUnit = true
          noUnitFound = false
          strippedValue = originalTagUnitValue.substring(derivativeUnit.length).trim()
        }
        if (actualUnit === derivativeUnit) {
          foundUnit = true
          strippedValue = getParentTag(originalTagUnitValue, ' ')
        } else if (actualUnit.toLowerCase() === derivativeUnit.toLowerCase()) {
          if (isUnitSymbol) {
            foundWrongCaseUnit = true
          } else {
            foundUnit = true
          }
          strippedValue = getParentTag(originalTagUnitValue, ' ')
        }
        if (foundUnit) {
          const unitIsValid = tagUnitClassUnits.has(unit)
          return [true, unitIsValid, strippedValue]
        }
      }
      if (foundWrongCaseUnit) {
        return [true, false, strippedValue]
      }
    }
    return [!noUnitFound, false, originalTagUnitValue]
  }
}

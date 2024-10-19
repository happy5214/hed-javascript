export const errorTests = [
  {
    name: 'empty-tag-in-various-places',
    description: 'Empty tags in various places (empty groups are allowed).',
    tests: [
      {
        name: 'end-in-comma',
        string: 'x,y,',
        issueCount: 1,
        hedCode: 'TAG_EMPTY',
        code: 'emptyTagFound',
        warning: false,
        explanation: 'Cannot end in a comma',
      },
      {
        name: 'double-in-comma',
        string: 'x,,y,',
        issueCount: 1,
        hedCode: 'TAG_EMPTY',
        code: 'emptyTagFound',
        warning: false,
        explanation: 'Cannot have double commas',
      },
      {
        name: 'leading-comma',
        string: ',x,y',
        issueCount: 1,
        hedCode: 'TAG_EMPTY',
        code: 'emptyTagFound',
        warning: false,
        explanation: 'Cannot have a leading comma',
      },
    ],
  },
  {
    name: 'extra-slash-in-various-places',
    description: 'Tags cannot have leading or trailing, or extra slashes',
    tests: [
      {
        name: 'leading-slash',
        string: '/x',
        issueCount: 1,
        hedCode: 'TAG_INVALID',
        code: 'extraSlash',
        warning: false,
        explanation: 'Cannot have a leading slash',
      },
      {
        name: 'double-slash',
        string: 'x//y',
        issueCount: 1,
        hedCode: 'TAG_INVALID',
        code: 'extraSlash',
        warning: false,
        explanation: 'Cannot have double slash',
      },
      {
        name: 'triple-slash',
        string: 'x///y',
        issueCount: 1,
        hedCode: 'TAG_INVALID',
        code: 'extraSlash',
        warning: false,
        explanation: 'Cannot have double slash',
      },
      {
        name: 'trailing-slash',
        string: 'x/y/',
        issueCount: 1,
        hedCode: 'TAG_INVALID',
        code: 'extraSlash',
        warning: false,
        explanation: 'Cannot have ending slash',
      },
      {
        name: 'value-slash',
        string: 'x /y',
        issueCount: 1,
        hedCode: 'TAG_INVALID',
        code: 'extraBlank',
        warning: false,
        explanation: 'Cannot extra blanks before or after slashes',
      },
    ],
  },
  {
    name: 'improper-curly-braces',
    description: 'Curly braces cannot have commas or parentheses or other curly braces',
    tests: [
      {
        name: 'leading-close-brace',
        string: '}x',
        issueCount: 1,
        hedCode: 'SIDECAR_BRACES_INVALID',
        code: 'extraSlash',
        warning: false,
        explanation: 'Cannot have a leading slash',
      },
      {
        name: 'parenthesis-after-open-brace',
        string: 'x, {y(z)}',
        issueCount: 1,
        hedCode: 'SIDECAR_BRACES_INVALID',
        code: 'unclosedCurlyBrace',
        warning: false,
        explanation: 'Cannot parentheses inside curly braces',
      },
      {
        name: 'comma-inside-curly-brace',
        string: 'x, {y,z}',
        issueCount: 1,
        hedCode: 'SIDECAR_BRACES_INVALID',
        code: 'unclosedCurlyBrace',
        warning: false,
        explanation: 'Cannot have a comma inside curly brace',
      },
      {
        name: 'unclosed-curly-brace',
        string: 'x, {y, z',
        issueCount: 1,
        hedCode: 'SIDECAR_BRACES_INVALID',
        code: 'unclosedCurlyBrace',
        warning: false,
        explanation: 'Open curly braces must be matched with closing curly braces',
      },
      {
        name: 'nested-curly-brace',
        string: '{x}, {{y, z}}',
        issueCount: 1,
        hedCode: 'SIDECAR_BRACES_INVALID',
        code: 'nestedCurlyBrace',
        warning: false,
        explanation: 'Curly braces cannot be nested',
      },
    ],
  },
]

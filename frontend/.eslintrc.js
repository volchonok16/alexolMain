module.exports = {
  rules: {
    'max-len': ['warn', {
      code: 80,
      tabWidth: 4,
      ignoreComments: true,
      ignoreTrailingComments: true,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
    
    // Поддержка JSX
    'react/jsx-max-props-per-line': ['error', {
      maximum: 1,
      when: 'multiline'
    }],
    
    'react/jsx-first-prop-new-line': ['error', 'multiline'],
    'react/jsx-closing-bracket-location': ['error', 'line-aligned'],
  }
};
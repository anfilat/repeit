# Task Completion Checklist

Before marking a task as complete:

1. **TypeScript check:** Run `npm run build` to verify no type errors
2. **Tests:** Run `npm test` to ensure all tests pass
3. **No unused imports/variables:** TypeScript strict mode catches these, but verify after edits
4. **Follow three-layer architecture:** Services have no React deps, hooks bridge to React, components are UI-only
5. **Test colocated:** New tests go in `__tests__` directory next to the source file

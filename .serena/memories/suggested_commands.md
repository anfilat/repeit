# Suggested Commands

## Development
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check (tsc -b) + Vite production build
npm run preview      # Preview production build
```

## Testing
```bash
npm test             # Run all tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
npx vitest run src/audio/__tests__/AudioEngine.test.ts  # Run single test file
```

## System (macOS/Darwin)
```bash
git status / git log / git diff   # Version control
ls / find                          # File navigation
grep / rg                          # Search
```

## Linting / Formatting
No separate lint or format commands configured. TypeScript strict mode is enforced via `tsc -b` in the build step.

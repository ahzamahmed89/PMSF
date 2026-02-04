# Vite JavaScript Project - Setup Instructions

This is a Vite project with vanilla JavaScript set up with Yarn as the package manager.

## Project Setup Checklist

- [x] Create copilot-instructions.md
- [x] Get project setup information
- [x] Scaffold Vite project
- [x] Project files created (index.html, main.js, style.css, vite.config.js)
- [ ] Install dependencies with Yarn
- [ ] Verify project compiles
- [ ] Create run task
- [ ] Update documentation

## Installation

Install dependencies using Yarn:

```bash
yarn install
```

## Development

Start the development server:

```bash
yarn dev
```

The application will be available at `http://localhost:5173`

## Build

Build for production:

```bash
yarn build
```

## Preview

Preview the production build:

```bash
yarn preview
```

## Project Structure

- `index.html` - HTML entry point
- `main.js` - JavaScript entry point
- `style.css` - Stylesheet
- `vite.config.js` - Vite configuration
- `package.json` - Project dependencies
- `tsconfig.json` - TypeScript configuration (optional)

## Notes

- Vite uses ES modules natively
- The project is configured to use JavaScript (type: "module" in package.json)
- Yarn is the package manager for this project

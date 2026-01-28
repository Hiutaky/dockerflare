import { relative } from "path";

const buildEslintCommand = (filenames) =>
  `eslint --fix ${filenames
    .map((f) => `"${relative(process.cwd(), f)}"`)
    .join(" ")}`;

const buildPrettierCommand = (filenames) => `prettier . --check`;
const buildTscCommand = () => `bun tsc:check`;

export default {
  "*.{js,jsx,ts,tsx}": [
    buildEslintCommand,
    buildPrettierCommand,
    buildTscCommand,
  ],
};

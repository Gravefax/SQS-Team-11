/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make code hard to maintain and test.",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Orphan modules are not imported by anyone — likely dead code.",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$",
          "(^|/)vitest\\.setup\\.ts$",
          "(^|/)vitest\\.config\\.ts$",
          "(^|/)playwright\\.config\\.ts$",
          "(^|/)next\\.config\\.ts$",
          "(^|/)postcss\\.config\\.mjs$",
          "(^|/)tailwind\\.config\\.ts$",
        ],
      },
      to: {},
    },
    {
      name: "no-deprecated-core",
      severity: "warn",
      comment: "Deprecated Node.js core modules should be replaced.",
      from: {},
      to: {
        dependencyTypes: ["core"],
        path: [
          "^(v8/tools/codemap)$",
          "^(v8/tools/consarray)$",
          "^(v8/tools/csvparser)$",
          "^(v8/tools/logreader)$",
          "^(v8/tools/profile_view)$",
          "^(v8/tools/profile)$",
          "^(v8/tools/SourceMap)$",
          "^(v8/tools/splaytree)$",
          "^(v8/tools/tickprocessor-driver)$",
          "^(v8/tools/tickprocessor)$",
          "^(node-inspect/lib/_inspect)$",
          "^(node-inspect/lib/internal/inspect_client)$",
          "^(node-inspect/lib/internal/inspect_repl)$",
          "^(async_hooks)$",
          "^(punycode)$",
          "^(domain)$",
          "^(constants)$",
          "^(sys)$",
          "^(_linklist)$",
          "^(_stream_wrap)$",
        ],
      },
    },
    {
      name: "not-to-test-from-src",
      severity: "error",
      comment: "Source code must not import from test files.",
      from: {
        pathNot: [
          "\\.(spec|test)\\.(ts|tsx|js|jsx)$",
          "(^|/)__tests__/",
          "(^|/)e2e/",
        ],
      },
      to: {
        path: [
          "\\.(spec|test)\\.(ts|tsx|js|jsx)$",
          "(^|/)__tests__/",
          "(^|/)e2e/",
        ],
      },
    },
    {
      name: "components-not-to-api",
      severity: "error",
      comment:
        "UI components must not directly import from API routes. Use services or hooks instead.",
      from: {
        path: "(^|/)app/components/",
      },
      to: {
        path: "(^|/)app/api/",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
      dependencyTypes: [
        "npm",
        "npm-dev",
        "npm-optional",
        "npm-peer",
        "npm-bundled",
        "npm-no-pkg",
      ],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "./tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
      },
      archi: {
        collapsePattern:
          "^(node_modules|app/components|app/api|app/services|app/hooks)/[^/]+",
      },
    },
  },
};

#!/usr/bin/env node

'use strict';

const { format, supportedDialects } = require('../dist/cjs/index.js');
const fs = require('fs');
const path = require('path');
const tty = require('tty');
const { version } = require('../package.json');
const { ArgumentParser } = require('argparse');
const { promisify } = require('util');
const { text } = require('node:stream/consumers');

// ---------------------------------------------------------------------------
// Persistent config: ~/.dlh-sql-formatter/config.json
// ---------------------------------------------------------------------------

const GLOBAL_CONFIG_DIR = path.join(require('os').homedir(), '.dlh-sql-formatter');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');

function readGlobalConfig() {
  try {
    return JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeGlobalConfig(cfg) {
  fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n', {
    encoding: 'utf-8',
    mode: 0o600, // owner-only read/write
  });
}

/**
 * Handle `dlh-sql-formatter config <subcommand>` before argparse runs.
 * This is done pre-parse because argparse doesn't support subcommands cleanly
 * alongside the existing positional `FILE` argument.
 *
 * Subcommands:
 *   config set-key <provider> <key>
 *   config set-model <provider> <model>
 *   config set-base-url <provider> <url>
 *   config set-provider <provider>
 *   config show
 *   config path
 *   config reset
 */
function handleConfigCommand(argv) {
  const sub = argv[3]; // argv = [node, script, 'config', <sub>, ...]

  if (sub === 'help') {
    console.log('Usage: dlh-sql-formatter config <subcommand> [options]');
    console.log('\nSubcommands:');
    console.log('  set-key <provider> <key>       Save API key for a provider');
    console.log('  remove-key <provider>          Remove saved API key for a provider');
    console.log('  set-provider <provider>        Set default AI provider');
    console.log('  set-model <provider> <model>   Set default model for a provider');
    console.log('  set-base-url <provider> <url>  Set base URL for a provider');
    console.log('  show                           Display current configuration');
    console.log('  path                           Show path to config file');
    console.log('  reset                          Delete global configuration');
    process.exit(0);
  }

  if (!sub || sub === 'show') {
    const cfg = readGlobalConfig();
    if (Object.keys(cfg).length === 0) {
      console.log('No global configuration set.');
      console.log(`Config file: ${GLOBAL_CONFIG_FILE}`);
      console.log('\nRun "dlh-sql-formatter config set-key <provider> <key>" to get started.');
    } else {
      // Redact API keys in display
      const display = JSON.parse(JSON.stringify(cfg));
      if (display.ai && display.ai.keys) {
        for (const [p, k] of Object.entries(display.ai.keys)) {
          if (typeof k === 'string' && k.length > 8) {
            display.ai.keys[p] = k.slice(0, 4) + '...' + k.slice(-4);
          }
        }
      }
      console.log(JSON.stringify(display, null, 2));
      console.log(`\nConfig file: ${GLOBAL_CONFIG_FILE}`);
    }
    process.exit(0);
  }

  if (sub === 'path') {
    console.log(GLOBAL_CONFIG_FILE);
    process.exit(0);
  }

  if (sub === 'reset') {
    try {
      fs.unlinkSync(GLOBAL_CONFIG_FILE);
      console.log('Global configuration reset.');
    } catch {
      console.log('No configuration file to reset.');
    }
    process.exit(0);
  }

  if (sub === 'remove-key') {
    const provider = argv[4];
    if (!provider) {
      console.error('Usage: dlh-sql-formatter config remove-key <provider>');
      process.exit(1);
    }
    const cfg = readGlobalConfig();
    if (cfg.ai?.keys?.[provider]) {
      delete cfg.ai.keys[provider];
      // If the removed key was for the default provider, also unset the default provider
      if (cfg.ai.provider === provider) {
        delete cfg.ai.provider;
        console.log(`✓ API key for "${provider}" removed. Default provider unset.`);
      } else {
        console.log(`✓ API key for "${provider}" removed.`);
      }
      writeGlobalConfig(cfg);
    } else {
      console.log(`No API key found for provider "${provider}".`);
    }
    process.exit(0);
  }

  if (sub === 'set-key') {
    const provider = argv[4];
    const key = argv[5];
    if (!provider || !key) {
      console.error('Usage: dlh-sql-formatter config set-key <provider> <key>');
      console.error('Providers: anthropic, openai, gemini');
      process.exit(1);
    }
    const cfg = readGlobalConfig();
    if (!cfg.ai) cfg.ai = {};
    if (!cfg.ai.keys) cfg.ai.keys = {};
    cfg.ai.keys[provider] = key;
    // Also set as default provider if none is set yet
    if (!cfg.ai.provider) cfg.ai.provider = provider;
    writeGlobalConfig(cfg);
    console.log(`✓ API key saved for "${provider}".`);
    console.log(`  Default provider: ${cfg.ai.provider}`);
    console.log(`  Config file: ${GLOBAL_CONFIG_FILE} (mode 600)`);
    process.exit(0);
  }

  if (sub === 'set-provider') {
    const provider = argv[4];
    if (!provider) {
      console.error('Usage: dlh-sql-formatter config set-provider <provider>');
      process.exit(1);
    }
    const cfg = readGlobalConfig();
    if (!cfg.ai) cfg.ai = {};
    cfg.ai.provider = provider;
    writeGlobalConfig(cfg);
    console.log(`✓ Default provider set to "${provider}".`);
    process.exit(0);
  }

  if (sub === 'set-model') {
    const provider = argv[4];
    const model = argv[5];
    if (!provider || !model) {
      console.error('Usage: dlh-sql-formatter config set-model <provider> <model>');
      process.exit(1);
    }
    const cfg = readGlobalConfig();
    if (!cfg.ai) cfg.ai = {};
    if (!cfg.ai.models) cfg.ai.models = {};
    cfg.ai.models[provider] = model;
    writeGlobalConfig(cfg);
    console.log(`✓ Default model for "${provider}" set to "${model}".`);
    process.exit(0);
  }

  if (sub === 'set-base-url') {
    const provider = argv[4];
    const url = argv[5];
    if (!provider || !url) {
      console.error('Usage: dlh-sql-formatter config set-base-url <provider> <url>');
      process.exit(1);
    }
    const cfg = readGlobalConfig();
    if (!cfg.ai) cfg.ai = {};
    if (!cfg.ai.baseUrls) cfg.ai.baseUrls = {};
    cfg.ai.baseUrls[provider] = url;
    writeGlobalConfig(cfg);
    console.log(`✓ Base URL for "${provider}" set to "${url}".`);
    process.exit(0);
  }

  console.error(`Unknown config subcommand: ${sub}`);
  console.error('Available: set-key, set-provider, set-model, set-base-url, show, path, reset');
  process.exit(1);
}

// Check for `config` subcommand before argparse
if (process.argv[2] === 'config') {
  handleConfigCommand(process.argv);
}

/**
 * Handle `dlh-sql-formatter list-providers` — prints all AI providers
 * registered in code (built-in enum + any custom-registered providers),
 * resolved at runtime from the AI module.
 */
function handleListProvidersCommand(argv) {
  let listProviders, DEFAULT_MODELS, ENV_KEY_NAMES;
  try {
    ({ listProviders, DEFAULT_MODELS, ENV_KEY_NAMES } = require('../dist/cjs/ai/index.js'));
  } catch (e) {
    process.stderr.write('Error: AI module not found. Ensure the package is built.\n');
    process.exit(1);
  }

  const providers = listProviders();
  const json = argv.includes('--json');

  if (json) {
    const out = providers.map(name => ({
      name,
      defaultModel: DEFAULT_MODELS?.[name] ?? null,
      envVars: ENV_KEY_NAMES?.[name] ?? [],
    }));
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  }

  console.log('Available AI providers:');
  for (const name of providers) {
    const model = DEFAULT_MODELS?.[name];
    const envs = ENV_KEY_NAMES?.[name] ?? [];
    const parts = [];
    if (model) parts.push(`default model: ${model}`);
    if (envs.length) parts.push(`env: ${envs.join(' | ')}`);
    const suffix = parts.length ? `  (${parts.join('; ')})` : '';
    console.log(`  - ${name}${suffix}`);
  }
  process.exit(0);
}

if (process.argv[2] === 'list-providers') {
  handleListProvidersCommand(process.argv);
}

// ---------------------------------------------------------------------------
// Main CLI class
// ---------------------------------------------------------------------------

class SqlFormatterCli {
  constructor() {
    this.parser = this.getParser();
    this.args = this.parser.parse_args();
    this.globalCfg = readGlobalConfig();
  }

  async run() {
    if (this.args.list_providers) {
      handleListProvidersCommand(process.argv);
      return;
    }
    this.cfg = await this.readConfig();
    this.query = await this.getInput();
    const formattedQuery = format(this.query, this.cfg).trim() + '\n';

    if (this.args.suggest) {
      await this.handleSuggest(formattedQuery);
      return;
    }

    if (this.args.rewrite) {
      await this.handleRewrite(formattedQuery);
      return;
    }

    this.writeOutput(this.getOutputFile(this.args), formattedQuery);
  }

  /**
   * Resolve which AI provider to use.
   * Priority: --ai-provider flag > global config > .env auto-detect > rule-based
   */
  resolveProvider() {
    if (this.args.ai_provider) return this.args.ai_provider;

    // Global config
    if (this.globalCfg.ai?.provider) return this.globalCfg.ai.provider;

    // Auto-detect from environment variables
    const envMap = {
      ANTHROPIC_API_KEY: 'anthropic',
      OPENAI_API_KEY: 'openai',
      GEMINI_API_KEY: 'gemini',
      GOOGLE_API_KEY: 'gemini',
    };
    for (const [envVar, provider] of Object.entries(envMap)) {
      if (process.env[envVar]) return provider;
    }

    return 'rule-based';
  }

  /**
   * Resolve API key.
   * Priority: --ai-key flag > global config > env var > error
   */
  resolveApiKey(provider) {
    // 1. --ai-key flag
    if (this.args.ai_key) return this.args.ai_key;

    // 2. Global config file
    const savedKey = this.globalCfg.ai?.keys?.[provider];
    if (savedKey) return savedKey;

    // 3. Environment variables
    const envNames = {
      anthropic: ['ANTHROPIC_API_KEY'],
      openai: ['OPENAI_API_KEY'],
      gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    };
    for (const envName of envNames[provider] || []) {
      if (process.env[envName]) return process.env[envName];
    }

    // 4. Error — no key found
    if (provider !== 'rule-based') {
      const envHint = (envNames[provider] || []).join(' or ') || '<PROVIDER>_API_KEY';
      process.stderr.write(
        `Error: No API key found for provider "${provider}".\n\n` +
          `Set it once (recommended):\n` +
          `  dlh-sql-formatter config set-key ${provider} <your-key>\n\n` +
          `Or use an environment variable:\n` +
          `  export ${envHint}=<your-key>\n\n` +
          `Or pass it per-command:\n` +
          `  dlh-sql-formatter --rewrite --ai-key <your-key> query.sql\n`
      );
      process.exit(1);
    }
    return '';
  }

  /**
   * Resolve model.
   * Priority: --ai-model flag > global config > provider default
   */
  resolveModel() {
    if (this.args.ai_model) return this.args.ai_model;
    const provider = this.resolveProvider();
    return this.globalCfg.ai?.models?.[provider] || undefined;
  }

  /**
   * Resolve base URL.
   * Priority: --ai-base-url flag > global config > provider default
   */
  resolveBaseUrl() {
    if (this.args.ai_base_url) return this.args.ai_base_url;
    const provider = this.resolveProvider();
    return this.globalCfg.ai?.baseUrls?.[provider] || undefined;
  }

  async handleSuggest(formattedQuery) {
    try {
      const { suggest } = require('../dist/cjs/ai/index.js');
      const result = suggest(formattedQuery.trim(), { dialect: this.cfg.language });

      if (this.args.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        process.stdout.write(formattedQuery);
        if (result.suggestions.length > 0) {
          process.stderr.write('\n--- Suggestions ---\n');
          for (const s of result.suggestions) {
            const lineInfo = s.line ? ` (line ${s.line})` : '';
            const icon = s.severity === 'error' ? '✗' : s.severity === 'warning' ? '⚠' : 'ℹ';
            process.stderr.write(`${icon} [${s.severity}]${lineInfo} ${s.message}\n`);
          }
          process.stderr.write(`\n${result.suggestions.length} suggestion(s) found.\n`);
        } else {
          process.stderr.write('\n✓ No suggestions — query looks good!\n');
        }
      }
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        process.stderr.write('Error: AI module not found. Ensure the package is built.\n');
        process.exit(1);
      }
      throw e;
    }
  }

  async handleRewrite(formattedQuery) {
    const provider = this.resolveProvider();
    const apiKey = this.resolveApiKey(provider); // exits with error if no key found

    try {
      const { withAI } = require('../dist/cjs/ai/index.js');
      const result = await withAI(formattedQuery.trim(), {
        provider,
        apiKey,
        model: this.resolveModel(),
        baseUrl: this.resolveBaseUrl(),
        features: ['rewrite'],
        dialect: this.cfg.language,
      });

      if (this.args.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        const providerLabel = result.provider || provider;
        const modelLabel = result.model || this.args.ai_model || '(default)';

        process.stdout.write(`--- Provider: ${providerLabel} | Model: ${modelLabel} ---\n\n`);
        process.stdout.write('--- Original (formatted) ---\n');
        process.stdout.write(result.formatted + '\n\n');
        process.stdout.write('--- AI Rewrite ---\n');
        process.stdout.write(result.rewrite.sql + '\n\n');
        process.stdout.write('--- Explanation ---\n');
        process.stdout.write(result.rewrite.explanation + '\n');
        if (result.rewrite.optimizations.length > 0) {
          process.stdout.write('\n--- Optimizations ---\n');
          for (const opt of result.rewrite.optimizations) {
            process.stdout.write(`• [${opt.type}] ${opt.description}\n`);
            if (opt.suggestedChange) {
              process.stdout.write(`  → ${opt.suggestedChange}\n`);
            }
          }
        }
      }
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        process.stderr.write('Error: AI module not found. Ensure the package is built.\n');
        process.exit(1);
      }
      process.stderr.write(`Error: ${e.message}\n`);
      process.exit(1);
    }
  }

  getParser() {
    const parser = new ArgumentParser({
      add_help: true,
      description:
        'DLH SQL Formatter CLI - Format SQL queries from the command line \n\n' +
        'Subcommands:\n' +
        '  config <subcommand>     Manage saved config (run "config help" for details)\n',
    });

    parser.add_argument('file', {
      metavar: 'FILE',
      nargs: '?',
      help: 'Input SQL file (defaults to stdin)',
    });

    parser.add_argument('-o', '--output', {
      help: 'File to write SQL output (defaults to stdout)',
    });

    parser.add_argument('--fix', {
      help: 'Update the file in-place',
      action: 'store_const',
      const: true,
    });

    parser.add_argument('-l', '--language', {
      help: 'SQL Formatter dialect (defaults to basic sql)',
      choices: supportedDialects,
      default: 'sql',
    });

    parser.add_argument('-c', '--config', {
      help: 'Path to config JSON file or json string',
    });

    // AI feature flags
    parser.add_argument('--suggest', {
      help: 'Analyze SQL and show suggestions (no API key needed)',
      action: 'store_const',
      const: true,
    });

    parser.add_argument('--rewrite', {
      help: 'AI-powered SQL rewrite (requires API key for chosen provider)',
      action: 'store_const',
      const: true,
    });

    parser.add_argument('--json', {
      help: 'Output results as JSON (for --suggest and --rewrite)',
      action: 'store_const',
      const: true,
    });

    parser.add_argument('--list-providers', {
      help: 'List all AI providers available in code (built-in + custom-registered)',
      action: 'store_const',
      const: true,
      dest: 'list_providers',
    });

    parser.add_argument('--ai-provider', {
      help: 'AI provider: anthropic, openai, gemini, rule-based (auto-detected from env vars if omitted)',
      dest: 'ai_provider',
    });

    parser.add_argument('--ai-key', {
      help: 'API key for AI provider (alternative to environment variable)',
      dest: 'ai_key',
    });

    parser.add_argument('--ai-model', {
      help: 'AI model override (each provider has a sensible default)',
      dest: 'ai_model',
    });

    parser.add_argument('--ai-base-url', {
      help: 'Base URL override for AI API (for proxies, Ollama, Azure, etc.)',
      dest: 'ai_base_url',
    });

    parser.add_argument('--version', {
      action: 'version',
      version,
    });

    return parser;
  }

  async readConfig() {
    if (
      tty.isatty(0) &&
      Object.entries(this.args).every(
        ([k, v]) =>
          k === 'language' ||
          k === 'ai_model' ||
          k === 'ai_provider' ||
          v === undefined ||
          v === false ||
          v === null
      )
    ) {
      this.parser.print_help();
      process.exit(0);
    }

    return {
      language: this.args.language,
      ...(await this.getConfig()),
    };
  }

  async getConfig() {
    if (this.args.config) {
      try {
        return JSON.parse(this.args.config);
      } catch (e) {
        return this.parseFile(this.args.config);
      }
    }
    const localConfig = this.findConfig();
    if (!localConfig) return null;
    return this.parseFile(localConfig);
  }

  findConfig(dir = process.cwd()) {
    const filePath = path.join(dir, '.sql-formatter.json');
    if (!fs.existsSync(filePath)) {
      const parentDir = path.resolve(dir, '..');
      if (parentDir === dir) return null;
      return this.findConfig(parentDir);
    }
    return filePath;
  }

  async getInput() {
    const infile = this.args.file || process.stdin.fd;
    if (this.args.file) {
      return await this.readFile(infile);
    } else {
      return await text(process.stdin);
    }
  }

  async parseFile(filename) {
    try {
      return JSON.parse(await this.readFile(filename));
    } catch (e) {
      console.error(`Error: unable to parse as JSON or treat as JSON file: ${filename}`);
      process.exit(1);
    }
  }

  async readFile(filename) {
    try {
      return promisify(fs.readFile)(filename, { encoding: 'utf-8' });
    } catch (e) {
      this.exitWhenIOError(e, filename);
      console.error('An unknown error has occurred, please file a bug report at:');
      console.log('https://github.com/datalakehouse/dlh-sql-formatter/issues\n');
      throw e;
    }
  }

  exitWhenIOError(e, infile) {
    if (e.code === 'EAGAIN') {
      console.error('Error: no file specified and no data in stdin');
      process.exit(1);
    }
    if (e.code === 'ENOENT') {
      console.error(`Error: could not open file ${infile}`);
      process.exit(1);
    }
  }

  getOutputFile(args) {
    if (args.output && args.fix) {
      console.error('Error: Cannot use both --output and --fix options simultaneously');
      process.exit(1);
    }
    if (args.fix && !args.file) {
      console.error('Error: The --fix option cannot be used without a filename');
      process.exit(1);
    }
    if (args.fix) return args.file;
    return args.output;
  }

  writeOutput(file, query) {
    if (!file) {
      process.stdout.write(query);
    } else {
      fs.writeFileSync(file, query);
    }
  }
}

const cli = new SqlFormatterCli();
cli.run();

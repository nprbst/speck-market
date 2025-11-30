#!/usr/bin/env bun
// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// node_modules/commander/lib/error.js
var require_error = __commonJS((exports) => {
  class CommanderError extends Error {
    constructor(exitCode, code, message) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.code = code;
      this.exitCode = exitCode;
      this.nestedError = undefined;
    }
  }

  class InvalidArgumentError extends CommanderError {
    constructor(message) {
      super(1, "commander.invalidArgument", message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
    }
  }
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Argument {
    constructor(name, description) {
      this.description = description || "";
      this.variadic = false;
      this.parseArg = undefined;
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.argChoices = undefined;
      switch (name[0]) {
        case "<":
          this.required = true;
          this._name = name.slice(1, -1);
          break;
        case "[":
          this.required = false;
          this._name = name.slice(1, -1);
          break;
        default:
          this.required = true;
          this._name = name;
          break;
      }
      if (this._name.endsWith("...")) {
        this.variadic = true;
        this._name = this._name.slice(0, -3);
      }
    }
    name() {
      return this._name;
    }
    _collectValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      previous.push(value);
      return previous;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._collectValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    argRequired() {
      this.required = true;
      return this;
    }
    argOptional() {
      this.required = false;
      return this;
    }
  }
  function humanReadableArgName(arg) {
    const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
    return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
  }
  exports.Argument = Argument;
  exports.humanReadableArgName = humanReadableArgName;
});

// node_modules/commander/lib/help.js
var require_help = __commonJS((exports) => {
  var { humanReadableArgName } = require_argument();

  class Help {
    constructor() {
      this.helpWidth = undefined;
      this.minWidthToWrap = 40;
      this.sortSubcommands = false;
      this.sortOptions = false;
      this.showGlobalOptions = false;
    }
    prepareContext(contextOptions) {
      this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
    }
    visibleCommands(cmd) {
      const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
      const helpCommand = cmd._getHelpCommand();
      if (helpCommand && !helpCommand._hidden) {
        visibleCommands.push(helpCommand);
      }
      if (this.sortSubcommands) {
        visibleCommands.sort((a, b) => {
          return a.name().localeCompare(b.name());
        });
      }
      return visibleCommands;
    }
    compareOptions(a, b) {
      const getSortKey = (option) => {
        return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
      };
      return getSortKey(a).localeCompare(getSortKey(b));
    }
    visibleOptions(cmd) {
      const visibleOptions = cmd.options.filter((option) => !option.hidden);
      const helpOption = cmd._getHelpOption();
      if (helpOption && !helpOption.hidden) {
        const removeShort = helpOption.short && cmd._findOption(helpOption.short);
        const removeLong = helpOption.long && cmd._findOption(helpOption.long);
        if (!removeShort && !removeLong) {
          visibleOptions.push(helpOption);
        } else if (helpOption.long && !removeLong) {
          visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
        } else if (helpOption.short && !removeShort) {
          visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
        }
      }
      if (this.sortOptions) {
        visibleOptions.sort(this.compareOptions);
      }
      return visibleOptions;
    }
    visibleGlobalOptions(cmd) {
      if (!this.showGlobalOptions)
        return [];
      const globalOptions = [];
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
        globalOptions.push(...visibleOptions);
      }
      if (this.sortOptions) {
        globalOptions.sort(this.compareOptions);
      }
      return globalOptions;
    }
    visibleArguments(cmd) {
      if (cmd._argsDescription) {
        cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        });
      }
      if (cmd.registeredArguments.find((argument) => argument.description)) {
        return cmd.registeredArguments;
      }
      return [];
    }
    subcommandTerm(cmd) {
      const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
      return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
    }
    optionTerm(option) {
      return option.flags;
    }
    argumentTerm(argument) {
      return argument.name();
    }
    longestSubcommandTermLength(cmd, helper) {
      return helper.visibleCommands(cmd).reduce((max, command) => {
        return Math.max(max, this.displayWidth(helper.styleSubcommandTerm(helper.subcommandTerm(command))));
      }, 0);
    }
    longestOptionTermLength(cmd, helper) {
      return helper.visibleOptions(cmd).reduce((max, option) => {
        return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
      }, 0);
    }
    longestGlobalOptionTermLength(cmd, helper) {
      return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
        return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
      }, 0);
    }
    longestArgumentTermLength(cmd, helper) {
      return helper.visibleArguments(cmd).reduce((max, argument) => {
        return Math.max(max, this.displayWidth(helper.styleArgumentTerm(helper.argumentTerm(argument))));
      }, 0);
    }
    commandUsage(cmd) {
      let cmdName = cmd._name;
      if (cmd._aliases[0]) {
        cmdName = cmdName + "|" + cmd._aliases[0];
      }
      let ancestorCmdNames = "";
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
      }
      return ancestorCmdNames + cmdName + " " + cmd.usage();
    }
    commandDescription(cmd) {
      return cmd.description();
    }
    subcommandDescription(cmd) {
      return cmd.summary() || cmd.description();
    }
    optionDescription(option) {
      const extraInfo = [];
      if (option.argChoices) {
        extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (option.defaultValue !== undefined) {
        const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
        if (showDefault) {
          extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
        }
      }
      if (option.presetArg !== undefined && option.optional) {
        extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
      }
      if (option.envVar !== undefined) {
        extraInfo.push(`env: ${option.envVar}`);
      }
      if (extraInfo.length > 0) {
        const extraDescription = `(${extraInfo.join(", ")})`;
        if (option.description) {
          return `${option.description} ${extraDescription}`;
        }
        return extraDescription;
      }
      return option.description;
    }
    argumentDescription(argument) {
      const extraInfo = [];
      if (argument.argChoices) {
        extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (argument.defaultValue !== undefined) {
        extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
      }
      if (extraInfo.length > 0) {
        const extraDescription = `(${extraInfo.join(", ")})`;
        if (argument.description) {
          return `${argument.description} ${extraDescription}`;
        }
        return extraDescription;
      }
      return argument.description;
    }
    formatItemList(heading, items, helper) {
      if (items.length === 0)
        return [];
      return [helper.styleTitle(heading), ...items, ""];
    }
    groupItems(unsortedItems, visibleItems, getGroup) {
      const result = new Map;
      unsortedItems.forEach((item) => {
        const group = getGroup(item);
        if (!result.has(group))
          result.set(group, []);
      });
      visibleItems.forEach((item) => {
        const group = getGroup(item);
        if (!result.has(group)) {
          result.set(group, []);
        }
        result.get(group).push(item);
      });
      return result;
    }
    formatHelp(cmd, helper) {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth ?? 80;
      function callFormatItem(term, description) {
        return helper.formatItem(term, termWidth, description, helper);
      }
      let output = [
        `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
        ""
      ];
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0) {
        output = output.concat([
          helper.boxWrap(helper.styleCommandDescription(commandDescription), helpWidth),
          ""
        ]);
      }
      const argumentList = helper.visibleArguments(cmd).map((argument) => {
        return callFormatItem(helper.styleArgumentTerm(helper.argumentTerm(argument)), helper.styleArgumentDescription(helper.argumentDescription(argument)));
      });
      output = output.concat(this.formatItemList("Arguments:", argumentList, helper));
      const optionGroups = this.groupItems(cmd.options, helper.visibleOptions(cmd), (option) => option.helpGroupHeading ?? "Options:");
      optionGroups.forEach((options, group) => {
        const optionList = options.map((option) => {
          return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
        });
        output = output.concat(this.formatItemList(group, optionList, helper));
      });
      if (helper.showGlobalOptions) {
        const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
          return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
        });
        output = output.concat(this.formatItemList("Global Options:", globalOptionList, helper));
      }
      const commandGroups = this.groupItems(cmd.commands, helper.visibleCommands(cmd), (sub) => sub.helpGroup() || "Commands:");
      commandGroups.forEach((commands, group) => {
        const commandList = commands.map((sub) => {
          return callFormatItem(helper.styleSubcommandTerm(helper.subcommandTerm(sub)), helper.styleSubcommandDescription(helper.subcommandDescription(sub)));
        });
        output = output.concat(this.formatItemList(group, commandList, helper));
      });
      return output.join(`
`);
    }
    displayWidth(str) {
      return stripColor(str).length;
    }
    styleTitle(str) {
      return str;
    }
    styleUsage(str) {
      return str.split(" ").map((word) => {
        if (word === "[options]")
          return this.styleOptionText(word);
        if (word === "[command]")
          return this.styleSubcommandText(word);
        if (word[0] === "[" || word[0] === "<")
          return this.styleArgumentText(word);
        return this.styleCommandText(word);
      }).join(" ");
    }
    styleCommandDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleOptionDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleSubcommandDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleArgumentDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleDescriptionText(str) {
      return str;
    }
    styleOptionTerm(str) {
      return this.styleOptionText(str);
    }
    styleSubcommandTerm(str) {
      return str.split(" ").map((word) => {
        if (word === "[options]")
          return this.styleOptionText(word);
        if (word[0] === "[" || word[0] === "<")
          return this.styleArgumentText(word);
        return this.styleSubcommandText(word);
      }).join(" ");
    }
    styleArgumentTerm(str) {
      return this.styleArgumentText(str);
    }
    styleOptionText(str) {
      return str;
    }
    styleArgumentText(str) {
      return str;
    }
    styleSubcommandText(str) {
      return str;
    }
    styleCommandText(str) {
      return str;
    }
    padWidth(cmd, helper) {
      return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
    }
    preformatted(str) {
      return /\n[^\S\r\n]/.test(str);
    }
    formatItem(term, termWidth, description, helper) {
      const itemIndent = 2;
      const itemIndentStr = " ".repeat(itemIndent);
      if (!description)
        return itemIndentStr + term;
      const paddedTerm = term.padEnd(termWidth + term.length - helper.displayWidth(term));
      const spacerWidth = 2;
      const helpWidth = this.helpWidth ?? 80;
      const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
      let formattedDescription;
      if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
        formattedDescription = description;
      } else {
        const wrappedDescription = helper.boxWrap(description, remainingWidth);
        formattedDescription = wrappedDescription.replace(/\n/g, `
` + " ".repeat(termWidth + spacerWidth));
      }
      return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
    }
    boxWrap(str, width) {
      if (width < this.minWidthToWrap)
        return str;
      const rawLines = str.split(/\r\n|\n/);
      const chunkPattern = /[\s]*[^\s]+/g;
      const wrappedLines = [];
      rawLines.forEach((line) => {
        const chunks = line.match(chunkPattern);
        if (chunks === null) {
          wrappedLines.push("");
          return;
        }
        let sumChunks = [chunks.shift()];
        let sumWidth = this.displayWidth(sumChunks[0]);
        chunks.forEach((chunk) => {
          const visibleWidth = this.displayWidth(chunk);
          if (sumWidth + visibleWidth <= width) {
            sumChunks.push(chunk);
            sumWidth += visibleWidth;
            return;
          }
          wrappedLines.push(sumChunks.join(""));
          const nextChunk = chunk.trimStart();
          sumChunks = [nextChunk];
          sumWidth = this.displayWidth(nextChunk);
        });
        wrappedLines.push(sumChunks.join(""));
      });
      return wrappedLines.join(`
`);
    }
  }
  function stripColor(str) {
    const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
    return str.replace(sgrPattern, "");
  }
  exports.Help = Help;
  exports.stripColor = stripColor;
});

// node_modules/commander/lib/option.js
var require_option = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Option {
    constructor(flags, description) {
      this.flags = flags;
      this.description = description || "";
      this.required = flags.includes("<");
      this.optional = flags.includes("[");
      this.variadic = /\w\.\.\.[>\]]$/.test(flags);
      this.mandatory = false;
      const optionFlags = splitOptionFlags(flags);
      this.short = optionFlags.shortFlag;
      this.long = optionFlags.longFlag;
      this.negate = false;
      if (this.long) {
        this.negate = this.long.startsWith("--no-");
      }
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.presetArg = undefined;
      this.envVar = undefined;
      this.parseArg = undefined;
      this.hidden = false;
      this.argChoices = undefined;
      this.conflictsWith = [];
      this.implied = undefined;
      this.helpGroupHeading = undefined;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    preset(arg) {
      this.presetArg = arg;
      return this;
    }
    conflicts(names) {
      this.conflictsWith = this.conflictsWith.concat(names);
      return this;
    }
    implies(impliedOptionValues) {
      let newImplied = impliedOptionValues;
      if (typeof impliedOptionValues === "string") {
        newImplied = { [impliedOptionValues]: true };
      }
      this.implied = Object.assign(this.implied || {}, newImplied);
      return this;
    }
    env(name) {
      this.envVar = name;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    makeOptionMandatory(mandatory = true) {
      this.mandatory = !!mandatory;
      return this;
    }
    hideHelp(hide = true) {
      this.hidden = !!hide;
      return this;
    }
    _collectValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      previous.push(value);
      return previous;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._collectValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    name() {
      if (this.long) {
        return this.long.replace(/^--/, "");
      }
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      if (this.negate) {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      return camelcase(this.name());
    }
    helpGroup(heading) {
      this.helpGroupHeading = heading;
      return this;
    }
    is(arg) {
      return this.short === arg || this.long === arg;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }

  class DualOptions {
    constructor(options) {
      this.positiveOptions = new Map;
      this.negativeOptions = new Map;
      this.dualOptions = new Set;
      options.forEach((option) => {
        if (option.negate) {
          this.negativeOptions.set(option.attributeName(), option);
        } else {
          this.positiveOptions.set(option.attributeName(), option);
        }
      });
      this.negativeOptions.forEach((value, key) => {
        if (this.positiveOptions.has(key)) {
          this.dualOptions.add(key);
        }
      });
    }
    valueFromOption(value, option) {
      const optionKey = option.attributeName();
      if (!this.dualOptions.has(optionKey))
        return true;
      const preset = this.negativeOptions.get(optionKey).presetArg;
      const negativeValue = preset !== undefined ? preset : false;
      return option.negate === (negativeValue === value);
    }
  }
  function camelcase(str) {
    return str.split("-").reduce((str2, word) => {
      return str2 + word[0].toUpperCase() + word.slice(1);
    });
  }
  function splitOptionFlags(flags) {
    let shortFlag;
    let longFlag;
    const shortFlagExp = /^-[^-]$/;
    const longFlagExp = /^--[^-]/;
    const flagParts = flags.split(/[ |,]+/).concat("guard");
    if (shortFlagExp.test(flagParts[0]))
      shortFlag = flagParts.shift();
    if (longFlagExp.test(flagParts[0]))
      longFlag = flagParts.shift();
    if (!shortFlag && shortFlagExp.test(flagParts[0]))
      shortFlag = flagParts.shift();
    if (!shortFlag && longFlagExp.test(flagParts[0])) {
      shortFlag = longFlag;
      longFlag = flagParts.shift();
    }
    if (flagParts[0].startsWith("-")) {
      const unsupportedFlag = flagParts[0];
      const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
      if (/^-[^-][^-]/.test(unsupportedFlag))
        throw new Error(`${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`);
      if (shortFlagExp.test(unsupportedFlag))
        throw new Error(`${baseError}
- too many short flags`);
      if (longFlagExp.test(unsupportedFlag))
        throw new Error(`${baseError}
- too many long flags`);
      throw new Error(`${baseError}
- unrecognised flag format`);
    }
    if (shortFlag === undefined && longFlag === undefined)
      throw new Error(`option creation failed due to no flags found in '${flags}'.`);
    return { shortFlag, longFlag };
  }
  exports.Option = Option;
  exports.DualOptions = DualOptions;
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS((exports) => {
  var maxDistance = 3;
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > maxDistance)
      return Math.max(a.length, b.length);
    const d = [];
    for (let i = 0;i <= a.length; i++) {
      d[i] = [i];
    }
    for (let j = 0;j <= b.length; j++) {
      d[0][j] = j;
    }
    for (let j = 1;j <= b.length; j++) {
      for (let i = 1;i <= a.length; i++) {
        let cost = 1;
        if (a[i - 1] === b[j - 1]) {
          cost = 0;
        } else {
          cost = 1;
        }
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function suggestSimilar(word, candidates) {
    if (!candidates || candidates.length === 0)
      return "";
    candidates = Array.from(new Set(candidates));
    const searchingOptions = word.startsWith("--");
    if (searchingOptions) {
      word = word.slice(2);
      candidates = candidates.map((candidate) => candidate.slice(2));
    }
    let similar = [];
    let bestDistance = maxDistance;
    const minSimilarity = 0.4;
    candidates.forEach((candidate) => {
      if (candidate.length <= 1)
        return;
      const distance = editDistance(word, candidate);
      const length = Math.max(word.length, candidate.length);
      const similarity = (length - distance) / length;
      if (similarity > minSimilarity) {
        if (distance < bestDistance) {
          bestDistance = distance;
          similar = [candidate];
        } else if (distance === bestDistance) {
          similar.push(candidate);
        }
      }
    });
    similar.sort((a, b) => a.localeCompare(b));
    if (searchingOptions) {
      similar = similar.map((candidate) => `--${candidate}`);
    }
    if (similar.length > 1) {
      return `
(Did you mean one of ${similar.join(", ")}?)`;
    }
    if (similar.length === 1) {
      return `
(Did you mean ${similar[0]}?)`;
    }
    return "";
  }
  exports.suggestSimilar = suggestSimilar;
});

// node_modules/commander/lib/command.js
var require_command = __commonJS((exports) => {
  var EventEmitter = __require("events").EventEmitter;
  var childProcess = __require("child_process");
  var path = __require("path");
  var fs = __require("fs");
  var process2 = __require("process");
  var { Argument, humanReadableArgName } = require_argument();
  var { CommanderError } = require_error();
  var { Help, stripColor } = require_help();
  var { Option, DualOptions } = require_option();
  var { suggestSimilar } = require_suggestSimilar();

  class Command extends EventEmitter {
    constructor(name) {
      super();
      this.commands = [];
      this.options = [];
      this.parent = null;
      this._allowUnknownOption = false;
      this._allowExcessArguments = false;
      this.registeredArguments = [];
      this._args = this.registeredArguments;
      this.args = [];
      this.rawArgs = [];
      this.processedArgs = [];
      this._scriptPath = null;
      this._name = name || "";
      this._optionValues = {};
      this._optionValueSources = {};
      this._storeOptionsAsProperties = false;
      this._actionHandler = null;
      this._executableHandler = false;
      this._executableFile = null;
      this._executableDir = null;
      this._defaultCommandName = null;
      this._exitCallback = null;
      this._aliases = [];
      this._combineFlagAndOptionalValue = true;
      this._description = "";
      this._summary = "";
      this._argsDescription = undefined;
      this._enablePositionalOptions = false;
      this._passThroughOptions = false;
      this._lifeCycleHooks = {};
      this._showHelpAfterError = false;
      this._showSuggestionAfterError = true;
      this._savedState = null;
      this._outputConfiguration = {
        writeOut: (str) => process2.stdout.write(str),
        writeErr: (str) => process2.stderr.write(str),
        outputError: (str, write) => write(str),
        getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : undefined,
        getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : undefined,
        getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
        getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
        stripColor: (str) => stripColor(str)
      };
      this._hidden = false;
      this._helpOption = undefined;
      this._addImplicitHelpCommand = undefined;
      this._helpCommand = undefined;
      this._helpConfiguration = {};
      this._helpGroupHeading = undefined;
      this._defaultCommandGroup = undefined;
      this._defaultOptionGroup = undefined;
    }
    copyInheritedSettings(sourceCommand) {
      this._outputConfiguration = sourceCommand._outputConfiguration;
      this._helpOption = sourceCommand._helpOption;
      this._helpCommand = sourceCommand._helpCommand;
      this._helpConfiguration = sourceCommand._helpConfiguration;
      this._exitCallback = sourceCommand._exitCallback;
      this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
      this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
      this._allowExcessArguments = sourceCommand._allowExcessArguments;
      this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
      this._showHelpAfterError = sourceCommand._showHelpAfterError;
      this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
      return this;
    }
    _getCommandAndAncestors() {
      const result = [];
      for (let command = this;command; command = command.parent) {
        result.push(command);
      }
      return result;
    }
    command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
      let desc = actionOptsOrExecDesc;
      let opts = execOpts;
      if (typeof desc === "object" && desc !== null) {
        opts = desc;
        desc = null;
      }
      opts = opts || {};
      const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
      const cmd = this.createCommand(name);
      if (desc) {
        cmd.description(desc);
        cmd._executableHandler = true;
      }
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      cmd._hidden = !!(opts.noHelp || opts.hidden);
      cmd._executableFile = opts.executableFile || null;
      if (args)
        cmd.arguments(args);
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd.copyInheritedSettings(this);
      if (desc)
        return this;
      return cmd;
    }
    createCommand(name) {
      return new Command(name);
    }
    createHelp() {
      return Object.assign(new Help, this.configureHelp());
    }
    configureHelp(configuration) {
      if (configuration === undefined)
        return this._helpConfiguration;
      this._helpConfiguration = configuration;
      return this;
    }
    configureOutput(configuration) {
      if (configuration === undefined)
        return this._outputConfiguration;
      this._outputConfiguration = {
        ...this._outputConfiguration,
        ...configuration
      };
      return this;
    }
    showHelpAfterError(displayHelp = true) {
      if (typeof displayHelp !== "string")
        displayHelp = !!displayHelp;
      this._showHelpAfterError = displayHelp;
      return this;
    }
    showSuggestionAfterError(displaySuggestion = true) {
      this._showSuggestionAfterError = !!displaySuggestion;
      return this;
    }
    addCommand(cmd, opts) {
      if (!cmd._name) {
        throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      }
      opts = opts || {};
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      if (opts.noHelp || opts.hidden)
        cmd._hidden = true;
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd._checkForBrokenPassThrough();
      return this;
    }
    createArgument(name, description) {
      return new Argument(name, description);
    }
    argument(name, description, parseArg, defaultValue) {
      const argument = this.createArgument(name, description);
      if (typeof parseArg === "function") {
        argument.default(defaultValue).argParser(parseArg);
      } else {
        argument.default(parseArg);
      }
      this.addArgument(argument);
      return this;
    }
    arguments(names) {
      names.trim().split(/ +/).forEach((detail) => {
        this.argument(detail);
      });
      return this;
    }
    addArgument(argument) {
      const previousArgument = this.registeredArguments.slice(-1)[0];
      if (previousArgument?.variadic) {
        throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
      }
      if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
        throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
      }
      this.registeredArguments.push(argument);
      return this;
    }
    helpCommand(enableOrNameAndArgs, description) {
      if (typeof enableOrNameAndArgs === "boolean") {
        this._addImplicitHelpCommand = enableOrNameAndArgs;
        if (enableOrNameAndArgs && this._defaultCommandGroup) {
          this._initCommandGroup(this._getHelpCommand());
        }
        return this;
      }
      const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
      const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
      const helpDescription = description ?? "display help for command";
      const helpCommand = this.createCommand(helpName);
      helpCommand.helpOption(false);
      if (helpArgs)
        helpCommand.arguments(helpArgs);
      if (helpDescription)
        helpCommand.description(helpDescription);
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      if (enableOrNameAndArgs || description)
        this._initCommandGroup(helpCommand);
      return this;
    }
    addHelpCommand(helpCommand, deprecatedDescription) {
      if (typeof helpCommand !== "object") {
        this.helpCommand(helpCommand, deprecatedDescription);
        return this;
      }
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      this._initCommandGroup(helpCommand);
      return this;
    }
    _getHelpCommand() {
      const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
      if (hasImplicitHelpCommand) {
        if (this._helpCommand === undefined) {
          this.helpCommand(undefined, undefined);
        }
        return this._helpCommand;
      }
      return null;
    }
    hook(event, listener) {
      const allowedValues = ["preSubcommand", "preAction", "postAction"];
      if (!allowedValues.includes(event)) {
        throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      if (this._lifeCycleHooks[event]) {
        this._lifeCycleHooks[event].push(listener);
      } else {
        this._lifeCycleHooks[event] = [listener];
      }
      return this;
    }
    exitOverride(fn) {
      if (fn) {
        this._exitCallback = fn;
      } else {
        this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync") {
            throw err;
          } else {}
        };
      }
      return this;
    }
    _exit(exitCode, code, message) {
      if (this._exitCallback) {
        this._exitCallback(new CommanderError(exitCode, code, message));
      }
      process2.exit(exitCode);
    }
    action(fn) {
      const listener = (args) => {
        const expectedArgsCount = this.registeredArguments.length;
        const actionArgs = args.slice(0, expectedArgsCount);
        if (this._storeOptionsAsProperties) {
          actionArgs[expectedArgsCount] = this;
        } else {
          actionArgs[expectedArgsCount] = this.opts();
        }
        actionArgs.push(this);
        return fn.apply(this, actionArgs);
      };
      this._actionHandler = listener;
      return this;
    }
    createOption(flags, description) {
      return new Option(flags, description);
    }
    _callParseArg(target, value, previous, invalidArgumentMessage) {
      try {
        return target.parseArg(value, previous);
      } catch (err) {
        if (err.code === "commander.invalidArgument") {
          const message = `${invalidArgumentMessage} ${err.message}`;
          this.error(message, { exitCode: err.exitCode, code: err.code });
        }
        throw err;
      }
    }
    _registerOption(option) {
      const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
      if (matchingOption) {
        const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
        throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
      }
      this._initOptionGroup(option);
      this.options.push(option);
    }
    _registerCommand(command) {
      const knownBy = (cmd) => {
        return [cmd.name()].concat(cmd.aliases());
      };
      const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
      if (alreadyUsed) {
        const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
        const newCmd = knownBy(command).join("|");
        throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
      }
      this._initCommandGroup(command);
      this.commands.push(command);
    }
    addOption(option) {
      this._registerOption(option);
      const oname = option.name();
      const name = option.attributeName();
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(name, option.defaultValue === undefined ? true : option.defaultValue, "default");
        }
      } else if (option.defaultValue !== undefined) {
        this.setOptionValueWithSource(name, option.defaultValue, "default");
      }
      const handleOptionValue = (val, invalidValueMessage, valueSource) => {
        if (val == null && option.presetArg !== undefined) {
          val = option.presetArg;
        }
        const oldValue = this.getOptionValue(name);
        if (val !== null && option.parseArg) {
          val = this._callParseArg(option, val, oldValue, invalidValueMessage);
        } else if (val !== null && option.variadic) {
          val = option._collectValue(val, oldValue);
        }
        if (val == null) {
          if (option.negate) {
            val = false;
          } else if (option.isBoolean() || option.optional) {
            val = true;
          } else {
            val = "";
          }
        }
        this.setOptionValueWithSource(name, val, valueSource);
      };
      this.on("option:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "cli");
      });
      if (option.envVar) {
        this.on("optionEnv:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        });
      }
      return this;
    }
    _optionEx(config, flags, description, fn, defaultValue) {
      if (typeof flags === "object" && flags instanceof Option) {
        throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
      }
      const option = this.createOption(flags, description);
      option.makeOptionMandatory(!!config.mandatory);
      if (typeof fn === "function") {
        option.default(defaultValue).argParser(fn);
      } else if (fn instanceof RegExp) {
        const regex = fn;
        fn = (val, def) => {
          const m = regex.exec(val);
          return m ? m[0] : def;
        };
        option.default(defaultValue).argParser(fn);
      } else {
        option.default(fn);
      }
      return this.addOption(option);
    }
    option(flags, description, parseArg, defaultValue) {
      return this._optionEx({}, flags, description, parseArg, defaultValue);
    }
    requiredOption(flags, description, parseArg, defaultValue) {
      return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
    }
    combineFlagAndOptionalValue(combine = true) {
      this._combineFlagAndOptionalValue = !!combine;
      return this;
    }
    allowUnknownOption(allowUnknown = true) {
      this._allowUnknownOption = !!allowUnknown;
      return this;
    }
    allowExcessArguments(allowExcess = true) {
      this._allowExcessArguments = !!allowExcess;
      return this;
    }
    enablePositionalOptions(positional = true) {
      this._enablePositionalOptions = !!positional;
      return this;
    }
    passThroughOptions(passThrough = true) {
      this._passThroughOptions = !!passThrough;
      this._checkForBrokenPassThrough();
      return this;
    }
    _checkForBrokenPassThrough() {
      if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
        throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
      }
    }
    storeOptionsAsProperties(storeAsProperties = true) {
      if (this.options.length) {
        throw new Error("call .storeOptionsAsProperties() before adding options");
      }
      if (Object.keys(this._optionValues).length) {
        throw new Error("call .storeOptionsAsProperties() before setting option values");
      }
      this._storeOptionsAsProperties = !!storeAsProperties;
      return this;
    }
    getOptionValue(key) {
      if (this._storeOptionsAsProperties) {
        return this[key];
      }
      return this._optionValues[key];
    }
    setOptionValue(key, value) {
      return this.setOptionValueWithSource(key, value, undefined);
    }
    setOptionValueWithSource(key, value, source) {
      if (this._storeOptionsAsProperties) {
        this[key] = value;
      } else {
        this._optionValues[key] = value;
      }
      this._optionValueSources[key] = source;
      return this;
    }
    getOptionValueSource(key) {
      return this._optionValueSources[key];
    }
    getOptionValueSourceWithGlobals(key) {
      let source;
      this._getCommandAndAncestors().forEach((cmd) => {
        if (cmd.getOptionValueSource(key) !== undefined) {
          source = cmd.getOptionValueSource(key);
        }
      });
      return source;
    }
    _prepareUserArgs(argv, parseOptions) {
      if (argv !== undefined && !Array.isArray(argv)) {
        throw new Error("first parameter to parse must be array or undefined");
      }
      parseOptions = parseOptions || {};
      if (argv === undefined && parseOptions.from === undefined) {
        if (process2.versions?.electron) {
          parseOptions.from = "electron";
        }
        const execArgv = process2.execArgv ?? [];
        if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
          parseOptions.from = "eval";
        }
      }
      if (argv === undefined) {
        argv = process2.argv;
      }
      this.rawArgs = argv.slice();
      let userArgs;
      switch (parseOptions.from) {
        case undefined:
        case "node":
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
          break;
        case "electron":
          if (process2.defaultApp) {
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
          } else {
            userArgs = argv.slice(1);
          }
          break;
        case "user":
          userArgs = argv.slice(0);
          break;
        case "eval":
          userArgs = argv.slice(1);
          break;
        default:
          throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
      }
      if (!this._name && this._scriptPath)
        this.nameFromFilename(this._scriptPath);
      this._name = this._name || "program";
      return userArgs;
    }
    parse(argv, parseOptions) {
      this._prepareForParse();
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      this._parseCommand([], userArgs);
      return this;
    }
    async parseAsync(argv, parseOptions) {
      this._prepareForParse();
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      await this._parseCommand([], userArgs);
      return this;
    }
    _prepareForParse() {
      if (this._savedState === null) {
        this.saveStateBeforeParse();
      } else {
        this.restoreStateBeforeParse();
      }
    }
    saveStateBeforeParse() {
      this._savedState = {
        _name: this._name,
        _optionValues: { ...this._optionValues },
        _optionValueSources: { ...this._optionValueSources }
      };
    }
    restoreStateBeforeParse() {
      if (this._storeOptionsAsProperties)
        throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
      this._name = this._savedState._name;
      this._scriptPath = null;
      this.rawArgs = [];
      this._optionValues = { ...this._savedState._optionValues };
      this._optionValueSources = { ...this._savedState._optionValueSources };
      this.args = [];
      this.processedArgs = [];
    }
    _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
      if (fs.existsSync(executableFile))
        return;
      const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
      const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
      throw new Error(executableMissing);
    }
    _executeSubCommand(subcommand, args) {
      args = args.slice();
      let launchWithNode = false;
      const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function findFile(baseDir, baseName) {
        const localBin = path.resolve(baseDir, baseName);
        if (fs.existsSync(localBin))
          return localBin;
        if (sourceExt.includes(path.extname(baseName)))
          return;
        const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
        if (foundExt)
          return `${localBin}${foundExt}`;
        return;
      }
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
      let executableDir = this._executableDir || "";
      if (this._scriptPath) {
        let resolvedScriptPath;
        try {
          resolvedScriptPath = fs.realpathSync(this._scriptPath);
        } catch {
          resolvedScriptPath = this._scriptPath;
        }
        executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
      }
      if (executableDir) {
        let localFile = findFile(executableDir, executableFile);
        if (!localFile && !subcommand._executableFile && this._scriptPath) {
          const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
          if (legacyName !== this._name) {
            localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
          }
        }
        executableFile = localFile || executableFile;
      }
      launchWithNode = sourceExt.includes(path.extname(executableFile));
      let proc;
      if (process2.platform !== "win32") {
        if (launchWithNode) {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
        } else {
          proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
        }
      } else {
        this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(process2.execArgv).concat(args);
        proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
      }
      if (!proc.killed) {
        const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
        signals.forEach((signal) => {
          process2.on(signal, () => {
            if (proc.killed === false && proc.exitCode === null) {
              proc.kill(signal);
            }
          });
        });
      }
      const exitCallback = this._exitCallback;
      proc.on("close", (code) => {
        code = code ?? 1;
        if (!exitCallback) {
          process2.exit(code);
        } else {
          exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
        }
      });
      proc.on("error", (err) => {
        if (err.code === "ENOENT") {
          this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
        } else if (err.code === "EACCES") {
          throw new Error(`'${executableFile}' not executable`);
        }
        if (!exitCallback) {
          process2.exit(1);
        } else {
          const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
          wrappedError.nestedError = err;
          exitCallback(wrappedError);
        }
      });
      this.runningCommand = proc;
    }
    _dispatchSubcommand(commandName, operands, unknown) {
      const subCommand = this._findCommand(commandName);
      if (!subCommand)
        this.help({ error: true });
      subCommand._prepareForParse();
      let promiseChain;
      promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
      promiseChain = this._chainOrCall(promiseChain, () => {
        if (subCommand._executableHandler) {
          this._executeSubCommand(subCommand, operands.concat(unknown));
        } else {
          return subCommand._parseCommand(operands, unknown);
        }
      });
      return promiseChain;
    }
    _dispatchHelpCommand(subcommandName) {
      if (!subcommandName) {
        this.help();
      }
      const subCommand = this._findCommand(subcommandName);
      if (subCommand && !subCommand._executableHandler) {
        subCommand.help();
      }
      return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
    }
    _checkNumberOfArguments() {
      this.registeredArguments.forEach((arg, i) => {
        if (arg.required && this.args[i] == null) {
          this.missingArgument(arg.name());
        }
      });
      if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
        return;
      }
      if (this.args.length > this.registeredArguments.length) {
        this._excessArguments(this.args);
      }
    }
    _processArguments() {
      const myParseArg = (argument, value, previous) => {
        let parsedValue = value;
        if (value !== null && argument.parseArg) {
          const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
          parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
        }
        return parsedValue;
      };
      this._checkNumberOfArguments();
      const processedArgs = [];
      this.registeredArguments.forEach((declaredArg, index) => {
        let value = declaredArg.defaultValue;
        if (declaredArg.variadic) {
          if (index < this.args.length) {
            value = this.args.slice(index);
            if (declaredArg.parseArg) {
              value = value.reduce((processed, v) => {
                return myParseArg(declaredArg, v, processed);
              }, declaredArg.defaultValue);
            }
          } else if (value === undefined) {
            value = [];
          }
        } else if (index < this.args.length) {
          value = this.args[index];
          if (declaredArg.parseArg) {
            value = myParseArg(declaredArg, value, declaredArg.defaultValue);
          }
        }
        processedArgs[index] = value;
      });
      this.processedArgs = processedArgs;
    }
    _chainOrCall(promise, fn) {
      if (promise?.then && typeof promise.then === "function") {
        return promise.then(() => fn());
      }
      return fn();
    }
    _chainOrCallHooks(promise, event) {
      let result = promise;
      const hooks = [];
      this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== undefined).forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
      if (event === "postAction") {
        hooks.reverse();
      }
      hooks.forEach((hookDetail) => {
        result = this._chainOrCall(result, () => {
          return hookDetail.callback(hookDetail.hookedCommand, this);
        });
      });
      return result;
    }
    _chainOrCallSubCommandHook(promise, subCommand, event) {
      let result = promise;
      if (this._lifeCycleHooks[event] !== undefined) {
        this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => {
            return hook(this, subCommand);
          });
        });
      }
      return result;
    }
    _parseCommand(operands, unknown) {
      const parsed = this.parseOptions(unknown);
      this._parseOptionsEnv();
      this._parseOptionsImplied();
      operands = operands.concat(parsed.operands);
      unknown = parsed.unknown;
      this.args = operands.concat(unknown);
      if (operands && this._findCommand(operands[0])) {
        return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
      }
      if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
        return this._dispatchHelpCommand(operands[1]);
      }
      if (this._defaultCommandName) {
        this._outputHelpIfRequested(unknown);
        return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
      }
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
        this.help({ error: true });
      }
      this._outputHelpIfRequested(parsed.unknown);
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      const checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) {
          this.unknownOption(parsed.unknown[0]);
        }
      };
      const commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        this._processArguments();
        let promiseChain;
        promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
        promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
        if (this.parent) {
          promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          });
        }
        promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
        return promiseChain;
      }
      if (this.parent?.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this._processArguments();
        this.parent.emit(commandEvent, operands, unknown);
      } else if (operands.length) {
        if (this._findCommand("*")) {
          return this._dispatchSubcommand("*", operands, unknown);
        }
        if (this.listenerCount("command:*")) {
          this.emit("command:*", operands, unknown);
        } else if (this.commands.length) {
          this.unknownCommand();
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      } else if (this.commands.length) {
        checkForUnknownOptions();
        this.help({ error: true });
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    }
    _findCommand(name) {
      if (!name)
        return;
      return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
    }
    _findOption(arg) {
      return this.options.find((option) => option.is(arg));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd.options.forEach((anOption) => {
          if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
            cmd.missingMandatoryOptionValue(anOption);
          }
        });
      });
    }
    _checkForConflictingLocalOptions() {
      const definedNonDefaultOptions = this.options.filter((option) => {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined) {
          return false;
        }
        return this.getOptionValueSource(optionKey) !== "default";
      });
      const optionsWithConflicting = definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0);
      optionsWithConflicting.forEach((option) => {
        const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
        if (conflictingAndDefined) {
          this._conflictingOption(option, conflictingAndDefined);
        }
      });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd._checkForConflictingLocalOptions();
      });
    }
    parseOptions(args) {
      const operands = [];
      const unknown = [];
      let dest = operands;
      function maybeOption(arg) {
        return arg.length > 1 && arg[0] === "-";
      }
      const negativeNumberArg = (arg) => {
        if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg))
          return false;
        return !this._getCommandAndAncestors().some((cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short)));
      };
      let activeVariadicOption = null;
      let activeGroup = null;
      let i = 0;
      while (i < args.length || activeGroup) {
        const arg = activeGroup ?? args[i++];
        activeGroup = null;
        if (arg === "--") {
          if (dest === unknown)
            dest.push(arg);
          dest.push(...args.slice(i));
          break;
        }
        if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
          this.emit(`option:${activeVariadicOption.name()}`, arg);
          continue;
        }
        activeVariadicOption = null;
        if (maybeOption(arg)) {
          const option = this._findOption(arg);
          if (option) {
            if (option.required) {
              const value = args[i++];
              if (value === undefined)
                this.optionMissingArgument(option);
              this.emit(`option:${option.name()}`, value);
            } else if (option.optional) {
              let value = null;
              if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
                value = args[i++];
              }
              this.emit(`option:${option.name()}`, value);
            } else {
              this.emit(`option:${option.name()}`);
            }
            activeVariadicOption = option.variadic ? option : null;
            continue;
          }
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
          const option = this._findOption(`-${arg[1]}`);
          if (option) {
            if (option.required || option.optional && this._combineFlagAndOptionalValue) {
              this.emit(`option:${option.name()}`, arg.slice(2));
            } else {
              this.emit(`option:${option.name()}`);
              activeGroup = `-${arg.slice(2)}`;
            }
            continue;
          }
        }
        if (/^--[^=]+=/.test(arg)) {
          const index = arg.indexOf("=");
          const option = this._findOption(arg.slice(0, index));
          if (option && (option.required || option.optional)) {
            this.emit(`option:${option.name()}`, arg.slice(index + 1));
            continue;
          }
        }
        if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
          dest = unknown;
        }
        if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
          if (this._findCommand(arg)) {
            operands.push(arg);
            unknown.push(...args.slice(i));
            break;
          } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
            operands.push(arg, ...args.slice(i));
            break;
          } else if (this._defaultCommandName) {
            unknown.push(arg, ...args.slice(i));
            break;
          }
        }
        if (this._passThroughOptions) {
          dest.push(arg, ...args.slice(i));
          break;
        }
        dest.push(arg);
      }
      return { operands, unknown };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        const result = {};
        const len = this.options.length;
        for (let i = 0;i < len; i++) {
          const key = this.options[i].attributeName();
          result[key] = key === this._versionOptionName ? this._version : this[key];
        }
        return result;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
    }
    error(message, errorOptions) {
      this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
      if (typeof this._showHelpAfterError === "string") {
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      } else if (this._showHelpAfterError) {
        this._outputConfiguration.writeErr(`
`);
        this.outputHelp({ error: true });
      }
      const config = errorOptions || {};
      const exitCode = config.exitCode || 1;
      const code = config.code || "commander.error";
      this._exit(exitCode, code, message);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in process2.env) {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === undefined || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
            if (option.required || option.optional) {
              this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
            } else {
              this.emit(`optionEnv:${option.name()}`);
            }
          }
        }
      });
    }
    _parseOptionsImplied() {
      const dualHelper = new DualOptions(this.options);
      const hasCustomOptionValue = (optionKey) => {
        return this.getOptionValue(optionKey) !== undefined && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
      };
      this.options.filter((option) => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
        Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
          this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
        });
      });
    }
    missingArgument(name) {
      const message = `error: missing required argument '${name}'`;
      this.error(message, { code: "commander.missingArgument" });
    }
    optionMissingArgument(option) {
      const message = `error: option '${option.flags}' argument missing`;
      this.error(message, { code: "commander.optionMissingArgument" });
    }
    missingMandatoryOptionValue(option) {
      const message = `error: required option '${option.flags}' not specified`;
      this.error(message, { code: "commander.missingMandatoryOptionValue" });
    }
    _conflictingOption(option, conflictingOption) {
      const findBestOptionFromValue = (option2) => {
        const optionKey = option2.attributeName();
        const optionValue = this.getOptionValue(optionKey);
        const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
        const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
        if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
          return negativeOption;
        }
        return positiveOption || option2;
      };
      const getErrorMessage = (option2) => {
        const bestOption = findBestOptionFromValue(option2);
        const optionKey = bestOption.attributeName();
        const source = this.getOptionValueSource(optionKey);
        if (source === "env") {
          return `environment variable '${bestOption.envVar}'`;
        }
        return `option '${bestOption.flags}'`;
      };
      const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
      this.error(message, { code: "commander.conflictingOption" });
    }
    unknownOption(flag) {
      if (this._allowUnknownOption)
        return;
      let suggestion = "";
      if (flag.startsWith("--") && this._showSuggestionAfterError) {
        let candidateFlags = [];
        let command = this;
        do {
          const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
          candidateFlags = candidateFlags.concat(moreFlags);
          command = command.parent;
        } while (command && !command._enablePositionalOptions);
        suggestion = suggestSimilar(flag, candidateFlags);
      }
      const message = `error: unknown option '${flag}'${suggestion}`;
      this.error(message, { code: "commander.unknownOption" });
    }
    _excessArguments(receivedArgs) {
      if (this._allowExcessArguments)
        return;
      const expected = this.registeredArguments.length;
      const s = expected === 1 ? "" : "s";
      const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
      const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
      this.error(message, { code: "commander.excessArguments" });
    }
    unknownCommand() {
      const unknownName = this.args[0];
      let suggestion = "";
      if (this._showSuggestionAfterError) {
        const candidateNames = [];
        this.createHelp().visibleCommands(this).forEach((command) => {
          candidateNames.push(command.name());
          if (command.alias())
            candidateNames.push(command.alias());
        });
        suggestion = suggestSimilar(unknownName, candidateNames);
      }
      const message = `error: unknown command '${unknownName}'${suggestion}`;
      this.error(message, { code: "commander.unknownCommand" });
    }
    version(str, flags, description) {
      if (str === undefined)
        return this._version;
      this._version = str;
      flags = flags || "-V, --version";
      description = description || "output the version number";
      const versionOption = this.createOption(flags, description);
      this._versionOptionName = versionOption.attributeName();
      this._registerOption(versionOption);
      this.on("option:" + versionOption.name(), () => {
        this._outputConfiguration.writeOut(`${str}
`);
        this._exit(0, "commander.version", str);
      });
      return this;
    }
    description(str, argsDescription) {
      if (str === undefined && argsDescription === undefined)
        return this._description;
      this._description = str;
      if (argsDescription) {
        this._argsDescription = argsDescription;
      }
      return this;
    }
    summary(str) {
      if (str === undefined)
        return this._summary;
      this._summary = str;
      return this;
    }
    alias(alias) {
      if (alias === undefined)
        return this._aliases[0];
      let command = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
        command = this.commands[this.commands.length - 1];
      }
      if (alias === command._name)
        throw new Error("Command alias can't be the same as its name");
      const matchingCommand = this.parent?._findCommand(alias);
      if (matchingCommand) {
        const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
        throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
      }
      command._aliases.push(alias);
      return this;
    }
    aliases(aliases) {
      if (aliases === undefined)
        return this._aliases;
      aliases.forEach((alias) => this.alias(alias));
      return this;
    }
    usage(str) {
      if (str === undefined) {
        if (this._usage)
          return this._usage;
        const args = this.registeredArguments.map((arg) => {
          return humanReadableArgName(arg);
        });
        return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
      }
      this._usage = str;
      return this;
    }
    name(str) {
      if (str === undefined)
        return this._name;
      this._name = str;
      return this;
    }
    helpGroup(heading) {
      if (heading === undefined)
        return this._helpGroupHeading ?? "";
      this._helpGroupHeading = heading;
      return this;
    }
    commandsGroup(heading) {
      if (heading === undefined)
        return this._defaultCommandGroup ?? "";
      this._defaultCommandGroup = heading;
      return this;
    }
    optionsGroup(heading) {
      if (heading === undefined)
        return this._defaultOptionGroup ?? "";
      this._defaultOptionGroup = heading;
      return this;
    }
    _initOptionGroup(option) {
      if (this._defaultOptionGroup && !option.helpGroupHeading)
        option.helpGroup(this._defaultOptionGroup);
    }
    _initCommandGroup(cmd) {
      if (this._defaultCommandGroup && !cmd.helpGroup())
        cmd.helpGroup(this._defaultCommandGroup);
    }
    nameFromFilename(filename) {
      this._name = path.basename(filename, path.extname(filename));
      return this;
    }
    executableDir(path2) {
      if (path2 === undefined)
        return this._executableDir;
      this._executableDir = path2;
      return this;
    }
    helpInformation(contextOptions) {
      const helper = this.createHelp();
      const context = this._getOutputContext(contextOptions);
      helper.prepareContext({
        error: context.error,
        helpWidth: context.helpWidth,
        outputHasColors: context.hasColors
      });
      const text = helper.formatHelp(this, helper);
      if (context.hasColors)
        return text;
      return this._outputConfiguration.stripColor(text);
    }
    _getOutputContext(contextOptions) {
      contextOptions = contextOptions || {};
      const error = !!contextOptions.error;
      let baseWrite;
      let hasColors;
      let helpWidth;
      if (error) {
        baseWrite = (str) => this._outputConfiguration.writeErr(str);
        hasColors = this._outputConfiguration.getErrHasColors();
        helpWidth = this._outputConfiguration.getErrHelpWidth();
      } else {
        baseWrite = (str) => this._outputConfiguration.writeOut(str);
        hasColors = this._outputConfiguration.getOutHasColors();
        helpWidth = this._outputConfiguration.getOutHelpWidth();
      }
      const write = (str) => {
        if (!hasColors)
          str = this._outputConfiguration.stripColor(str);
        return baseWrite(str);
      };
      return { error, write, hasColors, helpWidth };
    }
    outputHelp(contextOptions) {
      let deprecatedCallback;
      if (typeof contextOptions === "function") {
        deprecatedCallback = contextOptions;
        contextOptions = undefined;
      }
      const outputContext = this._getOutputContext(contextOptions);
      const eventContext = {
        error: outputContext.error,
        write: outputContext.write,
        command: this
      };
      this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
      this.emit("beforeHelp", eventContext);
      let helpInformation = this.helpInformation({ error: outputContext.error });
      if (deprecatedCallback) {
        helpInformation = deprecatedCallback(helpInformation);
        if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
          throw new Error("outputHelp callback must return a string or a Buffer");
        }
      }
      outputContext.write(helpInformation);
      if (this._getHelpOption()?.long) {
        this.emit(this._getHelpOption().long);
      }
      this.emit("afterHelp", eventContext);
      this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", eventContext));
    }
    helpOption(flags, description) {
      if (typeof flags === "boolean") {
        if (flags) {
          if (this._helpOption === null)
            this._helpOption = undefined;
          if (this._defaultOptionGroup) {
            this._initOptionGroup(this._getHelpOption());
          }
        } else {
          this._helpOption = null;
        }
        return this;
      }
      this._helpOption = this.createOption(flags ?? "-h, --help", description ?? "display help for command");
      if (flags || description)
        this._initOptionGroup(this._helpOption);
      return this;
    }
    _getHelpOption() {
      if (this._helpOption === undefined) {
        this.helpOption(undefined, undefined);
      }
      return this._helpOption;
    }
    addHelpOption(option) {
      this._helpOption = option;
      this._initOptionGroup(option);
      return this;
    }
    help(contextOptions) {
      this.outputHelp(contextOptions);
      let exitCode = Number(process2.exitCode ?? 0);
      if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
        exitCode = 1;
      }
      this._exit(exitCode, "commander.help", "(outputHelp)");
    }
    addHelpText(position, text) {
      const allowedValues = ["beforeAll", "before", "after", "afterAll"];
      if (!allowedValues.includes(position)) {
        throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      const helpEvent = `${position}Help`;
      this.on(helpEvent, (context) => {
        let helpStr;
        if (typeof text === "function") {
          helpStr = text({ error: context.error, command: context.command });
        } else {
          helpStr = text;
        }
        if (helpStr) {
          context.write(`${helpStr}
`);
        }
      });
      return this;
    }
    _outputHelpIfRequested(args) {
      const helpOption = this._getHelpOption();
      const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
      if (helpRequested) {
        this.outputHelp();
        this._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
  }
  function incrementNodeInspectorPort(args) {
    return args.map((arg) => {
      if (!arg.startsWith("--inspect")) {
        return arg;
      }
      let debugOption;
      let debugHost = "127.0.0.1";
      let debugPort = "9229";
      let match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
        debugOption = match[1];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) {
          debugPort = match[3];
        } else {
          debugHost = match[3];
        }
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }
      if (debugOption && debugPort !== "0") {
        return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      }
      return arg;
    });
  }
  function useColor() {
    if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
      return false;
    if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== undefined)
      return true;
    return;
  }
  exports.Command = Command;
  exports.useColor = useColor;
});

// node_modules/commander/index.js
var require_commander = __commonJS((exports) => {
  var { Argument } = require_argument();
  var { Command } = require_command();
  var { CommanderError, InvalidArgumentError } = require_error();
  var { Help } = require_help();
  var { Option } = require_option();
  exports.program = new Command;
  exports.createCommand = (name) => new Command(name);
  exports.createOption = (flags, description) => new Option(flags, description);
  exports.createArgument = (name, description) => new Argument(name, description);
  exports.Command = Command;
  exports.Option = Option;
  exports.Argument = Argument;
  exports.Help = Help;
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
  exports.InvalidOptionArgumentError = InvalidArgumentError;
});

// .speck/scripts/common/paths.ts
var exports_paths = {};
__export(exports_paths, {
  validateBranchName: () => validateBranchName,
  syncSharedContracts: () => syncSharedContracts,
  isPluginInstallation: () => isPluginInstallation,
  isMultiRepoChild: () => isMultiRepoChild,
  hasGit: () => hasGit,
  getTemplatesDir: () => getTemplatesDir,
  getScriptsDir: () => getScriptsDir,
  getRepoRoot: () => getRepoRoot,
  getPluginRoot: () => getPluginRoot,
  getMultiRepoContext: () => getMultiRepoContext,
  getMemoryDir: () => getMemoryDir,
  getFeaturePaths: () => getFeaturePaths,
  getFeatureDir: () => getFeatureDir,
  getDefaultWorkflowMode: () => getDefaultWorkflowMode,
  getCurrentBranch: () => getCurrentBranch,
  getChildRepoName: () => getChildRepoName,
  findFeatureDirByPrefix: () => findFeatureDirByPrefix,
  findChildReposWithNames: () => findChildReposWithNames,
  findChildRepos: () => findChildRepos,
  detectSpeckRoot: () => detectSpeckRoot,
  detectSpeckMode: () => detectSpeckMode,
  clearSpeckCache: () => clearSpeckCache,
  checkFile: () => checkFile,
  checkFeatureBranch: () => checkFeatureBranch,
  checkDir: () => checkDir
});
import { existsSync } from "fs";
import { readdirSync } from "fs";
import fs from "fs/promises";
import path from "path";
var {$ } = globalThis.Bun;
function isPluginInstallation() {
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return true;
  }
  const scriptDir = import.meta.dir;
  return scriptDir.includes("/.claude/plugins/") || scriptDir.includes("/.config/claude-code/plugins/");
}
function getPluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }
  const scriptDir = import.meta.dir;
  if (scriptDir.endsWith("/dist") || scriptDir.includes("/dist/")) {
    return path.resolve(scriptDir, "..");
  }
  if (isPluginInstallation()) {
    return path.resolve(scriptDir, "../../..");
  } else {
    return path.resolve(scriptDir, "../../..");
  }
}
function getTemplatesDir() {
  const pluginRoot = getPluginRoot();
  if (isPluginInstallation()) {
    return path.join(pluginRoot, "templates");
  } else {
    return path.join(pluginRoot, ".speck/templates");
  }
}
function getScriptsDir() {
  const pluginRoot = getPluginRoot();
  return path.join(pluginRoot, ".speck/scripts");
}
function getMemoryDir() {
  const pluginRoot = getPluginRoot();
  if (isPluginInstallation()) {
    return path.join(pluginRoot, "memory");
  } else {
    return path.join(pluginRoot, ".speck/memory");
  }
}
async function getRepoRoot() {
  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    return result.text().trim();
  } catch {
    return process.cwd();
  }
}
function clearSpeckCache() {
  cachedConfig = null;
}
async function detectSpeckRoot() {
  if (cachedConfig) {
    return cachedConfig;
  }
  const repoRoot = await getRepoRoot();
  let mainRepoRoot = repoRoot;
  const gitPath = path.join(repoRoot, ".git");
  try {
    const gitStats = await fs.stat(gitPath);
    if (gitStats.isFile()) {
      const gitContent = await fs.readFile(gitPath, "utf-8");
      const match = gitContent.match(/gitdir:\s*(.+)/);
      if (match && match[1]) {
        const gitDir = match[1].trim();
        const worktreesDir = path.dirname(gitDir);
        const gitDirPath = path.dirname(worktreesDir);
        mainRepoRoot = path.dirname(gitDirPath);
      }
    }
  } catch {}
  const symlinkPath = path.join(mainRepoRoot, ".speck", "root");
  try {
    const stats = await fs.lstat(symlinkPath);
    if (!stats.isSymbolicLink()) {
      console.warn(`WARNING: .speck/root exists but is not a symlink
` + `Expected: symlink to speck root directory
` + `Found: regular file/directory
` + `Falling back to single-repo mode.
` + "To enable multi-repo: mv .speck/root .speck/root.backup && /speck.link <path>");
      const config2 = {
        mode: "single-repo",
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, "specs")
      };
      cachedConfig = config2;
      return config2;
    }
    const speckRoot = await fs.realpath(symlinkPath);
    const dangerousPaths = ["/", "/etc", "/usr", "/bin", "/sbin", "/System", "/Library"];
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    if (dangerousPaths.some((dangerous) => speckRoot === dangerous || speckRoot.startsWith(dangerous + "/"))) {
      throw new Error(`Security: .speck/root symlink points to system directory: ${speckRoot}
` + `Speck root must be a user-owned project directory.
` + "Fix: rm .speck/root && /speck.link <safe-project-path>");
    }
    if (homeDir && speckRoot === path.dirname(homeDir)) {
      throw new Error(`Security: .speck/root symlink points above home directory: ${speckRoot}
` + "Fix: rm .speck/root && /speck.link <project-path-within-home>");
    }
    await fs.access(speckRoot);
    const config = {
      mode: "multi-repo",
      speckRoot,
      repoRoot,
      specsDir: path.join(speckRoot, "specs")
    };
    cachedConfig = config;
    return config;
  } catch (error) {
    const err = error;
    if (err.code === "ENOENT") {
      const childRepos = await findChildRepos(repoRoot);
      if (childRepos.length > 0) {
        const config2 = {
          mode: "multi-repo",
          speckRoot: repoRoot,
          repoRoot,
          specsDir: path.join(repoRoot, "specs")
        };
        cachedConfig = config2;
        return config2;
      }
      const config = {
        mode: "single-repo",
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, "specs")
      };
      cachedConfig = config;
      return config;
    }
    if (err.code === "ELOOP") {
      throw new Error(`Multi-repo configuration broken: .speck/root contains circular reference
` + "Fix: rm .speck/root && /speck.link <valid-path>");
    }
    const target = await fs.readlink(symlinkPath).catch(() => "unknown");
    throw new Error(`Multi-repo configuration broken: .speck/root \u2192 ${target} (does not exist)
` + `Fix:
` + `  1. Remove broken symlink: rm .speck/root
` + "  2. Link to correct location: /speck.link <path-to-speck-root>");
  }
}
async function isMultiRepoChild() {
  const config = await detectSpeckRoot();
  return config.mode === "multi-repo" && config.repoRoot !== config.speckRoot;
}
async function getChildRepoName(repoRoot, speckRoot) {
  try {
    const resolvedRepoRoot = await fs.realpath(repoRoot);
    const entries = await fs.readdir(speckRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink() && entry.name.startsWith(".speck-link-")) {
        const symlinkPath = path.join(speckRoot, entry.name);
        try {
          const targetPath = await fs.realpath(symlinkPath);
          if (targetPath === resolvedRepoRoot) {
            return entry.name.replace(/^\.speck-link-/, "");
          }
        } catch {
          continue;
        }
      }
    }
  } catch {}
  return path.basename(repoRoot);
}
async function findChildRepos(speckRoot) {
  const childRepos = [];
  try {
    const entries = await fs.readdir(speckRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink() && entry.name.startsWith(".speck-link-")) {
        const symlinkPath = path.join(speckRoot, entry.name);
        try {
          const targetPath = await fs.realpath(symlinkPath);
          const dangerousPaths = ["/", "/etc", "/usr", "/bin", "/sbin", "/System", "/Library"];
          if (dangerousPaths.some((dangerous) => targetPath === dangerous || targetPath.startsWith(dangerous + "/"))) {
            console.warn(`Security: Skipping ${entry.name} - points to system directory: ${targetPath}`);
            continue;
          }
          const gitDir = path.join(targetPath, ".git");
          try {
            await fs.access(gitDir);
            childRepos.push(targetPath);
          } catch {
            console.warn(`Warning: ${entry.name} points to non-git directory: ${targetPath}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Broken symlink ${entry.name}: ${errorMessage}`);
        }
      }
    }
  } catch (error) {
    const err = error;
    if (err.code !== "ENOENT") {
      throw error;
    }
  }
  return childRepos;
}
async function findChildReposWithNames(speckRoot) {
  const childRepos = new Map;
  try {
    const entries = await fs.readdir(speckRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink() && entry.name.startsWith(".speck-link-")) {
        const symlinkPath = path.join(speckRoot, entry.name);
        const logicalName = entry.name.substring(".speck-link-".length);
        try {
          const targetPath = await fs.realpath(symlinkPath);
          const dangerousPaths = ["/", "/etc", "/usr", "/bin", "/sbin", "/System", "/Library"];
          if (dangerousPaths.some((dangerous) => targetPath === dangerous || targetPath.startsWith(dangerous + "/"))) {
            console.warn(`Security: Skipping ${entry.name} - points to system directory: ${targetPath}`);
            continue;
          }
          const gitDir = path.join(targetPath, ".git");
          try {
            await fs.access(gitDir);
            childRepos.set(logicalName, targetPath);
          } catch {
            console.warn(`Warning: ${entry.name} points to non-git directory: ${targetPath}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Broken symlink ${entry.name}: ${errorMessage}`);
        }
      }
    }
  } catch (error) {
    const err = error;
    if (err.code !== "ENOENT") {
      throw error;
    }
  }
  return childRepos;
}
async function getMultiRepoContext() {
  const config = await detectSpeckRoot();
  if (config.mode === "single-repo") {
    return {
      ...config,
      context: "single",
      parentSpecId: null,
      childRepoName: null
    };
  }
  if (config.repoRoot === config.speckRoot) {
    return {
      ...config,
      context: "root",
      parentSpecId: null,
      childRepoName: null
    };
  } else {
    const childRepoName = await getChildRepoName(config.repoRoot, config.speckRoot);
    let parentSpecId = null;
    try {
      const branchesJsonPath = path.join(config.repoRoot, ".speck", "branches.json");
      const content = await fs.readFile(branchesJsonPath, "utf-8");
      const branchMapping = JSON.parse(content);
      if (branchMapping.branches && branchMapping.branches.length > 0) {
        parentSpecId = branchMapping.branches[0]?.parentSpecId || null;
      }
    } catch {}
    if (!parentSpecId) {
      try {
        const { $: $2 } = await Promise.resolve(globalThis.Bun);
        const result = await $2`git -C ${config.speckRoot} rev-parse --abbrev-ref HEAD`.quiet();
        const currentBranch = result.stdout.toString().trim();
        if (/^\d{3}-/.test(currentBranch)) {
          parentSpecId = currentBranch;
        }
      } catch {}
    }
    return {
      ...config,
      context: "child",
      parentSpecId,
      childRepoName
    };
  }
}
async function getCurrentBranch(repoRoot) {
  if (process.env.SPECIFY_FEATURE) {
    return process.env.SPECIFY_FEATURE;
  }
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.quiet();
    return result.text().trim();
  } catch {
    const specsDir = path.join(repoRoot, "specs");
    if (existsSync(specsDir)) {
      let latestFeature = "";
      let highest = 0;
      const dirs = readdirSync(specsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const match = dir.name.match(/^(\d{3})-/);
          if (match && match[1]) {
            const number = parseInt(match[1], 10);
            if (number > highest) {
              highest = number;
              latestFeature = dir.name;
            }
          }
        }
      }
      if (latestFeature) {
        return latestFeature;
      }
    }
    return "main";
  }
}
async function hasGit() {
  try {
    const cwd = process.cwd();
    const gitDir = path.join(cwd, ".git");
    if (existsSync(gitDir)) {
      return true;
    }
    await $`git rev-parse --show-toplevel`.quiet();
    return true;
  } catch {
    return false;
  }
}
async function validateBranchName(branchName) {
  try {
    const result = await $`git check-ref-format --branch ${branchName}`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
async function checkFeatureBranch(branch, hasGitRepo, repoRoot) {
  if (!hasGitRepo) {
    console.error("[specify] Warning: Git repository not detected; skipped branch validation");
    return true;
  }
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content);
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branchExists = mapping.branches.some((b) => b.name === branch);
        if (branchExists) {
          return true;
        }
      }
    } catch {}
  }
  if (!/^\d{3}-/.test(branch)) {
    console.error(`ERROR: Not on a feature branch. Current branch: ${branch}`);
    console.error("Feature branches should be named like: 001-feature-name");
    return false;
  }
  return true;
}
function getFeatureDir(repoRoot, branchName) {
  return path.join(repoRoot, "specs", branchName);
}
async function findFeatureDirByPrefix(specsDir, branchName, repoRoot) {
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content);
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branch = mapping.branches.find((b) => b.name === branchName);
        if (branch && branch.specId) {
          return path.join(specsDir, branch.specId);
        }
      }
    } catch {}
  }
  const match = branchName.match(/^(\d{3})-/);
  if (!match) {
    return path.join(specsDir, branchName);
  }
  const prefix = match[1];
  const matches = [];
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory() && dir.name.startsWith(`${prefix}-`)) {
        matches.push(dir.name);
      }
    }
  }
  if (matches.length === 0) {
    return path.join(specsDir, branchName);
  } else if (matches.length === 1 && matches[0]) {
    return path.join(specsDir, matches[0]);
  } else {
    console.error(`ERROR: Multiple spec directories found with prefix '${prefix}': ${matches.join(", ")}`);
    console.error("Please ensure only one spec directory exists per numeric prefix.");
    return path.join(specsDir, branchName);
  }
}
async function getFeaturePaths() {
  const config = await detectSpeckRoot();
  const currentBranch = await getCurrentBranch(config.repoRoot);
  const hasGitRepo = await hasGit();
  const featureDir = await findFeatureDirByPrefix(config.specsDir, currentBranch, config.repoRoot);
  const featureName = path.basename(featureDir);
  const localSpecsDir = path.join(config.repoRoot, "specs", featureName);
  return {
    MODE: config.mode,
    SPECK_ROOT: config.speckRoot,
    SPECS_DIR: config.specsDir,
    REPO_ROOT: config.repoRoot,
    CURRENT_BRANCH: currentBranch,
    HAS_GIT: hasGitRepo ? "true" : "false",
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, "spec.md"),
    CHECKLISTS_DIR: path.join(featureDir, "checklists"),
    LINKED_REPOS: path.join(featureDir, "linked-repos.md"),
    IMPL_PLAN: path.join(localSpecsDir, "plan.md"),
    TASKS: path.join(localSpecsDir, "tasks.md"),
    RESEARCH: path.join(localSpecsDir, "research.md"),
    DATA_MODEL: path.join(localSpecsDir, "data-model.md"),
    QUICKSTART: path.join(localSpecsDir, "quickstart.md"),
    CONTRACTS_DIR: path.join(featureDir, "contracts")
  };
}
async function getDefaultWorkflowMode() {
  try {
    const repoRoot = await getRepoRoot();
    const constitutionPath = path.join(repoRoot, ".speck/memory/constitution.md");
    if (!existsSync(constitutionPath)) {
      return null;
    }
    const content = await fs.readFile(constitutionPath, "utf-8");
    const match = content.match(/^\*\*Default Workflow Mode\*\*:\s*(stacked-pr|single-branch)\s*$/m);
    if (match && (match[1] === "stacked-pr" || match[1] === "single-branch")) {
      return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}
function checkFile(filePath, label) {
  return existsSync(filePath) ? `  \u2713 ${label}` : `  \u2717 ${label}`;
}
function checkDir(dirPath, label) {
  if (!existsSync(dirPath)) {
    return `  \u2717 ${label}`;
  }
  try {
    const files = readdirSync(dirPath);
    return files.length > 0 ? `  \u2713 ${label}` : `  \u2717 ${label}`;
  } catch {
    return `  \u2717 ${label}`;
  }
}
async function syncSharedContracts(featureName) {
  const config = await detectSpeckRoot();
  if (config.mode !== "multi-repo") {
    return false;
  }
  const sharedContractsDir = path.join(config.speckRoot, "specs", featureName, "contracts");
  if (!existsSync(sharedContractsDir)) {
    return false;
  }
  const localFeatureDir = path.join(config.repoRoot, "specs", featureName);
  if (!existsSync(localFeatureDir)) {
    return false;
  }
  const localContractsLink = path.join(localFeatureDir, "contracts");
  try {
    const stats = await fs.lstat(localContractsLink);
    if (stats.isSymbolicLink()) {
      const resolved = await fs.realpath(localContractsLink);
      if (resolved === sharedContractsDir) {
        return true;
      }
      await fs.unlink(localContractsLink);
    } else {
      console.warn(`WARNING: Local contracts/ directory exists but is not a symlink
  Local: ${localContractsLink}
  Shared: ${sharedContractsDir}
  Skipping symlink creation to preserve local data.`);
      return false;
    }
  } catch (error) {
    const err = error;
    if (err.code !== "ENOENT")
      throw error;
  }
  const relativePath = path.relative(localFeatureDir, sharedContractsDir);
  try {
    await fs.symlink(relativePath, localContractsLink, "dir");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to create contracts/ symlink: ${errorMessage}`);
    return false;
  }
}
var cachedConfig = null, detectSpeckMode;
var init_paths = __esm(() => {
  detectSpeckMode = detectSpeckRoot;
});

// .speck/scripts/contracts/cli-interface.ts
var init_cli_interface = () => {};

// .speck/scripts/lib/output-formatter.ts
function detectInputMode(options) {
  return options.hook ? "hook" : "default";
}
function detectOutputMode(options) {
  if (options.hook) {
    return "hook";
  }
  if (options.json) {
    return "json";
  }
  return "human";
}
async function readHookInput(stdinContent) {
  try {
    let content = stdinContent;
    if (content === undefined) {
      const stdin = Bun.stdin.stream();
      const reader = stdin.getReader();
      const readPromise = reader.read();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ done: true, value: undefined }), 100));
      const result = await Promise.race([readPromise, timeoutPromise]);
      reader.releaseLock();
      if (result.done || !result.value) {
        return;
      }
      content = new TextDecoder().decode(result.value);
    }
    if (!content || content.trim() === "") {
      return;
    }
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return;
  }
}
function formatJsonOutput(input) {
  const now = Date.now();
  const duration = input.startTime ? now - input.startTime : 0;
  const output = {
    ok: input.success,
    meta: {
      command: input.command,
      timestamp: new Date(now).toISOString(),
      duration_ms: duration
    }
  };
  if (input.success && input.data !== undefined) {
    output.result = input.data;
  }
  if (!input.success && input.error) {
    output.error = {
      code: input.error.code,
      message: input.error.message
    };
    if (input.error.recovery) {
      output.error.recovery = input.error.recovery;
    }
  }
  return output;
}
function formatHookOutput(input) {
  if (input.passthrough) {
    return {};
  }
  const output = {};
  if (input.hookType === "UserPromptSubmit" && input.context) {
    output.context = input.context;
  }
  if (input.hookType === "SessionStart" && input.additionalContext) {
    output.hookSpecificOutput = {
      additionalContext: input.additionalContext
    };
  }
  if (input.hookType === "PreToolUse") {
    if (input.allow !== undefined) {
      output.allow = input.allow;
    }
    if (input.message) {
      output.message = input.message;
    }
  }
  if (input.message && !output.message) {
    output.message = input.message;
  }
  return output;
}

// .speck/scripts/check-prerequisites.ts
var exports_check_prerequisites = {};
__export(exports_check_prerequisites, {
  main: () => main
});
import { existsSync as existsSync2, readdirSync as readdirSync2, readFileSync, statSync } from "fs";
import { join, basename, relative } from "path";
function collectAllFiles(dirPath, fileList = []) {
  if (!existsSync2(dirPath)) {
    return fileList;
  }
  try {
    const entries = readdirSync2(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          collectAllFiles(fullPath, fileList);
        } else if (stat.isFile()) {
          fileList.push(fullPath);
        }
      } catch {
        continue;
      }
    }
  } catch {}
  return fileList;
}
function parseArgs(args) {
  return {
    json: args.includes("--json"),
    hook: args.includes("--hook"),
    requireTasks: args.includes("--require-tasks"),
    includeTasks: args.includes("--include-tasks"),
    pathsOnly: args.includes("--paths-only"),
    skipFeatureCheck: args.includes("--skip-feature-check"),
    skipPlanCheck: args.includes("--skip-plan-check"),
    help: args.includes("--help") || args.includes("-h"),
    includeFileContents: args.includes("--include-file-contents"),
    includeWorkflowMode: args.includes("--include-workflow-mode"),
    validateCodeQuality: args.includes("--validate-code-quality")
  };
}
function showHelp() {
  console.log(`Usage: check-prerequisites.ts [OPTIONS]

Consolidated prerequisite checking for Spec-Driven Development workflow.

OPTIONS:
  --json                   Output in JSON format (structured JSON envelope)
  --hook                   Output hook-formatted response for Claude Code hooks
  --require-tasks          Require tasks.md to exist (for implementation phase)
  --include-tasks          Include tasks.md in AVAILABLE_DOCS list
  --paths-only             Only output path variables (no prerequisite validation)
  --skip-feature-check     Skip feature directory and plan.md validation (for /speck.specify)
  --skip-plan-check        Skip plan.md validation but check feature directory (for /speck.plan)
  --validate-code-quality  Validate TypeScript typecheck and ESLint (Constitution Principle IX)
  --include-file-contents  Include file contents in JSON output
  --include-workflow-mode  Include workflow mode in JSON output
  --help, -h               Show this help message

OUTPUT MODES:
  Default (human): Human-readable text output
  --json: Structured JSON with { ok, result, error, meta } envelope
  --hook: Hook output for Claude Code integration (context injection)

EXAMPLES:
  # Check task prerequisites (plan.md required)
  bun .speck/scripts/check-prerequisites.ts --json

  # Check implementation prerequisites (plan.md + tasks.md required)
  bun .speck/scripts/check-prerequisites.ts --json --require-tasks --include-tasks

  # For Claude Code hook integration
  bun .speck/scripts/check-prerequisites.ts --hook --include-workflow-mode

  # Validate code quality before feature completion
  bun .speck/scripts/check-prerequisites.ts --validate-code-quality

  # Get feature paths only (no validation)
  bun .speck/scripts/check-prerequisites.ts --paths-only
`);
}
function outputPathsOnly(paths, jsonMode) {
  if (jsonMode) {
    const output = {
      MODE: paths.MODE,
      REPO_ROOT: paths.REPO_ROOT,
      BRANCH: paths.CURRENT_BRANCH,
      FEATURE_DIR: paths.FEATURE_DIR,
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      TASKS: paths.TASKS
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`MODE: ${paths.MODE}`);
    console.log(`REPO_ROOT: ${paths.REPO_ROOT}`);
    console.log(`BRANCH: ${paths.CURRENT_BRANCH}`);
    console.log(`FEATURE_DIR: ${paths.FEATURE_DIR}`);
    console.log(`FEATURE_SPEC: ${paths.FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${paths.IMPL_PLAN}`);
    console.log(`TASKS: ${paths.TASKS}`);
  }
}
function checkForUnknownOptions(args, _outputMode) {
  const validOptions = [
    "--json",
    "--hook",
    "--require-tasks",
    "--include-tasks",
    "--paths-only",
    "--skip-feature-check",
    "--skip-plan-check",
    "--help",
    "-h",
    "--include-file-contents",
    "--include-workflow-mode",
    "--validate-code-quality"
  ];
  for (const arg of args) {
    if (arg.startsWith("--") || arg.startsWith("-")) {
      if (!validOptions.includes(arg)) {
        return `Unknown option '${arg}'. Use --help for usage information.`;
      }
    }
  }
  return null;
}
function loadFileContent(filePath, totalSize) {
  if (!existsSync2(filePath)) {
    return "NOT_FOUND";
  }
  try {
    const stats = Bun.file(filePath);
    const fileSize = stats.size;
    if (fileSize > FILE_SIZE_LIMITS.maxSingleFile) {
      return "TOO_LARGE";
    }
    if (totalSize.value + fileSize > FILE_SIZE_LIMITS.maxTotalFiles) {
      return "TOO_LARGE";
    }
    const content = readFileSync(filePath, "utf-8");
    totalSize.value += fileSize;
    return content;
  } catch (error) {
    return "NOT_FOUND";
  }
}
async function validateCodeQuality(repoRoot) {
  const { $: $2 } = await Promise.resolve(globalThis.Bun);
  const typecheckResult = await $2`bun run typecheck`.cwd(repoRoot).nothrow().quiet();
  if (typecheckResult.exitCode !== 0) {
    return {
      passed: false,
      message: `\u274C TypeScript validation failed (exit code ${typecheckResult.exitCode})
${typecheckResult.stderr.toString()}`
    };
  }
  const lintResult = await $2`bun run lint`.cwd(repoRoot).nothrow().quiet();
  if (lintResult.exitCode !== 0) {
    const output = lintResult.stdout.toString();
    return {
      passed: false,
      message: `\u274C ESLint validation failed (exit code ${lintResult.exitCode})
${output}`
    };
  }
  return {
    passed: true,
    message: "\u2705 Code quality validation passed (0 typecheck errors, 0 lint errors/warnings)"
  };
}
function determineWorkflowMode(featureDir, repoRoot) {
  const planPath = join(featureDir, "plan.md");
  if (existsSync2(planPath)) {
    try {
      const planContent = readFileSync(planPath, "utf-8");
      const workflowMatch = planContent.match(/\*\*Workflow Mode\*\*:\s*(stacked-pr|single-branch)/);
      if (workflowMatch && workflowMatch[1]) {
        return workflowMatch[1];
      }
    } catch {}
  }
  const constitutionPath = join(repoRoot, ".speck", "memory", "constitution.md");
  if (existsSync2(constitutionPath)) {
    try {
      const constitutionContent = readFileSync(constitutionPath, "utf-8");
      const workflowMatch = constitutionContent.match(/\*\*Default Workflow Mode\*\*:\s*(stacked-pr|single-branch)/);
      if (workflowMatch && workflowMatch[1]) {
        return workflowMatch[1];
      }
    } catch {}
  }
  return "single-branch";
}
function outputError(code, message, recovery, outputMode, startTime) {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message, recovery },
      command: "check-prerequisites",
      startTime
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    console.error(`ERROR: ${message}`);
    recovery.forEach((r) => console.error(r));
  } else {
    console.error(`ERROR: ${message}`);
    recovery.forEach((r) => console.error(r));
  }
}
async function main(args) {
  const startTime = Date.now();
  const options = parseArgs(args);
  const outputMode = detectOutputMode(options);
  if (outputMode === "human" && process.stdout.isTTY) {
    console.warn(`\x1B[33m\u26A0\uFE0F  DEPRECATION WARNING: Direct invocation deprecated. Prerequisites are now auto-checked via PrePromptSubmit hook.\x1B[0m
`);
  }
  const unknownOptionError = checkForUnknownOptions(args, outputMode);
  if (unknownOptionError) {
    outputError("INVALID_ARGS", unknownOptionError, [], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (options.help) {
    showHelp();
    return 0 /* SUCCESS */;
  }
  if (detectInputMode(options) === "hook") {
    await readHookInput();
  }
  const paths = await getFeaturePaths();
  const hasGitRepo = paths.HAS_GIT === "true";
  if (!hasGitRepo) {
    outputError("NO_GIT_REPO", "Not in a git repository", [
      "Speck requires a git repository to function.",
      "Initialize a git repository first: git init",
      "Or navigate to an existing git repository."
    ], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (!options.skipFeatureCheck) {
    if (!await checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo, paths.REPO_ROOT)) {
      outputError("NOT_ON_FEATURE_BRANCH", `Not on a feature branch: ${paths.CURRENT_BRANCH}`, ["Switch to a feature branch (e.g., git checkout 001-feature-name)"], outputMode, startTime);
      return 1 /* USER_ERROR */;
    }
  }
  if (options.pathsOnly || options.skipFeatureCheck) {
    outputPathsOnly(paths, options.json);
    return 0 /* SUCCESS */;
  }
  if (!existsSync2(paths.FEATURE_DIR)) {
    outputError("FEATURE_DIR_NOT_FOUND", `Feature directory not found: ${paths.FEATURE_DIR}`, ["Run /speck.specify first to create the feature structure."], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (!options.skipPlanCheck && !existsSync2(paths.IMPL_PLAN)) {
    outputError("PLAN_NOT_FOUND", `plan.md not found in ${paths.FEATURE_DIR}`, ["Run /speck.plan first to create the implementation plan."], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (options.requireTasks && !existsSync2(paths.TASKS)) {
    outputError("TASKS_NOT_FOUND", `tasks.md not found in ${paths.FEATURE_DIR}`, ["Run /speck.tasks first to create the task list."], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  const absoluteDocs = [];
  const rootFeatureFiles = collectAllFiles(paths.FEATURE_DIR);
  absoluteDocs.push(...rootFeatureFiles);
  const linkedReposPath = join(paths.SPECK_ROOT, ".speck", "linked-repos.md");
  if (existsSync2(linkedReposPath)) {
    absoluteDocs.push(linkedReposPath);
  }
  const rootConstitutionPath = join(paths.SPECK_ROOT, ".speck", "memory", "constitution.md");
  if (existsSync2(rootConstitutionPath)) {
    absoluteDocs.push(rootConstitutionPath);
  }
  const childConstitutionPath = join(paths.REPO_ROOT, ".speck", "memory", "constitution.md");
  if (childConstitutionPath !== rootConstitutionPath && existsSync2(childConstitutionPath)) {
    absoluteDocs.push(childConstitutionPath);
  }
  const featureName = basename(paths.FEATURE_DIR);
  const localFeatureDir = join(paths.REPO_ROOT, "specs", featureName);
  if (localFeatureDir !== paths.FEATURE_DIR) {
    const localFeatureFiles = collectAllFiles(localFeatureDir);
    absoluteDocs.push(...localFeatureFiles);
  }
  const relativeDocs = absoluteDocs.map((absolutePath) => {
    return relative(paths.REPO_ROOT, absolutePath);
  });
  const filteredDocs = options.includeTasks ? relativeDocs : relativeDocs.filter((filePath) => !filePath.endsWith("tasks.md"));
  let fileContents;
  if (options.includeFileContents) {
    fileContents = {};
    const totalSize = { value: 0 };
    fileContents["tasks.md"] = loadFileContent(paths.TASKS, totalSize);
    fileContents["plan.md"] = loadFileContent(paths.IMPL_PLAN, totalSize);
    fileContents["spec.md"] = loadFileContent(paths.FEATURE_SPEC, totalSize);
    const constitutionPath = join(paths.REPO_ROOT, ".speck", "memory", "constitution.md");
    fileContents["constitution.md"] = loadFileContent(constitutionPath, totalSize);
    fileContents["data-model.md"] = loadFileContent(paths.DATA_MODEL, totalSize);
    fileContents["research.md"] = loadFileContent(paths.RESEARCH, totalSize);
    if (existsSync2(paths.CHECKLISTS_DIR)) {
      try {
        const checklistFiles = readdirSync2(paths.CHECKLISTS_DIR).filter((f) => f.endsWith(".md"));
        for (const file of checklistFiles) {
          const checklistPath = join(paths.CHECKLISTS_DIR, file);
          fileContents[`checklists/${file}`] = loadFileContent(checklistPath, totalSize);
        }
      } catch {}
    }
  }
  let workflowMode;
  if (options.includeWorkflowMode || outputMode === "hook") {
    workflowMode = determineWorkflowMode(paths.FEATURE_DIR, paths.REPO_ROOT);
  }
  if (options.validateCodeQuality) {
    const qualityResult = await validateCodeQuality(paths.REPO_ROOT);
    if (!qualityResult.passed) {
      outputError("CODE_QUALITY_FAILED", qualityResult.message, ["Constitution Principle IX requires zero typecheck errors and zero lint errors/warnings.", "Fix all issues before marking the feature complete."], outputMode, startTime);
      return 1 /* USER_ERROR */;
    }
    if (outputMode === "human") {
      console.log(`
` + qualityResult.message + `
`);
    }
  }
  const validationData = {
    MODE: paths.MODE,
    FEATURE_DIR: paths.FEATURE_DIR,
    AVAILABLE_DOCS: filteredDocs,
    ...fileContents && { FILE_CONTENTS: fileContents },
    ...workflowMode && { WORKFLOW_MODE: workflowMode },
    IMPL_PLAN: paths.IMPL_PLAN,
    TASKS: paths.TASKS,
    REPO_ROOT: paths.REPO_ROOT
  };
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: true,
      data: validationData,
      command: "check-prerequisites",
      startTime
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    const hookContext = buildHookContext(validationData);
    const hookOutput = formatHookOutput({
      hookType: "UserPromptSubmit",
      context: hookContext
    });
    console.log(JSON.stringify(hookOutput));
  } else {
    console.log(`FEATURE_DIR:${paths.FEATURE_DIR}`);
    console.log("AVAILABLE_DOCS:");
    for (const filePath of filteredDocs) {
      console.log(`  \u2713 ${filePath}`);
    }
  }
  return 0 /* SUCCESS */;
}
function buildHookContext(data) {
  const lines = [
    "<!-- SPECK_PREREQ_CONTEXT",
    JSON.stringify({
      MODE: data.MODE,
      FEATURE_DIR: data.FEATURE_DIR,
      AVAILABLE_DOCS: data.AVAILABLE_DOCS,
      WORKFLOW_MODE: data.WORKFLOW_MODE,
      IMPL_PLAN: data.IMPL_PLAN,
      TASKS: data.TASKS,
      REPO_ROOT: data.REPO_ROOT
    }),
    "-->"
  ];
  return lines.join(`
`);
}
var FILE_SIZE_LIMITS;
var init_check_prerequisites = __esm(async () => {
  init_paths();
  init_cli_interface();
  FILE_SIZE_LIMITS = {
    maxSingleFile: 24 * 1024,
    maxTotalFiles: 100 * 1024
  };
  if (false) {}
});

// node_modules/zod/v3/helpers/util.js
var util, objectUtil, ZodParsedType, getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var init_util = __esm(() => {
  (function(util2) {
    util2.assertEqual = (_) => {};
    function assertIs(_arg) {}
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error;
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items) => {
      const obj = {};
      for (const item of items) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
      const filtered = {};
      for (const k of validKeys) {
        filtered[k] = obj[k];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e) {
        return obj[e];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
      const keys = [];
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
      };
    };
  })(objectUtil || (objectUtil = {}));
  ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
});

// node_modules/zod/v3/ZodError.js
var ZodIssueCode, quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, ZodError;
var init_ZodError = __esm(() => {
  init_util();
  ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  ZodError = class ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue) {
        return issue.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue of error.issues) {
          if (issue.code === "invalid_union") {
            issue.unionErrors.map(processError);
          } else if (issue.code === "invalid_return_type") {
            processError(issue.returnTypeError);
          } else if (issue.code === "invalid_arguments") {
            processError(issue.argumentsError);
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < issue.path.length) {
              const el = issue.path[i];
              const terminal = i === issue.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue));
              }
              curr = curr[el];
              i++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };
});

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
}, en_default;
var init_en = __esm(() => {
  init_ZodError();
  init_util();
  en_default = errorMap;
});

// node_modules/zod/v3/errors.js
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var overrideErrorMap;
var init_errors = __esm(() => {
  init_en();
  overrideErrorMap = en_default;
});

// node_modules/zod/v3/helpers/parseUtil.js
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === en_default ? undefined : en_default
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, EMPTY_PATH, INVALID, DIRTY = (value) => ({ status: "dirty", value }), OK = (value) => ({ status: "valid", value }), isAborted = (x) => x.status === "aborted", isDirty = (x) => x.status === "dirty", isValid = (x) => x.status === "valid", isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
var init_parseUtil = __esm(() => {
  init_errors();
  init_en();
  EMPTY_PATH = [];
  INVALID = Object.freeze({
    status: "aborted"
  });
});

// node_modules/zod/v3/helpers/typeAliases.js
var init_typeAliases = () => {};

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
var init_errorUtil = __esm(() => {
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));
});

// node_modules/zod/v3/types.js
class ParseInputLazyPath {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
}, cuidRegex, cuid2Regex, ulidRegex, uuidRegex, nanoidRegex, jwtRegex, durationRegex, emailRegex, _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`, emojiRegex, ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex, base64Regex, base64urlRegex, dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`, dateRegex, ZodString, ZodNumber, ZodBigInt, ZodBoolean, ZodDate, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodArray, ZodObject, ZodUnion, getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [undefined];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [undefined, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodFunction, ZodLazy, ZodLiteral, ZodEnum, ZodNativeEnum, ZodPromise, ZodEffects, ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodNaN, BRAND, ZodBranded, ZodPipeline, ZodReadonly, late, ZodFirstPartyTypeKind, instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), stringType, numberType, nanType, bigIntType, booleanType, dateType, symbolType, undefinedType, nullType, anyType, unknownType, neverType, voidType, arrayType, objectType, strictObjectType, unionType, discriminatedUnionType, intersectionType, tupleType, recordType, mapType, setType, functionType, lazyType, literalType, enumType, nativeEnumType, promiseType, effectsType, optionalType, nullableType, preprocessType, pipelineType, ostring = () => stringType().optional(), onumber = () => numberType().optional(), oboolean = () => booleanType().optional(), coerce, NEVER;
var init_types = __esm(() => {
  init_ZodError();
  init_errors();
  init_errorUtil();
  init_parseUtil();
  init_util();
  cuidRegex = /^c[^\s-]{8,}$/i;
  cuid2Regex = /^[0-9a-z]+$/;
  ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  nanoidRegex = /^[a-z0-9_-]{21}$/i;
  jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  dateRegex = new RegExp(`^${dateRegexSource}$`);
  ZodString = class ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus;
      let ctx = undefined;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          const tooBig = input.data.length > check.value;
          const tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            }
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) {
            emojiRegex = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          const testResult = check.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "trim") {
          input.data = input.data.trim();
        } else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          const regex = datetimeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          const regex = timeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxLength() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  ZodNumber = class ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = undefined;
      const status = new ParseStatus;
      for (const check of this._def.checks) {
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  ZodBigInt = class ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = undefined;
      const status = new ParseStatus;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  ZodBoolean = class ZodBoolean extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  ZodDate = class ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus;
      let ctx = undefined;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max != null ? new Date(max) : null;
    }
  };
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  ZodSymbol = class ZodSymbol extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  ZodUndefined = class ZodUndefined extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  ZodNull = class ZodNull extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  ZodAny = class ZodAny extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  ZodUnknown = class ZodUnknown extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  ZodNever = class ZodNever extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  };
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  ZodVoid = class ZodVoid extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  ZodArray = class ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : undefined,
            maximum: tooBig ? def.exactLength.value : undefined,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        })).then((result2) => {
          return ParseStatus.mergeArray(status, result2);
        });
      }
      const result = [...ctx.data].map((item, i) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      });
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  ZodObject = class ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") {} else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== undefined ? {
          errorMap: (issue, ctx) => {
            const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            if (issue.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    extend(augmentation) {
      return new ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    merge(merging) {
      const merged = new ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    catchall(index) {
      return new ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodUnion = class ZodUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === "valid") {
            return result.result;
          }
        }
        for (const result of results) {
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = undefined;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid") {
            return result;
          } else if (result.status === "dirty" && !dirty) {
            dirty = { result, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => {
    return new ZodUnion({
      options: types,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  ZodDiscriminatedUnion = class ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator = this.discriminator;
      const discriminatorValue = ctx.data[discriminator];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    static create(discriminator, options, params) {
      const optionsMap = new Map;
      for (const type of options) {
        const discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type);
        }
      }
      return new ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  ZodIntersection = class ZodIntersection extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left, right]) => handleParsed(left, right));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  };
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  ZodTuple = class ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x) => !!x);
      if (ctx.common.async) {
        return Promise.all(items).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  ZodRecord = class ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  };
  ZodMap = class ZodMap extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = new Map;
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = new Map;
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  ZodSet = class ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = new Set;
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  ZodFunction = class ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          const result = await Reflect.apply(fn, this, parsedArgs);
          const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me = this;
        return OK(function(...args) {
          const parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result = Reflect.apply(fn, this, parsedArgs.data);
          const parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  };
  ZodLazy = class ZodLazy extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  ZodLiteral = class ZodLiteral extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  ZodEnum = class ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  ZodNativeEnum = class ZodNativeEnum extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  ZodPromise = class ZodPromise extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  };
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  ZodEffects = class ZodEffects extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        const processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        }
      }
      if (effect.type === "refinement") {
        const executeRefinement = (acc) => {
          const result = effect.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result);
          }
          if (result instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }));
          });
        }
      }
      util.assertNever(effect);
    }
  };
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  ZodOptional = class ZodOptional extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(undefined);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => {
    return new ZodOptional({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  ZodNullable = class ZodNullable extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => {
    return new ZodNullable({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  ZodDefault = class ZodDefault extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => {
    return new ZodDefault({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  ZodCatch = class ZodCatch extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: "valid",
            value: result2.status === "valid" ? result2.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result.status === "valid" ? result.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => {
    return new ZodCatch({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  ZodNaN = class ZodNaN extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  BRAND = Symbol("zod_brand");
  ZodBranded = class ZodBranded extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  ZodPipeline = class ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a, b) {
      return new ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  };
  ZodReadonly = class ZodReadonly extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  late = {
    object: ZodObject.lazycreate
  };
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  stringType = ZodString.create;
  numberType = ZodNumber.create;
  nanType = ZodNaN.create;
  bigIntType = ZodBigInt.create;
  booleanType = ZodBoolean.create;
  dateType = ZodDate.create;
  symbolType = ZodSymbol.create;
  undefinedType = ZodUndefined.create;
  nullType = ZodNull.create;
  anyType = ZodAny.create;
  unknownType = ZodUnknown.create;
  neverType = ZodNever.create;
  voidType = ZodVoid.create;
  arrayType = ZodArray.create;
  objectType = ZodObject.create;
  strictObjectType = ZodObject.strictCreate;
  unionType = ZodUnion.create;
  discriminatedUnionType = ZodDiscriminatedUnion.create;
  intersectionType = ZodIntersection.create;
  tupleType = ZodTuple.create;
  recordType = ZodRecord.create;
  mapType = ZodMap.create;
  setType = ZodSet.create;
  functionType = ZodFunction.create;
  lazyType = ZodLazy.create;
  literalType = ZodLiteral.create;
  enumType = ZodEnum.create;
  nativeEnumType = ZodNativeEnum.create;
  promiseType = ZodPromise.create;
  effectsType = ZodEffects.create;
  optionalType = ZodOptional.create;
  nullableType = ZodNullable.create;
  preprocessType = ZodEffects.createWithPreprocess;
  pipelineType = ZodPipeline.create;
  coerce = {
    string: (arg) => ZodString.create({ ...arg, coerce: true }),
    number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
    boolean: (arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    }),
    bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
    date: (arg) => ZodDate.create({ ...arg, coerce: true })
  };
  NEVER = INVALID;
});

// node_modules/zod/v3/external.js
var exports_external = {};
__export(exports_external, {
  void: () => voidType,
  util: () => util,
  unknown: () => unknownType,
  union: () => unionType,
  undefined: () => undefinedType,
  tuple: () => tupleType,
  transformer: () => effectsType,
  symbol: () => symbolType,
  string: () => stringType,
  strictObject: () => strictObjectType,
  setErrorMap: () => setErrorMap,
  set: () => setType,
  record: () => recordType,
  quotelessJson: () => quotelessJson,
  promise: () => promiseType,
  preprocess: () => preprocessType,
  pipeline: () => pipelineType,
  ostring: () => ostring,
  optional: () => optionalType,
  onumber: () => onumber,
  oboolean: () => oboolean,
  objectUtil: () => objectUtil,
  object: () => objectType,
  number: () => numberType,
  nullable: () => nullableType,
  null: () => nullType,
  never: () => neverType,
  nativeEnum: () => nativeEnumType,
  nan: () => nanType,
  map: () => mapType,
  makeIssue: () => makeIssue,
  literal: () => literalType,
  lazy: () => lazyType,
  late: () => late,
  isValid: () => isValid,
  isDirty: () => isDirty,
  isAsync: () => isAsync,
  isAborted: () => isAborted,
  intersection: () => intersectionType,
  instanceof: () => instanceOfType,
  getParsedType: () => getParsedType,
  getErrorMap: () => getErrorMap,
  function: () => functionType,
  enum: () => enumType,
  effect: () => effectsType,
  discriminatedUnion: () => discriminatedUnionType,
  defaultErrorMap: () => en_default,
  datetimeRegex: () => datetimeRegex,
  date: () => dateType,
  custom: () => custom,
  coerce: () => coerce,
  boolean: () => booleanType,
  bigint: () => bigIntType,
  array: () => arrayType,
  any: () => anyType,
  addIssueToContext: () => addIssueToContext,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransformer: () => ZodEffects,
  ZodSymbol: () => ZodSymbol,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodSchema: () => ZodType,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPipeline: () => ZodPipeline,
  ZodParsedType: () => ZodParsedType,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNever: () => ZodNever,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEffects: () => ZodEffects,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCatch: () => ZodCatch,
  ZodBranded: () => ZodBranded,
  ZodBoolean: () => ZodBoolean,
  ZodBigInt: () => ZodBigInt,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  Schema: () => ZodType,
  ParseStatus: () => ParseStatus,
  OK: () => OK,
  NEVER: () => NEVER,
  INVALID: () => INVALID,
  EMPTY_PATH: () => EMPTY_PATH,
  DIRTY: () => DIRTY,
  BRAND: () => BRAND
});
var init_external = __esm(() => {
  init_errors();
  init_parseUtil();
  init_typeAliases();
  init_util();
  init_types();
  init_ZodError();
});

// node_modules/zod/index.js
var init_zod = __esm(() => {
  init_external();
  init_external();
});

// .speck/scripts/worktree/config-schema.ts
function validateSpeckConfig(data) {
  try {
    return SpeckConfigSchema.parse(data);
  } catch (error) {
    if (error instanceof exports_external.ZodError) {
      const messages = error.errors.map((err) => `  - ${err.path.join(".")}: ${err.message}`).join(`
`);
      throw new Error(`Invalid configuration in .speck/config.json:
${messages}`);
    }
    throw error;
  }
}
var FileRuleSchema, FileConfigSchema, DependencyConfigSchema, IDEConfigSchema, WorktreeConfigSchema, SpeckConfigSchema, DEFAULT_WORKTREE_CONFIG, DEFAULT_SPECK_CONFIG;
var init_config_schema = __esm(() => {
  init_zod();
  FileRuleSchema = exports_external.object({
    pattern: exports_external.string().min(1, "Pattern cannot be empty"),
    action: exports_external.enum(["copy", "symlink", "ignore"], {
      errorMap: () => ({ message: "Action must be 'copy', 'symlink', or 'ignore'" })
    })
  });
  FileConfigSchema = exports_external.object({
    rules: exports_external.array(FileRuleSchema).default([]),
    includeUntracked: exports_external.boolean().default(true)
  }).default({});
  DependencyConfigSchema = exports_external.object({
    autoInstall: exports_external.boolean().default(false),
    packageManager: exports_external.enum(["npm", "yarn", "pnpm", "bun", "auto"], {
      errorMap: () => ({ message: "Package manager must be 'npm', 'yarn', 'pnpm', 'bun', or 'auto'" })
    }).default("auto")
  }).default({});
  IDEConfigSchema = exports_external.object({
    autoLaunch: exports_external.boolean().default(false),
    editor: exports_external.enum(["vscode", "cursor", "webstorm", "idea", "pycharm"], {
      errorMap: () => ({ message: "Editor must be one of: vscode, cursor, webstorm, idea, pycharm" })
    }).default("vscode"),
    newWindow: exports_external.boolean().default(true)
  }).default({});
  WorktreeConfigSchema = exports_external.object({
    enabled: exports_external.boolean().default(true),
    worktreePath: exports_external.string().default("../"),
    branchPrefix: exports_external.string().optional(),
    ide: IDEConfigSchema,
    dependencies: DependencyConfigSchema,
    files: FileConfigSchema
  }).default({});
  SpeckConfigSchema = exports_external.object({
    version: exports_external.string().default("1.0"),
    worktree: WorktreeConfigSchema
  });
  DEFAULT_WORKTREE_CONFIG = {
    enabled: true,
    worktreePath: "../",
    ide: {
      autoLaunch: false,
      editor: "vscode",
      newWindow: true
    },
    dependencies: {
      autoInstall: false,
      packageManager: "auto"
    },
    files: {
      rules: [
        { pattern: ".env*", action: "copy" },
        { pattern: "*.config.js", action: "copy" },
        { pattern: "*.config.ts", action: "copy" },
        { pattern: "*.config.json", action: "copy" },
        { pattern: ".nvmrc", action: "copy" },
        { pattern: ".node-version", action: "copy" },
        { pattern: ".claude/settings.local.json", action: "copy" },
        { pattern: "node_modules", action: "symlink" },
        { pattern: ".bun", action: "symlink" },
        { pattern: ".cache", action: "symlink" },
        { pattern: ".git", action: "ignore" },
        { pattern: ".speck", action: "ignore" },
        { pattern: "dist", action: "ignore" },
        { pattern: "build", action: "ignore" }
      ],
      includeUntracked: true
    }
  };
  DEFAULT_SPECK_CONFIG = {
    version: "1.0",
    worktree: DEFAULT_WORKTREE_CONFIG
  };
});

// .speck/scripts/worktree/config.ts
import { existsSync as existsSync3 } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join as join2 } from "path";
function getConfigPath(repoPath) {
  return join2(repoPath, SPECK_DIR, CONFIG_FILENAME);
}
async function loadConfig(repoPath) {
  const configPath = getConfigPath(repoPath);
  if (!existsSync3(configPath)) {
    return DEFAULT_SPECK_CONFIG;
  }
  try {
    const content = await readFile(configPath, "utf-8");
    const rawConfig = JSON.parse(content);
    return validateSpeckConfig(rawConfig);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse configuration file at ${configPath}: ${error.message}`);
    }
    throw error;
  }
}
var CONFIG_FILENAME = "config.json", SPECK_DIR = ".speck";
var init_config = __esm(() => {
  init_config_schema();
});

// .speck/scripts/worktree/naming.ts
import { basename as basename2, dirname, join as join3, resolve } from "path";
var {$: $2 } = globalThis.Bun;
async function detectRepoLayout(repoPath) {
  try {
    const result = await $2`git -C ${repoPath} rev-parse --abbrev-ref HEAD`.quiet();
    const currentBranch = result.stdout.toString().trim();
    const dirName = basename2(repoPath);
    if (dirName === currentBranch) {
      return "branch-name-dir";
    }
    return "repo-name-dir";
  } catch {
    return "repo-name-dir";
  }
}
async function getRepoName(repoPath) {
  try {
    const result = await $2`git -C ${repoPath} remote get-url origin`.quiet();
    const remoteUrl = result.stdout.toString().trim();
    const match = remoteUrl.match(/\/([^/]+?)(\.git)?$/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {}
  return basename2(repoPath);
}
function slugifyBranchName(branchName) {
  return branchName.toLowerCase().replace(/\//g, "-").replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
async function constructWorktreeDirName(repoPath, branchName) {
  const layout = await detectRepoLayout(repoPath);
  const slugifiedBranch = slugifyBranchName(branchName);
  if (layout === "branch-name-dir") {
    return slugifiedBranch;
  } else {
    const repoName = await getRepoName(repoPath);
    return `${repoName}-${slugifiedBranch}`;
  }
}
async function constructWorktreePath(repoPath, _config, branchName) {
  const parentDir = dirname(repoPath);
  const worktreeDirName = await constructWorktreeDirName(repoPath, branchName);
  return resolve(join3(parentDir, worktreeDirName));
}
var init_naming = () => {};

// .speck/scripts/worktree/handoff.ts
import { mkdirSync, existsSync as existsSync4, renameSync, readFileSync as readFileSync2, writeFileSync, chmodSync } from "fs";
import path2 from "path";
function createHandoffDocument(options) {
  const { featureName, branchName, specPath, context, status } = options;
  return HandoffDocumentSchema.parse({
    featureName,
    branchName,
    specPath,
    createdAt: new Date().toISOString(),
    context,
    status,
    nextStep: determineNextStep(status)
  });
}
function determineNextStep(status) {
  switch (status) {
    case "not-started":
      return "Run `/speck.plan` to create an implementation plan, then `/speck.tasks` to generate tasks.";
    case "in-progress":
      return "Run `/speck.implement` to continue working on the remaining tasks.";
    case "completed":
      return "This feature is complete. Run `/speck.analyze` to verify consistency before merging.";
    default:
      return "Start by reviewing the spec, then run `/speck.plan` to create an implementation plan.";
  }
}
function generateHandoffMarkdown(doc) {
  const statusLine = doc.status ? `status: "${doc.status}"` : "";
  const yamlFrontmatter = `---
featureName: "${escapeYaml(doc.featureName)}"
branchName: "${escapeYaml(doc.branchName)}"
specPath: "${escapeYaml(doc.specPath)}"
createdAt: "${doc.createdAt}"
${statusLine}
---`.trim();
  const markdownContent = `
# Feature Handoff: ${doc.featureName}

## Context

${doc.context}

## Getting Started

1. **Review the spec**: [\`${doc.specPath}\`](${doc.specPath})
2. **Check current tasks**: Run \`/speck.tasks\` if tasks.md doesn't exist
3. **Start implementation**: Run \`/speck.implement\` to execute tasks

## Next Step

${doc.nextStep}

---

*This handoff document was automatically generated. It will be archived after loading.*
`;
  return yamlFrontmatter + `
` + markdownContent.trim() + `
`;
}
function escapeYaml(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n");
}
function writeWorktreeHandoff(worktreePath, options) {
  const doc = createHandoffDocument(options);
  const markdown = generateHandoffMarkdown(doc);
  const speckDir = path2.join(worktreePath, ".speck");
  mkdirSync(speckDir, { recursive: true });
  writeFileSync(path2.join(worktreePath, HANDOFF_FILE_PATH), markdown);
  const claudeDir = path2.join(worktreePath, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(path2.join(worktreePath, CLAUDE_SETTINGS_PATH), JSON.stringify(CLAUDE_SETTINGS_TEMPLATE, null, 2));
  const scriptsDir = path2.join(worktreePath, ".claude", "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  const hookScriptPath = path2.join(worktreePath, HOOK_SCRIPT_PATH);
  writeFileSync(hookScriptPath, HANDOFF_HOOK_SCRIPT);
  chmodSync(hookScriptPath, 493);
  const vscodeDir = path2.join(worktreePath, ".vscode");
  mkdirSync(vscodeDir, { recursive: true });
  writeFileSync(path2.join(worktreePath, VSCODE_TASKS_PATH), JSON.stringify(VSCODE_TASKS_TEMPLATE, null, 2));
}
var HandoffDocumentSchema, HANDOFF_FILE_PATH = ".speck/handoff.md", CLAUDE_SETTINGS_PATH = ".claude/settings.json", HOOK_SCRIPT_PATH = ".claude/scripts/handoff.sh", VSCODE_TASKS_PATH = ".vscode/tasks.json", CLAUDE_SETTINGS_TEMPLATE, VSCODE_TASKS_TEMPLATE, HANDOFF_HOOK_SCRIPT = `#!/bin/bash

HANDOFF_FILE="$CLAUDE_PROJECT_DIR/.speck/handoff.md"
SETTINGS_FILE="$CLAUDE_PROJECT_DIR/.claude/settings.json"

# Exit silently if no handoff file
[ ! -f "$HANDOFF_FILE" ] && exit 0

# Inject context into Claude session
# Use jq -Rs to properly JSON-escape the content (handles newlines, quotes, etc.)
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $(jq -Rs . < "$HANDOFF_FILE")
  }
}
EOF

# Cleanup: Mark handoff as processed
mv "$HANDOFF_FILE" "\${HANDOFF_FILE%.md}.done.md"

# Cleanup: Remove the SessionStart hook from settings.json (one-time use)
if command -v jq &> /dev/null; then
  jq 'del(.hooks.SessionStart)' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \\
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
fi

exit 0
`;
var init_handoff = __esm(() => {
  init_zod();
  HandoffDocumentSchema = exports_external.object({
    featureName: exports_external.string().min(1, "Feature name is required"),
    branchName: exports_external.string().min(1, "Branch name is required").regex(/^[a-zA-Z0-9._/-]+$/, "Branch name contains invalid characters"),
    specPath: exports_external.string().min(1, "Spec path is required"),
    createdAt: exports_external.string().datetime("Invalid ISO timestamp"),
    context: exports_external.string().min(1, "Context is required"),
    status: exports_external.enum(["not-started", "in-progress", "completed"]).optional(),
    nextStep: exports_external.string().min(1, "Next step is required")
  });
  CLAUDE_SETTINGS_TEMPLATE = {
    hooks: {
      SessionStart: [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: "$CLAUDE_PROJECT_DIR/.claude/scripts/handoff.sh"
            }
          ]
        }
      ]
    }
  };
  VSCODE_TASKS_TEMPLATE = {
    version: "2.0.0",
    tasks: [
      {
        label: "Start Claude with Handoff",
        type: "shell",
        command: "~/.claude/local/claude",
        args: ["'Read .speck/handoff.md and proceed with the task described there.'"],
        runOptions: {
          runOn: "folderOpen"
        },
        presentation: {
          reveal: "always",
          panel: "dedicated",
          focus: true
        },
        problemMatcher: []
      }
    ]
  };
});

// .speck/scripts/worktree/ide-launch.ts
function isIDEAvailable(command) {
  const path3 = Bun.which(command);
  return path3 !== null;
}
function getIDECommand(editor, worktreePath, newWindow) {
  const config = IDE_CONFIG[editor];
  if (!config) {
    throw new Error(`Unknown IDE editor: ${editor}`);
  }
  const command = [config.command];
  if (config.newWindowFlag) {
    if (newWindow) {
      command.push(config.newWindowFlag);
    }
  } else {
    command.push("nosplash");
  }
  command.push(worktreePath);
  return command;
}
function launchIDE(options) {
  const { worktreePath, editor, newWindow = true } = options;
  const config = IDE_CONFIG[editor];
  if (!config) {
    return {
      success: false,
      editor,
      command: "",
      error: `Unknown IDE editor: ${editor}`
    };
  }
  const available = isIDEAvailable(config.command);
  if (!available) {
    return {
      success: false,
      editor,
      command: config.command,
      error: `IDE '${config.name}' (command: ${config.command}) is not available in PATH. Please install ${config.name} or add it to your PATH environment variable.`
    };
  }
  const commandArray = getIDECommand(editor, worktreePath, newWindow);
  const commandString = commandArray.join(" ");
  try {
    Bun.spawn(commandArray, {
      cwd: worktreePath,
      stdio: ["ignore", "ignore", "ignore"],
      onExit: undefined
    });
    return {
      success: true,
      editor,
      command: commandString
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      editor,
      command: commandString,
      error: `Failed to launch IDE '${config.name}': ${errorMessage}. The IDE command may not be in your PATH, or the worktree path may be invalid.`
    };
  }
}
var IDE_CONFIG;
var init_ide_launch = __esm(() => {
  IDE_CONFIG = {
    vscode: { command: "code", name: "VSCode", newWindowFlag: "-n" },
    cursor: { command: "cursor", name: "Cursor", newWindowFlag: "-n" },
    webstorm: { command: "webstorm", name: "WebStorm" },
    idea: { command: "idea", name: "IntelliJ IDEA" },
    pycharm: { command: "pycharm", name: "PyCharm" }
  };
});

// .speck/scripts/common/branch-mapper.ts
import fs2 from "fs/promises";
import { existsSync as existsSync5 } from "fs";
import path3 from "path";
function createEmptyBranchMapping() {
  return {
    version: SCHEMA_VERSION,
    branches: [],
    specIndex: {}
  };
}
function createBranchEntry(name, specId, parentSpecId) {
  const now = new Date().toISOString();
  return BranchEntrySchema.parse({
    name,
    specId,
    createdAt: now,
    updatedAt: now,
    parentSpecId
  });
}
function rebuildSpecIndex(branches) {
  const index = {};
  for (const branch of branches) {
    if (!index[branch.specId]) {
      index[branch.specId] = [];
    }
    index[branch.specId].push(branch.name);
  }
  return index;
}
function addBranchEntry(mapping, entry) {
  if (mapping.branches.some((b) => b.name === entry.name)) {
    throw new Error(`Branch "${entry.name}" already exists in mapping`);
  }
  const branches = [...mapping.branches, entry];
  const specIndex = rebuildSpecIndex(branches);
  return {
    ...mapping,
    branches,
    specIndex
  };
}
function needsMigration(mapping) {
  return mapping.version.startsWith(LEGACY_SCHEMA_VERSION_PREFIX);
}
function migrateBranchMapping(legacy) {
  const branches = legacy.branches.map((entry) => ({
    name: entry.name,
    specId: entry.specId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    parentSpecId: entry.parentSpecId
  }));
  const specIndex = rebuildSpecIndex(branches);
  return {
    version: SCHEMA_VERSION,
    branches,
    specIndex
  };
}
async function readBranches(repoRoot) {
  const filePath = path3.join(repoRoot, BRANCHES_FILE_PATH);
  if (!existsSync5(filePath)) {
    return createEmptyBranchMapping();
  }
  try {
    const content = await fs2.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    if (typeof data === "object" && data !== null && "version" in data && typeof data.version === "string") {
      const versionedData = data;
      if (needsMigration(versionedData)) {
        console.log(`[INFO] Migrating branches.json from v${versionedData.version} to v${SCHEMA_VERSION}`);
        const legacyBranches = (versionedData.branches || []).map((b) => LegacyBranchEntrySchema.parse(b));
        const migrated = migrateBranchMapping({
          version: versionedData.version,
          branches: legacyBranches
        });
        await writeBranches(repoRoot, migrated);
        return migrated;
      }
    }
    const result = BranchMappingSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Corrupted branches.json - restore from git history:
` + `  git show HEAD:.speck/branches.json > .speck/branches.json

` + `Validation errors:
${result.error.message}`);
    }
    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Corrupted branches.json (invalid JSON) - restore from git history:
` + `  git show HEAD:.speck/branches.json > .speck/branches.json`);
    }
    throw error;
  }
}
async function writeBranches(repoRoot, mapping) {
  const filePath = path3.join(repoRoot, BRANCHES_FILE_PATH);
  const tempPath = `${filePath}.tmp`;
  const result = BranchMappingSchema.safeParse(mapping);
  if (!result.success) {
    throw new Error(`Invalid branch mapping: ${result.error.message}`);
  }
  const speckDir = path3.join(repoRoot, ".speck");
  if (!existsSync5(speckDir)) {
    await fs2.mkdir(speckDir, { recursive: true });
  }
  const content = JSON.stringify(mapping, null, 2);
  await fs2.writeFile(tempPath, content, "utf-8");
  await fs2.rename(tempPath, filePath);
}
async function getAggregatedBranchStatus(speckRoot, _repoRoot) {
  const { findChildReposWithNames: findChildReposWithNames2 } = await Promise.resolve().then(() => (init_paths(), exports_paths));
  let rootRepo = null;
  try {
    const rootMapping = await readBranches(speckRoot);
    if (rootMapping.branches.length > 0) {
      rootRepo = buildRepoBranchSummary(speckRoot, "root", rootMapping);
    }
  } catch {}
  const childRepos = new Map;
  const childRepoMap = await findChildReposWithNames2(speckRoot);
  const childRepoPromises = Array.from(childRepoMap.entries()).map(async ([childName, childPath]) => {
    try {
      const childMapping = await readBranches(childPath);
      if (childMapping.branches.length > 0) {
        const summary = buildRepoBranchSummary(childPath, childName, childMapping);
        return { childName, summary };
      }
    } catch {}
    return null;
  });
  const childResults = await Promise.all(childRepoPromises);
  for (const result of childResults) {
    if (result) {
      childRepos.set(result.childName, result.summary);
    }
  }
  return {
    rootRepo,
    childRepos
  };
}
function buildRepoBranchSummary(repoPath, repoName, mapping) {
  const specIds = [...new Set(mapping.branches.map((b) => b.specId))];
  const specId = specIds.length === 1 ? specIds[0] ?? null : null;
  return {
    repoPath,
    repoName,
    specId,
    branchCount: mapping.branches.length,
    branches: mapping.branches
  };
}
var SCHEMA_VERSION = "2.0.0", LEGACY_SCHEMA_VERSION_PREFIX = "1.", SPEC_ID_PATTERN, BRANCHES_FILE_PATH = ".speck/branches.json", BranchEntrySchema, BranchMappingSchema, LegacyBranchEntrySchema;
var init_branch_mapper = __esm(() => {
  init_zod();
  SPEC_ID_PATTERN = /^\d{3}-[a-z0-9-]+$/;
  BranchEntrySchema = exports_external.object({
    name: exports_external.string().min(1, "Branch name is required").regex(/^[a-zA-Z0-9._/-]+$/, "Branch name contains invalid characters"),
    specId: exports_external.string().regex(SPEC_ID_PATTERN, "Spec ID must match NNN-short-name format"),
    createdAt: exports_external.string().datetime("Invalid ISO timestamp for createdAt"),
    updatedAt: exports_external.string().datetime("Invalid ISO timestamp for updatedAt"),
    parentSpecId: exports_external.string().regex(SPEC_ID_PATTERN, "Parent spec ID must match NNN-short-name format").optional()
  });
  BranchMappingSchema = exports_external.object({
    version: exports_external.string().min(1, "Version is required"),
    branches: exports_external.array(BranchEntrySchema),
    specIndex: exports_external.record(exports_external.string(), exports_external.array(exports_external.string()))
  });
  LegacyBranchEntrySchema = exports_external.object({
    name: exports_external.string(),
    specId: exports_external.string(),
    baseBranch: exports_external.string().optional(),
    status: exports_external.enum(["active", "submitted", "merged", "abandoned"]).optional(),
    pr: exports_external.number().nullable().optional(),
    createdAt: exports_external.string(),
    updatedAt: exports_external.string(),
    parentSpecId: exports_external.string().optional()
  });
});

// .speck/scripts/create-new-feature.ts
var exports_create_new_feature = {};
__export(exports_create_new_feature, {
  main: () => main2
});
import { existsSync as existsSync6, mkdirSync as mkdirSync2, readdirSync as readdirSync3, copyFileSync, symlinkSync } from "fs";
import path4 from "path";
var {$: $3 } = globalThis.Bun;
function parseArgs2(args) {
  const options = {
    json: false,
    hook: false,
    branch: undefined,
    sharedSpec: false,
    localSpec: false,
    noWorktree: false,
    worktree: false,
    noIde: false,
    help: false,
    featureDescription: ""
  };
  const positionalArgs = [];
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--json") {
      options.json = true;
      i++;
    } else if (arg === "--hook") {
      options.hook = true;
      i++;
    } else if (arg === "--short-name") {
      if (i + 1 >= args.length || args[i + 1]?.startsWith("--")) {
        return { success: false, error: "--short-name requires a value" };
      }
      options.shortName = args[i + 1];
      i += 2;
    } else if (arg === "--number") {
      if (i + 1 >= args.length || args[i + 1]?.startsWith("--")) {
        return { success: false, error: "--number requires a value" };
      }
      const num = parseInt(args[i + 1], 10);
      if (isNaN(num)) {
        return { success: false, error: "--number requires a numeric value" };
      }
      options.number = num;
      i += 2;
    } else if (arg === "--branch") {
      if (i + 1 >= args.length || args[i + 1]?.startsWith("--")) {
        return { success: false, error: "--branch requires a value" };
      }
      options.branch = args[i + 1];
      i += 2;
    } else if (arg === "--shared-spec") {
      options.sharedSpec = true;
      i++;
    } else if (arg === "--local-spec") {
      options.localSpec = true;
      i++;
    } else if (arg === "--no-worktree") {
      options.noWorktree = true;
      i++;
    } else if (arg === "--worktree") {
      options.worktree = true;
      i++;
    } else if (arg === "--no-ide") {
      options.noIde = true;
      i++;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
      i++;
    } else {
      positionalArgs.push(arg);
      i++;
    }
  }
  options.featureDescription = positionalArgs.join(" ");
  return { success: true, options };
}
function showHelp2() {
  const scriptName = path4.basename(process.argv[1]);
  console.log(`Usage: ${scriptName} [--json] [--hook] [--short-name <name>] [--number N] [--branch <name>] [--shared-spec | --local-spec] [--worktree | --no-worktree] [--no-ide] <feature_description>

Options:
  --json              Output in JSON format (structured JSON envelope)
  --hook              Output hook-formatted response for Claude Code hooks
  --short-name <name> Provide a custom short name (2-4 words) for the branch
  --number N          Specify branch number manually (overrides auto-detection)
  --branch <name>     Use a custom branch name (non-standard, recorded in branches.json)
  --shared-spec       Create spec at speckRoot (multi-repo shared spec with local symlinks)
  --local-spec        Create spec locally in child repo (single-repo or child-only spec)
  --worktree          Create a worktree with handoff artifacts (overrides config)
  --no-worktree       Disable worktree creation (overrides config)
  --no-ide            Skip IDE launch (for deferred launch by /speck.specify)
  --help, -h          Show this help message

Worktree Mode:
  When worktree mode is enabled (via config or --worktree), this command:
  1. Creates a branch and worktree atomically (no checkout switching)
  2. Writes session handoff artifacts to the worktree
  3. Launches IDE in the new worktree

Non-Standard Branch Names:
  When --branch is used with a name that doesn't follow the NNN-name pattern,
  the branch-to-spec mapping is recorded in .speck/branches.json for later lookup.

Examples:
  ${scriptName} 'Add user authentication system' --short-name 'user-auth'
  ${scriptName} 'Implement OAuth2 integration for API' --number 5 --shared-spec
  ${scriptName} 'Fix login bug' --worktree
  ${scriptName} 'My feature' --branch 'nprbst/custom-feature'`);
}
function outputError2(code, message, outputMode, startTime, recovery) {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message, recovery },
      command: "create-new-feature",
      startTime
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    console.error(`ERROR: ${message}`);
  } else {
    console.error(`Error: ${message}`);
  }
}
function findRepoRoot(startDir) {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync6(path4.join(dir, ".git")) || existsSync6(path4.join(dir, ".specify")) || existsSync6(path4.join(dir, ".speck"))) {
      return dir;
    }
    dir = path4.dirname(dir);
  }
  return null;
}
function getHighestFromSpecs(specsDir) {
  let highest = 0;
  if (existsSync6(specsDir)) {
    const dirs = readdirSync3(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(/^(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > highest) {
            highest = num;
          }
        }
      }
    }
  }
  return highest;
}
async function checkExistingBranches(shortName, specsDir) {
  try {
    await $3`git fetch --all --prune`.quiet();
  } catch {}
  let maxNum = 0;
  try {
    const result = await $3`git ls-remote --heads origin`.quiet();
    const lines = result.text().split(`
`);
    for (const line of lines) {
      const match = line.match(new RegExp(`refs/heads/(\\d+)-${shortName}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {}
  try {
    const result = await $3`git branch`.quiet();
    const branches = result.text().split(`
`);
    for (const branch of branches) {
      const match = branch.match(new RegExp(`^[* ]*?(\\d+)-${shortName}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {}
  if (existsSync6(specsDir)) {
    const dirs = readdirSync3(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(new RegExp(`^(\\d+)-${shortName}$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }
  return maxNum + 1;
}
function cleanBranchName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-/, "").replace(/-$/, "");
}
function generateBranchName(description) {
  const stopWords = new Set([
    "i",
    "a",
    "an",
    "the",
    "to",
    "for",
    "of",
    "in",
    "on",
    "at",
    "by",
    "with",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "can",
    "may",
    "might",
    "must",
    "shall",
    "this",
    "that",
    "these",
    "those",
    "my",
    "your",
    "our",
    "their",
    "want",
    "need",
    "add",
    "get",
    "set"
  ]);
  const cleanName = description.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);
  const meaningfulWords = [];
  for (const word of words) {
    if (stopWords.has(word)) {
      continue;
    }
    if (word.length >= 3) {
      meaningfulWords.push(word);
    } else {
      const upperWord = word.toUpperCase();
      if (description.includes(upperWord)) {
        meaningfulWords.push(word);
      }
    }
  }
  if (meaningfulWords.length > 0) {
    const maxWords = meaningfulWords.length === 4 ? 4 : 3;
    return meaningfulWords.slice(0, maxWords).join("-");
  }
  const cleaned = cleanBranchName(description);
  return cleaned.split("-").filter((w) => w.length > 0).slice(0, 3).join("-");
}
async function main2(args) {
  const startTime = Date.now();
  const parseResult = parseArgs2(args);
  if (!parseResult.success) {
    const hasJsonFlag = args.includes("--json");
    const hasHookFlag = args.includes("--hook");
    const outputMode2 = detectOutputMode({ json: hasJsonFlag, hook: hasHookFlag });
    outputError2("INVALID_ARGS", parseResult.error, outputMode2, startTime);
    return 1 /* USER_ERROR */;
  }
  const options = parseResult.options;
  const outputMode = detectOutputMode(options);
  if (options.help) {
    showHelp2();
    return 0 /* SUCCESS */;
  }
  if (!options.featureDescription) {
    outputError2("MISSING_DESCRIPTION", "Feature description is required", outputMode, startTime, ["Provide a description: create-new-feature '<feature description>'"]);
    return 1 /* USER_ERROR */;
  }
  let repoRoot;
  let hasGit2 = false;
  try {
    const result = await $3`git rev-parse --show-toplevel`.quiet();
    repoRoot = result.text().trim();
    hasGit2 = true;
  } catch {
    const scriptDir = import.meta.dir;
    const foundRoot = findRepoRoot(scriptDir);
    if (!foundRoot) {
      outputError2("REPO_NOT_FOUND", "Could not determine repository root. Please run this script from within the repository.", outputMode, startTime);
      return 1 /* USER_ERROR */;
    }
    repoRoot = foundRoot;
    hasGit2 = false;
  }
  const config = await detectSpeckRoot();
  let specsDir;
  let isSharedSpec = false;
  if (options.sharedSpec && config.mode === "multi-repo") {
    specsDir = path4.join(config.speckRoot, "specs");
    isSharedSpec = true;
  } else {
    specsDir = path4.join(repoRoot, "specs");
  }
  mkdirSync2(specsDir, { recursive: true });
  let branchName;
  let specId;
  let featureNum;
  let isNonStandardBranch = false;
  if (options.branch) {
    branchName = options.branch;
    isNonStandardBranch = !/^\d{3}-/.test(branchName);
    let branchSuffix;
    if (options.shortName) {
      branchSuffix = cleanBranchName(options.shortName);
    } else {
      branchSuffix = generateBranchName(options.featureDescription);
    }
    let branchNumber;
    if (options.number !== undefined) {
      branchNumber = options.number;
    } else if (hasGit2) {
      branchNumber = await checkExistingBranches(branchSuffix, specsDir);
    } else {
      const highest = getHighestFromSpecs(specsDir);
      branchNumber = highest + 1;
    }
    featureNum = branchNumber.toString().padStart(3, "0");
    specId = `${featureNum}-${branchSuffix}`;
  } else {
    let branchSuffix;
    if (options.shortName) {
      branchSuffix = cleanBranchName(options.shortName);
    } else {
      branchSuffix = generateBranchName(options.featureDescription);
    }
    let branchNumber;
    if (options.number !== undefined) {
      branchNumber = options.number;
    } else if (hasGit2) {
      branchNumber = await checkExistingBranches(branchSuffix, specsDir);
    } else {
      const highest = getHighestFromSpecs(specsDir);
      branchNumber = highest + 1;
    }
    featureNum = branchNumber.toString().padStart(3, "0");
    branchName = `${featureNum}-${branchSuffix}`;
    const maxBranchLength = 244;
    if (branchName.length > maxBranchLength) {
      const maxSuffixLength = maxBranchLength - 4;
      const truncatedSuffix = branchSuffix.substring(0, maxSuffixLength).replace(/-$/, "");
      console.error(`[specify] Warning: Branch name exceeded GitHub's 244-byte limit`);
      console.error(`[specify] Original: ${branchName} (${branchName.length} bytes)`);
      branchName = `${featureNum}-${truncatedSuffix}`;
      console.error(`[specify] Truncated to: ${branchName} (${branchName.length} bytes)`);
    }
    specId = branchName;
  }
  if (isNonStandardBranch && hasGit2) {
    try {
      const branchMapping = await readBranches(repoRoot);
      const entry = createBranchEntry(branchName, specId);
      const updatedMapping = addBranchEntry(branchMapping, entry);
      await writeBranches(repoRoot, updatedMapping);
      if (outputMode === "human") {
        console.log(`[speck] Recorded branch mapping: ${branchName} \u2192 ${specId}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[speck] Warning: Failed to record branch mapping: ${errorMessage}`);
    }
  }
  let worktreePath;
  let useWorktree = false;
  const warnings = [];
  if (hasGit2) {
    const worktreeConfig = await loadConfig(repoRoot);
    const configEnablesWorktree = worktreeConfig.worktree.enabled;
    if (options.noWorktree) {
      useWorktree = false;
    } else if (options.worktree) {
      useWorktree = true;
    } else {
      useWorktree = configEnablesWorktree;
    }
    if (useWorktree) {
      try {
        worktreePath = await constructWorktreePath(repoRoot, worktreeConfig.worktree, branchName);
        const result = await $3`git worktree add -b ${branchName} ${worktreePath} HEAD`.nothrow();
        if (result.exitCode !== 0) {
          throw new Error(`git worktree add failed: ${result.stderr.toString()}`);
        }
        if (outputMode === "human") {
          console.log(`[speck] Created worktree at: ${worktreePath}`);
        }
        try {
          const featureTitle = options.featureDescription.charAt(0).toUpperCase() + options.featureDescription.slice(1);
          const relativeSpecDir = path4.join("specs", specId);
          const relativeSpecPath = path4.join(relativeSpecDir, "spec.md");
          writeWorktreeHandoff(worktreePath, {
            featureName: featureTitle,
            branchName,
            specPath: relativeSpecPath,
            context: options.featureDescription,
            status: "not-started"
          });
          if (outputMode === "human") {
            console.log(`[speck] Written handoff artifacts to worktree`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          warnings.push(`Failed to write handoff artifacts: ${errorMessage}`);
          if (outputMode === "human") {
            console.error(`[speck] Warning: Failed to write handoff artifacts: ${errorMessage}`);
          }
        }
        if (worktreeConfig.worktree.ide.autoLaunch && !options.noIde) {
          try {
            const ideResult = launchIDE({
              worktreePath,
              editor: worktreeConfig.worktree.ide.editor,
              newWindow: worktreeConfig.worktree.ide.newWindow
            });
            if (!ideResult.success) {
              warnings.push(`IDE launch failed: ${ideResult.error}`);
              if (outputMode === "human") {
                console.error(`[speck] Warning: IDE launch failed: ${ideResult.error}`);
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            warnings.push(`IDE launch error: ${errorMessage}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (outputMode === "human") {
          console.error(`[speck] Warning: Worktree creation failed, falling back to branch checkout: ${errorMessage}`);
        }
        warnings.push(`Worktree creation failed: ${errorMessage}`);
        worktreePath = undefined;
        useWorktree = false;
        try {
          await $3`git checkout -b ${branchName}`;
        } catch (checkoutError) {
          outputError2("GIT_BRANCH_FAILED", `Failed to create git branch: ${String(checkoutError)}`, outputMode, startTime);
          return 1 /* USER_ERROR */;
        }
      }
    } else {
      try {
        await $3`git checkout -b ${branchName}`;
      } catch (error) {
        outputError2("GIT_BRANCH_FAILED", `Failed to create git branch: ${String(error)}`, outputMode, startTime);
        return 1 /* USER_ERROR */;
      }
    }
  } else if (outputMode === "human") {
    console.error(`[specify] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
  }
  if (isSharedSpec && config.mode === "multi-repo") {
    const parentRepoRoot = config.speckRoot;
    let parentHasGit = false;
    try {
      const result = await $3`git -C ${parentRepoRoot} rev-parse --git-dir`.quiet();
      if (result.exitCode === 0) {
        parentHasGit = true;
      }
    } catch {}
    if (!parentHasGit) {
      console.error(`[specify] Notice: Parent directory is not a git repository: ${parentRepoRoot}`);
      console.error(`[specify] To enable branch coordination, initialize it as a git repo:`);
      console.error(`[specify]   cd ${parentRepoRoot} && git init`);
      console.error(`[specify] Skipping parent branch creation for now.`);
    } else {
      try {
        let branchExistsInParent = false;
        try {
          const checkResult = await $3`git -C ${parentRepoRoot} rev-parse --verify ${branchName}`.quiet();
          branchExistsInParent = checkResult.exitCode === 0;
        } catch {
          branchExistsInParent = false;
        }
        if (branchExistsInParent) {
          await $3`git -C ${parentRepoRoot} checkout ${branchName}`.quiet();
          if (!options.json) {
            console.log(`[specify] Checked out existing branch in parent repo: ${branchName}`);
          }
        } else {
          const createResult = await $3`git -C ${parentRepoRoot} checkout -b ${branchName}`.quiet();
          if (createResult.exitCode !== 0) {
            throw new Error(`git checkout -b failed with exit code ${String(createResult.exitCode)}: ${String(createResult.stderr)}`);
          }
          if (!options.json) {
            console.log(`[specify] Created branch in parent repo: ${branchName}`);
          }
        }
      } catch (error) {
        console.error(`[specify] Warning: Failed to create branch in parent repo: ${String(error)}`);
        console.error(`[specify] Parent repo: ${parentRepoRoot}`);
        console.error(`[specify] You may need to manually create the branch: git -C ${parentRepoRoot} checkout -b ${branchName}`);
      }
    }
  }
  let actualSpecsDir;
  if (isSharedSpec) {
    actualSpecsDir = specsDir;
  } else if (useWorktree && worktreePath) {
    actualSpecsDir = path4.join(worktreePath, "specs");
  } else {
    actualSpecsDir = specsDir;
  }
  const featureDir = path4.join(actualSpecsDir, specId);
  mkdirSync2(featureDir, { recursive: true });
  const template = path4.join(getTemplatesDir(), "spec-template.md");
  const specFile = path4.join(featureDir, "spec.md");
  if (existsSync6(template)) {
    copyFileSync(template, specFile);
  } else {
    await Bun.write(specFile, "");
  }
  if (options.sharedSpec && config.mode === "multi-repo") {
    const localFeatureDir = path4.join(repoRoot, "specs", specId);
    mkdirSync2(localFeatureDir, { recursive: true });
    const localSpecFile = path4.join(localFeatureDir, "spec.md");
    const relativePath = path4.relative(localFeatureDir, specFile);
    try {
      symlinkSync(relativePath, localSpecFile, "file");
    } catch (error) {
      const err = error;
      if (err.code !== "EEXIST") {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Warning: Failed to create symlink for spec.md: ${errorMessage}`);
        console.error(`  From: ${localSpecFile}`);
        console.error(`  To: ${specFile}`);
      }
    }
  }
  process.env.SPECIFY_FEATURE = branchName;
  const outputData = {
    BRANCH_NAME: branchName,
    SPEC_FILE: specFile,
    FEATURE_NUM: featureNum,
    WORKTREE_PATH: worktreePath
  };
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: true,
      data: outputData,
      command: "create-new-feature",
      startTime
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    const hookOutput = formatHookOutput({
      hookType: "UserPromptSubmit",
      context: `<!-- SPECK_FEATURE_CREATED
${JSON.stringify(outputData)}
-->`
    });
    console.log(JSON.stringify(hookOutput));
  } else {
    console.log(`BRANCH_NAME: ${branchName}`);
    console.log(`SPEC_FILE: ${specFile}`);
    console.log(`FEATURE_NUM: ${featureNum}`);
    if (worktreePath) {
      console.log(`WORKTREE_PATH: ${worktreePath}`);
    }
    console.log(`SPECIFY_FEATURE environment variable set to: ${branchName}`);
  }
  return 0 /* SUCCESS */;
}
var init_create_new_feature = __esm(async () => {
  init_cli_interface();
  init_paths();
  init_config();
  init_naming();
  init_handoff();
  init_ide_launch();
  init_branch_mapper();
  if (false) {}
});

// .speck/scripts/common/errors.ts
var GitError;
var init_errors2 = __esm(() => {
  GitError = class GitError extends Error {
    constructor(message) {
      super(message);
      this.name = "GitError";
    }
  };
});

// .speck/scripts/common/git-operations.ts
var {$: $4 } = globalThis.Bun;
async function getCurrentBranch2(repoRoot) {
  const result = await $4`git -C ${repoRoot} rev-parse --abbrev-ref HEAD`.quiet();
  if (result.exitCode !== 0) {
    throw new GitError("Failed to get current branch");
  }
  const branch = result.stdout.toString().trim();
  if (branch === "HEAD") {
    throw new GitError("Currently in detached HEAD state");
  }
  return branch;
}
var defaultBranchCache;
var init_git_operations = __esm(() => {
  init_errors2();
  defaultBranchCache = new Map;
});

// .speck/scripts/env-command.ts
var exports_env_command = {};
__export(exports_env_command, {
  main: () => main3
});
import fs3 from "fs/promises";
import path5 from "path";
async function main3(args = process.argv.slice(2)) {
  const startTime = Date.now();
  const options = {
    json: args.includes("--json"),
    hook: args.includes("--hook"),
    help: args.includes("--help")
  };
  const outputMode = detectOutputMode(options);
  if (options.help) {
    showHelp3();
    return 0;
  }
  try {
    await displayEnvironmentStatus(outputMode, startTime);
    return 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputError3("ENV_ERROR", errorMessage, outputMode, startTime);
    return 1;
  }
}
function outputError3(code, message, outputMode, startTime) {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message },
      command: "env",
      startTime
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    console.error(`ERROR: ${message}`);
  } else {
    console.error(`Error: ${message}`);
  }
}
function showHelp3() {
  console.log(`
Speck Environment Check

Usage:
  bun run .speck/scripts/env-command.ts [options]

Options:
  --help     Show this help message
  --json     Output as JSON (structured JSON envelope)
  --hook     Output hook-formatted response for Claude Code hooks

Description:
  Displays comprehensive environment information including:
  - Multi-repo configuration
  - Branch mapping status
  - Feature detection
  - System diagnostics
  `.trim());
}
async function displayEnvironmentStatus(outputMode, startTime) {
  const config = await detectSpeckRoot();
  const context = await getMultiRepoContext();
  if (outputMode === "json") {
    await displayJsonOutput(config, context, startTime);
  } else if (outputMode === "hook") {
    await displayHookOutput(config, context);
  } else {
    await displayTextOutput(config, context);
  }
}
async function displayTextOutput(config, context) {
  console.log(`=== Speck Environment Status ===
`);
  await displayMultiRepoContext(context);
  await displayBranchMappingStatus(config, context);
}
async function displayMultiRepoContext(context) {
  let currentBranch = "";
  try {
    currentBranch = await getCurrentBranch2(context.repoRoot);
  } catch {}
  if (context.mode === "single-repo") {
    console.log("Mode: Single-repo");
    console.log(`  Repo Root: ${context.repoRoot}`);
    console.log(`  Specs Directory: ${context.specsDir}`);
    if (currentBranch) {
      console.log(`  Current Branch: ${currentBranch}`);
    }
    console.log("");
  } else if (context.context === "root") {
    console.log("Mode: Multi-repo (Root)");
    console.log(`  Speck Root: ${context.speckRoot}`);
    console.log(`  Specs Directory: ${context.specsDir}`);
    if (currentBranch) {
      console.log(`  Current Branch: ${currentBranch}`);
    }
    console.log("");
  } else if (context.context === "child") {
    console.log("Mode: Multi-repo (Child Repository)");
    console.log(`  Context: Child repo (${context.childRepoName})`);
    console.log(`  Parent Spec: ${context.parentSpecId || "Unknown"}`);
    console.log(`  Repo Root: ${context.repoRoot}`);
    console.log(`  Speck Root: ${context.speckRoot}`);
    if (currentBranch) {
      console.log(`  Current Branch: ${currentBranch}`);
    }
    console.log("");
  }
}
async function displayBranchMappingStatus(config, context) {
  const childReposMap = await findChildReposWithNames(config.speckRoot);
  const hasChildRepos = childReposMap.size > 0;
  const branchesPath = path5.join(config.repoRoot, ".speck", "branches.json");
  let hasBranches = false;
  try {
    await fs3.access(branchesPath);
    hasBranches = true;
  } catch {}
  if (!hasBranches && !hasChildRepos) {
    console.log("Branch Mappings: None");
    console.log("  (Use non-standard branch names to auto-create mappings)");
    console.log("");
    return;
  }
  if (context.mode === "multi-repo" && context.context === "root" || context.mode === "single-repo" && hasChildRepos) {
    await displayAggregateStatus(config.speckRoot, config.repoRoot);
  } else {
    await displayLocalStatus(config.repoRoot);
  }
}
async function displayAggregateStatus(speckRoot, repoRoot) {
  console.log(`=== Branch Mappings (Multi-Repo) ===
`);
  const aggregated = await getAggregatedBranchStatus(speckRoot, repoRoot);
  if (aggregated.rootRepo) {
    displayRepoSummary("Root", aggregated.rootRepo);
  } else {
    console.log("Root Repository: (no branch mappings)");
    console.log("");
  }
  const childNames = Array.from(aggregated.childRepos.keys()).sort();
  for (const childName of childNames) {
    const summary = aggregated.childRepos.get(childName);
    displayRepoSummary(`Child: ${childName}`, summary);
  }
  if (childNames.length === 0 && !aggregated.rootRepo) {
    console.log("No branch mappings found in any repository.");
    console.log("");
  }
}
function displayRepoSummary(header, summary) {
  console.log(`${header}${summary.specId ? ` (${summary.specId})` : ""}:`);
  console.log(`  ${summary.branchCount} branch mapping(s)`);
  for (const branch of summary.branches) {
    console.log(`    - ${branch.name} \u2192 ${branch.specId}`);
  }
  console.log("");
}
async function displayLocalStatus(repoRoot) {
  console.log(`=== Branch Mappings ===
`);
  const mapping = await readBranches(repoRoot);
  if (mapping.branches.length === 0) {
    console.log("No branch mappings yet.");
    console.log("  (Non-standard branch names are auto-tracked when created)");
    console.log("");
    return;
  }
  let currentBranch = "";
  try {
    currentBranch = await getCurrentBranch2(repoRoot);
  } catch {}
  const specIds = Object.keys(mapping.specIndex);
  for (const specId of specIds) {
    console.log(`Spec: ${specId}`);
    const branchNames = mapping.specIndex[specId] || [];
    for (const branchName of branchNames) {
      const isCurrent = branchName === currentBranch;
      console.log(`  - ${branchName}${isCurrent ? " (current)" : ""}`);
    }
    console.log("");
  }
}
async function buildEnvOutputData(_config, context) {
  let currentBranch = "";
  try {
    currentBranch = await getCurrentBranch2(context.repoRoot);
  } catch {}
  const output = {
    mode: context.mode,
    context: context.context,
    speckRoot: context.speckRoot,
    repoRoot: context.repoRoot,
    specsDir: context.specsDir,
    currentBranch: currentBranch || undefined
  };
  if (context.context === "child") {
    output.childRepoName = context.childRepoName;
    output.parentSpecId = context.parentSpecId;
  }
  if (context.mode === "multi-repo" && context.context === "root") {
    const aggregated = await getAggregatedBranchStatus(context.speckRoot, context.repoRoot);
    output.branchStatus = {
      type: "aggregate",
      rootRepo: aggregated.rootRepo,
      childRepos: Object.fromEntries(aggregated.childRepos)
    };
  } else {
    try {
      const mapping = await readBranches(context.repoRoot);
      output.branchStatus = {
        type: "local",
        branches: mapping.branches,
        specIndex: mapping.specIndex
      };
    } catch {
      output.branchStatus = { type: "none" };
    }
  }
  return output;
}
async function displayJsonOutput(config, context, startTime) {
  const data = await buildEnvOutputData(config, context);
  const output = formatJsonOutput({
    success: true,
    data,
    command: "env",
    startTime
  });
  console.log(JSON.stringify(output));
}
async function displayHookOutput(config, context) {
  const data = await buildEnvOutputData(config, context);
  const hookOutput = formatHookOutput({
    hookType: "UserPromptSubmit",
    context: `<!-- SPECK_ENV_CONTEXT
${JSON.stringify(data)}
-->`
  });
  console.log(JSON.stringify(hookOutput));
}
var init_env_command = __esm(async () => {
  init_branch_mapper();
  init_git_operations();
  init_paths();
  if (false) {}
});

// .speck/scripts/commands/init.ts
var exports_init = {};
__export(exports_init, {
  main: () => main4
});
import { existsSync as existsSync7, mkdirSync as mkdirSync3, lstatSync, readlinkSync, unlinkSync, symlinkSync as symlinkSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { join as join4, dirname as dirname2, resolve as resolve2 } from "path";
import { homedir } from "os";
import { parseArgs as parseArgs3 } from "util";
import { createInterface } from "readline";
function findGitRoot() {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
      cwd: process.cwd()
    });
    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }
    return null;
  } catch {
    return null;
  }
}
function createSpeckDirectory(repoRoot) {
  const speckDir = join4(repoRoot, ".speck");
  try {
    const alreadyExists = existsSync7(speckDir);
    for (const subdir of SPECK_SUBDIRS) {
      const subdirPath = join4(speckDir, subdir);
      if (!existsSync7(subdirPath)) {
        mkdirSync3(subdirPath, { recursive: true });
      }
    }
    return { created: !alreadyExists, path: speckDir };
  } catch {
    return null;
  }
}
function getBootstrapPath() {
  const scriptPath = new URL(import.meta.url).pathname;
  const scriptDir = dirname2(scriptPath);
  const candidates = [
    resolve2(scriptDir, "../src/cli/bootstrap.sh"),
    resolve2(scriptDir, "../../../src/cli/bootstrap.sh"),
    resolve2(scriptDir, "../../src/cli/bootstrap.sh")
  ];
  for (const candidate of candidates) {
    if (existsSync7(candidate)) {
      return candidate;
    }
  }
  return candidates[0] ?? resolve2(scriptDir, "../src/cli/bootstrap.sh");
}
function isInPath() {
  const pathDirs = (process.env.PATH || "").split(":");
  return pathDirs.includes(LOCAL_BIN_DIR);
}
function getPathInstructions() {
  const shell = process.env.SHELL || "/bin/bash";
  const shellName = shell.includes("zsh") ? "zsh" : "bash";
  const rcFile = shellName === "zsh" ? "~/.zshrc" : "~/.bashrc";
  return `Add ~/.local/bin to your PATH by adding this line to ${rcFile}:

  export PATH="$HOME/.local/bin:$PATH"

Then reload your shell config:

  source ${rcFile}`;
}
function isValidSymlink(symlinkPath, expectedTarget) {
  try {
    if (!existsSync7(symlinkPath))
      return false;
    if (!lstatSync(symlinkPath).isSymbolicLink())
      return false;
    const target = readlinkSync(symlinkPath);
    return target === expectedTarget;
  } catch {
    return false;
  }
}
function isRegularFile(path6) {
  try {
    return existsSync7(path6) && lstatSync(path6).isFile() && !lstatSync(path6).isSymbolicLink();
  } catch {
    return false;
  }
}
async function promptYesNo(question, defaultYes) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const hint = defaultYes ? "(Y/n)" : "(y/N)";
  return new Promise((resolve3) => {
    rl.question(`${question} ${hint} `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (normalized === "") {
        resolve3(defaultYes);
      } else {
        resolve3(normalized === "y" || normalized === "yes");
      }
    });
  });
}
async function promptIDE(defaultEditor) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const options = IDE_EDITORS.join("/");
  return new Promise((resolve3) => {
    rl.question(`Which IDE editor? (${options}) [${defaultEditor}] `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (normalized === "" || !IDE_EDITORS.includes(normalized)) {
        resolve3(defaultEditor);
      } else {
        resolve3(normalized);
      }
    });
  });
}
async function createSpeckConfig(speckDir, isInteractive, options) {
  const configPath = join4(speckDir, "config.json");
  if (existsSync7(configPath)) {
    return false;
  }
  const config = JSON.parse(JSON.stringify(DEFAULT_SPECK_CONFIG));
  const hasConfigFlags = options.worktreeEnabled !== undefined || options.ideAutolaunch !== undefined || options.ideEditor !== undefined;
  if (hasConfigFlags) {
    if (options.worktreeEnabled !== undefined) {
      config.worktree.enabled = options.worktreeEnabled;
    }
    if (options.ideAutolaunch !== undefined) {
      config.worktree.ide.autoLaunch = options.ideAutolaunch;
    }
    if (options.ideEditor !== undefined && IDE_EDITORS.includes(options.ideEditor)) {
      config.worktree.ide.editor = options.ideEditor;
    }
  } else if (isInteractive) {
    console.log(`
\uD83D\uDCCB Configure Speck preferences:
`);
    config.worktree.enabled = await promptYesNo("Enable worktree mode? (creates isolated directories for each feature)", true);
    config.worktree.ide.autoLaunch = await promptYesNo("Auto-launch IDE when creating features?", false);
    if (config.worktree.ide.autoLaunch) {
      config.worktree.ide.editor = await promptIDE("vscode");
    }
    console.log("");
  }
  try {
    writeFileSync2(configPath, JSON.stringify(config, null, 2) + `
`);
    return true;
  } catch {
    return false;
  }
}
function configurePluginPermissions(repoRoot) {
  const settingsPath = join4(repoRoot, ".claude", "settings.local.json");
  try {
    const claudeDir = join4(repoRoot, ".claude");
    if (!existsSync7(claudeDir)) {
      mkdirSync3(claudeDir, { recursive: true });
    }
    let settings = {};
    if (existsSync7(settingsPath)) {
      const content = readFileSync3(settingsPath, "utf-8");
      settings = JSON.parse(content);
    }
    if (!settings.permissions) {
      settings.permissions = {};
    }
    if (!settings.permissions.allow) {
      settings.permissions.allow = [];
    }
    let addedCount = 0;
    for (const permission of DEFAULT_ALLOWED_PERMISSIONS) {
      if (!settings.permissions.allow.includes(permission)) {
        settings.permissions.allow.push(permission);
        addedCount++;
      }
    }
    if (addedCount > 0) {
      writeFileSync2(settingsPath, JSON.stringify(settings, null, 2) + `
`);
    }
    return addedCount;
  } catch {
    return 0;
  }
}
async function runInit(options) {
  const bootstrapPath = getBootstrapPath();
  const inPath = isInPath();
  const pathInstructions = inPath ? undefined : getPathInstructions();
  const gitRoot = findGitRoot();
  if (!gitRoot) {
    return {
      success: false,
      symlinkPath: SYMLINK_PATH,
      targetPath: bootstrapPath,
      inPath,
      message: `Error: Not in a git repository.

Speck requires a git repository to function. Please either:
  1. Initialize a git repository: git init
  2. Navigate to an existing git repository

Then run 'speck init' again.`,
      pathInstructions
    };
  }
  let speckDirCreated = false;
  let speckDirPath;
  let needsConstitution = false;
  let configCreated = false;
  const speckResult = createSpeckDirectory(gitRoot);
  if (speckResult) {
    speckDirCreated = speckResult.created;
    speckDirPath = speckResult.path;
    const constitutionPath = join4(speckResult.path, "memory", "constitution.md");
    needsConstitution = !existsSync7(constitutionPath);
    const isInteractive = !options.json && process.stdin.isTTY;
    configCreated = await createSpeckConfig(speckResult.path, isInteractive, options);
  }
  const permissionsConfigured = configurePluginPermissions(gitRoot);
  if (!existsSync7(bootstrapPath)) {
    return {
      success: false,
      symlinkPath: SYMLINK_PATH,
      targetPath: bootstrapPath,
      inPath,
      message: `Error: Bootstrap script not found at ${bootstrapPath}`,
      pathInstructions,
      speckDirCreated,
      speckDirPath
    };
  }
  if (isValidSymlink(SYMLINK_PATH, bootstrapPath)) {
    if (!options.force) {
      const alreadyInstalledMessages = [];
      if (speckDirCreated) {
        alreadyInstalledMessages.push(`\u2713 Created .speck/ directory`);
      }
      if (configCreated) {
        alreadyInstalledMessages.push(`\u2713 Created .speck/config.json with your preferences`);
      }
      alreadyInstalledMessages.push(`\u2713 Speck CLI already installed at ${SYMLINK_PATH}`);
      if (permissionsConfigured > 0) {
        alreadyInstalledMessages.push(`\u2713 Added ${permissionsConfigured} permission(s) to .claude/settings.local.json`);
      }
      return {
        success: true,
        symlinkPath: SYMLINK_PATH,
        targetPath: bootstrapPath,
        inPath,
        alreadyInstalled: true,
        message: alreadyInstalledMessages.join(`
`),
        pathInstructions,
        speckDirCreated,
        speckDirPath,
        configCreated,
        permissionsConfigured,
        nextStep: needsConstitution ? "Run /speck:constitution to set up your project principles." : undefined
      };
    }
    unlinkSync(SYMLINK_PATH);
  }
  if (existsSync7(SYMLINK_PATH)) {
    if (isRegularFile(SYMLINK_PATH)) {
      if (!options.force) {
        return {
          success: false,
          symlinkPath: SYMLINK_PATH,
          targetPath: bootstrapPath,
          inPath,
          message: `Error: Regular file exists at ${SYMLINK_PATH}. Use --force to replace.`,
          pathInstructions,
          speckDirCreated,
          speckDirPath
        };
      }
    }
    unlinkSync(SYMLINK_PATH);
  }
  if (!existsSync7(LOCAL_BIN_DIR)) {
    mkdirSync3(LOCAL_BIN_DIR, { recursive: true });
  }
  try {
    symlinkSync2(bootstrapPath, SYMLINK_PATH);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      symlinkPath: SYMLINK_PATH,
      targetPath: bootstrapPath,
      inPath,
      message: `Error creating symlink: ${errMsg}`,
      pathInstructions,
      speckDirCreated,
      speckDirPath
    };
  }
  const messages = [];
  if (speckDirCreated) {
    messages.push(`\u2713 Created .speck/ directory at ${speckDirPath}`);
  } else if (speckDirPath) {
    messages.push(`\u2713 .speck/ directory exists at ${speckDirPath}`);
  }
  if (configCreated) {
    messages.push(`\u2713 Created .speck/config.json with your preferences`);
  }
  messages.push(`\u2713 Speck CLI installed to ${SYMLINK_PATH}`);
  if (permissionsConfigured > 0) {
    messages.push(`\u2713 Added ${permissionsConfigured} permission(s) to .claude/settings.local.json`);
  }
  return {
    success: true,
    symlinkPath: SYMLINK_PATH,
    targetPath: bootstrapPath,
    inPath,
    message: messages.join(`
`),
    pathInstructions,
    speckDirCreated,
    speckDirPath,
    configCreated,
    permissionsConfigured,
    nextStep: needsConstitution ? "Run /speck:constitution to set up your project principles." : undefined
  };
}
function formatOutput(result, options) {
  if (options.json) {
    return JSON.stringify({
      ok: result.success,
      result: {
        symlinkPath: result.symlinkPath,
        targetPath: result.targetPath,
        inPath: result.inPath,
        alreadyInstalled: result.alreadyInstalled,
        speckDirCreated: result.speckDirCreated,
        speckDirPath: result.speckDirPath,
        configCreated: result.configCreated,
        permissionsConfigured: result.permissionsConfigured
      },
      message: result.message,
      pathInstructions: result.pathInstructions,
      nextStep: result.nextStep
    }, null, 2);
  }
  let output = result.message;
  if (result.success && !result.inPath && result.pathInstructions) {
    output += `

\u26A0\uFE0F  Warning: ~/.local/bin is not in your PATH

${result.pathInstructions}`;
  }
  if (result.success && result.nextStep) {
    output += `

\uD83D\uDCCB Next step: ${result.nextStep}`;
  }
  return output;
}
async function main4(args) {
  const { values } = parseArgs3({
    args,
    options: {
      force: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      "worktree-enabled": { type: "string" },
      "ide-autolaunch": { type: "string" },
      "ide-editor": { type: "string" }
    },
    allowPositionals: true
  });
  const parseBoolean = (val) => {
    if (val === undefined)
      return;
    return val.toLowerCase() === "true" || val === "1" || val.toLowerCase() === "yes";
  };
  const options = {
    force: values.force ?? false,
    json: values.json ?? false,
    worktreeEnabled: parseBoolean(values["worktree-enabled"]),
    ideAutolaunch: parseBoolean(values["ide-autolaunch"]),
    ideEditor: values["ide-editor"]
  };
  const result = await runInit(options);
  console.log(formatOutput(result, options));
  return result.success ? 0 : 1;
}
var LOCAL_BIN_DIR, SYMLINK_PATH, IDE_EDITORS, SPECK_SUBDIRS, DEFAULT_ALLOWED_PERMISSIONS;
var init_init = __esm(() => {
  init_config_schema();
  LOCAL_BIN_DIR = join4(homedir(), ".local", "bin");
  SYMLINK_PATH = join4(LOCAL_BIN_DIR, "speck");
  IDE_EDITORS = ["vscode", "cursor", "webstorm", "idea", "pycharm"];
  SPECK_SUBDIRS = [
    "memory",
    "scripts"
  ];
  DEFAULT_ALLOWED_PERMISSIONS = [
    "Read(~/.claude/plugins/marketplaces/speck-market/speck/templates/**)",
    "Bash(git diff:*)",
    "Bash(git fetch:*)",
    "Bash(git log:*)",
    "Bash(git ls-remote:*)",
    "Bash(git ls:*)",
    "Bash(git status)"
  ];
  if (false) {}
});

// .speck/scripts/worktree/cli-launch-ide.ts
var exports_cli_launch_ide = {};
__export(exports_cli_launch_ide, {
  executeLaunchIDECommand: () => executeLaunchIDECommand
});
async function executeLaunchIDECommand(options) {
  const { worktreePath, repoPath = ".", json = false } = options;
  try {
    const config = await loadConfig(repoPath);
    if (!config.worktree?.ide?.autoLaunch) {
      if (json) {
        console.log(JSON.stringify({
          success: true,
          skipped: true,
          message: "IDE auto-launch is disabled in configuration"
        }));
      }
      return;
    }
    const result = launchIDE({
      worktreePath,
      editor: config.worktree.ide.editor,
      newWindow: config.worktree.ide.newWindow
    });
    if (json) {
      console.log(JSON.stringify({
        success: result.success,
        editor: result.editor,
        command: result.command,
        error: result.error
      }));
    } else {
      if (result.success) {
        console.log(`\u2713 Launched ${result.editor} at ${worktreePath}`);
      } else {
        console.error(`\u26A0 IDE launch failed: ${result.error}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (json) {
      console.log(JSON.stringify({
        success: false,
        error: errorMessage
      }));
    } else {
      console.error(`\u26A0 Error: ${errorMessage}`);
    }
  }
}
var init_cli_launch_ide = __esm(() => {
  init_config();
  init_ide_launch();
});

// .speck/scripts/setup-plan.ts
var exports_setup_plan = {};
__export(exports_setup_plan, {
  main: () => main5
});
import { existsSync as existsSync8, mkdirSync as mkdirSync4, copyFileSync as copyFileSync2 } from "fs";
import path6 from "path";
var {$: $5 } = globalThis.Bun;
function parseArgs4(args) {
  return {
    json: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h")
  };
}
function showHelp4() {
  console.log(`Usage: setup-plan [--json]
  --json    Output results in JSON format
  --help    Show this help message`);
}
async function main5(args) {
  const options = parseArgs4(args);
  if (options.help) {
    showHelp4();
    return 0 /* SUCCESS */;
  }
  const paths = await getFeaturePaths();
  const hasGitRepo = paths.HAS_GIT === "true";
  if (!await checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo, paths.REPO_ROOT)) {
    return 1 /* USER_ERROR */;
  }
  mkdirSync4(paths.FEATURE_DIR, { recursive: true });
  const branchName = paths.CURRENT_BRANCH;
  const config = await detectSpeckRoot();
  if (hasGitRepo) {
    try {
      const currentBranch = await $5`git rev-parse --abbrev-ref HEAD`.quiet();
      const currentBranchName = currentBranch.text().trim();
      if (currentBranchName !== branchName) {
        try {
          await $5`git checkout ${branchName}`.quiet();
          console.log(`[specify] Checked out branch: ${branchName}`);
        } catch {
          await $5`git checkout -b ${branchName}`.quiet();
          console.log(`[specify] Created and checked out branch: ${branchName}`);
        }
      }
    } catch (error) {
      console.error(`[specify] Warning: Could not manage git branch: ${String(error)}`);
    }
    const specFile = paths.FEATURE_SPEC;
    const isSharedSpec = config.mode === "multi-repo" && existsSync8(specFile);
    if (isSharedSpec) {
      const parentRepoRoot = config.speckRoot;
      let parentHasGit = false;
      try {
        const result = await $5`git -C ${parentRepoRoot} rev-parse --git-dir`.quiet();
        if (result.exitCode === 0) {
          parentHasGit = true;
        }
      } catch {}
      if (parentHasGit) {
        try {
          const parentBranch = await $5`git -C ${parentRepoRoot} rev-parse --abbrev-ref HEAD`.quiet();
          const parentBranchName = parentBranch.text().trim();
          if (parentBranchName !== branchName) {
            console.error(`[specify] Warning: Parent repo branch mismatch!`);
            console.error(`[specify]   Child repo (current): ${branchName}`);
            console.error(`[specify]   Parent repo: ${parentBranchName}`);
            console.error(`[specify]   Parent location: ${parentRepoRoot}`);
            console.error(`[specify] Consider checking out matching branch in parent:`);
            console.error(`[specify]   git -C ${parentRepoRoot} checkout ${branchName}`);
          }
        } catch (error) {
          console.error(`[specify] Warning: Could not check parent repo branch: ${String(error)}`);
        }
      }
    }
  }
  const template = path6.join(getTemplatesDir(), "plan-template.md");
  if (existsSync8(template)) {
    const implPlanDir = path6.dirname(paths.IMPL_PLAN);
    mkdirSync4(implPlanDir, { recursive: true });
    copyFileSync2(template, paths.IMPL_PLAN);
    console.log(`Copied plan template to ${paths.IMPL_PLAN}`);
  } else {
    console.log(`Warning: Plan template not found at ${template}`);
    await Bun.write(paths.IMPL_PLAN, "");
  }
  if (options.json) {
    const output = {
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      SPECS_DIR: paths.FEATURE_DIR,
      BRANCH: paths.CURRENT_BRANCH,
      HAS_GIT: paths.HAS_GIT
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`FEATURE_SPEC: ${paths.FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${paths.IMPL_PLAN}`);
    console.log(`SPECS_DIR: ${paths.FEATURE_DIR}`);
    console.log(`BRANCH: ${paths.CURRENT_BRANCH}`);
    console.log(`HAS_GIT: ${paths.HAS_GIT}`);
  }
  return 0 /* SUCCESS */;
}
var init_setup_plan = __esm(async () => {
  init_paths();
  init_cli_interface();
  if (false) {}
});

// .speck/scripts/update-agent-context.ts
var exports_update_agent_context = {};
__export(exports_update_agent_context, {
  main: () => main6
});
import { existsSync as existsSync9, readFileSync as readFileSync4, writeFileSync as writeFileSync3 } from "fs";
import path7 from "path";
function extractPlanField(fieldPattern, planContent) {
  const regex = new RegExp(`^\\*\\*${fieldPattern}\\*\\*: (.+)$`, "m");
  const match = planContent.match(regex);
  if (!match || !match[1])
    return "";
  const value = match[1].trim();
  if (value === "NEEDS CLARIFICATION" || value === "N/A") {
    return "";
  }
  return value;
}
function parsePlanData(planFile) {
  if (!existsSync9(planFile)) {
    console.error(`ERROR: Plan file not found: ${planFile}`);
    process.exit(1 /* USER_ERROR */);
  }
  const content = readFileSync4(planFile, "utf-8");
  const lang = extractPlanField("Language/Version", content);
  const framework = extractPlanField("Primary Dependencies", content);
  const db = extractPlanField("Storage", content);
  const projectType = extractPlanField("Project Type", content);
  if (lang) {
    console.log(`INFO: Found language: ${lang}`);
  } else {
    console.error("WARNING: No language information found in plan");
  }
  if (framework) {
    console.log(`INFO: Found framework: ${framework}`);
  }
  if (db && db !== "N/A") {
    console.log(`INFO: Found database: ${db}`);
  }
  if (projectType) {
    console.log(`INFO: Found project type: ${projectType}`);
  }
  return { lang, framework, db, projectType };
}
function formatTechnologyStack(lang, framework) {
  const parts = [];
  if (lang && lang !== "NEEDS CLARIFICATION") {
    parts.push(lang);
  }
  if (framework && framework !== "NEEDS CLARIFICATION" && framework !== "N/A") {
    parts.push(framework);
  }
  return parts.join(" + ");
}
function getProjectStructure(projectType) {
  if (projectType?.toLowerCase().includes("web")) {
    return `backend/
frontend/
tests/`;
  }
  return `src/
tests/`;
}
function getCommandsForLanguage(lang) {
  if (lang?.includes("Python")) {
    return "cd src && pytest && ruff check .";
  } else if (lang?.includes("Rust")) {
    return "cargo test && cargo clippy";
  } else if (lang?.includes("JavaScript") || lang?.includes("TypeScript")) {
    return "npm test && npm run lint";
  }
  return `# Add commands for ${lang ?? "Unknown"}`;
}
function getLanguageConventions(lang) {
  return `${lang ?? "Unknown"}: Follow standard conventions`;
}
function createNewClaudeFile(targetFile, templateFile, projectName, currentDate, currentBranch, lang, framework, projectType) {
  if (!existsSync9(templateFile)) {
    console.error(`ERROR: Template not found at ${templateFile}`);
    process.exit(1 /* USER_ERROR */);
  }
  console.log("INFO: Creating new CLAUDE.md from template...");
  let content = readFileSync4(templateFile, "utf-8");
  let techStack = "";
  let recentChange = "";
  if (lang && framework) {
    techStack = `- ${lang} + ${framework} (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added ${lang} + ${framework}`;
  } else if (lang) {
    techStack = `- ${lang} (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added ${lang}`;
  } else if (framework) {
    techStack = `- ${framework} (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added ${framework}`;
  } else {
    techStack = `- (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added`;
  }
  const projectStructure = getProjectStructure(projectType);
  const commands = getCommandsForLanguage(lang);
  const languageConventions = getLanguageConventions(lang);
  content = content.replace(/\[PROJECT NAME\]/g, projectName);
  content = content.replace(/\[DATE\]/g, currentDate);
  content = content.replace(/\[EXTRACTED FROM ALL PLAN\.MD FILES\]/g, techStack);
  content = content.replace(/\[ACTUAL STRUCTURE FROM PLANS\]/g, projectStructure);
  content = content.replace(/\[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES\]/g, commands);
  content = content.replace(/\[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE\]/g, languageConventions);
  content = content.replace(/\[LAST 3 FEATURES AND WHAT THEY ADDED\]/g, recentChange);
  writeFileSync3(targetFile, content, "utf-8");
  console.log(`\u2713 Created CLAUDE.md`);
}
function updateExistingClaudeFile(targetFile, currentDate, currentBranch, lang, framework, db) {
  console.log("INFO: Updating existing CLAUDE.md...");
  const content = readFileSync4(targetFile, "utf-8");
  const lines = content.split(`
`);
  const output = [];
  const techStack = formatTechnologyStack(lang, framework);
  const newTechEntries = [];
  let newChangeEntry = "";
  if (techStack && !content.includes(techStack)) {
    newTechEntries.push(`- ${techStack} (${currentBranch})`);
  }
  if (db && db !== "N/A" && db !== "NEEDS CLARIFICATION" && !content.includes(db)) {
    newTechEntries.push(`- ${db} (${currentBranch})`);
  }
  if (techStack) {
    newChangeEntry = `- ${currentBranch}: Added ${techStack}`;
  } else if (db && db !== "N/A" && db !== "NEEDS CLARIFICATION") {
    newChangeEntry = `- ${currentBranch}: Added ${db}`;
  }
  let inTechSection = false;
  let inChangesSection = false;
  let techEntriesAdded = false;
  let existingChangesCount = 0;
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined)
      continue;
    if (line === "## Active Technologies") {
      output.push(line);
      inTechSection = true;
      continue;
    } else if (inTechSection && line.match(/^##\s/)) {
      if (!techEntriesAdded && newTechEntries.length > 0) {
        output.push(...newTechEntries);
        techEntriesAdded = true;
      }
      output.push(line);
      inTechSection = false;
      continue;
    } else if (inTechSection && line === "") {
      if (!techEntriesAdded && newTechEntries.length > 0) {
        output.push(...newTechEntries);
        techEntriesAdded = true;
      }
      output.push(line);
      continue;
    }
    if (line === "## Recent Changes") {
      output.push(line);
      if (newChangeEntry) {
        output.push(newChangeEntry);
      }
      inChangesSection = true;
      continue;
    } else if (inChangesSection && line.match(/^##\s/)) {
      output.push(line);
      inChangesSection = false;
      continue;
    } else if (inChangesSection && line.startsWith("- ")) {
      if (existingChangesCount < 2) {
        output.push(line);
        existingChangesCount++;
      }
      continue;
    }
    if (line.match(/\*\*Last updated\*\*:.*\d{4}-\d{2}-\d{2}/)) {
      output.push(line.replace(/\d{4}-\d{2}-\d{2}/, currentDate));
    } else {
      output.push(line);
    }
  }
  writeFileSync3(targetFile, output.join(`
`), "utf-8");
  console.log(`\u2713 Updated CLAUDE.md`);
}
function updateClaudeFile(repoRoot, currentBranch, lang, framework, db, projectType) {
  const targetFile = path7.join(repoRoot, "CLAUDE.md");
  console.log(`INFO: Updating CLAUDE.md: ${targetFile}`);
  const projectName = path7.basename(repoRoot);
  const currentDate = new Date().toISOString().split("T")[0];
  const templateFile = path7.join(getTemplatesDir(), "agent-file-template.md");
  if (!existsSync9(targetFile)) {
    createNewClaudeFile(targetFile, templateFile, projectName, currentDate, currentBranch, lang, framework, projectType);
  } else {
    updateExistingClaudeFile(targetFile, currentDate, currentBranch, lang, framework, db);
  }
}
function printSummary(lang, framework, db) {
  console.log("");
  console.log("INFO: Summary of changes:");
  if (lang) {
    console.log(`  - Added language: ${lang}`);
  }
  if (framework) {
    console.log(`  - Added framework: ${framework}`);
  }
  if (db && db !== "N/A") {
    console.log(`  - Added database: ${db}`);
  }
}
async function main6(_args) {
  const paths = await getFeaturePaths();
  if (!paths.CURRENT_BRANCH) {
    console.error("ERROR: Unable to determine current feature");
    if (paths.HAS_GIT === "true") {
      console.log("INFO: Make sure you're on a feature branch");
    } else {
      console.log("INFO: Set SPECIFY_FEATURE environment variable or create a feature first");
    }
    return 1 /* USER_ERROR */;
  }
  if (!existsSync9(paths.IMPL_PLAN)) {
    console.error(`ERROR: No plan.md found at ${paths.IMPL_PLAN}`);
    console.log("INFO: Make sure you're working on a feature with a corresponding spec directory");
    if (paths.HAS_GIT !== "true") {
      console.log("INFO: Use: export SPECIFY_FEATURE=your-feature-name or create a new feature first");
    }
    return 1 /* USER_ERROR */;
  }
  console.log(`INFO: === Updating CLAUDE.md for feature ${paths.CURRENT_BRANCH} ===`);
  const planData = parsePlanData(paths.IMPL_PLAN);
  updateClaudeFile(paths.REPO_ROOT, paths.CURRENT_BRANCH, planData.lang, planData.framework, planData.db, planData.projectType);
  printSummary(planData.lang, planData.framework, planData.db);
  console.log("");
  console.log("\u2713 CLAUDE.md update completed successfully");
  return 0 /* SUCCESS */;
}
var init_update_agent_context = __esm(async () => {
  init_paths();
  init_cli_interface();
  if (false) {}
});

// node_modules/commander/esm.mjs
var import__ = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Command,
  Argument,
  Option,
  Help
} = import__.default;

// src/cli/index.ts
import { readFileSync as readFileSync5, existsSync as existsSync10 } from "fs";
import { join as join5, dirname as dirname3 } from "path";
var lazyCheckPrerequisites = () => init_check_prerequisites().then(() => exports_check_prerequisites);
var lazyCreateNewFeature = () => init_create_new_feature().then(() => exports_create_new_feature);
var lazyEnvCommand = () => init_env_command().then(() => exports_env_command);
var lazyInitCommand = () => Promise.resolve().then(() => (init_init(), exports_init));
var lazyLaunchIDECommand = () => Promise.resolve().then(() => (init_cli_launch_ide(), exports_cli_launch_ide));
var lazySetupPlan = () => init_setup_plan().then(() => exports_setup_plan);
var lazyUpdateAgentContext = () => init_update_agent_context().then(() => exports_update_agent_context);
var globalState = {
  outputMode: "human"
};
function getVersion() {
  try {
    const possiblePaths = [
      join5(dirname3(import.meta.path), "../../package.json"),
      join5(dirname3(import.meta.path), "../../../package.json"),
      join5(process.cwd(), "package.json")
    ];
    for (const pkgPath of possiblePaths) {
      if (existsSync10(pkgPath)) {
        const pkg = JSON.parse(readFileSync5(pkgPath, "utf-8"));
        if (pkg.version) {
          return pkg.version;
        }
      }
    }
    return "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function processGlobalOptions(options) {
  if (options.hook) {
    globalState.outputMode = "hook";
  } else if (options.json) {
    globalState.outputMode = "json";
  } else {
    globalState.outputMode = "human";
  }
}
function buildSubcommandArgs(args, options, rawArgs) {
  const result = [...args];
  if (options.json || globalState.outputMode === "json") {
    result.push("--json");
  }
  for (const [key, value] of Object.entries(options)) {
    if (key === "json" || key === "hook")
      continue;
    if (key === "worktree") {
      const hasWorktreeFlag = rawArgs?.some((arg) => arg === "--worktree" || arg === "--no-worktree");
      if (hasWorktreeFlag) {
        if (value === true) {
          result.push("--worktree");
        } else if (value === false) {
          result.push("--no-worktree");
        }
      }
      continue;
    }
    if (key === "ide") {
      if (value === false) {
        result.push("--no-ide");
      }
      continue;
    }
    if (value === true) {
      result.push(`--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`);
    } else if (value !== false && value !== undefined) {
      result.push(`--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, String(value));
    }
  }
  return result;
}
function createProgram() {
  const program2 = new Command;
  program2.name("speck").description("Speck CLI - Claude Code-Optimized Specification Framework").version(getVersion(), "-V, --version", "Show version number").option("--json", "Output structured JSON for LLM parsing").option("--hook", "Output hook-formatted response for Claude Code hooks").hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    processGlobalOptions(opts);
  });
  program2.command("init").description("Install Speck CLI globally via symlink to ~/.local/bin/speck").option("--json", "Output in JSON format").option("--force", "Force reinstall even if symlink exists").option("--worktree-enabled <bool>", "Enable worktree mode (true/false)").option("--ide-autolaunch <bool>", "Auto-launch IDE when creating features (true/false)").option("--ide-editor <editor>", "IDE editor choice (vscode/cursor/webstorm/idea/pycharm)").action(async (options) => {
    const module = await lazyInitCommand();
    const args = buildSubcommandArgs([], options);
    const exitCode = await module.main(args);
    process.exit(exitCode);
  });
  program2.command("create-new-feature").description("Create a new feature specification directory").argument("<description>", "Feature description").option("--json", "Output in JSON format").option("--short-name <name>", "Custom short name for the branch").option("--number <n>", "Specify branch number manually", parseInt).option("--shared-spec", "Create spec at speckRoot (multi-repo shared spec)").option("--local-spec", "Create spec locally in child repo").option("--worktree", "Create a worktree for the feature branch (overrides config)").option("--no-worktree", "Skip worktree creation (overrides config)").option("--no-ide", "Skip IDE auto-launch").action(async (description, options, command) => {
    const module = await lazyCreateNewFeature();
    const rawArgs = command.args.concat(process.argv.slice(3));
    const args = [description, ...buildSubcommandArgs([], options, rawArgs)];
    const exitCode = await module.main(args);
    process.exit(exitCode);
  });
  program2.command("check-prerequisites").description("Validate feature directory structure and prerequisites").option("--json", "Output in JSON format").option("--hook", "Output hook-formatted response").option("--require-tasks", "Require tasks.md to exist").option("--include-tasks", "Include tasks.md in available docs list").option("--paths-only", "Only output path variables").option("--skip-feature-check", "Skip feature directory validation").option("--skip-plan-check", "Skip plan.md validation").option("--include-file-contents", "Include file contents in output").option("--include-workflow-mode", "Include workflow mode in output").option("--validate-code-quality", "Validate TypeScript typecheck and ESLint").action(async (options) => {
    const module = await lazyCheckPrerequisites();
    const args = buildSubcommandArgs([], options);
    const exitCode = await module.main(args);
    process.exit(exitCode);
  });
  program2.command("env").description("Show Speck environment and configuration info").option("--json", "Output as JSON").option("--hook", "Output hook-formatted response").action(async (options) => {
    const module = await lazyEnvCommand();
    const args = buildSubcommandArgs([], options);
    const exitCode = await module.main(args);
    process.exit(exitCode);
  });
  program2.command("launch-ide").description("Launch IDE in worktree (for deferred IDE launch)").requiredOption("--worktree-path <path>", "Path to worktree directory").option("--repo-path <path>", "Path to repository root for config (default: .)").option("--json", "Output as JSON").action(async (options) => {
    const module = await lazyLaunchIDECommand();
    await module.executeLaunchIDECommand({
      worktreePath: options.worktreePath,
      repoPath: options.repoPath || ".",
      json: options.json === true
    });
  });
  program2.command("setup-plan").description("Set up plan.md for the current feature").option("--json", "Output in JSON format").action(async (options) => {
    const module = await lazySetupPlan();
    const args = buildSubcommandArgs([], options);
    const exitCode = await module.main(args);
    process.exit(exitCode);
  });
  program2.command("update-agent-context").description("Update CLAUDE.md context file with technology stack from current feature").option("--json", "Output in JSON format").action(async (options) => {
    const module = await lazyUpdateAgentContext();
    const args = buildSubcommandArgs([], options);
    const exitCode = await module.main(args);
    process.exit(exitCode);
  });
  program2.command("help [command]").description("Display help for command").action((cmdName) => {
    if (cmdName) {
      const cmd = program2.commands.find((c) => c.name() === cmdName);
      if (cmd) {
        cmd.help();
      } else {
        console.error(`Unknown command: ${cmdName}`);
        process.exit(1);
      }
    } else {
      program2.help();
    }
  });
  program2.on("command:*", (operands) => {
    console.error(`error: unknown command '${operands[0]}'`);
    console.error("Run 'speck --help' to see available commands.");
    process.exit(1);
  });
  return program2;
}
async function main7() {
  const program2 = createProgram();
  if (process.argv.length === 2) {
    program2.help();
  }
  await program2.parseAsync(process.argv);
}
main7().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Fatal error:", message);
  process.exit(1);
});

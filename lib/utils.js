import { expandHomePath, homeDir } from "./path-utils.js";
import fuzzysort from "fuzzysort";
import fs from "fs-extra";
import path from "path";
import alfy from "alfy";

const PROJECTS_FILE = "projects.json";
const PROJECTS_HISTORY_FILE = "state.vscdb";

/**
 * File exists
 *
 * @private
 * @param {string} file File path
 * @returns {boolean}
 */
function fileExists(file) {
  try {
    fs.statSync(file);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Project title
 *
 * @public
 * @param {object} project Project object
 * @returns {string}
 */
function getTitle({ name, tags } = {}) {
  if (!tags) return name;

  return "".concat(name, " » ", tags);
}

/**
 * Project subtitle
 *
 * @public
 * @param {object} project Project object
 * @returns {string}
 */
function getSubtitle(project) {
  return expandHomePath(project.rootPath);
}

/**
 * Project icon
 *
 * @public
 * @param {object} project Project object
 * @returns {string} Icon file
 */
function getIcon(project) {
  const iconPaths = project.paths.map((projectPath) =>
    path.join(projectPath, "icon.png")
  );

  return (
    Object.keys(iconPaths)
      .map((key) => iconPaths[key])
      .find(fileExists) || "icon.png"
  );
}

/**
 * Get atom arguments
 *
 * @public
 * @param {object} project Project object
 * @param {array} args Extra commandline arguments
 * @param {string} app Command to open project paths with
 * @returns {string}
 */
function getArgument(project) {
  return expandHomePath(project.rootPath);
}

/**
 * Filter projects
 *
 * @public
 * @param {Object[]} list List of data objects
 * @param {String} input Search input
 * @param {Array} keys Props to search
 * @returns {Array} Filtered list
 */
function inputMatchesData(list, input, keys) {
  if (!input || [list, keys].filter(Array.isArray).length !== 2) return list;

  return fuzzysort
    .go(input, list, {
      limit: 100,
      threshold: -10000,
      keys,
    })
    .map((result) => result.obj);
}

/**
 * Parse projects
 *
 * @public
 * @param {Object[]} data Collection with projects
 * @returns {Object[]}
 */
function parseProjects(data = {}) {
  return data
    .filter(Boolean)
    .filter((project) => project.name && project.rootPath)
    .reduce((parsedProjects, project) => [...parsedProjects, project], [])
    .map((project) => ({
      ...project,
      tag: Array.isArray(project.tags) ? project.tags.join(",") : "",
    }));
}

async function fetch(url, options = {}) {
  const rawKey = url + JSON.stringify(options);
  const key = rawKey.replace(/\./g, "\\.");
  const cachedResponse = alfy.cache.get(key, { ignoreMaxAge: true });

  if (cachedResponse && !alfy.cache.isExpired(key)) {
    return Promise.resolve(cachedResponse);
  }

  let response;

  try {
    response = await fs.readJson(url);
  } catch (error) {
    if (cachedResponse) return cachedResponse;
    throw error;
  }

  const data = options.transform ? options.transform(response) : response;

  if (options.maxAge) {
    alfy.cache.set(key, data, { maxAge: options.maxAge });
  }

  return data;
}

function getChannelPath(appdata = "", vscodeEdition = "code") {
  if (
    vscodeEdition === "code-insiders" &&
    fs.existsSync("".concat(appdata, "/Code - Insiders"))
  ) {
    return "Code - Insiders";
  }

  if (
    vscodeEdition === "codium" &&
    fs.existsSync("".concat(appdata, "/VSCodium"))
  ) {
    return "VSCodium";
  }

  return "Code";
}

function getProjectFilePath() {
  let appdata;

  const {
    env: { APPDATA, HOME, vscodeEdition },
  } = process;

  if (APPDATA) {
    appdata = APPDATA;
  } else {
    appdata =
      process.platform === "darwin"
        ? "".concat(HOME, "/Library/Application Support")
        : "/var/local";
  }

  const channelPath = getChannelPath(appdata, vscodeEdition);
  const relativeProjectFilePath = path.join(channelPath, "User", PROJECTS_FILE);
  // in the new version, the location of projects.json is changed.
  const relativeProjectFilePathNew = path.join(
    channelPath,
    "User",
    "globalStorage/alefragnani.project-manager",
    PROJECTS_FILE
  );
  const relativeProjectHistoryFilePath = path.join(
    channelPath,
    "User/globalStorage",
    PROJECTS_HISTORY_FILE
  );

  let projectFile = path.join(appdata, relativeProjectFilePath);
  let projectHistoryFile = path.join(appdata, relativeProjectHistoryFilePath);

  // In linux, it may not work with /var/local, then try to use /home/myuser/.config
  if (process.platform === "linux" && fs.existsSync(projectFile) === false) {
    projectFile = path.join(homeDir, ".config/", relativeProjectFilePath);
    if (fs.existsSync(projectFile) === false) {
      projectFile = path.join(homeDir, ".config/", relativeProjectFilePathNew);
    }
  }

  if (fs.existsSync(projectFile) === false) {
    projectFile = path.join(appdata, relativeProjectFilePathNew);
  }
  if (fs.existsSync(projectFile) === false) {
    return null;
  }
  return [projectFile, projectHistoryFile];
}

function uniqBy(arr, predicate) {
  return [
    ...arr
      .reduce((map, item) => {
        const key =
          item === null || item === undefined ? item : item[predicate];

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values(),
  ];
}
// PUBLIC INTERFACE
export default {
  uniqBy,
  inputMatchesData,
  parseProjects,
  getChannelPath,
  getProjectFilePath,
  fetch,
  getTitle,
  getSubtitle,
  getArgument,
  getIcon,
};

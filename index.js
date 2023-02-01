import alfy from "alfy";
import utils from "./lib/utils.js";
import { GetHistoryFiles } from "./lib/history.js";

async function getProjects(file) {
  if (file) {
    const projects = await utils.fetch(file, {
      transform: utils.parseProjects,
    });
    return projects;
  }
  return [];
}

async function getHistory(file) {
  if (file) {
    const res = await GetHistoryFiles(file);
    return res || [];
  }
  return [];
}

(async () => {
  const [file, historyFile] = utils.getProjectFilePath();
  let matchedProjects = [];
  if (!alfy.input) {
    matchedProjects.push({
      title: "Open with Visual Studio Code",
      subtitle: "Open Finder folder or selection in Visual Studio Code",
      icon: {
        path: "./resource/icon.png",
      },
      arg: "",
    });
  }
  const [projects, history] = await Promise.all([
    getProjects(file),
    getHistory(historyFile),
  ]);
  if (projects) {
    matchedProjects = matchedProjects.concat(
      utils
        .inputMatchesData(projects, alfy.input, ["name", "group"])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((project) => ({
          title: utils.getTitle(project),
          subtitle: utils.getSubtitle(project),
          icon: utils.getIcon(project),
          arg: utils.getArgument(project),
          valid: true,
          text: {
            copy: utils.getArgument(project),
          },
        }))
    );
  }
  if (history) {
    matchedProjects = matchedProjects.concat(
      utils
        .inputMatchesData(history, alfy.input, ["name", "rootPath"])
        .map((project) => ({
          title: project.name,
          subtitle: project.rootPath,
          icon: {
            type: "fileicon",
            path: project.rootPath,
          },
          arg: project.rootPath,
          valid: true,
          text: {
            copy: project.rootPath,
          },
        }))
    );
  }

  if (matchedProjects.length === 0) {
    alfy.output([
      {
        title: "No projects found",
      },
    ]);
    return;
  }

  alfy.output(utils.uniqBy(matchedProjects, "arg"));
})();

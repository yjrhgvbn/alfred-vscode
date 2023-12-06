import alfy from "alfy";
import utils from "./lib/utils.js";
import { GetHistoryFiles } from "./lib/history.js";
import fs from "fs";

async function getProjects(file) {
  if (file) {
    const projects = await utils.fetch(file, {
      transform: utils.parseProjects,
    });
    const showRemote = process.argv[3] === "-r";
    return projects.filter((file) =>
      showRemote ? file.rootPath[0] !== "/" : file.rootPath[0] === "/"
    );
  }
  return [];
}

async function getHistory(file) {
  const showRemote = process.argv[3] === "-r";
  if (file) {
    const files = (await GetHistoryFiles(file)) || [];
    const filterFiles = files.filter((file) =>
      showRemote ? file.rootPath[0] !== "/" : file.rootPath[0] === "/"
    );
    const filesPath = filterFiles.map((file) => file.rootPath);
    const existsCall = filesPath.map((file) => checkFileExists(file));
    const exists = await Promise.all(existsCall);
    const res = filterFiles.filter((file, index) => exists[index]);
    duplicateName(res)
    return res || [];
  }
  return [];
}

// 重复名称处理
function duplicateName(files) {
  const fileNameMap = new Map()
  files.forEach((file,index) => {
    fileNameMap.set(file.name, fileNameMap.has(file.name) ? fileNameMap.get(file.name).concat(index) : [index])
  });
  const duplicateNameList = [...fileNameMap].filter(([key, value]) => value.length > 1)
  if(!duplicateNameList) return files
  duplicateNameList.forEach(([key, value]) => {
    value.forEach((index, i) => {
      files[index].name = `${files[index].name} (${getCurrentParentDir(files[index].rootPath)})`
    })
  })
  return files
}

function getCurrentParentDir(path) {
  return path.split("/").slice(-2,-1);
}

// 检查文件是否存在
function checkFileExists(file) {
  if (!file || typeof file !== "string" || file[0] !== "/") return true;
  return new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
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
        .inputMatchesData(projects, alfy.input, ["name", "tag"])
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

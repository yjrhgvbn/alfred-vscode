import fs from "fs";
import initSqlJs from "sql.js";
import { basename } from "path";

export async function GetHistoryFiles(path) {
  const fileBuffer = fs.readFileSync(path);
  let db = new (await initSqlJs()).Database(fileBuffer);
  let sql =
    "select value from ItemTable where key = 'history.recentlyOpenedPathsList'";
  let results = db.exec(sql);
  let res = results[0].values.toString();
  if (!res) return [];
  let data = JSON.parse(res);

  return data.entries.map((file) => {
    let decodePath = "";
    if (typeof file === "string") decodePath = decodeURIComponent(file);
    let path = file.fileUri || file.folderUri || file.workspace.configPath;
    decodePath = decodeURIComponent(path);
    if (decodePath.startsWith("file")) {
      decodePath = decodeURIComponent(decodePath).slice(7);
    }
    return {
      name: basename(decodePath),
      rootPath: decodePath,
    };
  });
}

import { SHEET_NAMES } from "./constants";

export const validation = () => {
  // 席替え対象の座席数と人数が一致しない場合、エラーとする
  if (countTargetSeats() !== countTargetPeople()) {
    throw new Error("席替え対象の座席数と人数が一致しません");
  }
}

/**
 * 席替え対象の座席数をカウントする
 */
const countTargetSeats = () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SEATS);
  if (!sheet) {
    throw new Error("シートが見つかりません");
  }

  const regex = new RegExp("@"); 
  var n = 0;
  sheet.getDataRange().getValues().forEach(function(row, rowIndex) {
    row.forEach(function(cell, colIndex) {
      if (cell.toString().match(regex)) {
        n++;
      }
    });
  });
  Logger.log(`席替え対象の座席数：${n}`)
  return n;
}

/**
 * 席替え対象の人数をカウントする
 */
const countTargetPeople = () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.GROUPS);
  if (!sheet) {
    throw new Error("シートが見つかりません");
  }

  // 文字列の先頭が#でないセルをカウントする
  const regex = new RegExp("^(?!#)."); 
  var n = 0;
  // 2行目からデータを確認する
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  dataRange.getValues().forEach(function(row, rowIndex) {
    row.forEach(function(cell, colIndex) {
      if (cell.toString().match(regex)) {
        n++;
      }
    });
  });
  Logger.log(`席替え対象の人数：${n}`)
  return n;
}

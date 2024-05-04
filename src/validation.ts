import { SHEET_NAMES } from "./constants";

class ValidationInfo {
  constructor(
    // 固定座席の人の名前のリスト
    public fixedSeatMembers: string[],
    // 席替え対象の人数
    public changeTargetCount: number,
  ) {
    this.fixedSeatMembers = fixedSeatMembers;
    this.changeTargetCount = changeTargetCount;
  }
}

export const validation = () => {
  const groupingSheetValidationInfo = getGroupingSheetValidationInfo();
  const seatSheetValidationInfo = getSeatSheetValidationInfo();

  const groupingTargetCount = groupingSheetValidationInfo.validationInfo.changeTargetCount;
  const seatTargetCount = seatSheetValidationInfo.validationInfo.changeTargetCount;
  // 席替え対象の人数が一致しているか確認する
  if (groupingTargetCount !== seatTargetCount) {
    throw new Error("席替え対象の人数が一致していません");
  }

  const groupingFixedSeatMembers = groupingSheetValidationInfo.validationInfo.fixedSeatMembers;
  const seatFixedSeatMembers = seatSheetValidationInfo.validationInfo.fixedSeatMembers;
  // 固定座席の人数が一致しているか確認する
  if (groupingFixedSeatMembers.length !== seatFixedSeatMembers.length) {
    throw new Error("固定座席の人数が一致していません");
  }

  // 固定座席の人が一致しているか確認する
  const sortedGroupingFixedSeatMembers = groupingFixedSeatMembers.sort();
  const sortedSeatFixedSeatMembers = seatFixedSeatMembers.sort();
  sortedGroupingFixedSeatMembers.map((value, index) => {
    if (value !== sortedSeatFixedSeatMembers[index]) {
      throw new Error("固定座席の人の名前が一致していません");
    }
  });
}

/**
 * グループ分けシートからバリデーションに必要な情報を取得する
 * @returns ValidationInfo
 */
const getGroupingSheetValidationInfo = (): { validationInfo: ValidationInfo } => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.GROUPS);
  if (!sheet) {
    throw new Error("シートが見つかりません");
  }

  var fixedSeatMembers: string[] = [];
  const fixedSeatRegex = new RegExp("^(?!#)."); 
  var changeTargetCount: number = 0;

  // 2行目からデータを確認する
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  dataRange.getValues().forEach(function(row, rowIndex) {
    row.forEach(function(cell, colIndex) {
      // 固定座席の人の名前を取得する
      if (cell.toString().startsWith("#")) {
        fixedSeatMembers.push(cell.toString());
      }
      // 席替え対象の人をカウントする
      if (cell.toString().match(fixedSeatRegex)) {
        changeTargetCount++;
      }
    });
  });
  Logger.log(`【グループ分け】固定座席の人：${fixedSeatMembers}`);
  Logger.log(`【グループ分け】席替え対象の人数：${changeTargetCount}`);

  const validationInfo = new ValidationInfo(fixedSeatMembers, changeTargetCount);
  return { validationInfo };
}

/**
 * 座席シートからバリデーションに必要な情報を取得する
 * @returns ValidationInfo
 */
const getSeatSheetValidationInfo = (): { validationInfo: ValidationInfo } => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SEATS);
  if (!sheet) {
    throw new Error("シートが見つかりません");
  }

  var fixedSeatMembers: string[] = [];
  var changeTargetCount: number = 0;

  // 2行目からデータを確認する
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  dataRange.getValues().forEach(function(row, rowIndex) {
    row.forEach(function(cell, colIndex) {
      // 固定座席の人の名前を取得する
      if (cell.toString().startsWith("#")) {
        fixedSeatMembers.push(cell.toString());
      }
      // 席替え対象の人をカウントする
      if (cell.toString().match("@")) {
        changeTargetCount++;
      }
    });
  });
  Logger.log(`【座席】固定座席の人：${fixedSeatMembers}`);
  Logger.log(`【座席】席替え対象の人数：${changeTargetCount}`);

  const validationInfo = new ValidationInfo(fixedSeatMembers, changeTargetCount);
  return { validationInfo };
}

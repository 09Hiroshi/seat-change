import { validation } from "./validation";

class Member {
  constructor(
    // 名前
    public name: string,
    // グループ
    public group: string,
  ) {
    this.name = name;
    this.group = group;
  }
}

class Seat {
  constructor(
    // メンバー
    public member: Member,
    // 席
    public seat: string,
    // 固定座席かどうか
    public isFixed: boolean,
  ) {
    this.member = member;
    this.seat = seat;
  }
}

const main = () => {
  // バリデーションを実行
  Logger.log("バリデーションを実行します");
  validation();
  // グループ分けシートからメンバー情報を取得
  Logger.log("グループ分けシートからメンバー情報を取得します");
  const members = getMemberInfo();
  // 固定座席のメンバーと席替え対象のメンバーとに分ける
  const { fixedSeatMembers, changeTargetMembers } = divideMembers(members);
}

/**
 * グループ分けシートからメンバー情報を取得する
 */
const getMemberInfo = (): Member[] => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("グループ分け");
  if (!sheet) {
    throw new Error("「グループ分け」シートが見つかりません");
  }

  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  var members: Member[] = [];
  for (let col = 1; col <= lastColumn; col++) {
    // グループ名を取得
    const groupName = sheet.getRange(1, col).getValue();
    for (let row = 2; row <= lastRow; row++) {
      // 対象セルの文字列を取得
      const cellValue = sheet.getRange(row, col).getValue();
      if (cellValue === "") {
        // 文字列がないので、次の列（グループ）へ移動
        break;
      }
      const member = new Member(cellValue, groupName);
      members.push(member);
    }
  }
  return members;
}

/**
 * 固定座席のメンバーと席替え対象のメンバーとに分ける
 * @param members メンバーリスト
 * @returns
 * fixedSeatMembers: 固定座席のメンバー
 * changeTargetMembers: 席替え対象のメンバー
 */
const divideMembers = (members: Member[]): { fixedSeatMembers: Member[], changeTargetMembers: Member[] } => {
  const fixedSeatMembers: Member[] = [];
  const changeTargetMembers: Member[] = [];
  members.forEach(member => {
    if (member.name.startsWith("#")) {
      fixedSeatMembers.push(member);
    } else {
      changeTargetMembers.push(member);
    }
  });
  return { fixedSeatMembers, changeTargetMembers };
}

main();

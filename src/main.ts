import { SHEET_NAMES } from "./constants";
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
    public seatColumn: number,
    public seatRow: number,
    // 固定座席かどうか
    public isFixedSeat: boolean,
  ) {
    this.member = member;
    this.seatColumn = seatColumn;
    this.seatRow = seatRow;
    this.isFixedSeat = isFixedSeat;
  }
}

const main = () => {
  // バリデーションを実行
  Logger.log("バリデーションを実行します");
  validation();
  Logger.log("バリデーションが成功しました");
  // グループ分けシートからメンバー情報を取得
  Logger.log("グループ分けシートからメンバー情報を取得します");
  const members = getMemberInfo();
  Logger.log("メンバー情報の取得が完了しました");
  // 固定座席のメンバーと席替え対象のメンバーとに分ける
  Logger.log("固定座席のメンバーと席替え対象のメンバーとに分けます");
  const { fixedSeatMembers, changeTargetMembers } = divideMembers(members);
  Logger.log("メンバーの分割が完了しました");
  // 初期値の生成
  Logger.log("各座席へメンバーを割り当てます（初期値の生成）");
  const initialSeats = generateInitialSeats(fixedSeatMembers, changeTargetMembers);
  Logger.log("初期値の生成が完了しました");
}

/**
 * グループ分けシートからメンバー情報を取得する
 * @returns Member[] メンバーリスト
 */
const getMemberInfo = (): Member[] => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("グループ分け");
  if (!sheet) {
    throw new Error("グループ分けシートが見つかりません");
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
        // 文字列が空なので、次の列（グループ）へ移動
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

/**
 * 各座席へメンバーを割り当てる（初期値の生成）
 * @param fixedSeatMembers 固定座席のメンバー
 * @param changeTargetMembers 席替え対象のメンバー
 * @returns Seat[] 座席リスト
 */
const generateInitialSeats = (fixedSeatMembers: Member[], changeTargetMembers: Member[]): Seat[] => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SEAT);
  if (!sheet) {
    throw new Error("座席シートが見つかりません");
  }

  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const initialSeats: Seat[] = [];
  // 固定座席のメンバーと席替え対象のメンバーをコピー（使用したらリストから削除するためletで宣言）
  let tmpFixedSeatMembers = fixedSeatMembers;
  let tmpChangeTargetMembers = changeTargetMembers;
  for (let col = 1; col <= lastColumn; col++) {
    for (let row = 1; row <= lastRow; row++) {
      const cellValue = sheet.getRange(row, col).getValue();
      if (cellValue === "") {
        // 文字列が空なので、次のセルへ移動
        continue;
      }
      // 固定座席の場合
      if (cellValue.startsWith("#")) {
        // fixedSeatMembersから該当するメンバーを取得してSeatクラスを生成
        const member = fixedSeatMembers.find(member => member.name === cellValue);
        if (!member) {
          throw new Error(`固定座席のメンバーが見つかりません：${cellValue}`);
        }
        const seat = new Seat(member, col, row, true);
        initialSeats.push(seat);
        // tmpFixedSeatMembersから取得したメンバーを削除
        tmpFixedSeatMembers = tmpFixedSeatMembers.filter(member => member.name !== cellValue);
      }
      // 席替え対象の場合
      if (cellValue.match("@")) {
        // tmpChangeTargetMembersからランダムで1人取得してSeatクラスを生成
        const randomIndex = Math.floor(Math.random() * tmpChangeTargetMembers.length);
        const member = tmpChangeTargetMembers[randomIndex];
        const seat = new Seat(member, col, row, false);
        initialSeats.push(seat);
        // tmpChangeTargetMembersから取得したメンバーを削除
        tmpChangeTargetMembers = tmpChangeTargetMembers.filter((_, index) => index !== randomIndex);
      }
    }
  }
  // tmpFixedSeatMembersが空でない場合、エラー
  if (tmpFixedSeatMembers.length > 0) {
    throw new Error(`グループ分けシートと座席シートとで固定座席のメンバーが一致しません：${tmpFixedSeatMembers.map(member => member.name)}`);
  }
  // tmpFixedSeatMembersが空でない場合、エラー
  if (tmpChangeTargetMembers.length > 0) {
    throw new Error("席替え対象のメンバーが座席に割り当てられていません");
  }

  return initialSeats;
}

main();

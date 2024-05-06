import { SHEET_NAMES } from "./constants";
import { Member } from "./member";
import { Seat } from "./seat";

/**
 * 初期値の生成（各座席へメンバーを割り当てる）
 * @param fixedSeatMembers 固定座席のメンバー
 * @param changeTargetMembers 席替え対象のメンバー
 * @returns Seat[] 座席リスト
 */
export const generateInitialSeats = (fixedSeatMembers: Member[], changeTargetMembers: Member[]): Seat[] => {
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
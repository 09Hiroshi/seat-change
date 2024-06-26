import { SHEET_NAMES } from "./constants";
import { Member } from "./member";
import { Seat } from './seat';

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

/**
 * 評価値の計算を行う（自身の座席から見て下と右の座席を確認し、同一グループの場合に評価値をプラスする）
 * @param sheetName シート名
 * @param seats 座席リスト
 * @returns number 評価値
 */
export const calculateEvaluationValue = (sheetName: string, seats: Seat[]): number => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("座席シートが見つかりません");
  }

  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  let evaluationValue = 0;
  for (let col = 1; col <= lastColumn; col++) {
    for (let row = 1; row <= lastRow; row++) {
      // 対象セルが座席ではない場合、次のセルへ移動
      const cellValue = sheet.getRange(row, col).getValue();
      if (!cellValue.startsWith("#") && cellValue === "") {
        continue;
      }
      const seat = seats.find(seat => seat.seatColumn === col && seat.seatRow === row);
      if (!seat) {
        throw new Error(`座席が見つかりません（${col}列${row}行）`);
      }
      // 下の座席が同じグループの場合、評価値+8
      const downSeat = seats.find(seat => seat.seatColumn === col && seat.seatRow === row + 1);
      if (downSeat && seat.member.groupName === downSeat.member.groupName) {
        evaluationValue += 8;
      }
      // 右の座席が同じグループの場合、評価値+10
      const rightSeat = seats.find(seat => seat.seatColumn === col + 1 && seat.seatRow === row);
      if (rightSeat && seat.member.groupName === rightSeat.member.groupName) {
        evaluationValue += 10;
      }
    }
  }
  return evaluationValue;
}

/**
 * 交叉を行う（席替え）
 * @param sheetName シート名
 * @param seats 座席リスト
 * @returns
 * Seat[] 座席リスト
 * Seat 交叉の対象となる1つ目の座席
 * Seat 交叉の対象となる2つ目の座席
 */
export const crossover = (seats: Seat[]): { newSeats: Seat[], firstCrossoverSeat: Seat, secondCrossoverSeat: Seat } => {
  // 評価値が上回らない場合、交叉を行わないため、座席リストを一時的にコピーする
  const newSeats = JSON.parse(JSON.stringify(seats));

  // 交叉の対象となる1つ目の座席
  const firstCrossoverSeat = selectFirstCrossoverSeat(newSeats);
  // 交叉の対象となる2つ目の座席
  const secondCrossoverSeat = selectSecondCrossoverSeat(newSeats, firstCrossoverSeat);

  // 1つ目の座席と2つ目の座席のメンバーを交換する
  const tmpMember = firstCrossoverSeat.member;
  firstCrossoverSeat.member = secondCrossoverSeat.member;
  secondCrossoverSeat.member = tmpMember;

  return { newSeats, firstCrossoverSeat, secondCrossoverSeat };
}

/**
 * 交叉の対象となる1つ目の座席を選択する
 * @param seats 座席リスト
 * @returns Seat 交叉の対象となる1つ目の座席
 */
const selectFirstCrossoverSeat = (seats: Seat[]): Seat => {
  while (true) {
    const randomIndex = Math.floor(Math.random() * seats.length);
    const seat = seats[randomIndex];
    // 固定座席の場合、再度ランダムで選択する
    if (seat.isFixedSeat) {
      continue;
    }
    return seat;
  }
}

/**
 * 交叉の対象となる2つ目の座席を選択する
 * @param seats 座席リスト
 */
const selectSecondCrossoverSeat = (seats: Seat[], firstCrossoverSeat: Seat): Seat => {
  while (true) {
    const randomIndex = Math.floor(Math.random() * seats.length);
    const seat = seats[randomIndex];
    // 固定座席の場合、再度ランダムで選択する
    if (seat.isFixedSeat) {
      continue;
    }
    // 1つ目の座席と同一グループの場合、再度ランダムで選択する
    if (firstCrossoverSeat.member.groupName === seat.member.groupName) {
      continue;
    }
    // 1つ目の座席と同一座席の場合、再度ランダムで選択する
    if (firstCrossoverSeat.seatColumn === seat.seatColumn && firstCrossoverSeat.seatRow === seat.seatRow) {
      continue;
    }
    return seat;
  }
}
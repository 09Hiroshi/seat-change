import { SHEET_NAMES } from "./constants";
import { Member } from "./member";
import { Seat } from "./seat";
import { validation } from "./validation";
import { generateInitialSeats, calculateEvaluationValue, crossover } from "./seatChangeAlgorithm";

// mainを実行すると2回実行されてしまうため、run関数を呼び出すようにする
const run = () => {
}
run();

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
  let seats = generateInitialSeats(fixedSeatMembers, changeTargetMembers);
  Logger.log("初期値の生成が完了しました");
  // 新しい座席シート（座席_yyyyMMddHHmmss）を生成
  Logger.log("座席を生成します");
  const newSheetName = generateSeats(seats);
  Logger.log("座席の生成が完了しました");
  // 座席にバックグラウンドカラーを設定
  Logger.log("座席にバックグラウンドカラーを設定します");
  setBackgroundColor(newSheetName, seats);
  Logger.log("バックグラウンドカラーの設定が完了しました");
  // 初期評価値の計算
  let evaluationValue = calculateEvaluationValue(newSheetName, seats);
  Logger.log(`評価値：${evaluationValue}`)
  let notChangeCount = 0;
  let generation = 0;
  while (true) {
    generation++;
    Logger.log(`第${generation}世代`);
    // 交叉（席替え）
    const { newSeats, firstCrossoverSeat, secondCrossoverSeat } = crossover(seats);
    // 評価値の計算
    const newEvaluationValue = calculateEvaluationValue(newSheetName, newSeats);
    if (newEvaluationValue > evaluationValue) {
      Logger.log(`第${generation}世代：評価値の更新（${newEvaluationValue}）`);
      evaluationValue = newEvaluationValue;
      notChangeCount = 0;

      Logger.log(`席替え（${firstCrossoverSeat.member.name}←→${secondCrossoverSeat.member.name}）`);
      seats = newSeats;
      updateSeatSheet(newSheetName, firstCrossoverSeat, secondCrossoverSeat);
      continue;
    }
    notChangeCount++;
    // 評価値がn回変わらなかった場合、席替えを終了する
    if (notChangeCount > 1000) {
      Logger.log("席替えを終了します");
      break;
    }
  }
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
    const groupColor = sheet.getRange(1, col).getBackground();
    for (let row = 2; row <= lastRow; row++) {
      // 対象セルの文字列を取得
      const cellValue = sheet.getRange(row, col).getValue();
      if (cellValue === "") {
        // 文字列が空なので、次の列（グループ）へ移動
        break;
      }
      const member = new Member(cellValue, groupName, groupColor);
      members.push(member);
    }
  }
  return members;
}

/**
 * 固定座席のメンバーと席替え対象のメンバーとに分ける
 * @param members メンバーリスト
 * @returns fixedSeatMembers 固定座席のメンバー, changeTargetMembers 席替え対象のメンバー
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
 * 初期値を使用して座席を生成（新規にシートを作成する）
 * @param initialSeats 
 * @returns string 新規シート名
 */
const generateSeats = (initialSeats: Seat[]): string => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SEAT);
  if (!sheet) {
    throw new Error("座席シートが見つかりません");
  }

  // 座席シートをコピー（座席シートの枠線を使用したいため）
  const copiedSheet = sheet.copyTo(ss);
  // 新規シート名を作成
  const now = new Date();
  const formattedDateTime = Utilities.formatDate(now, "JST", "yyyyMMddHHmmss");
  const newSheetName = `座席_${formattedDateTime}`;
  copiedSheet.setName(newSheetName);
  // 座席情報を書き込む
  initialSeats.forEach(seat => {
    copiedSheet.getRange(seat.seatRow, seat.seatColumn).setValue(seat.member.name);
  });

  return newSheetName;
}

/**
 * 座席にバックグラウンドカラーを設定する
 * @param sheetName シート名
 */
const setBackgroundColor = (sheetName: string, initialSeats: Seat[]) => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName); // Change the type of sheetName to 'string'
  if (!sheet) {
    throw new Error("色塗り対象のシートが見つかりません");
  }

  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  // initialSeatsをコピー（使用したらリストから削除するためletで宣言）
  let tmpInitialSeats = initialSeats;
  for (let col = 1; col <= lastColumn; col++) {
    for (let row = 1; row <= lastRow; row++) {
      const cellValue = sheet.getRange(row, col).getValue();
      if (cellValue === "") {
        // 文字列が空なので、次のセルへ移動
        continue;
      }
      // initialSeatsから該当する座席を取得する
      const seat = initialSeats.find(seat => seat.seatColumn === col && seat.seatRow === row);
      if (!seat) {
        throw new Error(`座席情報が見つかりません（列=${col}, 行=${row}）`);
      }
      sheet.getRange(row, col).setBackground(seat.member.groupColor);
      // tmpInitialSeatsから取得した座席を削除
      tmpInitialSeats = tmpInitialSeats.filter(s => s.seatColumn !== col || s.seatRow !== row);
    }
  }
  // tmpInitialSeatsが空でない場合、エラー
  if (tmpInitialSeats.length > 0) {
    throw new Error("座席情報がシートに反映されていません");
  }
}

/**
 * 新規作成した座席シートを更新する
 * @param sheetName 
 * @param firstCrossoverSeat 
 * @param secondCrossoverSeat 
 */
const updateSeatSheet = (sheetName: string, firstCrossoverSeat: Seat, secondCrossoverSeat: Seat) => {
  // 変更した内容をシートに反映する
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("座席シートが見つかりません");
  }
  // メンバー名を更新する
  sheet.getRange(firstCrossoverSeat.seatRow, firstCrossoverSeat.seatColumn).setValue(firstCrossoverSeat.member.name);
  sheet.getRange(secondCrossoverSeat.seatRow, secondCrossoverSeat.seatColumn).setValue(secondCrossoverSeat.member.name);
  // バックグラウンドカラーを更新する
  sheet.getRange(firstCrossoverSeat.seatRow, firstCrossoverSeat.seatColumn).setBackground(firstCrossoverSeat.member.groupColor);
  sheet.getRange(secondCrossoverSeat.seatRow, secondCrossoverSeat.seatColumn).setBackground(secondCrossoverSeat.member.groupColor);
}

main(); // mainを用意しておかないとGASが反映されない & 最後に配置しないと実行時にエラーとなる

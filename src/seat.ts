import { Member } from './member';

export class Seat {
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
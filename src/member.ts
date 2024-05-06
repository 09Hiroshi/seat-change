export class Member {
  constructor(
    // 名前
    public name: string,
    // グループ名
    public groupName: string,
    // グループカラー
    public groupColor: string,
  ) {
    this.name = name;
    this.groupName = groupName;
    this.groupColor = groupColor;
  }
}
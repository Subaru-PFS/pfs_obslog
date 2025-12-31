export type Styles = {
  cards: string;
  cellContent: string;
  comment: string;
  commentKey: string;
  commentValue: string;
  filename: string;
  hduButton: string;
  hduSelector: string;
  info: string;
  root: string;
  scrollable: string;
  selected: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

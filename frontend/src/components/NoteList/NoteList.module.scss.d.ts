export type Styles = {
  addButton: string;
  noteBody: string;
  noteForm: string;
  noteInput: string;
  noteItem: string;
  noteList: string;
  noteUser: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

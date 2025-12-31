export type Styles = {
  backdrop: string;
  cards: string;
  closeButton: string;
  comment: string;
  commentKey: string;
  commentValue: string;
  dialog: string;
  dialogContent: string;
  dialogHeader: string;
  dialogTitle: string;
  error: string;
  filename: string;
  hduButton: string;
  hduButtons: string;
  info: string;
  loading: string;
  placeholder: string;
  scrollable: string;
  selected: string;
  viewer: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

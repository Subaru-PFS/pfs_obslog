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
  hduDropdown: string;
  hduLabel: string;
  headerBar: string;
  loading: string;
  panel: string;
  panelCloseButton: string;
  panelContent: string;
  panelHeader: string;
  panelInfo: string;
  panelPlaceholder: string;
  panelTitle: string;
  placeholder: string;
  scrollable: string;
  selected: string;
  viewer: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

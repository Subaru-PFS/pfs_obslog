export type Styles = {
  bottomPane: string;
  error: string;
  gutter: string;
  gutterActive: string;
  inspector: string;
  loading: string;
  noData: string;
  note: string;
  noteBody: string;
  notesSection: string;
  noteUser: string;
  placeholder: string;
  showInListButton: string;
  splitContainer: string;
  summary: string;
  summaryContent: string;
  summaryTable: string;
  topPane: string;
  visitDetail: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

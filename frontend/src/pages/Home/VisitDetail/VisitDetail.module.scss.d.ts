export type Styles = {
  bottomPane: string;
  error: string;
  gutter: string;
  inspector: string;
  loading: string;
  noData: string;
  note: string;
  noteBody: string;
  noteUser: string;
  placeholder: string;
  splitContainer: string;
  summary: string;
  summaryLabel: string;
  summaryRow: string;
  summaryValue: string;
  topPane: string;
  visitDetail: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

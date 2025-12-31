export type Styles = {
  error: string;
  inspector: string;
  loading: string;
  noData: string;
  note: string;
  noteBody: string;
  noteUser: string;
  placeholder: string;
  summary: string;
  summaryLabel: string;
  summaryRow: string;
  summaryValue: string;
  visitDetail: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

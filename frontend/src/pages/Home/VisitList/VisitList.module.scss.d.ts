export type Styles = {
  colDate: string;
  colDescription: string;
  colExposures: string;
  colExptime: string;
  colId: string;
  colNotes: string;
  colTime: string;
  command: string;
  content: string;
  empty: string;
  error: string;
  exposureAgc: string;
  exposureMcs: string;
  exposureMixed: string;
  exposureNone: string;
  exposureSps: string;
  iicSequence: string;
  info: string;
  loading: string;
  noSequence: string;
  notesBadge: string;
  pageInfo: string;
  pagination: string;
  searchInput: string;
  selected: string;
  sequenceGroup: string;
  sequenceId: string;
  sequenceName: string;
  sequenceType: string;
  status: string;
  statusError: string;
  statusOk: string;
  title: string;
  toolbar: string;
  visitGroup: string;
  visitList: string;
  visitTable: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

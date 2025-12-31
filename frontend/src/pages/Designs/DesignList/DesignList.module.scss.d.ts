export type Styles = {
  entry: string;
  entryButtons: string;
  entryDate: string;
  entryGroup: string;
  entryHover: string;
  entryId: string;
  entryInfo: string;
  entryName: string;
  entrySelected: string;
  entrySelectedHover: string;
  list: string;
  listContainer: string;
  listHeader: string;
  searchRow: string;
  sortCondition: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

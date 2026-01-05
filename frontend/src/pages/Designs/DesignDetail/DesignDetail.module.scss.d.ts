export type Styles = {
  colorModeSelect: string;
  dataColumn: string;
  designDetailContainer: string;
  detailArea: string;
  focalPlaneSection: string;
  infoTable: string;
  leftColumn: string;
  legendEntries: string;
  legendEntry: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

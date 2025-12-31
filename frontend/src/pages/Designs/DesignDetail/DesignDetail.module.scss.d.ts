export type Styles = {
  colorModeSelect: string;
  designDetailContainer: string;
  detailTable: string;
  focalPlaneSection: string;
  legendEntries: string;
  legendEntry: string;
  summaryTable: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

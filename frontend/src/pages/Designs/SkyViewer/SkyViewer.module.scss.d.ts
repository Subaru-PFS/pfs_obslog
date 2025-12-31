export type Styles = {
  clock: string;
  datepicker: string;
  globeWrapper: string;
  skyViewerContainer: string;
  timeSection: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

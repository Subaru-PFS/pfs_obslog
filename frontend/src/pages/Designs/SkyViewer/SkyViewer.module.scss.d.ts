export type Styles = {
  clock: string;
  datepicker: string;
  globeWrapper: string;
  hscSection: string;
  settingsButton: string;
  skyViewerContainer: string;
  subOption: string;
  timeSection: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

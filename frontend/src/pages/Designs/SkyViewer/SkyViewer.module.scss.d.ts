export type Styles = {
  clock: string;
  datepicker: string;
  filterSection: string;
  filterSelector: string;
  filterSwitch: string;
  globeWrapper: string;
  hscControls: string;
  hscHeader: string;
  hscSection: string;
  inlineOption: string;
  paramRow: string;
  skyViewerContainer: string;
  slider: string;
  sliderPopup: string;
  sliderSection: string;
  timeSection: string;
  value: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

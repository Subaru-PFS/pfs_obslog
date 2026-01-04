export type Styles = {
  button: string;
  clearButton: string;
  datepicker: string;
  datepickerCell: string;
  datepickerControls: string;
  datepickerFooter: string;
  datepickerHeader: string;
  datepickerMain: string;
  datepickerPicker: string;
  daysOfWeek: string;
  disabled: string;
  dow: string;
  focused: string;
  next: string;
  nextButton: string;
  prev: string;
  prevButton: string;
  range: string;
  rangeEnd: string;
  rangeStart: string;
  selected: string;
  today: string;
  todayButton: string;
  viewSwitch: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

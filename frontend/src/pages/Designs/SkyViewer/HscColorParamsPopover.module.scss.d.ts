export type Styles = {
  closeButton: string;
  content: string;
  header: string;
  paramRow: string;
  popover: string;
  slider: string;
  value: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

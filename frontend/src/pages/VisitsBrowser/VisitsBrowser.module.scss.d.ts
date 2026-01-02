export type Styles = {
  leftPane: string;
  placeholder: string;
  resizer: string;
  resizerActive: string;
  rightPane: string;
  visitsBrowser: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

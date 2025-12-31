export type Styles = {
  home: string;
  leftPane: string;
  placeholder: string;
  resizer: string;
  resizerActive: string;
  rightPane: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

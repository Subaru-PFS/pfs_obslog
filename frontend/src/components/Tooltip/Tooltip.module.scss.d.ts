export type Styles = {
  fadeIn: string;
  tooltip: string;
  trigger: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

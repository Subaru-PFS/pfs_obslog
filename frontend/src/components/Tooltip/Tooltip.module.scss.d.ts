export type Styles = {
  arrow: string;
  bottom: string;
  fadeIn: string;
  left: string;
  right: string;
  tooltip: string;
  top: string;
  trigger: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

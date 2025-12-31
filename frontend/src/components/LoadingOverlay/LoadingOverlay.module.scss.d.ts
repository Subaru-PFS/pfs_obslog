export type Styles = {
  fadeIn: string;
  fullScreen: string;
  overlay: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

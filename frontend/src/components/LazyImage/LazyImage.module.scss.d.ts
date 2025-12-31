export type Styles = {
  container: string;
  errorActions: string;
  errorContainer: string;
  fadeIn: string;
  image: string;
  ready: string;
  transparent: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

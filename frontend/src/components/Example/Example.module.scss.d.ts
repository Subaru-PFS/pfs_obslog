export type Styles = {
  'container': string;
  'containerTitle': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;

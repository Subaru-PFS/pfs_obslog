export type Styles = {
  buttons: string;
  header: string;
  logo: string;
  spacer: string;
  user: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
